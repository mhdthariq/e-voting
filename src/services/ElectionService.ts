import { ElectionRepository } from "@/repositories/ElectionRepository";
import { Election, Prisma } from "@prisma/client";

export class ElectionService {
  private electionRepository: ElectionRepository;

  constructor() {
    this.electionRepository = new ElectionRepository();
  }

  async createElection(data: Prisma.ElectionCreateInput): Promise<Election> {
    return this.electionRepository.create(data);
  }

  async getActiveElections(): Promise<Election[]> {
    return this.electionRepository.findActive();
  }

  async getElectionsByOrganization(organizationId: number): Promise<Election[]> {
    return this.electionRepository.findByOrganization(organizationId);
  }
  
  async getElectionById(id: number): Promise<Election | null> {
      return this.electionRepository.findById(id);
  }

  async getElectionsByOrganizationWithStats(organizationId: number): Promise<Election[]> {
    return this.electionRepository.findByOrganizationWithStats(organizationId);
  }

  async createElectionWithCandidates(
    data: Prisma.ElectionCreateInput,
    candidates: { name: string; description: string }[]
  ): Promise<{ election: Election; candidates: any[] }> {
    return this.electionRepository.createWithCandidates(data, candidates);
  }
}
