/**
 * Password Reset API Endpoints
 * Handles password reset requests and verification
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { passwordReset } from "@/lib/auth/password-reset";
import { log } from "@/utils/logger";

// Validation schemas
const passwordResetRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const passwordResetVerifySchema = z.object({
  token: z.string().min(32, "Invalid reset token"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

// Helper to get client info
function getClientInfo(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return {
    ipAddress: forwarded?.split(",")[0] || realIp || "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  };
}

/**
 * POST /api/auth/password-reset - Request password reset
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const clientInfo = getClientInfo(request);

    // Validate request body
    const validation = passwordResetRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid input",
          errors: validation.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Request password reset
    const result = await passwordReset.request({
      email,
      ...clientInfo,
    });

    log.auth("Password reset requested", {
      email,
      success: result.success,
      ...clientInfo,
    });

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: result.message,
    });

  } catch (error) {
    log.exception(error as Error, "AUTH", {
      operation: "passwordResetRequest",
    });

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/password-reset - Verify token and reset password
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const clientInfo = getClientInfo(request);

    // Validate request body
    const validation = passwordResetVerifySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid input",
          errors: validation.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const { token, newPassword } = validation.data;

    // Reset password
    const result = await passwordReset.reset({
      token,
      newPassword,
      ...clientInfo,
    });

    const statusCode = result.success ? 200 : 400;

    log.auth("Password reset attempt", {
      token: token.substring(0, 8) + "...",
      success: result.success,
      ...clientInfo,
    });

    return NextResponse.json({
      success: result.success,
      message: result.message,
    }, { status: statusCode });

  } catch (error) {
    log.exception(error as Error, "AUTH", {
      operation: "passwordResetVerify",
    });

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/password-reset?token=... - Verify reset token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Reset token is required",
        },
        { status: 400 }
      );
    }

    // Verify token
    const verification = await passwordReset.verify(token);

    return NextResponse.json({
      success: verification.valid,
      expired: verification.expired,
      used: verification.used,
      email: verification.email,
    });

  } catch (error) {
    log.exception(error as Error, "AUTH", {
      operation: "passwordResetTokenVerify",
    });

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
