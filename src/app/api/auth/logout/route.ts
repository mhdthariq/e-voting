/**
 * Logout API Route for BlockVote Authentication
 * POST /api/auth/logout - Clear user session and invalidate tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { protect } from "@/lib/auth/middleware";
import { UserService } from "@/lib/database/services/user.service";
import { log } from "@/utils/logger";

// UserService methods are static, no need to instantiate

export async function POST(request: NextRequest) {
  try {
    // Authenticate user (optional - logout should work even with invalid tokens)
    const authResult = await protect.authenticate(request, {
      requireAuth: false,
    });

    // Get user info from token if available
    const user = authResult.user;
    const userId = user?.userId;
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    // Log logout attempt
    if (userId) {
      log.auth("User logout initiated", {
        userId,
        email: user.email,
        role: user.role,
        ip,
      });

      // Note: Audit logging needs to be implemented in UserService
      // try {
      //   await UserService.createAuditLog(
      //     userId,
      //     "USER_LOGOUT",
      //     "User logged out successfully",
      //     {
      //       ip,
      //       userAgent: request.headers.get("user-agent") || "unknown",
      //     },
      //   );
      // } catch (auditError) {
      //   // Non-critical error
      //   log.exception(auditError as Error, "AUTH", {
      //     operation: "logoutAuditLog",
      //     userId,
      //   });
      // }
    } else {
      log.security("Logout attempt without valid token", { ip });
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: "Logout successful",
    });

    // Clear authentication cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      maxAge: 0, // Expire immediately
      path: "/",
    };

    response.cookies.set("accessToken", "", cookieOptions);
    response.cookies.set("refreshToken", "", cookieOptions);

    // Additional security headers
    response.headers.set("Clear-Site-Data", '"cookies", "storage"');
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate",
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    log.auth("User logout completed successfully", {
      userId: userId || "unknown",
      ip,
    });

    return response;
  } catch (error) {
    log.exception(error as Error, "AUTH_LOGOUT", {
      path: "/api/auth/logout",
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });

    // Even if there's an error, we should still clear cookies
    const response = NextResponse.json(
      {
        success: false,
        error: "Logout error occurred, but session cleared",
      },
      { status: 500 },
    );

    // Clear cookies anyway
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      maxAge: 0,
      path: "/",
    };

    response.cookies.set("accessToken", "", cookieOptions);
    response.cookies.set("refreshToken", "", cookieOptions);

    return response;
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
