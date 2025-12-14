import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database/client";
import { auth } from "@/lib/auth/jwt";
import { AuditService } from "@/lib/database/services/audit.service";

/**
 * GET /api/organization/elections/[id]
 * Get detailed election information with statistics and results for organization
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ---------- Auth ----------
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      const verification = await auth.verifyToken(token);
      decoded = verification.payload;
    } catch {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
    }

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ success: false, message: "Invalid token payload" }, { status: 401 });
    }

    const userId = typeof decoded.userId === "string" ? parseInt(decoded.userId, 10) : decoded.userId;
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, message: "Invalid user ID in token" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }
    if (user.role !== "ORGANIZATION") {
      return NextResponse.json({ success: false, message: "Organization access required" }, { status: 403 });
    }

    // ---------- Get Election ID ----------
    const { id } = await params;
    const electionId = parseInt(id, 10);

    if (isNaN(electionId)) {
      return NextResponse.json({ success: false, message: "Invalid election ID" }, { status: 400 });
    }

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
      return NextResponse.json({ success: false, message: "Election not found" }, { status: 404 });
    }

    // Verify ownership
    if (election.organizationId !== user.id) {
      return NextResponse.json({ success: false, message: "Access denied to this election" }, { status: 403 });
    }

    // ---------- Aggregate Vote Counts per Candidate from Blockchain ----------
    const blocks = await prisma.blockchainBlock.findMany({
      where: { electionId },
      select: { votesData: true },
    });

    const candidateVotes: Record<number, number> = {};
    election.candidates.forEach(c => candidateVotes[c.id] = 0);

    blocks.forEach(block => {
      try {
        const transactions: { candidateId: number }[] = JSON.parse(block.votesData);
        if (Array.isArray(transactions)) {
          transactions.forEach((tx) => {
            if (tx.candidateId && candidateVotes[tx.candidateId] !== undefined) {
              candidateVotes[tx.candidateId]++;
            }
          });
        }
      } catch (e) {
        console.error("Error parsing block votes:", e);
      }
    });

    // ---------- Format Candidates with Vote Counts ----------
    const candidatesWithVotes = election.candidates.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      voteCount: candidateVotes[c.id] || 0,
    })).sort((a, b) => b.voteCount - a.voteCount); // Sort by vote count (winner first)

    // ---------- Calculate Winner ----------
    const winner = candidatesWithVotes.length > 0 && candidatesWithVotes[0].voteCount > 0
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
        participationRate: election._count.voters > 0
          ? Math.round((election._count.votes / election._count.voters) * 100 * 100) / 100
          : 0
      },
      results: candidatesWithVotes,
      winner: winner ? {
        id: winner.id,
        name: winner.name,
        voteCount: winner.voteCount,
      } : null,
    };

    // ---------- Audit ----------
    try {
      await AuditService.createAuditLog(
        user.id,
        "VIEW",
        "ELECTION_DETAILS",
        electionId,
        `Viewed election details: ${election.title}`,
        req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
        req.headers.get("user-agent") || "unknown"
      );
    } catch (e) {
      console.error("Audit log failed:", e);
    }

    return NextResponse.json({ success: true, data: responseData });

  } catch (error) {
    console.error("Error fetching election details:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
