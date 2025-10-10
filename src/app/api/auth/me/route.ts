/**
 * Current User Info API Route for BlockVote Authentication
 * GET /api/auth/me - Get current authenticated user information
 */

import { NextRequest, NextResponse } from "next/server";
import { protect } from "@/lib/auth/middleware";
import { UserService } from "@/lib/database/services/user.service";
import { log } from "@/utils/logger";

// UserService methods are static, no need to instantiate

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await protect.authenticate(request, {
      requireAuth: true,
    });

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || "Authentication required",
        },
        { status: authResult.statusCode || 401 },
      );
    }

    const { userId } = authResult.user;

    // Get fresh user data from database
    const user = await UserService.findById(parseInt(userId));

    if (!user) {
      log.security("Authenticated user not found in database", {
        userId,
        tokenUser: authResult.user,
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
      log.security("Inactive user accessed /me endpoint", {
        userId,
        email: user.email,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Account disabled",
        },
        { status: 403 },
      );
    }

    // Prepare user info (excluding sensitive data)
    const userInfo = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // Add role-specific information
      permissions: getRolePermissions(user.role),
    };

    // Log successful access
    log.auth("User info retrieved", {
      userId,
      role: user.role,
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });

    return NextResponse.json({
      success: true,
      user: userInfo,
    });
  } catch (error) {
    log.exception(error as Error, "AUTH_ME", {
      path: "/api/auth/me",
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

/**
 * Get role-based permissions
 */
function getRolePermissions(role: string): string[] {
  switch (role) {
    case "admin":
      return [
        "manage_users",
        "manage_organizations",
        "manage_elections",
        "view_audit_logs",
        "system_settings",
        "manage_voters",
        "view_analytics",
        "blockchain_validation",
      ];

    case "organization":
      return [
        "create_elections",
        "manage_own_elections",
        "manage_candidates",
        "manage_voters",
        "view_election_results",
        "export_results",
        "view_own_analytics",
      ];

    case "voter":
      return ["view_elections", "cast_votes", "view_own_votes", "verify_vote"];

    default:
      return [];
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
