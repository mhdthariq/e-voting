/**
 * Security Headers Utility
 * Adds security headers to API responses
 */

import { NextResponse } from "next/server";

/**
 * Security headers to prevent various attacks
 */
export const SecurityHeaders = {
  // Prevent clickjacking attacks
  "X-Frame-Options": "DENY",

  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",

  // Enable XSS protection in older browsers
  "X-XSS-Protection": "1; mode=block",

  // Referrer policy
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // Permissions policy (disable unnecessary features)
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",

  // Content Security Policy (strict)
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join("; "),

  // Strict Transport Security (HTTPS only)
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

/**
 * CORS headers for API endpoints
 */
export function getCorsHeaders(origin?: string | null): Record<string, string> {
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000",
    "http://localhost:3001",
  ].filter(Boolean);

  const isAllowed = origin && allowedOrigins.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed
      ? origin
      : allowedOrigins[0] || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
}

/**
 * Add security headers to a response
 */
export function addSecurityHeaders(
  response: NextResponse,
  includeCSP: boolean = false,
): NextResponse {
  // Add all security headers
  Object.entries(SecurityHeaders).forEach(([key, value]) => {
    // Skip CSP if not needed (can break some pages)
    if (key === "Content-Security-Policy" && !includeCSP) return;
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Add CORS headers to a response
 */
export function addCorsHeaders(
  response: NextResponse,
  requestOrigin?: string | null,
): NextResponse {
  const corsHeaders = getCorsHeaders(requestOrigin);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Create a secure JSON response with all headers
 */
export function createSecureResponse(
  data: unknown,
  status: number = 200,
  requestOrigin?: string | null,
  includeCSP: boolean = false,
): NextResponse {
  const response = NextResponse.json(data, { status });

  // Add security headers
  addSecurityHeaders(response, includeCSP);

  // Add CORS headers
  addCorsHeaders(response, requestOrigin);

  return response;
}

/**
 * Rate limit headers
 */
export function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  resetTime: number,
): NextResponse {
  response.headers.set("X-RateLimit-Limit", limit.toString());
  response.headers.set("X-RateLimit-Remaining", remaining.toString());
  response.headers.set("X-RateLimit-Reset", new Date(resetTime).toISOString());

  return response;
}
