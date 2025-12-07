/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { GET } from "@/app/api/voter/dashboard/route";
import { auth } from "@/lib/auth/jwt";
import { UserService } from "@/lib/database/services/user.service";
import { UserElectionService } from "@/lib/database/services/user-election.service";

// Mock dependencies
jest.mock("@/lib/auth/jwt");
jest.mock("@/lib/database/services/user.service");
jest.mock("@/lib/database/services/user-election.service");
jest.mock("@/utils/logger", () => ({
  log: {
    info: jest.fn(),
    exception: jest.fn(),
  },
}));

describe("Voter API Integration", () => {
    const mockVoter = {
        id: 1,
        role: "voter",
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("GET /api/voter/dashboard", () => {
        test("should return dashboard data for authenticated voter", async () => {
            (auth.verifyToken as jest.Mock).mockReturnValue({
                isValid: true,
                payload: { userId: "1" },
            });
            (UserService.findById as jest.Mock).mockResolvedValue(mockVoter);
            (UserElectionService.getUserElections as jest.Mock).mockResolvedValue({
                participations: [],
                activeElections: [],
            });
            (UserElectionService.getUserPendingInvitations as jest.Mock).mockResolvedValue([]);
            (UserElectionService.getUserVotingHistory as jest.Mock).mockResolvedValue([]);

            const req = new NextRequest("http://localhost:3000/api/voter/dashboard", {
                headers: { authorization: "Bearer valid_token" },
            });

            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.data.statistics).toBeDefined();
        });

        test("should return 401 if token missing", async () => {
             const req = new NextRequest("http://localhost:3000/api/voter/dashboard");
             const res = await GET(req);
             expect(res.status).toBe(401);
        });

         test("should return 403 if not a voter", async () => {
            (auth.verifyToken as jest.Mock).mockReturnValue({
                isValid: true,
                payload: { userId: "2" },
            });
            (UserService.findById as jest.Mock).mockResolvedValue({ id: 2, role: "admin" });

            const req = new NextRequest("http://localhost:3000/api/voter/dashboard", {
                headers: { authorization: "Bearer valid_token" },
            });

            const res = await GET(req);
             // The route handler logic returns json with status in body or calls NextResponse?
             // Checking route.ts: return NextResponse.json(..., { status: authResult.status })
             // authResult returns { error, status: 403 }
             expect(res.status).toBe(403);
        });
    });
});
