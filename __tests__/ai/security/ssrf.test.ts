import { assertAllowedUrl } from "../../../lib/ai/server/security/ssrf";
test.each(["http://api.example.com/x","https://127.0.0.1/x","https://localhost/x","https://169.254.169.254/x","https://api.example.com.evil.test/x"])("rejects unsafe URL %s",url=>expect(()=>assertAllowedUrl(url,{hosts:["api.example.com"],pathPrefixes:["/v1/"]})).toThrow());
test("allows exact https host and path",()=>expect(assertAllowedUrl("https://api.example.com/v1/ticker",{hosts:["api.example.com"],pathPrefixes:["/v1/"]}).hostname).toBe("api.example.com"));
