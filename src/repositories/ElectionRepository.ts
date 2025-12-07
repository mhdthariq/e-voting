import { BaseRepository } from "./BaseRepository";
import prisma from "@/lib/database/client";
import { Election, Prisma } from "@prisma/client";

export class ElectionRepository extends BaseRepository<Election, Prisma.ElectionCreateInput, Prisma.ElectionUpdateInput> {
  constructor() {
    super(prisma.election);
  }

  async findByStatus(status: "draft" | "active" | "ended"): Promise<Election[]> {
    return this.model.findMany({ where: { status } });
  }

  async findActive(): Promise<Election[]> {
    return this.findByStatus("active");
  }

  async findByOrganization(organizationId: number): Promise<Election[]> {
    return this.model.findMany({ where: { organizationId } });
  }

  async findByOrganizationWithStats(organizationId: number): Promise<Election[]> {
    return this.model.findMany({
      where: { organizationId },
      include: {
        candidates: {
          orderBy: { id: "asc" },
        },
        _count: {
          select: {
            votes: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async createWithCandidates(
    data: Prisma.ElectionCreateInput,
    candidates: { name: string; description: string }[]
  ): Promise<{ election: Election; candidates: any[] }> {
    return prisma.$transaction(async (tx) => {
      const election = await tx.election.create({ data });

      const createdCandidates = await Promise.all(
          candidates.map((candidate) =>
              tx.candidate.create({
                  data: {
                      electionId: election.id,
                      name: candidate.name,
                      description: candidate.description, // Ensure 'description' field exists in Candidate model, else map to 'vision'/'mission'
                  },
              })
          )
      );
      
      // Initialize stats
      await tx.electionStatistics.create({
        data: {
          electionId: election.id,
          totalRegisteredVoters: 0,
          totalVotesCast: 0,
          participationRate: 0.0,
        },
      });

      return { election, candidates: createdCandidates };
    });
  }
}
