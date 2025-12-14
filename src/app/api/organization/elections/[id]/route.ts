import { NextRequest } from "next/server";
import prisma from "@/lib/database/client";
import { auth } from "@/lib/auth/jwt";
import { AuditService } from "@/lib/database/services/audit.service";
import {
  rateLimiter,
  RateLimitConfig,
  getUserIdentifier,
} from "@/lib/security/rate-limit";
import {
  createSecureResponse,
  addRateLimitHeaders,
} from "@/lib/security/headers";
import { isValidId } from "@/lib/security/validation";

/**
 * GET /api/organization/elections/[id]
 * Get detailed election information with statistics and results for organization
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // ---------- Rate Limiting ----------
    const clientId = getUserIdentifier(req);
    const rateLimit = rateLimiter.check(
      clientId,
      RateLimitConfig.read.maxRequests,
      RateLimitConfig.read.windowMs,
      RateLimitConfig.read.blockDurationMs,
    );

    if (!rateLimit.allowed) {
      const response = createSecureResponse(
        {
          success: false,
          message: "Too many requests. Please try again later.",
          retryAfter: rateLimit.retryAfter,
        },
        429,
        req.headers.get("origin"),
      );
      return addRateLimitHeaders(
        response,
        RateLimitConfig.read.maxRequests,
        0,
        rateLimit.resetTime,
      );
    }

    // ---------- Auth ----------
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return createSecureResponse(
        { success: false, message: "Authentication required" },
        401,
        req.headers.get("origin"),
      );
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      const verification = await auth.verifyToken(token);
      decoded = verification.payload;
    } catch {
      return createSecureResponse(
        { success: false, message: "Invalid token" },
        401,
        req.headers.get("origin"),
      );
    }

    if (!decoded || !decoded.userId) {
      return createSecureResponse(
        { success: false, message: "Invalid token payload" },
        401,
        req.headers.get("origin"),
      );
    }

    const userId =
      typeof decoded.userId === "string"
        ? parseInt(decoded.userId, 10)
        : decoded.userId;
    if (isNaN(userId)) {
      return createSecureResponse(
        { success: false, message: "Invalid user ID in token" },
        401,
        req.headers.get("origin"),
      );
    }

    // Apply user-specific rate limiting
    const userRateLimit = rateLimiter.check(
      getUserIdentifier(req, userId),
      RateLimitConfig.read.maxRequests * 2, // Higher limit for authenticated users
      RateLimitConfig.read.windowMs,
      RateLimitConfig.read.blockDurationMs,
    );

    if (!userRateLimit.allowed) {
      const response = createSecureResponse(
        {
          success: false,
          message: "Too many requests. Please try again later.",
          retryAfter: userRateLimit.retryAfter,
        },
        429,
        req.headers.get("origin"),
      );
      return addRateLimitHeaders(
        response,
        RateLimitConfig.read.maxRequests * 2,
        0,
        userRateLimit.resetTime,
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return createSecureResponse(
        { success: false, message: "User not found" },
        404,
        req.headers.get("origin"),
      );
    }
    if (user.role !== "ORGANIZATION") {
      return createSecureResponse(
        { success: false, message: "Organization access required" },
        403,
        req.headers.get("origin"),
      );
    }

    // ---------- Get Election ID ----------
    const { id } = await params;

    // Validate ID format
    if (!isValidId(id)) {
      return createSecureResponse(
        { success: false, message: "Invalid election ID format" },
        400,
        req.headers.get("origin"),
      );
    }

    const electionId = parseInt(id, 10);

    // ---------- Fetch Election Data ----------
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        organization: {
          select: { username: true, email: true },
        },
        candidates: {
          select: { id: true, name: true, description: true },
        },
        _count: {
          select: {
            voters: true,
            votes: true,
          },
        },
      },
    });

    if (!election) {
      return createSecureResponse(
        { success: false, message: "Election not found" },
        404,
        req.headers.get("origin"),
      );
    }

    // Verify ownership (CRITICAL SECURITY CHECK)
    if (election.organizationId !== user.id) {
      // Log unauthorized access attempt
      try {
        await AuditService.createAuditLog(
          user.id,
          "UNAUTHORIZED_ACCESS",
          "ELECTION",
          electionId,
          `Attempted to access election ${electionId} without permission`,
          req.headers.get("x-forwarded-for") ||
            req.headers.get("x-real-ip") ||
            "unknown",
          req.headers.get("user-agent") || "unknown",
        );
      } catch (e) {
        console.error("Audit log failed:", e);
      }

      return createSecureResponse(
        { success: false, message: "Access denied to this election" },
        403,
        req.headers.get("origin"),
      );
    }

    // ---------- Aggregate Vote Counts per Candidate from Blockchain ----------
    const blocks = await prisma.blockchainBlock.findMany({
      where: { electionId },
      select: { votesData: true },
    });

    const candidateVotes: Record<number, number> = {};
    election.candidates.forEach((c) => (candidateVotes[c.id] = 0));

    blocks.forEach((block) => {
      try {
        const transactions: { candidateId: number }[] = JSON.parse(
          block.votesData,
        );
        if (Array.isArray(transactions)) {
          transactions.forEach((tx) => {
            if (
              tx.candidateId &&
              candidateVotes[tx.candidateId] !== undefined
            ) {
              candidateVotes[tx.candidateId]++;
            }
          });
        }
      } catch (e) {
        console.error("Error parsing block votes:", e);
      }
    });

    // ---------- Format Candidates with Vote Counts ----------
    const candidatesWithVotes = election.candidates
      .map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        voteCount: candidateVotes[c.id] || 0,
      }))
      .sort((a, b) => b.voteCount - a.voteCount); // Sort by vote count (winner first)

    // ---------- Calculate Winner ----------
    const winner =
      candidatesWithVotes.length > 0 && candidatesWithVotes[0].voteCount > 0
        ? candidatesWithVotes[0]
        : null;

    // ---------- Prepare Response ----------
    const responseData = {
      id: election.id,
      title: election.title,
      description: election.description,
      status: election.status,
      startDate: election.startDate,
      endDate: election.endDate,
      organization: election.organization,
      stats: {
        invited: election._count.voters,
        voted: election._count.votes,
        participationRate:
          election._count.voters > 0
            ? Math.round(
                (election._count.votes / election._count.voters) * 100 * 100,
              ) / 100
            : 0,
      },
      results: candidatesWithVotes,
      winner: winner
        ? {
            id: winner.id,
            name: winner.name,
            voteCount: winner.voteCount,
          }
        : null,
    };

    // ---------- Audit ----------
    try {
      await AuditService.createAuditLog(
        user.id,
        "VIEW",
        "ELECTION_DETAILS",
        electionId,
        `Viewed election details: ${election.title}`,
        req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          "unknown",
        req.headers.get("user-agent") || "unknown",
      );
    } catch (e) {
      console.error("Audit log failed:", e);
    }

    // Create secure response with rate limit headers
    const response = createSecureResponse(
      { success: true, data: responseData },
      200,
      req.headers.get("origin"),
    );

    return addRateLimitHeaders(
      response,
      RateLimitConfig.read.maxRequests * 2,
      userRateLimit.remaining,
      userRateLimit.resetTime,
    );
  } catch (error) {
    console.error("Error fetching election details:", error);

    // Don't expose internal errors in production
    const errorMessage =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "An unexpected error occurred";

    return createSecureResponse(
      {
        success: false,
        message: "Internal server error",
        ...(process.env.NODE_ENV === "development" && { error: errorMessage }),
      },
      500,
      req.headers.get("origin"),
    );
  } finally {
    await prisma.$disconnect();
  }
}
