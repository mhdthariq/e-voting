/**
 * Authentication Middleware for BlockVote
 * Provides route protection, role-based access control, and session management
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, JwtPayload } from "./jwt";
import { log } from "@/utils/logger";
import { UserService } from "@/lib/database/services/user.service";

// Extended request interface with user data
export interface AuthenticatedRequest extends NextRequest {
  user?: JwtPayload;
  userId?: string;
}

// Middleware configuration
export interface MiddlewareConfig {
  requireAuth?: boolean;
  allowedRoles?: Array<"admin" | "organization" | "voter">;
  allowSelf?: boolean; // Allow users to access their own resources
  skipTokenValidation?: boolean; // For public endpoints
  rateLimitKey?: string;
}

// Route access levels
export enum AccessLevel {
  PUBLIC = "public",
  AUTHENTICATED = "authenticated",
  ADMIN = "admin",
  ORGANIZATION = "organization",
  VOTER = "voter",
  ADMIN_OR_ORGANIZATION = "admin_or_organization",
  SELF_OR_ADMIN = "self_or_admin",
}

// Middleware response types
export interface MiddlewareResult {
  success: boolean;
  user?: JwtPayload;
  error?: string;
  statusCode?: number;
}

/**
 * Authentication Middleware Class
 */
class AuthMiddleware {
  // UserService methods are static, no need to instantiate

  constructor() {}

  /**
   * Main authentication middleware function
   */
  async authenticate(
    request: NextRequest,
    config: MiddlewareConfig = {},
  ): Promise<MiddlewareResult> {
    try {
      // Skip authentication for public endpoints
      if (config.skipTokenValidation) {
        return { success: true };
      }

      // Extract token from request
      const token = this.extractToken(request);

      if (!token) {
        if (config.requireAuth !== false) {
          log.security("Missing authentication token", {
            path: request.nextUrl.pathname,
            method: request.method,
            ip: this.getClientIP(request),
          });

          return {
            success: false,
            error: "Authentication required",
            statusCode: 401,
          };
        }
        return { success: true };
      }

      // Verify token
      const tokenResult = auth.verifyToken(token);

      if (!tokenResult.isValid || !tokenResult.payload) {
        log.security("Invalid authentication token", {
          path: request.nextUrl.pathname,
          method: request.method,
          error: tokenResult.error,
          expired: tokenResult.expired,
          ip: this.getClientIP(request),
        });

        return {
          success: false,
          error: tokenResult.expired ? "Token expired" : "Invalid token",
          statusCode: 401,
        };
      }

      const user = tokenResult.payload;

      // Verify user still exists and is active
      const dbUser = await UserService.findById(parseInt(user.userId));
      if (!dbUser) {
        log.security("Token user not found in database", {
          userId: user.userId,
          path: request.nextUrl.pathname,
        });

        return {
          success: false,
          error: "User not found",
          statusCode: 401,
        };
      }

      // Check if user is active
      if (dbUser.status !== "active") {
        log.security("Inactive user attempted access", {
          userId: user.userId,
          email: user.email,
          path: request.nextUrl.pathname,
        });

        return {
          success: false,
          error: "Account disabled",
          statusCode: 403,
        };
      }

      // Check role-based access
      if (config.allowedRoles && config.allowedRoles.length > 0) {
        if (!config.allowedRoles.includes(user.role)) {
          log.security("Insufficient role permissions", {
            userId: user.userId,
            userRole: user.role,
            requiredRoles: config.allowedRoles,
            path: request.nextUrl.pathname,
          });

          return {
            success: false,
            error: "Insufficient permissions",
            statusCode: 403,
          };
        }
      }

      // Log successful authentication
      log.auth("User authenticated successfully", {
        userId: user.userId,
        role: user.role,
        path: request.nextUrl.pathname,
      });

      return {
        success: true,
        user,
      };
    } catch (error) {
      log.exception(error as Error, "AUTH_MIDDLEWARE", {
        path: request.nextUrl.pathname,
        method: request.method,
      });

      return {
        success: false,
        error: "Authentication error",
        statusCode: 500,
      };
    }
  }

