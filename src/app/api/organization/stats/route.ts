import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth/jwt";
import { AuditService } from "@/lib/database/services/audit.service";

const prisma = new PrismaClient();

interface ElectionStatistic {
  electionId: number;
  totalRegisteredVoters: number;
  totalVotesCast: number;
  participationRate: number;
  election: {
    title: string;
    status: string;
    startDate: Date;
    endDate: Date;
  };
}

interface RecentElection {
  id: number;
  title: string;
  status: string;
  startDate: Date;
  endDate: Date;
  candidateCount: number;
  voterCount: number;
  voteCount: number;
  participationRate: number;
}

interface MostActiveElection {
  id: number;
  title: string;
  voteCount: number;
}

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
    let decoded;

    try {
      decoded = auth.verifyToken(token).payload;
    } catch (error) {
      console.error("Token verification failed:", error);
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 },
      );
    }

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, message: "Invalid token payload" },
        { status: 401 },
      );
    }

    // Convert userId to number
    const userId =
      typeof decoded.userId === "string"
        ? parseInt(decoded.userId, 10)
        : decoded.userId;

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, message: "Invalid user ID in token" },
        { status: 401 },
      );
    }

    // Get user and verify organization role
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    if (user.role !== "ORGANIZATION") {
      return NextResponse.json(
        { success: false, message: "Organization access required" },
        { status: 403 },
      );
    }

    // Gather organization statistics with error handling for each query
    let totalElections = 0;
    let activeElections = 0;
    let draftElections = 0;
    let endedElections = 0;
    let totalVotes = 0;
    let totalVoters = 0;
    let electionStatistics: ElectionStatistic[] = [];

    try {
      totalElections = await prisma.election.count({
        where: { organizationId: user.id },
      });
    } catch (error) {
      console.error("Error counting total elections:", error);
    }

    try {
      activeElections = await prisma.election.count({
        where: {
          organizationId: user.id,
          status: "ACTIVE",
        },
      });
    } catch (error) {
      console.error("Error counting active elections:", error);
    }

    try {
      draftElections = await prisma.election.count({
        where: {
          organizationId: user.id,
          status: "DRAFT",
        },
      });
    } catch (error) {
      console.error("Error counting draft elections:", error);
    }

    try {
      endedElections = await prisma.election.count({
        where: {
          organizationId: user.id,
          status: "ENDED",
        },
      });
    } catch (error) {
      console.error("Error counting ended elections:", error);
    }

    try {
      totalVotes = await prisma.vote.count({
        where: {
          election: {
            organizationId: user.id,
          },
        },
      });
    } catch (error) {
      console.error("Error counting total votes:", error);
    }

    try {
      totalVoters = await prisma.electionVoter.count({
        where: {
          election: {
            organizationId: user.id,
          },
        },
      });
    } catch (error) {
      console.error("Error counting total voters:", error);
    }

    try {
      electionStatistics = await prisma.electionStatistics.findMany({
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
      });
    } catch (error) {
      console.error("Error fetching election statistics:", error);
    }

    // Calculate participation rate
    const averageParticipation =
      totalVoters > 0 ? (totalVotes / totalVoters) * 100 : 0;

    // Get recent election activity
    let recentElections: RecentElection[] = [];
    try {
      const elections = await prisma.election.findMany({
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

      recentElections = await Promise.all(
        elections.map(async (election) => {
          let voterCount = 0;
          try {
            voterCount = await prisma.electionVoter.count({
              where: { electionId: election.id },
            });
          } catch (error) {
            console.error(
              `Error counting voters for election ${election.id}:`,
              error,
            );
          }

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
      );
    } catch (error) {
      console.error("Error fetching recent elections:", error);
    }

    // Get voting trends (last 30 days)
    let recentVotes = 0;
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      recentVotes = await prisma.vote.count({
        where: {
          election: {
            organizationId: user.id,
          },
          votedAt: {
            gte: thirtyDaysAgo,
          },
        },
      });
    } catch (error) {
      console.error("Error counting recent votes:", error);
    }

    // Get most active election
    let mostActiveElection: MostActiveElection | null = null;
    try {
      // Fetch all elections with vote counts and sort in memory
      const electionsWithVotes = await prisma.election.findMany({
        where: { organizationId: user.id },
        include: {
          _count: {
            select: { votes: true },
          },
        },
      });

      // Sort by vote count and get the first one
      if (electionsWithVotes.length > 0) {
        const sorted = electionsWithVotes.sort(
          (a, b) => b._count.votes - a._count.votes,
        );
        const topElection = sorted[0];

        if (topElection && topElection._count.votes > 0) {
          mostActiveElection = {
            id: topElection.id,
            title: topElection.title,
            voteCount: topElection._count.votes,
          };
        }
      }
    } catch (error) {
      console.error("Error fetching most active election:", error);
    }

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
      recentElections,

      // Performance metrics
      performance: {
        mostActiveElection,
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

    // Create audit log (don't fail if this errors)
    try {
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
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
      // Continue anyway - audit log failure shouldn't break the request
    }

    return NextResponse.json({
      success: true,
      data: statsData,
    });
  } catch (error) {
    console.error("Error fetching organization statistics:", error);

    // Log detailed error information
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

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
