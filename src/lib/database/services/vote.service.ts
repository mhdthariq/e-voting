/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import prisma from "../client";
import {
  Vote,
  VoteTransaction,
  CastVoteRequest,
  VoteValidationResult,
} from "../../../types";

export class VoteService {
  // Cast a vote (create vote record and blockchain transaction)
  static async castVote(
    electionId: number,
    voterId: number,
    voteRequest: CastVoteRequest,
    blockHash: string,
    transactionHash: string,
  ): Promise<Vote | null> {
    try {
      const vote = await prisma.$transaction(async (tx) => {
        // Check if voter has already voted in this election
        const existingVote = await tx.vote.findUnique({
          where: {
            electionId_voterId: {
              electionId,
              voterId,
            },
          },
        });

        if (existingVote) {
          throw new Error("Voter has already cast a vote in this election");
        }

        // Create the vote record
        const newVote = await tx.vote.create({
          data: {
            electionId,
            voterId,
            blockHash,
            transactionHash,
          },
        });

        // Update election statistics
        const stats = await tx.electionStatistics.findUnique({
          where: { electionId },
        });

        if (stats) {
          const totalVotes = await tx.vote.count({
            where: { electionId },
          });

          const participationRate =
            stats.totalRegisteredVoters > 0
              ? (totalVotes / stats.totalRegisteredVoters) * 100
              : 0;

          await tx.electionStatistics.update({
            where: { electionId },
            data: {
              totalVotesCast: totalVotes,
              participationRate,
              lastVoteTime: new Date(),
            },
          });
        }

        return newVote;
      });

      return this.mapPrismaVoteToVote(vote);
    } catch (error) {
      console.error("Error casting vote:", error);
      return null;
    }
  }

