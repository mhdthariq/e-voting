import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth/jwt";
import { AuditService } from "@/lib/database/services/audit.service";

const prisma = new PrismaClient();

/**
 * GET /api/voter/elections
 * Get elections available to the authenticated voter
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);
    const decoded = auth.verifyToken(token).payload;

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 },
      );
    }

    // Get user and verify voter role
    const user = await prisma.user.findUnique({
      where: { id: parseInt(decoded.userId) },
    });

    if (!user || user.role !== "VOTER") {
      return NextResponse.json(
        { success: false, message: "Voter access required" },
        { status: 403 },
      );
    }

    // Get elections where this voter is registered
    const voterElections = await prisma.electionVoter.findMany({
      where: {
        email: user.email, // Match by email since voters are registered by email
      },
      include: {
        election: {
          include: {
            candidates: {
              orderBy: { id: "asc" },
            },
            organization: {
              select: {
                username: true,
                email: true,
              },
            },
            _count: {
              select: {
                votes: true,
              },
            },
          },
        },
      },
    });

    // Check if voter has already voted in each election
    const electionsWithVoteStatus = await Promise.all(
      voterElections.map(async (voterElection) => {
        const election = await prisma.election.findUnique({
          where: { id: voterElection.electionId },
          include: {
            candidates: {
              orderBy: { id: "asc" },
            },
            organization: {
              select: {
                username: true,
                email: true,
              },
            },
          },
        });

        if (!election) {
          return null;
        }

        const existingVote = await prisma.vote.findFirst({
          where: {
            electionId: voterElection.electionId,
            voterId: user.id,
          },
        });

        const now = new Date();

        // Determine if voter can vote
        const canVote =
          !existingVote &&
          election.status === "ACTIVE" &&
          now >= new Date(election.startDate) &&
          now <= new Date(election.endDate);

        // Calculate remaining time
        const remainingTime =
          election.status === "ACTIVE"
            ? Math.max(0, new Date(election.endDate).getTime() - now.getTime())
            : 0;

        return {
          id: election.id,
          title: election.title,
          description: election.description,
          status: election.status,
          startDate: election.startDate.toISOString(),
          endDate: election.endDate.toISOString(),
          organizationId: election.organizationId,
          organization: election.organization,
          candidates: election.candidates,
          hasVoted: !!existingVote,
          voteId: existingVote?.id,
          votedAt: existingVote?.votedAt?.toISOString(),
          canVote,
          remainingTime,
          voterRegistrationId: voterElection.id,
        };
      }),
    );

    // Filter out null elections and sort: active first, then by start date
    const validElections = electionsWithVoteStatus.filter(
      (election): election is NonNullable<typeof election> => election !== null,
    );
    const sortedElections = validElections.sort((a, b) => {
      if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
      if (b.status === "ACTIVE" && a.status !== "ACTIVE") return 1;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

    // Create audit log
    await AuditService.createAuditLog(
      user.id,
      "VIEW",
      "VOTER_ELECTIONS",
      undefined,
      `Viewed ${sortedElections.length} available elections`,
      request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown",
      request.headers.get("user-agent") || "unknown",
    );

    return NextResponse.json({
      success: true,
      data: sortedElections,
    });
  } catch (error) {
    console.error("Error fetching voter elections:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
