import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database/client";
import { auth } from "@/lib/auth/jwt";

// GET /api/admin/elections/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Auth Check
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const decoded = await auth.verifyToken(token);
    if (!decoded.isValid || !decoded.payload || decoded.payload.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    // Await params before using them (Next.js 15 requirement)
    const { id } = await params;
    const electionId = parseInt(id);

    if (isNaN(electionId)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    // 2. Fetch Election Data with Relations
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
            voters: true, // Invited voters
            votes: true,  // Main vote table
          },
        },
      },
    });

    if (!election) {
      return NextResponse.json({ success: false, message: "Election not found" }, { status: 404 });
    }

    // 3. Aggregate Vote Counts per Candidate
    // We need to group votes by candidateId. 
    // However, the Vote model connects to User (voter) and Election. 
    // The Vote model itself does NOT store candidateId directly in the schema provided earlier?
    // Let me re-check the schema schema.prisma provided in context.
    // Wait, the Vote model in schema.prisma:
    // model Vote { ... transactionHash, blockHash, electionId, voterId ... } 
    // It DOES NOT have candidateId! This is a typical blockchain voting pattern where the vote content is inside the block.
    // BUT, for querying usually there is a way.
    // Let's check the schema again.
    
    // Schema check:
    // model BlockchainBlock { ... votesData String ... } 
    // The votes are inside JSON in blocks?
    // OR is there a relational way?
    // Wait, `Vote` model usually tracks *who* voted to prevent double voting.
    // The *actual vote choice* might be encrypted or stored in the block.
    // BUT the user wants to see "Vote each candidate have". 
    // If the data is only in `votesData` (JSON) in blocks, I have to aggregate it from blocks.
    // OR, maybe I missed a field in `Vote` model?
    
    // Let's check `prisma/schema.prisma` content from previous turn.
    // model Vote { id, electionId, voterId, blockHash, transactionHash, votedAt } - NO candidateId.
    
    // This means the vote counts MUST be derived from `BlockchainBlock` -> `votesData`.
    // Since this is an admin dashboard, we can trust the blockchain blocks (or a separate counter if it existed).
    // The `ElectionStatistics` model might have it?
    // model ElectionStatistics { totalVotesCast, ... } - No candidate breakdown.
    
    // So, I must iterate over all `BlockchainBlock` for this election, parse `votesData`, and count.
    
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
        console.error("Error parsing block votes", e);
      }
    });

    // Format for frontend
    const candidatesWithVotes = election.candidates.map(c => ({
      ...c,
      voteCount: candidateVotes[c.id] || 0,
    })).sort((a, b) => b.voteCount - a.voteCount); // Sort by winner first

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
        voted: election._count.votes, // Or totalValidVotesFromChain? Usually similar.
        participationRate: election._count.voters > 0 
          ? (election._count.votes / election._count.voters) * 100 
          : 0
      },
      results: candidatesWithVotes
    };

    return NextResponse.json({ success: true, data: responseData });

  } catch (error) {
    console.error("Election Detail API Error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
