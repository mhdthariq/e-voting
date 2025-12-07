import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database/client";
import { AuditService } from "@/lib/database/services/audit.service";
import { BlockchainManager } from "@/lib/blockchain/blockchain";
import { BlockchainSecurity } from "@/lib/blockchain/crypto-utils";
import { log } from "@/utils/logger";
import { z } from "zod";
import { withVoterAuth } from "@/lib/auth/guard";
import { AuthenticatedRequest } from "@/lib/auth/middleware";
import { UserService } from "@/lib/database/services/user.service";
import { voteRateLimiter } from "@/lib/security/rate-limit";

// Validation schema for vote request
const voteSchema = z.object({
  voteId: z.string().uuid("Invalid vote ID format"),
  electionId: z.number().int().positive("Election ID must be a positive integer"),
  candidateId: z.number().int().positive("Candidate ID must be a positive integer"),
  timestamp: z.string().datetime("Invalid timestamp format"),
  signature: z.string().min(1, "Signature is required"),
});

/**
 * POST /api/voter/vote
 * Cast a vote in an election
 */
export const POST = withVoterAuth(async (req) => {
  const request = req as AuthenticatedRequest;
  
  // Check Rate Limit (User ID based if authenticated, or IP fallback)
  const identifier = request.user ? `user:${request.user.userId}` : (request.headers.get("x-forwarded-for") || "unknown");
  const rateLimit = voteRateLimiter.check(identifier, 1);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { success: false, message: "Vote rate limit exceeded. Please wait." },
      { status: 429 }
    );
  }

  try {
    // User is guaranteed to exist and have voter role by the guard
    // But we need the full user object for publicKey
    const userId = parseInt(request.user!.userId);
    const user = await UserService.findById(userId);

    if (!user) {
       return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }
    
    if (!user.publicKey) {
      return NextResponse.json(
        { success: false, message: "No public key found. Please generate keys in settings." },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = voteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request data",
          errors: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { voteId, electionId, candidateId, timestamp, signature } = validation.data;

    // Check if election exists
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        candidates: true,
      },
    });

    if (!election) {
      return NextResponse.json(
        { success: false, message: "Election not found" },
        { status: 404 }
      );
    }

    // Check if election is active
    const now = new Date();
    if (election.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, message: "Election is not active" },
        { status: 400 }
      );
    }

    if (now < election.startDate || now > election.endDate) {
      return NextResponse.json(
        { success: false, message: "Voting period has ended or not started" },
        { status: 400 }
      );
    }

    // Check if candidate exists in this election
    const candidate = election.candidates.find((c) => c.id === candidateId);
    if (!candidate) {
      return NextResponse.json(
        { success: false, message: "Candidate not found in this election" },
        { status: 404 }
      );
    }

    // Check if voter is registered for this election
    const voterRegistration = await prisma.electionVoter.findFirst({
      where: {
        electionId,
        email: user.email,
      },
    });

    if (!voterRegistration) {
      return NextResponse.json(
        { success: false, message: "You are not registered for this election" },
        { status: 403 }
      );
    }

    // Check if voter has already voted
    const existingVote = await prisma.vote.findFirst({
      where: {
        electionId,
        voterId: userId,
      },
    });

    if (existingVote) {
      return NextResponse.json(
        { success: false, message: "You have already voted in this election" },
        { status: 400 }
      );
    }

    // Verify Signature
    const voteData = {
      voteId,
      electionId,
      voterPublicKey: user.publicKey,
      candidateId,
      timestamp: new Date(timestamp),
      signature
    };
    
    // Validate Signature
    const isValidSignature = BlockchainSecurity.validateVoteSignature(voteData);
    
    if (!isValidSignature) {
      log.warn("Invalid vote signature detected", "VOTE_SECURITY", { userId, electionId });
      return NextResponse.json(
        { success: false, message: "Invalid cryptographic signature" },
        { status: 401 }
      );
    }

    // Add vote to blockchain
    const blockchain = BlockchainManager.getBlockchain(electionId);

    // We pass the verified transaction data directly
    const voteTransaction = {
      voteId,
      electionId,
      voterPublicKey: user.publicKey,
      candidateId,
      timestamp: new Date(timestamp),
      signature, 
    };

    const addedToChain = await blockchain.addVoteTransaction(voteTransaction);

    if (!addedToChain) {
      return NextResponse.json(
        { success: false, message: "Failed to add vote to blockchain" },
        { status: 500 }
      );
    }

    // Create vote record in database
    const vote = await prisma.vote.create({
      data: {
        electionId,
        voterId: userId,
        blockHash: blockchain.getLatestBlock().hash,
        transactionHash: voteId,
        votedAt: new Date(),
      },
    });

    // Update voter registration
    await prisma.electionVoter.update({
      where: { id: voterRegistration.id },
      data: {
        hasVoted: true,
      },
    });

    // Update user election participation if it exists
    await prisma.userElectionParticipation.updateMany({
      where: {
        userId,
        electionId,
      },
      data: {
        hasVoted: true,
        votedAt: new Date(),
      },
    });

    // Create audit log
    await AuditService.createAuditLog(
      userId,
      "VOTE_CAST",
      "VOTE",
      vote.id,
      `Voter cast vote in election ${electionId} for candidate ${candidateId}`,
      request.headers.get("x-forwarded-for") || "unknown",
      request.headers.get("user-agent") || "unknown"
    );

    log.info("Vote cast successfully", "VOTER_VOTE", {
      userId,
      electionId,
      candidateId,
      voteId: vote.id,
      blockHash: vote.blockHash,
    });

    return NextResponse.json({
      success: true,
      message: "Vote cast successfully",
      data: {
        voteId: vote.id,
        electionId: vote.electionId,
        votedAt: vote.votedAt.toISOString(),
        blockHash: vote.blockHash,
        transactionHash: vote.transactionHash,
      },
    });
  } catch (error) {
    log.exception(error as Error, "VOTER_VOTE", {
      path: "/api/voter/vote",
    });

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
});
