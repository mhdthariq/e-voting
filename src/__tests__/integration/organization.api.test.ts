/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/jwt";

// Helper variables for mocks
let mockGetUserProfile: jest.Mock;
let mockGetElections: jest.Mock;

describe("Organization API Integration", () => {
    let GET: any;

    const mockOrgUser = {
        id: 1,
        role: "organization",
    };

    beforeEach(() => {
        // Reset mocks for each test
        mockGetUserProfile = jest.fn();
        mockGetElections = jest.fn();

        jest.resetModules(); // Clear module cache
        
        // Setup mocks BEFORE importing module
        jest.mock("@/lib/auth/jwt", () => ({
            auth: {
                verifyToken: jest.fn(),
            },
        }));

        jest.mock("@/services/UserService", () => {
            return {
                UserService: jest.fn().mockImplementation(() => ({
                    getUserProfile: mockGetUserProfile,
                })),
            };
        });

        jest.mock("@/services/ElectionService", () => {
             return {
                ElectionService: jest.fn().mockImplementation(() => ({
                    getElectionsByOrganizationWithStats: mockGetElections,
                })),
            };
        });

        // Require the module under test
        // This triggers new UserService() calls using our fresh mocks
        const routeModule = require("@/app/api/organization/elections/route");
        GET = routeModule.GET;

        // Default mock behaviors
        mockGetUserProfile.mockResolvedValue(mockOrgUser);
        mockGetElections.mockResolvedValue([{ id: 1, title: "Election 1", status: "DRAFT" }]);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("GET /api/organization/elections", () => {
        test("should return elections for authenticated organization", async () => {
            const authModule = require("@/lib/auth/jwt");
            authModule.auth.verifyToken.mockReturnValue({
                isValid: true,
                payload: { userId: "1" },
            });

            const req = new NextRequest("http://localhost:3000/api/organization/elections", {
                headers: { authorization: "Bearer valid_token" },
            });

            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.data[0].title).toBe("Election 1");
        });

        test("should return 401 if token missing", async () => {
             const req = new NextRequest("http://localhost:3000/api/organization/elections");
             const res = await GET(req);
             expect(res.status).toBe(401);
        });

         test("should return 403 if not an organization", async () => {
            const authModule = require("@/lib/auth/jwt");
            authModule.auth.verifyToken.mockReturnValue({
                isValid: true,
                payload: { userId: "2" },
            });
            
            mockGetUserProfile.mockResolvedValueOnce({ id: 2, role: "voter" });

            const req = new NextRequest("http://localhost:3000/api/organization/elections", {
                headers: { authorization: "Bearer valid_token" },
            });

            const res = await GET(req);
             expect(res.status).toBe(403);
        });
    });
});