  // Find vote by ID
  static async findById(id: number): Promise<Vote | null> {
    const vote = await prisma.vote.findUnique({
      where: { id },
      include: {
        election: true,
        voter: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return vote ? this.mapPrismaVoteToVote(vote) : null;
  }

  // Find vote by transaction hash
  static async findByTransactionHash(
    transactionHash: string,
  ): Promise<Vote | null> {
    const vote = await prisma.vote.findUnique({
      where: { transactionHash },
      include: {
        election: true,
        voter: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return vote ? this.mapPrismaVoteToVote(vote) : null;
  }

  // Check if voter has voted in election
  static async hasVoterVoted(
    electionId: number,
    voterId: number,
  ): Promise<boolean> {
    const vote = await prisma.vote.findUnique({
      where: {
        electionId_voterId: {
          electionId,
          voterId,
        },
      },
    });

    return !!vote;
  }

  // Get all votes for an election
  static async getVotesByElection(
    electionId: number,
    page: number = 1,
    limit: number = 50,
  ) {
    const skip = (page - 1) * limit;

    const [votes, total] = await Promise.all([
      prisma.vote.findMany({
        where: { electionId },
        skip,
        take: limit,
        orderBy: { votedAt: "desc" },
        include: {
          voter: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
      prisma.vote.count({ where: { electionId } }),
    ]);

    return {
      data: votes.map(this.mapPrismaVoteToVote),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get votes by voter
  static async getVotesByVoter(voterId: number): Promise<Vote[]> {
    const votes = await prisma.vote.findMany({
      where: { voterId },
      orderBy: { votedAt: "desc" },
      include: {
        election: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
          },
        },
      },
    });

    return votes.map(this.mapPrismaVoteToVote);
  }

  // Get vote count by election
  static async getVoteCountByElection(electionId: number): Promise<number> {
    return await prisma.vote.count({
      where: { electionId },
    });
  }

  // Get voting statistics for election
  static async getVotingStatistics(electionId: number) {
    const [totalVotes, votesPerHour, votesPerDay] = await Promise.all([
      prisma.vote.count({ where: { electionId } }),

      // Votes in the last hour
      prisma.vote.count({
        where: {
          electionId,
          votedAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000),
          },
        },
      }),

      // Votes per day for the last 7 days
      prisma.$queryRaw`
        SELECT DATE(votedAt) as date, COUNT(*) as count
        FROM votes
        WHERE electionId = ${electionId}
        AND votedAt >= datetime('now', '-7 days')
        GROUP BY DATE(votedAt)
        ORDER BY date DESC
      `,
    ]);

    return {
      totalVotes,
      votesPerHour,
      votesPerDay,
    };
  }

  // Validate vote integrity
  static async validateVote(voteId: number): Promise<VoteValidationResult> {
    try {
      const vote = await prisma.vote.findUnique({
        where: { id: voteId },
        include: {
          election: true,
          voter: true,
        },
      });

      if (!vote) {
        return {
          isValid: false,
          error: "Vote not found",
        };
      }

      // Check if vote is within election timeframe
      const now = new Date();
      if (now < vote.election.startDate || now > vote.election.endDate) {
        return {
          isValid: false,
          error: "Vote cast outside election timeframe",
        };
      }

      // Check if blockchain block exists
      const block = await prisma.blockchainBlock.findFirst({
        where: { hash: vote.blockHash },
      });

      if (!block) {
        return {
          isValid: false,
          error: "Associated blockchain block not found",
        };
      }

      // Additional validation can be added here
      // (e.g., signature verification, merkle tree validation)

      return {
        isValid: true,
        voteHash: vote.transactionHash,
      };
    } catch (error) {
      return {
        isValid: false,
        error: "Validation failed: " + (error as Error).message,
      };
    }
  }

  // Get votes by block hash
  static async getVotesByBlockHash(blockHash: string): Promise<Vote[]> {
    const votes = await prisma.vote.findMany({
      where: { blockHash },
      orderBy: { votedAt: "asc" },
      include: {
        election: {
          select: {
            id: true,
            title: true,
          },
        },
        voter: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return votes.map(this.mapPrismaVoteToVote);
  }

  // Get recent votes (for dashboard)
  static async getRecentVotes(limit: number = 10): Promise<Vote[]> {
    const votes = await prisma.vote.findMany({
      take: limit,
      orderBy: { votedAt: "desc" },
      include: {
        election: {
          select: {
            id: true,
            title: true,
          },
        },
        voter: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return votes.map(this.mapPrismaVoteToVote);
  }

  // Delete vote (should be used very carefully and only in specific scenarios)
  static async deleteVote(id: number): Promise<boolean> {
    try {
      await prisma.$transaction(async (tx) => {
        const vote = await tx.vote.findUnique({
          where: { id },
        });

        if (!vote) {
          throw new Error("Vote not found");
        }

        await tx.vote.delete({
          where: { id },
        });

        // Update election statistics
        const stats = await tx.electionStatistics.findUnique({
          where: { electionId: vote.electionId },
        });

        if (stats) {
          const totalVotes = await tx.vote.count({
            where: { electionId: vote.electionId },
          });

          const participationRate =
            stats.totalRegisteredVoters > 0
              ? (totalVotes / stats.totalRegisteredVoters) * 100
              : 0;

          await tx.electionStatistics.update({
            where: { electionId: vote.electionId },
            data: {
              totalVotesCast: totalVotes,
              participationRate,
            },
          });
        }
      });

      return true;
    } catch (error) {
      console.error("Error deleting vote:", error);
      return false;
    }
  }

  // Bulk validate votes for election
  static async bulkValidateVotes(electionId: number): Promise<{
    totalVotes: number;
    validVotes: number;
    invalidVotes: number;
    errors: string[];
  }> {
    const votes = await prisma.vote.findMany({
      where: { electionId },
      include: {
        election: true,
      },
    });

    let validVotes = 0;
    let invalidVotes = 0;
    const errors: string[] = [];

    for (const vote of votes) {
      const validation = await this.validateVote(vote.id);
      if (validation.isValid) {
        validVotes++;
      } else {
        invalidVotes++;
        if (validation.error) {
          errors.push(`Vote ${vote.id}: ${validation.error}`);
        }
      }
    }

    return {
      totalVotes: votes.length,
      validVotes,
      invalidVotes,
      errors,
    };
  }

  // Get voting timeline for election
  static async getVotingTimeline(electionId: number) {
    const timeline = await prisma.$queryRaw`
      SELECT
        strftime('%Y-%m-%d %H:00:00', votedAt) as hour,
        COUNT(*) as votes
      FROM votes
      WHERE electionId = ${electionId}
      GROUP BY strftime('%Y-%m-%d %H:00:00', votedAt)
      ORDER BY hour ASC
    `;

    return timeline;
  }

  // Helper method to map Prisma vote to application Vote type
  private static mapPrismaVoteToVote(prismaVote: any): Vote {
    return {
      id: prismaVote.id,
      electionId: prismaVote.electionId,
      voterId: prismaVote.voterId,
      blockHash: prismaVote.blockHash,
      transactionHash: prismaVote.transactionHash,
      votedAt: prismaVote.votedAt,
    };
  }
}
