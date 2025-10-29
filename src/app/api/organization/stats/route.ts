import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth/jwt";
import { AuditService } from "@/lib/database/services/audit.service";

const prisma = new PrismaClient();

/**
 * GET /api/organization/stats
 * Get statistics for the authenticated organization
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

    // Get user and verify organization role
    const user = await prisma.user.findUnique({
      where: { id: parseInt(decoded.userId) },
    });

    if (!user || user.role !== "ORGANIZATION") {
      return NextResponse.json(
        { success: false, message: "Organization access required" },
        { status: 403 },
      );
    }

    // Gather organization statistics
    const [
      totalElections,
      activeElections,
      draftElections,
      endedElections,
      totalVotes,
      totalVoters,
      electionStatistics,
    ] = await Promise.all([
      // Total elections created by this organization
      prisma.election.count({
        where: { organizationId: user.id },
      }),

      // Active elections
      prisma.election.count({
        where: {
          organizationId: user.id,
          status: "ACTIVE",
        },
      }),

      // Draft elections
      prisma.election.count({
        where: {
          organizationId: user.id,
          status: "DRAFT",
        },
      }),

      // Ended elections
      prisma.election.count({
        where: {
          organizationId: user.id,
          status: "ENDED",
        },
      }),

      // Total votes cast in organization's elections
      prisma.vote.count({
        where: {
          election: {
            organizationId: user.id,
          },
        },
      }),

      // Total voters registered for organization's elections
      prisma.electionVoter.count({
        where: {
          election: {
            organizationId: user.id,
          },
        },
      }),

      // Election statistics for detailed metrics
      prisma.electionStatistics.findMany({
        where: {
          election: {
            organizationId: user.id,
          },
        },
        include: {
          election: {
            select: {
              title: true,
              status: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      }),
    ]);

    // Calculate participation rate
    const averageParticipation =
      totalVoters > 0 ? (totalVotes / totalVoters) * 100 : 0;

    // Get recent election activity
    const recentElections = await prisma.election.findMany({
      where: { organizationId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        candidates: true,
        _count: {
          select: {
            votes: true,
          },
        },
      },
    });

    // Get voting trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentVotes = await prisma.vote.count({
      where: {
        election: {
          organizationId: user.id,
        },
        votedAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Get most active election
    const mostActiveElection = await prisma.election.findFirst({
      where: { organizationId: user.id },
      orderBy: {
        votes: {
          _count: "desc",
        },
      },
      include: {
        _count: {
          select: { votes: true },
        },
      },
    });

    // Prepare response data
    const statsData = {
      // Basic counts
      totalElections,
      activeElections,
      draftElections,
      endedElections,
      totalVotes,
      totalVoters,

      // Calculated metrics
      averageParticipation: Math.round(averageParticipation * 100) / 100,
      recentVotes,

      // Detailed statistics
      electionBreakdown: {
        draft: draftElections,
        active: activeElections,
        ended: endedElections,
      },

      // Recent activity
      recentElections: await Promise.all(
        recentElections.map(async (election) => {
          const voterCount = await prisma.electionVoter.count({
            where: { electionId: election.id },
          });

          return {
            id: election.id,
            title: election.title,
            status: election.status,
            startDate: election.startDate,
            endDate: election.endDate,
            candidateCount: election.candidates.length,
            voterCount,
            voteCount: election._count.votes,
            participationRate:
              voterCount > 0
                ? Math.round((election._count.votes / voterCount) * 100 * 100) /
                  100
                : 0,
          };
        }),
      ),

      // Performance metrics
      performance: {
        mostActiveElection: mostActiveElection
          ? {
              id: mostActiveElection.id,
              title: mostActiveElection.title,
              voteCount: mostActiveElection._count.votes,
            }
          : null,
        averageVotesPerElection:
          totalElections > 0
            ? Math.round((totalVotes / totalElections) * 100) / 100
            : 0,
        totalEngagement: totalVoters + totalVotes, // Simple engagement metric
      },

      // Election statistics with details
      detailedStatistics: electionStatistics.map((stat) => ({
        electionId: stat.electionId,
        electionTitle: stat.election.title,
        electionStatus: stat.election.status,
        totalRegisteredVoters: stat.totalRegisteredVoters,
        totalVotesCast: stat.totalVotesCast,
        participationRate: stat.participationRate,
        startDate: stat.election.startDate,
        endDate: stat.election.endDate,
      })),

      // Timestamps
      lastUpdated: new Date().toISOString(),
    };

    // Create audit log
    await AuditService.createAuditLog(
      user.id,
      "VIEW",
      "ORGANIZATION_STATS",
      undefined,
      "Viewed organization statistics dashboard",
      request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown",
      request.headers.get("user-agent") || "unknown",
    );

    return NextResponse.json({
      success: true,
      data: statsData,
    });
  } catch (error) {
    console.error("Error fetching organization statistics:", error);
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
