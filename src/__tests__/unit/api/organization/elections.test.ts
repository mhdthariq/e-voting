/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/organization/elections/route";
import { NextRequest } from "next/server";
import prisma from "@/lib/database/client";
import { auth } from "@/lib/auth/jwt";

// Mock dependencies
jest.mock("@/lib/database/client", () => ({
  __esModule: true,
  default: {
    election: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
    },
    candidate: {
        create: jest.fn(),
    },
    electionStatistics: {
        create: jest.fn(),
    },
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
  },
}));

jest.mock("@/lib/auth/jwt", () => ({
  auth: {
    verifyToken: jest.fn(),
  },
}));

describe("API: Organization Elections", () => {
  let req: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return 401 if auth header is missing", async () => {
      req = new NextRequest("http://localhost/api/organization/elections");
      const res = await GET(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.message).toBe("Authentication required");
    });

    it("should return 401 if token is invalid", async () => {
      req = new NextRequest("http://localhost/api/organization/elections", {
        headers: { Authorization: "Bearer invalid_token" },
      });
      (auth.verifyToken as jest.Mock).mockRejectedValue(new Error("Invalid"));

      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("should return elections list for valid org", async () => {
      const mockElections = [{ id: 1, title: "Test Election" }];
      req = new NextRequest("http://localhost/api/organization/elections", {
        headers: { Authorization: "Bearer valid_token" },
      });
      
      (auth.verifyToken as jest.Mock).mockResolvedValue({
        payload: { userId: 123, role: "organization" }
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 123, role: "ORGANIZATION" 
      });
      
      (prisma.election.findMany as jest.Mock).mockResolvedValue(mockElections);

      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
    });
  });

  describe("POST", () => {
    it("should create an election successfully", async () => {
        const body = {
            title: "New Election",
            description: "Election description",
            startDate: new Date(Date.now() + 1000 * 60).toISOString(), // 1 min future
            endDate: new Date(Date.now() + 1000 * 3600).toISOString(), // 1 hour future
            candidates: ["Alice", "Bob"]
        };

        req = new NextRequest("http://localhost/api/organization/elections", {
            method: "POST",
            headers: { Authorization: "Bearer valid_token" },
            body: JSON.stringify(body)
        });

        (auth.verifyToken as jest.Mock).mockResolvedValue({
            payload: { userId: 123, role: "organization" }
        });

        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 123, role: "ORGANIZATION" 
        });

        (prisma.election.create as jest.Mock).mockResolvedValue({ id: 1, ...body });
        // Mock $transaction to simply execute the callback
        prisma.$transaction = jest.fn().mockImplementation(async (callback) => await callback(prisma));

        const res = await POST(req);
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.success).toBe(true);
    });
  });
});
