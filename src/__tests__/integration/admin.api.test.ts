/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/stats/route";
import { auth } from "@/lib/auth/jwt";
import prisma from "@/lib/database/client";

// Mock dependencies
jest.mock("@/lib/auth/jwt");
jest.mock("@/lib/database/client", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    election: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    vote: {
      count: jest.fn(),
    },
    blockchainBlock: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    systemStatistics: {
      findFirst: jest.fn(),
    },
    auditLog: {
      count: jest.fn(),
    },
    electionVoter: {
      count: jest.fn(),
    },
  },
}));
jest.mock("@/lib/database/services/audit.service");

describe("Admin API Integration", () => {
  const mockAdminUser = {
    id: 1,
    role: "ADMIN",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/stats", () => {
    test("should return stats for authenticated admin", async () => {
      // Mock auth
      (auth.verifyToken as jest.Mock).mockReturnValue({
        isValid: true,
        payload: { userId: "1", role: "admin" },
      });

      // Mock DB calls
      const mockPrisma = prisma as any;
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.election.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3); // Total, Active, Ended
      mockPrisma.vote.count.mockResolvedValue(500);
      mockPrisma.blockchainBlock.count.mockResolvedValue(10);
      mockPrisma.systemStatistics.findFirst.mockResolvedValue({ systemUptime: 3600 });
      mockPrisma.user.groupBy.mockResolvedValue([
        { role: "VOTER", _count: { role: 90 } },
        { role: "ADMIN", _count: { role: 10 } },
      ]);
      mockPrisma.election.groupBy.mockResolvedValue([
        { status: "ACTIVE", _count: { status: 2 } },
      ]);
      mockPrisma.auditLog.count.mockResolvedValue(50);
      mockPrisma.electionVoter.count.mockResolvedValue(200);
      mockPrisma.blockchainBlock.findMany.mockResolvedValue([]); // No blocks for average time in this mock

      const req = new NextRequest("http://localhost:3000/api/admin/stats", {
        headers: { authorization: "Bearer valid_token" },
      });

      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalUsers).toBe(100);
      expect(data.data.totalVotes).toBe(500);
    });

    test("should deny access without token", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/stats");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    test("should deny access for non-admin user", async () => {
       (auth.verifyToken as jest.Mock).mockReturnValue({
        isValid: true,
        payload: { userId: "2", role: "voter" },
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 2, role: "VOTER" });

      const req = new NextRequest("http://localhost:3000/api/admin/stats", {
        headers: { authorization: "Bearer valid_token" },
      });

      const res = await GET(req);
      expect(res.status).toBe(403);
    });
  });
});
