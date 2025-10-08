/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import prisma from "../client";
import {
  Election,
  ElectionStatus,
  CreateElectionRequest,
  Candidate,
  CreateCandidateRequest,
  CreateVoterRequest,
} from "../../../types";

export class ElectionService {
  // Create a new election with candidates and voters
  static async createElection(
    organizationId: number,
    electionData: CreateElectionRequest,
  ): Promise<Election> {
    const election = await prisma.$transaction(async (tx) => {
      // Create the election
      const newElection = await tx.election.create({
        data: {
          title: electionData.title,
          description: electionData.description,
          organizationId,
          startDate: new Date(electionData.startDate),
          endDate: new Date(electionData.endDate),
          status: "DRAFT",
        },
      });

      // Create candidates
      if (electionData.candidates && electionData.candidates.length > 0) {
        await tx.candidate.createMany({
          data: electionData.candidates.map((candidate) => ({
            electionId: newElection.id,
            name: candidate.name,
            description: candidate.description,
          })),
        });
      }

      // Create voters
      if (electionData.voters && electionData.voters.length > 0) {
        await tx.electionVoter.createMany({
          data: electionData.voters.map((voter) => ({
            electionId: newElection.id,
            name: voter.name,
            email: voter.email,
          })),
        });
      }

      // Initialize election statistics
      await tx.electionStatistics.create({
        data: {
          electionId: newElection.id,
          totalRegisteredVoters: electionData.voters?.length || 0,
        },
      });

      return newElection;
    });

    return this.mapPrismaElectionToElection(election);
  }

  // Find election by ID with full details
  static async findById(
    id: number,
    includeDetails: boolean = false,
  ): Promise<Election | null> {
    const election = await prisma.election.findUnique({
      where: { id },
      include: includeDetails
        ? {
            candidates: true,
            voters: true,
            votes: true,
            statistics: true,
            organization: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          }
        : undefined,
    });

    return election ? this.mapPrismaElectionToElection(election) : null;
  }

