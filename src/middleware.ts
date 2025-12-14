import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Paths that require authentication
const protectedPaths = ["/api/admin", "/api/voter", "/api/user"];

// Public paths that don't need auth checking (even if under protected prefixes)
const publicPaths = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/verify-email",
  "/api/auth/refresh",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": request.headers.get("origin") || "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Check if the path is protected
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));

  // If path is public, add CORS headers and continue
  if (isPublic) {
    const response = NextResponse.next();
    response.headers.set(
      "Access-Control-Allow-Origin",
      request.headers.get("origin") || "*",
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");
    return response;
  }

  // If not protected (and not public protected override), continue
  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for tokens in cookies first, then header
  const accessToken = request.cookies.get("accessToken")?.value;

  // Also check Authorization header
  const authHeader = request.headers.get("Authorization");
  const headerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  const tokenToVerify = accessToken || headerToken;

  if (!tokenToVerify) {
    // If no token, return 401 with CORS headers
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      {
        status: 401,
        headers: {
          "Access-Control-Allow-Origin": request.headers.get("origin") || "*",
          "Access-Control-Allow-Credentials": "true",
        },
      },
    );
  }

  try {
    // Verify token using jose (Edge compatible)
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(tokenToVerify, secret);

    // Add user info to headers for downstream handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.userId as string);
    requestHeaders.set("x-user-role", payload.role as string);

    // Role-based access control
    if (pathname.startsWith("/api/admin")) {
      if (payload.role !== "ADMIN" && payload.role !== "admin") {
        return NextResponse.json(
          { success: false, message: "Admin access required" },
          {
            status: 403,
            headers: {
              "Access-Control-Allow-Origin":
                request.headers.get("origin") || "*",
              "Access-Control-Allow-Credentials": "true",
            },
          },
        );
      }
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Add CORS headers to successful requests
    response.headers.set(
      "Access-Control-Allow-Origin",
      request.headers.get("origin") || "*",
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");

    return response;
  } catch (error) {
    console.error("Middleware Auth Error:", error);

    // Token is invalid or expired with CORS headers
    return NextResponse.json(
      {
        success: false,
        message: "Invalid or expired token",
        code: "TOKEN_EXPIRED",
      },
      {
        status: 401,
        headers: {
          "Access-Control-Allow-Origin": request.headers.get("origin") || "*",
          "Access-Control-Allow-Credentials": "true",
        },
      },
    );
  }
}

export const config = {
  matcher: [
    // Match all API routes except public ones and static assets
    "/api/:path*",
  ],
};
