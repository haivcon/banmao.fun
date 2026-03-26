// Minimal stub for thread-stream to satisfy browser/Turbopack builds
// Wallet-related dependencies pull in pino which depends on thread-stream;
// in the browser we don't use those transports, so a no-op stub is sufficient.
type Callback = (err?: Error | null) => void;

export interface ThreadStreamOptions {
  [key: string]: unknown;
}

function createThreadStream(_opts?: ThreadStreamOptions): {
  write: (chunk: any, cb?: Callback) => void;
  end: (cb?: Callback) => void;
} {
  return {
    write: (_chunk: any, cb?: Callback) => {
      cb?.();
    },
    end: (cb?: Callback) => {
      cb?.();
    },
  };
}

export default createThreadStream;