  // Get all elections for an organization
  static async getElectionsByOrganization(
    organizationId: number,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [elections, total] = await Promise.all([
      prisma.election.findMany({
        where: { organizationId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          candidates: true,
          voters: true,
          statistics: true,
        },
      }),
      prisma.election.count({ where: { organizationId } }),
    ]);

    return {
      data: elections.map(this.mapPrismaElectionToElection),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get elections by status
  static async getElectionsByStatus(
    status: ElectionStatus,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [elections, total] = await Promise.all([
      prisma.election.findMany({
        where: { status: status.toUpperCase() as any },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          organization: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          candidates: true,
          statistics: true,
        },
      }),
      prisma.election.count({ where: { status: status.toUpperCase() as any } }),
    ]);

    return {
      data: elections.map(this.mapPrismaElectionToElection),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get all elections (admin view)
  static async getAllElections(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [elections, total] = await Promise.all([
      prisma.election.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          organization: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          candidates: true,
          statistics: true,
        },
      }),
      prisma.election.count(),
    ]);

    return {
      data: elections.map(this.mapPrismaElectionToElection),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Update election
  static async updateElection(
    id: number,
    updateData: Partial<Election>,
  ): Promise<Election | null> {
    try {
      const election = await prisma.election.update({
        where: { id },
        data: {
          ...(updateData.title && { title: updateData.title }),
          ...(updateData.description && {
            description: updateData.description,
          }),
          ...(updateData.status && {
            status: updateData.status.toUpperCase() as any,
          }),
          ...(updateData.startDate && { startDate: updateData.startDate }),
          ...(updateData.endDate && { endDate: updateData.endDate }),
        },
      });

      return this.mapPrismaElectionToElection(election);
    } catch (error) {
      return null;
    }
  }

  // Update election status
  static async updateElectionStatus(
    id: number,
    status: ElectionStatus,
  ): Promise<boolean> {
    try {
      await prisma.election.update({
        where: { id },
        data: { status: status.toUpperCase() as any },
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  // Start election
  static async startElection(id: number): Promise<boolean> {
    try {
      await prisma.$transaction(async (tx) => {
        // Update election status
        await tx.election.update({
          where: { id },
          data: { status: "ACTIVE" },
        });

        // Update statistics
        await tx.electionStatistics.update({
          where: { electionId: id },
          data: { votingStarted: new Date() },
        });
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  // End election
  static async endElection(id: number): Promise<boolean> {
    try {
      await prisma.election.update({
        where: { id },
        data: { status: "ENDED" },
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  // Delete election
  static async deleteElection(id: number): Promise<boolean> {
    try {
      await prisma.election.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  // Add candidate to election
  static async addCandidate(
    electionId: number,
    candidateData: CreateCandidateRequest,
  ): Promise<Candidate | null> {
    try {
      const candidate = await prisma.candidate.create({
        data: {
          electionId,
          name: candidateData.name,
          description: candidateData.description,
        },
      });

      return {
        id: candidate.id,
        electionId: candidate.electionId,
        name: candidate.name,
        description: candidate.description,
        createdAt: candidate.createdAt,
      };
    } catch (error) {
      return null;
    }
  }

  // Remove candidate from election
  static async removeCandidate(candidateId: number): Promise<boolean> {
    try {
      await prisma.candidate.delete({
        where: { id: candidateId },
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  // Get candidates for election
  static async getCandidates(electionId: number): Promise<Candidate[]> {
    const candidates = await prisma.candidate.findMany({
      where: { electionId },
      orderBy: { createdAt: "asc" },
    });

    return candidates.map((candidate) => ({
      id: candidate.id,
      electionId: candidate.electionId,
      name: candidate.name,
      description: candidate.description,
      createdAt: candidate.createdAt,
    }));
  }

  // Add voter to election
  static async addVoter(
    electionId: number,
    voterData: CreateVoterRequest,
  ): Promise<boolean> {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.electionVoter.create({
          data: {
            electionId,
            name: voterData.name,
            email: voterData.email,
          },
        });

        // Update statistics
        await tx.electionStatistics.update({
          where: { electionId },
          data: {
            totalRegisteredVoters: {
              increment: 1,
            },
          },
        });
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  // Remove voter from election
  static async removeVoter(
    electionId: number,
    voterId: number,
  ): Promise<boolean> {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.electionVoter.delete({
          where: { id: voterId },
        });

        // Update statistics
        await tx.electionStatistics.update({
          where: { electionId },
          data: {
            totalRegisteredVoters: {
              decrement: 1,
            },
          },
        });
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  // Get voters for election
  static async getVoters(electionId: number): Promise<any[]> {
    const voters = await prisma.electionVoter.findMany({
      where: { electionId },
      orderBy: { createdAt: "asc" },
    });

    return voters;
  }

  // Check if voter is registered for election
  static async isVoterRegistered(
    electionId: number,
    email: string,
  ): Promise<boolean> {
    const voter = await prisma.electionVoter.findFirst({
      where: {
        electionId,
        email,
      },
    });

    return !!voter;
  }

  // Get election statistics
  static async getElectionStatistics(electionId: number) {
    const stats = await prisma.electionStatistics.findUnique({
      where: { electionId },
    });

    return stats;
  }

  // Update election statistics after vote
  static async updateStatisticsAfterVote(electionId: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const totalVotes = await tx.vote.count({
        where: { electionId },
      });

      const stats = await tx.electionStatistics.findUnique({
        where: { electionId },
      });

      if (stats) {
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
    });
  }

  // Search elections
  static async searchElections(
    query: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { title: { contains: query, mode: "insensitive" as const } },
        { description: { contains: query, mode: "insensitive" as const } },
      ],
    };

    const [elections, total] = await Promise.all([
      prisma.election.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          organization: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          candidates: true,
          statistics: true,
        },
      }),
      prisma.election.count({ where }),
    ]);

    return {
      data: elections.map(this.mapPrismaElectionToElection),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get upcoming elections
  static async getUpcomingElections(limit: number = 10): Promise<Election[]> {
    const elections = await prisma.election.findMany({
      where: {
        startDate: {
          gt: new Date(),
        },
        status: "DRAFT",
      },
      take: limit,
      orderBy: { startDate: "asc" },
      include: {
        organization: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        candidates: true,
        statistics: true,
      },
    });

    return elections.map(this.mapPrismaElectionToElection);
  }

  // Get active elections
  static async getActiveElections(): Promise<Election[]> {
    const elections = await prisma.election.findMany({
      where: {
        status: "ACTIVE",
        startDate: {
          lte: new Date(),
        },
        endDate: {
          gte: new Date(),
        },
      },
      orderBy: { startDate: "asc" },
      include: {
        organization: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        candidates: true,
        statistics: true,
      },
    });

    return elections.map(this.mapPrismaElectionToElection);
  }

  // Helper method to map Prisma election to application Election type
  private static mapPrismaElectionToElection(prismaElection: any): Election {
    return {
      id: prismaElection.id,
      title: prismaElection.title,
      description: prismaElection.description,
      organizationId: prismaElection.organizationId,
      status: prismaElection.status.toLowerCase() as ElectionStatus,
      startDate: prismaElection.startDate,
      endDate: prismaElection.endDate,
      createdAt: prismaElection.createdAt,
    };
  }
}
