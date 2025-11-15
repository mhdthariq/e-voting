/**
 * Voter (User) Registration API Endpoints
 * Handles user registration with email verification
 * 
 * Per problem statement:
 * - Users register and verify email
 * - After email verification, account is activated immediately (no admin approval)
 * - Users can then login and join elections via organization invitations
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { password } from "@/lib/auth/password";
import prisma from "@/lib/database/client";
import { log } from "@/utils/logger";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";

// Validation schema for voter registration
const voterRegistrationSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  studentId: z.string().optional(),
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
 * POST /api/auth/register/voter - Register a new voter (user)
 * 
 * Flow:
 * 1. User submits registration form
 * 2. System sends verification email
 * 3. User clicks verification link
 * 4. Account activated immediately (no admin approval needed)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const clientInfo = getClientInfo(request);

    // Validate request body
    const validation = voterRegistrationSchema.safeParse(body);
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
        { status: 400 },
      );
    }

    const { fullName, email, username, password: userPassword, studentId } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { username: username },
          ...(studentId ? [{ studentId: studentId }] : []),
        ],
      },
    });

    if (existingUser) {
      log.security("Voter registration attempted with existing credentials", {
        email,
        username,
        studentId,
        ipAddress: clientInfo.ipAddress,
      });

      let message = "An account with this ";
      if (existingUser.email === email) message += "email";
      else if (existingUser.username === username) message += "username";
      else if (studentId && existingUser.studentId === studentId) message += "student ID";
      message += " already exists.";

      return NextResponse.json(
        {
          success: false,
          message,
        },
        { status: 409 },
      );
    }

    // Validate password strength
    const passwordValidation = password.validate(userPassword);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: `Password validation failed: ${passwordValidation.feedback.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await password.hash(userPassword);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Create user account (inactive until email verified)
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        username,
        passwordHash: hashedPassword,
        studentId: studentId || null,
        role: "VOTER",
        status: "INACTIVE", // Will be activated after email verification
        emailVerified: false,
        emailVerificationToken: verificationToken,
      },
    });

    // Send verification email via Supabase or provide manual link
    let emailSent = false;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
          type: 'signup',
          email: email,
          options: {
            data: {
              userId: user.id,
              username: username,
              fullName: fullName,
            },
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/verify-email`,
          }
        });

        if (!error && data) {
          emailSent = true;
          log.auth("Verification email sent via Supabase", {
            userId: user.id,
            email: user.email,
          });
        } else {
          log.error("Supabase email error:", error);
        }
      } catch (error) {
        log.error("Failed to send Supabase email:", error);
      }
    }

    log.auth("Voter registration submitted", {
      userId: user.id,
      email: user.email,
      username: user.username,
      emailSent,
      ipAddress: clientInfo.ipAddress,
    });

    // Return verification token in development (in production, only send via email)
    const response: {
      success: boolean;
      message: string;
      userId: number;
      verificationToken?: string;
      verificationUrl?: string;
      emailSent?: boolean;
    } = {
      success: true,
      message: emailSent 
        ? "Registration successful! Please check your email to verify your account."
        : "Registration successful! Check your email for verification link (or use manual link below in development).",
      userId: user.id,
      emailSent,
    };

    // In development or if Supabase not configured, include the manual verification token
    if (process.env.NODE_ENV === "development" || !emailSent) {
      response.verificationToken = verificationToken;
      response.verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/verify-email?token=${verificationToken}`;
    }

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    log.exception(error as Error, "AUTH", {
      operation: "voterRegistration",
    });

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/auth/register/voter - Verify email and activate voter account
 * 
 * This endpoint is called when user clicks the verification link in their email
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const clientInfo = getClientInfo(request);

    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Verification token is required",
        },
        { status: 400 },
      );
    }

    // Find user with this verification token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        role: "VOTER",
      },
    });

    if (!user) {
      log.security("Invalid voter verification token used", {
        token: token.substring(0, 8) + "...",
        ipAddress: clientInfo.ipAddress,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired verification token",
        },
        { status: 400 },
      );
    }

    // Check if already verified
    if (user.emailVerified && user.status === "ACTIVE") {
      return NextResponse.json(
        {
          success: true,
          message: "Email already verified. You can now login.",
        },
      );
    }

    // Activate account immediately (no admin approval for voters)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        status: "ACTIVE",
        emailVerificationToken: null, // Remove token after use
      },
    });

    log.auth("Voter email verified and account activated", {
      userId: user.id,
      email: user.email,
      ipAddress: clientInfo.ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: "Email verified successfully! Your account is now active. You can login now.",
    });

  } catch (error) {
    log.exception(error as Error, "AUTH", {
      operation: "voterEmailVerification",
    });

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}
