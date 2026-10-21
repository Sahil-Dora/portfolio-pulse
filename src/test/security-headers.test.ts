import { describe, expect, it } from "vitest";
import { withSecurityHeaders } from "@/lib/security-headers";

describe("security headers", () => {
  const res = withSecurityHeaders(
    new Response("ok", { status: 201, headers: { "content-type": "text/html" } }),
  );
  const csp = res.headers.get("Content-Security-Policy") ?? "";

  it("keeps status, body type", () => {
    expect(res.status).toBe(201);
    expect(res.headers.get("content-type")).toBe("text/html");
  });
  it("sets nosniff and referrer policy", () => {
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });
  it("CSP blocks framing by unknown sites and plugins", () => {
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("object-src 'none'");
  });
  it("CSP allows Google Fonts and inline chart styles", () => {
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    expect(csp).toContain("font-src 'self' https://fonts.gstatic.com");
  });
});
