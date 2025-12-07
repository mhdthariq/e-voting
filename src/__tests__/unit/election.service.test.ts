import { ElectionService } from "@/services/ElectionService";
import { ElectionRepository } from "@/repositories/ElectionRepository";
import { Election } from "@prisma/client";

// Mock the ElectionRepository class
jest.mock("@/repositories/ElectionRepository");

describe("ElectionService", () => {
  let electionService: ElectionService;
  let mockElectionRepository: jest.Mocked<ElectionRepository>;

  const mockElection: Election = {
    id: 1,
    title: "Test Election",
    description: "Description",
    startDate: new Date(),
    endDate: new Date(),
    status: "DRAFT",
    organizationId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    electionService = new ElectionService();
    mockElectionRepository = (ElectionRepository as jest.Mock).mock.instances[0] as jest.Mocked<ElectionRepository>;
  });

  describe("createElection", () => {
    test("should create an election", async () => {
      const createData = {
        title: "Test Election",
        description: "Description",
        startDate: new Date(),
        endDate: new Date(),
        organization: { connect: { id: 1 } },
        status: "DRAFT" as const
      };
      
      mockElectionRepository.create.mockResolvedValue(mockElection);

      const result = await electionService.createElection(createData);
      
      expect(mockElectionRepository.create).toHaveBeenCalledWith(createData);
      expect(result).toEqual(mockElection);
    });
  });

  describe("getActiveElections", () => {
    test("should return active elections", async () => {
      const activeElection = { ...mockElection, status: "ACTIVE" as const };
      mockElectionRepository.findActive.mockResolvedValue([activeElection]);

      const result = await electionService.getActiveElections();
      
      expect(mockElectionRepository.findActive).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("ACTIVE");
    });
  });

  describe("getElectionsByOrganization", () => {
    test("should return elections for organization", async () => {
      mockElectionRepository.findByOrganization.mockResolvedValue([mockElection]);

      const result = await electionService.getElectionsByOrganization(1);
      
      expect(mockElectionRepository.findByOrganization).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(1);
    });
  });

  describe("getElectionById", () => {
    test("should return election by id", async () => {
      mockElectionRepository.findById.mockResolvedValue(mockElection);

      const result = await electionService.getElectionById(1);
      
      expect(mockElectionRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockElection);
    });
  });

  describe("getElectionsByOrganizationWithStats", () => {
    test("should return elections with stats", async () => {
      mockElectionRepository.findByOrganizationWithStats.mockResolvedValue([mockElection]);

      const result = await electionService.getElectionsByOrganizationWithStats(1);
      
      expect(mockElectionRepository.findByOrganizationWithStats).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(1);
    });
  });

  describe("createElectionWithCandidates", () => {
    test("should create election with candidates", async () => {
      const createData = {
        title: "Test Election",
        description: "Description",
        startDate: new Date(),
        endDate: new Date(),
        organization: { connect: { id: 1 } },
        status: "DRAFT" as const
      };
      const candidates = [{ name: "C1", description: "D1" }];
      
      const mockResult = {
          election: mockElection,
          candidates: [{ id: 1, name: "C1", electionId: 1 }]
      };

      mockElectionRepository.createWithCandidates.mockResolvedValue(mockResult);

      const result = await electionService.createElectionWithCandidates(createData, candidates);
      
      expect(mockElectionRepository.createWithCandidates).toHaveBeenCalledWith(createData, candidates);
      expect(result).toEqual(mockResult);
    });
  });
});
