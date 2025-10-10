/**
 * Login API Route for BlockVote Authentication
 * POST /api/auth/login - Authenticate user and return JWT tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/jwt";
import { password } from "@/lib/auth/password";
import { UserService } from "../../../../lib/database/services/user.service";
import { AuditService } from "../../../../lib/database/services/audit.service";
import { schemas } from "@/utils/validation";
import { log } from "@/utils/logger";

// UserService methods are static, no need to instantiate

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();

    const validation = schemas.user.login.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues
        .map((issue) => issue.message)
        .join(", ");

      log.security("Login validation failed", {
        errors,
        ip: request.headers.get("x-forwarded-for") || "unknown",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: errors,
        },
        { status: 400 },
      );
    }

    const { identifier, password: userPassword } = validation.data;

    // Find user by email or username
    const user = await UserService.findByUsernameOrEmail(identifier);

    if (!user) {
      log.security("Login attempt with non-existent user", {
        identifier,
        ip: request.headers.get("x-forwarded-for") || "unknown",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Invalid credentials",
        },
        { status: 401 },
      );
    }

    // Check if user account is active
    if (user.status !== "active") {
      log.security("Login attempt with inactive account", {
        userId: user.id,
        email: user.email,
        ip: request.headers.get("x-forwarded-for") || "unknown",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Account is disabled",
        },
        { status: 403 },
      );
    }

    // Verify password
    const isPasswordValid = await password.verify(
      userPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      log.security("Login attempt with invalid password", {
        userId: user.id,
        email: user.email,
        ip: request.headers.get("x-forwarded-for") || "unknown",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Invalid credentials",
        },
        { status: 401 },
      );
    }

    // Check if password hash needs updating (if salt rounds changed)
    if (password.needsRehash(user.passwordHash)) {
      try {
        const newHash = await password.hash(userPassword);
        await UserService.updatePassword(user.id, newHash);

        log.auth("Password hash updated during login", {
          userId: user.id,
        });
      } catch (error) {
        // Non-critical error, continue with login
        log.exception(error as Error, "AUTH", {
          operation: "passwordRehash",
          userId: user.id,
        });
      }
    }

    // Generate JWT tokens
    const tokenResponse = auth.login({
      userId: user.id.toString(),
      email: user.email,
      username: user.username,
      role: user.role as "admin" | "organization" | "voter",
      organizationName: undefined, // Not available in current schema
    });

    // Update last login time and create audit log
    await UserService.updateLastLogin(user.id);

    // Log successful login
    log.auth("User logged in successfully", {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });

    // Create audit log entry
    await AuditService.logUserLogin(
      user.id,
      request.headers.get("x-forwarded-for") || "unknown",
      request.headers.get("user-agent") || "unknown",
    );

    // Prepare response with user info (excluding sensitive data)
    const userInfo = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      lastLoginAt: new Date(),
      createdAt: user.createdAt,
    };

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: userInfo,
      tokens: {
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken,
        expiresIn: tokenResponse.expiresIn,
        tokenType: tokenResponse.tokenType,
      },
    });

    // Set HTTP-only cookies for web clients
    const isProduction = process.env.NODE_ENV === "production";

    response.cookies.set("accessToken", tokenResponse.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: tokenResponse.expiresIn,
      path: "/",
    });

    response.cookies.set("refreshToken", tokenResponse.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    log.exception(error as Error, "AUTH_LOGIN", {
      path: "/api/auth/login",
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
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
