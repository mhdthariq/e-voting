/**
 * Voter Dashboard API Route for BlockVote
 * GET /api/voter/dashboard - Get voter's dashboard data including elections, invitations, and history
 */

import { NextRequest, NextResponse } from "next/server";
import { UserElectionService } from "@/lib/database/services/user-election.service";
import { UserService } from "@/lib/database/services/user.service";
import { auth } from "@/lib/auth/jwt";
import { log } from "@/utils/logger";

/**
 * Verify voter authentication
 */
async function verifyVoterAuth(request: NextRequest) {
  // Get token from header or cookie
  let token = null;
  const authHeader = request.headers.get("authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .reduce(
          (acc, cookie) => {
            const [key, value] = cookie.split("=");
            if (key && value) {
              acc[key] = decodeURIComponent(value);
            }
            return acc;
          },
          {} as Record<string, string>,
        );
      token = cookies.accessToken;
    }
  }

  if (!token) {
    return { error: "Authentication required", status: 401 };
  }

  const tokenResult = auth.verifyToken(token);
  if (!tokenResult.isValid || !tokenResult.payload?.userId) {
    return {
      error: tokenResult.expired ? "Token expired" : "Invalid token",
      status: 401,
    };
  }

  // Get user and verify voter role
  const user = await UserService.findById(parseInt(tokenResult.payload.userId));
  if (!user) {
    return { error: "User not found", status: 404 };
  }

  if (user.role !== "voter") {
    return { error: "Voter access required", status: 403 };
  }

  return { user, userId: user.id };
}

/**
 * GET /api/voter/dashboard
 * Get comprehensive voter dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    // Verify voter authentication
    const authResult = await verifyVoterAuth(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      );
    }

    const { userId } = authResult;

    // Get user's election data
    const userElections = await UserElectionService.getUserElections(userId);

    // Get pending invitations
    const pendingInvitations = await UserElectionService.getUserPendingInvitations(userId);

    // Get voting history
    const votingHistory = await UserElectionService.getUserVotingHistory(userId);

    // Calculate statistics
    const totalInvitations = userElections.participations.length;
    const totalVoted = votingHistory.length;
    const participationRate = totalInvitations > 0 ? (totalVoted / totalInvitations) * 100 : 0;
    const pendingInvitationsCount = pendingInvitations.length;

    // Create audit log
    log.info("Voter accessed dashboard", "VOTER_DASHBOARD", {
      userId,
      totalInvitations,
      totalVoted,
      pendingInvitations: pendingInvitationsCount,
    });

    return NextResponse.json({
      success: true,
      data: {
        participations: userElections.participations,
        activeElections: userElections.activeElections,
        votingHistory,
        pendingInvitations,
        statistics: {
          totalInvitations,
          totalVoted,
          participationRate,
          pendingInvitations: pendingInvitationsCount,
        },
      },
    });

  } catch (error) {
    log.exception(error as Error, "VOTER_DASHBOARD", {
      path: "/api/voter/dashboard",
    });

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
