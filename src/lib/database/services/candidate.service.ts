/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import prisma from "../client";
import { Candidate, CreateCandidateRequest } from "../../../types";

export class CandidateService {
  // Create a new candidate
  static async createCandidate(
    electionId: number,
    candidateData: CreateCandidateRequest,
  ): Promise<Candidate> {
    const candidate = await prisma.candidate.create({
      data: {
        electionId,
        name: candidateData.name,
        description: candidateData.description,
      },
    });

    return this.mapPrismaCandidateToCandidate(candidate);
  }
  
  static async findAll() {
    return await prisma.candidate.findMany({
      orderBy: { createdAt: "desc" }, // optional
    });
  }

  // Get all candidates
  static async getAllCandidates(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [candidates, total] = await Promise.all([
      prisma.candidate.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.candidate.count(),
    ]);

    return {
      data: candidates.map(this.mapPrismaCandidateToCandidate),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get candidate by ID
  static async findById(id: number): Promise<Candidate | null> {
    const candidate = await prisma.candidate.findUnique({
      where: { id },
    });

    return candidate ? this.mapPrismaCandidateToCandidate(candidate) : null;
  }

  // Get candidates by election
  static async getByElectionId(electionId: number): Promise<Candidate[]> {
    const candidates = await prisma.candidate.findMany({
      where: { electionId },
      orderBy: { createdAt: "asc" },
    });

    return candidates.map(this.mapPrismaCandidateToCandidate);
  }

  // Update candidate info
  static async updateCandidate(
    id: number,
    updateData: Partial<Candidate>,
  ): Promise<Candidate | null> {
    try {
      const updated = await prisma.candidate.update({
        where: { id },
        data: {
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.description && {
            description: updateData.description,
          }),
        },
      });

      return this.mapPrismaCandidateToCandidate(updated);
    } catch (error) {
      return null;
    }
  }

  // Delete candidate
  static async deleteCandidate(id: number): Promise<boolean> {
    try {
      await prisma.candidate.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Search candidates
  static async searchCandidates(
    query: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { name: { contains: query, mode: "insensitive" as const } },
        { description: { contains: query, mode: "insensitive" as const } },
      ],
    };

    const [candidates, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.candidate.count({ where }),
    ]);

    return {
      data: candidates.map(this.mapPrismaCandidateToCandidate),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Helper mapper
  private static mapPrismaCandidateToCandidate(prismaCandidate: any): Candidate {
    return {
      id: prismaCandidate.id,
      electionId: prismaCandidate.electionId,
      name: prismaCandidate.name,
      description: prismaCandidate.description,
      createdAt: prismaCandidate.createdAt,
    };
  }
}
