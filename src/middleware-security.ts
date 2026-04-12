import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security Headers (OWASP ASVS Level 2)
  
  // 1. Content Security Policy (CSP)
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.openai.com https://api.anthropic.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  // 2. Strict-Transport-Security (HSTS)
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  // 3. X-Frame-Options (anti-clickjacking)
  response.headers.set("X-Frame-Options", "DENY");

  // 4. X-Content-Type-Options
  response.headers.set("X-Content-Type-Options", "nosniff");

  // 5. X-XSS-Protection
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // 6. Referrer-Policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // 7. Permissions-Policy
  response.headers.set(
    "Permissions-Policy",
    [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "magnetometer=()",
      "gyroscope=()",
      "accelerometer=()",
    ].join(", ")
  );

  // 8. X-DNS-Prefetch-Control
  response.headers.set("X-DNS-Prefetch-Control", "on");

  // 9. X-Download-Options
  response.headers.set("X-Download-Options", "noopen");

  // 10. X-Permitted-Cross-Domain-Policies
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
