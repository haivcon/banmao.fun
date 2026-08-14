import crypto from "crypto";

export interface OkxCredentials {
  apiKey: string;
  secretKey: string;
  passphrase: string;
}

export interface OkxRequestPolicy {
  paymentRequired?: "rotate-and-retry" | "return";
}

class OkxKeyManager {
  private credentials: OkxCredentials[] = [];
  private currentIndex = 0;
  private failedKeys = new Map<string, number>();
  private readonly COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.loadCredentials();
  }

  private loadCredentials() {
    // Primary key
    if (process.env.OKX_API_KEY && process.env.OKX_SECRET_KEY && process.env.OKX_PASSPHRASE) {
      this.credentials.push({
        apiKey: process.env.OKX_API_KEY,
        secretKey: process.env.OKX_SECRET_KEY,
        passphrase: process.env.OKX_PASSPHRASE,
      });
    }

    // Secondary keys: OKX_API_KEY_1, OKX_API_KEY_2, etc.
    for (let i = 1; i <= 20; i++) {
      const apiKey = process.env[`OKX_API_KEY_${i}`];
      const secretKey = process.env[`OKX_SECRET_KEY_${i}`];
      const passphrase = process.env[`OKX_PASSPHRASE_${i}`] || process.env[`OKX_API_PASSPHRASE_${i}`];
      
      if (apiKey && secretKey && passphrase) {
        this.credentials.push({ apiKey, secretKey, passphrase });
      }
    }
    
    if (this.credentials.length > 0) {
      console.log(`[OKX KeyManager] Loaded ${this.credentials.length} API keys for rotation.`);
    }
  }

  public getCredentials(): OkxCredentials | null {
    if (this.credentials.length === 0) return null;

    const startIndex = this.currentIndex;
    let loops = 0;

    while (loops < this.credentials.length) {
      const currentCred = this.credentials[this.currentIndex];
      const failedAt = this.failedKeys.get(currentCred.apiKey);

      if (!failedAt || (Date.now() - failedAt > this.COOLDOWN_MS)) {
        if (failedAt) {
          this.failedKeys.delete(currentCred.apiKey);
          console.log(`[OKX KeyManager] Key ${this.maskKey(currentCred.apiKey)} recovered from cooldown.`);
        }
        return currentCred;
      }

      this.currentIndex = (this.currentIndex + 1) % this.credentials.length;
      loops++;
    }

    throw new Error("ALL_OKX_KEYS_EXHAUSTED");
  }

  public rotate(apiKey: string, reason: string) {
    if (this.credentials.length <= 1) {
      this.failedKeys.set(apiKey, Date.now());
      return;
    }

    // Prevent race conditions where multiple failed requests rotate the key unnecessarily
    if (this.credentials[this.currentIndex].apiKey !== apiKey) {
      this.failedKeys.set(apiKey, Date.now());
      return;
    }

    console.warn(`[OKX KeyManager] Rotating key ${this.maskKey(apiKey)} due to: ${reason}`);
    this.failedKeys.set(apiKey, Date.now());
    this.currentIndex = (this.currentIndex + 1) % this.credentials.length;
  }

  private maskKey(key: string) {
    if (!key) return "unknown";
    if (key.length <= 8) return "***";
    return key.substring(0, 4) + "..." + key.substring(key.length - 4);
  }
}

const keyManager = new OkxKeyManager();

function generateSignature(timestamp: string, method: string, requestPath: string, secretKey: string, bodyString = ""): string {
  const prehash = timestamp + method.toUpperCase() + requestPath + bodyString;
  return crypto.createHmac("sha256", secretKey).update(prehash).digest("base64");
}

export async function okxFetch(
  method: string,
  requestPath: string,
  options: RequestInit = {},
  maxRetries = 2,
  policy: OkxRequestPolicy = {}
): Promise<Response> {
  const url = `https://web3.okx.com${requestPath}`;
  const methodUpper = method.toUpperCase();
  const bodyString = options.body ? String(options.body) : "";

  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const creds = keyManager.getCredentials();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {})
    };

    if (creds) {
      const timestamp = new Date().toISOString();
      const signature = generateSignature(timestamp, methodUpper, requestPath, creds.secretKey, bodyString);
      
      headers["OK-ACCESS-KEY"] = creds.apiKey;
      headers["OK-ACCESS-SIGN"] = signature;
      headers["OK-ACCESS-PASSPHRASE"] = creds.passphrase;
      headers["OK-ACCESS-TIMESTAMP"] = timestamp;
      
      if (process.env.OKX_PROJECT_ID) {
        headers["OK-ACCESS-PROJECT"] = process.env.OKX_PROJECT_ID;
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        method: methodUpper,
        headers,
      });

      // Handle Rate Limiting (429)
      if (response.status === 429) {
        if (creds) keyManager.rotate(creds.apiKey, `HTTP ${response.status}`);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 500 * Math.max(1, attempt)));
          continue; // Retry
        }
      }

      // Existing callers retain key rotation/retry unless they explicitly return HTTP 402.
      if (response.status === 402 && policy.paymentRequired !== "return") {
        if (creds) keyManager.rotate(creds.apiKey, "HTTP 402");
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 500 * Math.max(1, attempt)));
          continue; // Retry
        }
      }

      // Check for OKX specific rate limit codes inside JSON if status is 200
      if (response.status === 200) {
        const clone = response.clone();
        try {
          const data = await clone.json();
          if (data.code === "50011") { // OKX Rate limit code
            if (creds) keyManager.rotate(creds.apiKey, "OKX Code 50011 Rate Limit");
            if (attempt < maxRetries) {
              await new Promise(r => setTimeout(r, 500 * Math.max(1, attempt)));
              continue; // Retry
            }
          }
        } catch (e) {
          // ignore JSON parse errors here, let the caller handle it
        }
      }

      return response;
    } catch (error) {
      lastError = error;
      // Network errors (like timeout) could also trigger a retry, but we don't strictly rotate key for it
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 500 * Math.max(1, attempt)));
        continue;
      }
    }
  }

  throw lastError || new Error("Failed to fetch from OKX API after retries");
}
