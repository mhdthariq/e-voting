/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/login/route";
import { UserService } from "@/lib/database/services/user.service";
import { auth } from "@/lib/auth/jwt";
import { password } from "@/lib/auth/password";
import { AuditService } from "@/lib/database/services/audit.service";
import { loginRateLimiter } from "@/lib/security/rate-limit";

// Mock dependencies
jest.mock("@/lib/database/services/user.service");
jest.mock("@/lib/auth/jwt");
jest.mock("@/lib/auth/password");
jest.mock("@/lib/database/services/audit.service");
jest.mock("@/lib/security/rate-limit");
jest.mock("@/utils/logger", () => ({
  log: {
    security: jest.fn(),
    auth: jest.fn(),
    exception: jest.fn(),
  },
}));

describe("Authentication API Integration", () => {
  const mockUser = {
    id: 1,
    username: "testuser",
    email: "test@example.com",
    passwordHash: "hashed_password",
    role: "voter",
    status: "active",
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (loginRateLimiter.check as jest.Mock).mockReturnValue({ success: true });
  });

  describe("POST /api/auth/login", () => {
    test("should login successfully with valid credentials", async () => {
      // Setup mocks
      (UserService.findByUsernameOrEmail as jest.Mock).mockResolvedValue(mockUser);
      (password.verify as jest.Mock).mockResolvedValue(true);
      (password.needsRehash as jest.Mock).mockReturnValue(false);
      (auth.login as jest.Mock).mockReturnValue({
        accessToken: "access_token",
        refreshToken: "refresh_token",
        expiresIn: 3600,
        tokenType: "Bearer",
      });

      // Create request
      const body = {
        identifier: "test@example.com",
        password: "password123",
      };
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "x-forwarded-for": "127.0.0.1" },
      });

      // Execute route handler
      const res = await POST(req);
      const data = await res.json();

      // Assertions
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.email).toBe(mockUser.email);
      expect(data.tokens.accessToken).toBe("access_token");
      
      // Verify mocks called
      expect(UserService.findByUsernameOrEmail).toHaveBeenCalledWith(body.identifier);
      expect(password.verify).toHaveBeenCalledWith(body.password, mockUser.passwordHash);
      expect(UserService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      expect(AuditService.logUserLogin).toHaveBeenCalled();
    });

    test("should return 401 for invalid credentials", async () => {
      // Mock user found but password invalid
      (UserService.findByUsernameOrEmail as jest.Mock).mockResolvedValue(mockUser);
      (password.verify as jest.Mock).mockResolvedValue(false);

      const body = {
        identifier: "test@example.com",
        password: "wrong_password",
      };
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Invalid credentials");
    });

    test("should return 401 if user not found", async () => {
      (UserService.findByUsernameOrEmail as jest.Mock).mockResolvedValue(null);

      const body = {
        identifier: "nonexistent@example.com",
        password: "password123",
      };
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("Invalid credentials");
    });

    test("should return 400 for empty input", async () => {
      const body = {
        identifier: "", // Invalid (min 1)
        password: "", // Invalid (min 1)
      };
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    test("should return 429 when rate limit exceeded", async () => {
      (loginRateLimiter.check as jest.Mock).mockReturnValue({ success: false });

      const body = {
        identifier: "test@example.com",
        password: "password123",
      };
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const res = await POST(req);
      
      expect(res.status).toBe(429);
    });
  });
});
