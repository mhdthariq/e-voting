/**
 * Organization Registration API Endpoints
 * Handles organization registration requests and verification
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { registration } from "@/lib/auth/registration";
import { log } from "@/utils/logger";

// Validation schemas
const organizationRegistrationSchema = z.object({
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  contactEmail: z.string().email("Invalid contact email address"),
  contactName: z.string().min(2, "Contact name must be at least 2 characters"),
  phone: z.string().optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  description: z.string().min(10, "Description must be at least 10 characters"),
  address: z.object({
    street: z.string().min(5, "Street address must be at least 5 characters"),
    city: z.string().min(2, "City must be at least 2 characters"),
    state: z.string().min(2, "State must be at least 2 characters"),
    zipCode: z.string().min(5, "ZIP code must be at least 5 characters"),
    country: z.string().min(2, "Country must be at least 2 characters"),
  }),
  adminUser: z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Invalid admin email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
  }),
});

const registrationVerificationSchema = z.object({
  token: z.string().min(32, "Invalid verification token"),
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
 * POST /api/auth/register - Submit organization registration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const clientInfo = getClientInfo(request);

    // Validate request body
    const validation = organizationRegistrationSchema.safeParse(body);
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

    const registrationData = validation.data;

    // Submit registration
    const result = await registration.register({
      ...registrationData,
      ...clientInfo,
    });

    const statusCode = result.success ? 201 : 400;

    log.auth("Organization registration submitted", {
      organizationName: registrationData.organizationName,
      contactEmail: registrationData.contactEmail,
      success: result.success,
      ...clientInfo,
    });

    return NextResponse.json({
      success: result.success,
      message: result.message,
      registrationId: result.registrationId,
      expiresAt: result.expiresAt,
    }, { status: statusCode });

  } catch (error) {
    log.exception(error as Error, "AUTH", {
      operation: "organizationRegistration",
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
 * PUT /api/auth/register - Verify registration email
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const clientInfo = getClientInfo(request);

    // Validate request body
    const validation = registrationVerificationSchema.safeParse(body);
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

    const { token } = validation.data;

    // Verify registration
    const result = await registration.verify({
      token,
      ...clientInfo,
    });

    const statusCode = result.success ? 200 : 400;

    log.auth("Registration verification attempt", {
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
      operation: "registrationVerification",
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
 * GET /api/auth/register?token=... - Check registration status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "pending") {
      // Get pending registrations (admin only)
      // This should be protected by admin middleware
      const pendingRegistrations = await registration.getPending();

      return NextResponse.json({
        success: true,
        registrations: pendingRegistrations,
      });
    }

    // Default: get registration status
    return NextResponse.json({
      success: true,
      message: "Registration endpoint is active",
    });

  } catch (error) {
    log.exception(error as Error, "AUTH", {
      operation: "registrationStatus",
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