  /**
   * Role-based access control middleware
   */
  async authorize(
    request: NextRequest,
    accessLevel: AccessLevel,
    resourceUserId?: string,
  ): Promise<MiddlewareResult> {
    // Public access
    if (accessLevel === AccessLevel.PUBLIC) {
      return { success: true };
    }

    // Authenticate first
    const authResult = await this.authenticate(request, { requireAuth: true });
    if (!authResult.success || !authResult.user) {
      return authResult;
    }

    const user = authResult.user;

    // Check access level
    switch (accessLevel) {
      case AccessLevel.AUTHENTICATED:
        return { success: true, user };

      case AccessLevel.ADMIN:
        if (user.role !== "admin") {
          return {
            success: false,
            error: "Admin access required",
            statusCode: 403,
          };
        }
        break;

      case AccessLevel.ORGANIZATION:
        if (user.role !== "organization") {
          return {
            success: false,
            error: "Organization access required",
            statusCode: 403,
          };
        }
        break;

      case AccessLevel.VOTER:
        if (user.role !== "voter") {
          return {
            success: false,
            error: "Voter access required",
            statusCode: 403,
          };
        }
        break;

      case AccessLevel.ADMIN_OR_ORGANIZATION:
        if (!["admin", "organization"].includes(user.role)) {
          return {
            success: false,
            error: "Admin or organization access required",
            statusCode: 403,
          };
        }
        break;

      case AccessLevel.SELF_OR_ADMIN:
        if (user.role !== "admin" && user.userId !== resourceUserId) {
          return {
            success: false,
            error: "Access denied - can only access own resources",
            statusCode: 403,
          };
        }
        break;
    }

    return { success: true, user };
  }

  /**
   * Create API route middleware wrapper
   */
  createApiMiddleware(config: MiddlewareConfig = {}) {
    return async (
      request: NextRequest,
      handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
    ): Promise<NextResponse> => {
      const result = await this.authenticate(request, config);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.statusCode || 500 },
        );
      }

      // Add user to request object
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = result.user;
      authenticatedRequest.userId = result.user?.userId;

      return handler(authenticatedRequest);
    };
  }

  /**
   * Create role-based API middleware
   */
  createRoleMiddleware(
    allowedRoles: Array<"admin" | "organization" | "voter">,
  ) {
    return this.createApiMiddleware({
      requireAuth: true,
      allowedRoles,
    });
  }

  /**
   * Extract authentication token from request
   */
  private extractToken(request: NextRequest): string | null {
    // Check Authorization header
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      return auth.extractToken(authHeader);
    }

    // Check cookies (for browser requests)
    const cookieToken = request.cookies.get("accessToken")?.value;
    if (cookieToken) {
      return cookieToken;
    }

    // Check query parameter (for SSE or special cases)
    const queryToken = request.nextUrl.searchParams.get("token");
    if (queryToken) {
      return queryToken;
    }

    return null;
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string {
    // Check various headers for IP
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
      return forwardedFor.split(",")[0].trim();
    }

    const realIP = request.headers.get("x-real-ip");
    if (realIP) {
      return realIP;
    }

    const cfConnectingIP = request.headers.get("cf-connecting-ip");
    if (cfConnectingIP) {
      return cfConnectingIP;
    }

    return "unknown";
  }

  /**
   * Rate limiting helper
   */
  async checkRateLimit(
    request: NextRequest,
    key: string,
    maxRequests: number = 100,
    windowMs: number = 15 * 60 * 1000, // 15 minutes
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    // This is a simple in-memory rate limiter
    // In production, you'd want to use Redis or a proper rate limiting service

    // Note: In production, would get IP and create identifier for rate limiting
    // const ip = this.getClientIP(request);
    // const identifier = `${key}:${ip}`;
    // For now, return allowed (implement proper rate limiting in production)
    return {
      allowed: true,
      remaining: maxRequests,
      resetTime: Date.now() + windowMs,
    };
  }

  /**
   * Validate session for long-running operations
   */
  async validateSession(userId: string): Promise<boolean> {
    try {
      const user = await UserService.findById(parseInt(userId));
      return user !== null && user.status === "active";
    } catch (error) {
      log.exception(error as Error, "AUTH_MIDDLEWARE", {
        operation: "validateSession",
        userId,
      });
      return false;
    }
  }
}

// Create singleton instance
const authMiddleware = new AuthMiddleware();

// Export convenience functions
export const protect = {
  /**
   * Protect API route with authentication
   */
  api: (config?: MiddlewareConfig) =>
    authMiddleware.createApiMiddleware(config),

  /**
   * Protect API route with role-based access
   */
  role: (roles: Array<"admin" | "organization" | "voter">) =>
    authMiddleware.createRoleMiddleware(roles),

  /**
   * Admin only access
   */
  admin: () => authMiddleware.createRoleMiddleware(["admin"]),

  /**
   * Organization only access
   */
  organization: () => authMiddleware.createRoleMiddleware(["organization"]),

  /**
   * Voter only access
   */
  voter: () => authMiddleware.createRoleMiddleware(["voter"]),

  /**
   * Admin or organization access
   */
  adminOrOrganization: () =>
    authMiddleware.createRoleMiddleware(["admin", "organization"]),

  /**
   * Authenticate request and return user
   */
  authenticate: (request: NextRequest, config?: MiddlewareConfig) =>
    authMiddleware.authenticate(request, config),

  /**
   * Authorize request with access level
   */
  authorize: (
    request: NextRequest,
    accessLevel: AccessLevel,
    resourceUserId?: string,
  ) => authMiddleware.authorize(request, accessLevel, resourceUserId),
};

// Export utilities
export { authMiddleware };

// Default export
export default protect;
