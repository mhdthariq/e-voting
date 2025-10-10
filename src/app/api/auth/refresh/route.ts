/**
 * Token Refresh API Route for BlockVote Authentication
 * POST /api/auth/refresh - Refresh access token using refresh token
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/jwt";
import { UserService } from "@/lib/database/services/user.service";
import { AuditService } from "@/lib/database/services/audit.service";
import { log } from "@/utils/logger";

// UserService methods are static, no need to instantiate

export async function POST(request: NextRequest) {
  try {
    // Extract refresh token from request
    let refreshToken: string | null = null;

    // Check Authorization header first
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      refreshToken = authHeader.substring(7);
    }

    // Check cookies if no header
    if (!refreshToken) {
      refreshToken = request.cookies.get("refreshToken")?.value || null;
    }

    // Check request body as fallback
    if (!refreshToken) {
      try {
        const body = await request.json();
        refreshToken = body.refreshToken;
      } catch {
        // Body parsing failed, continue without it
      }
    }

    if (!refreshToken) {
      log.security("Token refresh attempt without refresh token", {
        ip: request.headers.get("x-forwarded-for") || "unknown",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Refresh token required",
        },
        { status: 400 },
      );
    }

    // Verify refresh token
    const refreshResult = auth.verifyRefreshToken(refreshToken);

    if (!refreshResult.isValid || !refreshResult.payload) {
      log.security("Invalid refresh token used", {
        error: refreshResult.error,
        ip: request.headers.get("x-forwarded-for") || "unknown",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Invalid refresh token",
        },
        { status: 401 },
      );
    }

    const { userId } = refreshResult.payload;

    // Get user data from database
    const user = await UserService.findById(parseInt(userId));

    if (!user) {
      log.security("Refresh token for non-existent user", {
        userId,
        ip: request.headers.get("x-forwarded-for") || "unknown",
      });

      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 },
      );
    }

    // Check if user is still active
    if (user.status !== "active") {
      log.security("Refresh token for inactive user", {
        userId,
        email: user.email,
        ip: request.headers.get("x-forwarded-for") || "unknown",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Account disabled",
        },
        { status: 403 },
      );
    }

    // Generate new access token directly
    const accessToken = auth.login({
      userId: user.id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
      organizationName: user.organizationName,
    }).accessToken;

    const tokenResponse = {
      accessToken,
      expiresIn: 604800, // 7 days in seconds
      tokenType: "Bearer" as const,
    };

    // Log successful token refresh
    log.auth("Access token refreshed successfully", {
      userId,
      email: user.email,
      role: user.role,
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });

    await AuditService.logTokenRefresh(
      parseInt(userId),
      request.headers.get("x-forwarded-for") || "unknown",
      request.headers.get("user-agent") || "unknown",
    );

    // Prepare user info (excluding sensitive data)
    const userInfo = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const response = NextResponse.json({
      success: true,
      message: "Token refreshed successfully",
      user: userInfo,
      tokens: {
        accessToken: tokenResponse.accessToken,
        refreshToken: refreshToken, // Return the same refresh token
        expiresIn: tokenResponse.expiresIn,
        tokenType: tokenResponse.tokenType,
      },
    });

    // Update access token cookie (keep existing refresh token)
    const isProduction = process.env.NODE_ENV === "production";

    response.cookies.set("accessToken", tokenResponse.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: tokenResponse.expiresIn,
      path: "/",
    });

    return response;
  } catch (error) {
    log.exception(error as Error, "AUTH_REFRESH", {
      path: "/api/auth/refresh",
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });

    return NextResponse.json(
      {
        success: false,
        error: "Token refresh failed",
      },
      { status: 500 },
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
