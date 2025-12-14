/**
 * Security Middleware Helper
 * Reusable security layer for API endpoints
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/jwt";
import { AuditService } from "@/lib/database/services/audit.service";
import {
  rateLimiter,
  RateLimitConfig,
  getUserIdentifier,
} from "@/lib/security/rate-limit";
import {
  createSecureResponse,
  addRateLimitHeaders,
} from "@/lib/security/headers";
import { isValidId } from "@/lib/security/validation";

export interface SecurityOptions {
  /** Require authentication */
  requireAuth?: boolean;
  /** Required role(s) */
  requiredRole?:
    | "admin"
    | "organization"
    | "voter"
    | ("admin" | "organization" | "voter")[];
  /** Rate limit configuration */
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
    blockDurationMs: number;
  };
  /** Enable audit logging */
  auditLog?: boolean;
  /** Audit action type */
  auditAction?: string;
  /** Audit entity type */
  auditEntity?: string;
}

export interface SecurityContext {
  userId: number;
  userRole: string;
  user?: {
    id: number;
    email: string;
    username: string;
    role: string;
  };
  ipAddress: string;
  userAgent: string;
  rateLimit: {
    remaining: number;
    resetTime: number;
    limit: number;
  };
}

/**
 * Apply security middleware to an API endpoint
 * Returns null if security checks pass, or a Response if blocked
 */
export async function securityMiddleware(
  req: NextRequest,
  options: SecurityOptions = {},
): Promise<{
  error?: ReturnType<typeof createSecureResponse>;
  context?: SecurityContext;
}> {
  const {
    requireAuth = true,
    requiredRole,
    rateLimit = RateLimitConfig.read,
    auditLog = false,
  } = options;

  const origin = req.headers.get("origin");
  const ipAddress = getUserIdentifier(req);
  const userAgent = req.headers.get("user-agent") || "unknown";

  try {
    // ---------- 1. IP-based Rate Limiting ----------
    const clientRateLimit = rateLimiter.check(
      ipAddress,
      rateLimit.maxRequests,
      rateLimit.windowMs,
      rateLimit.blockDurationMs,
    );

    if (!clientRateLimit.allowed) {
      const response = createSecureResponse(
        {
          success: false,
          message: "Too many requests. Please try again later.",
          retryAfter: clientRateLimit.retryAfter,
        },
        429,
        origin,
      );
      return {
        error: addRateLimitHeaders(
          response,
          rateLimit.maxRequests,
          0,
          clientRateLimit.resetTime,
        ),
      };
    }

    // ---------- 2. Authentication (if required) ----------
    if (requireAuth) {
      const authHeader = req.headers.get("authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return {
          error: createSecureResponse(
            { success: false, message: "Authentication required" },
            401,
            origin,
          ),
        };
      }

      const token = authHeader.substring(7);
      let decoded;
      try {
        const verification = await auth.verifyToken(token);
        decoded = verification.payload;
      } catch {
        return {
          error: createSecureResponse(
            { success: false, message: "Invalid or expired token" },
            401,
            origin,
          ),
        };
      }

      if (!decoded || !decoded.userId) {
        return {
          error: createSecureResponse(
            { success: false, message: "Invalid token payload" },
            401,
            origin,
          ),
        };
      }

      const userId =
        typeof decoded.userId === "string"
          ? parseInt(decoded.userId, 10)
          : decoded.userId;

      if (isNaN(userId)) {
        return {
          error: createSecureResponse(
            { success: false, message: "Invalid user ID in token" },
            401,
            origin,
          ),
        };
      }

      // ---------- 3. User-based Rate Limiting (higher limit) ----------
      const userRateLimit = rateLimiter.check(
        getUserIdentifier(req, userId),
        rateLimit.maxRequests * 2,
        rateLimit.windowMs,
        rateLimit.blockDurationMs,
      );

      if (!userRateLimit.allowed) {
        const response = createSecureResponse(
          {
            success: false,
            message: "Too many requests. Please try again later.",
            retryAfter: userRateLimit.retryAfter,
          },
          429,
          origin,
        );
        return {
          error: addRateLimitHeaders(
            response,
            rateLimit.maxRequests * 2,
            0,
            userRateLimit.resetTime,
          ),
        };
      }

      // ---------- 4. Role Validation (if required) ----------
      const userRole = decoded.role?.toLowerCase();
      if (requiredRole) {
        const allowedRoles = Array.isArray(requiredRole)
          ? requiredRole
          : [requiredRole];

        if (
          !allowedRoles.includes(userRole as "admin" | "organization" | "voter")
        ) {
          // Audit unauthorized role access
          if (auditLog) {
            try {
              await AuditService.createAuditLog(
                userId,
                "UNAUTHORIZED_ROLE_ACCESS",
                options.auditEntity || "UNKNOWN",
                undefined,
                `User with role ${userRole} attempted to access ${requiredRole} endpoint`,
                ipAddress,
                userAgent,
              );
            } catch (e) {
              console.error("Audit log failed:", e);
            }
          }

          return {
            error: createSecureResponse(
              { success: false, message: "Insufficient permissions" },
              403,
              origin,
            ),
          };
        }
      }

      // ---------- Return Security Context ----------
      return {
        context: {
          userId,
          userRole,
          user: {
            id: userId,
            email: decoded.email || "",
            username: decoded.username || "",
            role: userRole,
          },
          ipAddress,
          userAgent,
          rateLimit: {
            remaining: userRateLimit.remaining,
            resetTime: userRateLimit.resetTime,
            limit: rateLimit.maxRequests * 2,
          },
        },
      };
    } else {
      // No auth required - return basic context
      return {
        context: {
          userId: 0,
          userRole: "anonymous",
          ipAddress,
          userAgent,
          rateLimit: {
            remaining: clientRateLimit.remaining,
            resetTime: clientRateLimit.resetTime,
            limit: rateLimit.maxRequests,
          },
        },
      };
    }
  } catch (error) {
    console.error("Security middleware error:", error);
    return {
      error: createSecureResponse(
        { success: false, message: "Security check failed" },
        500,
        origin,
      ),
    };
  }
}

/**
 * Helper to validate resource ownership
 */
export async function validateOwnership<
  T extends { organizationId?: number; userId?: number },
>(
  resource: T | null,
  userId: number,
  options: {
    auditLog?: boolean;
    entityType?: string;
    entityId?: number;
    ipAddress?: string;
    userAgent?: string;
  } = {},
): Promise<{ error?: ReturnType<typeof createSecureResponse> }> {
  if (!resource) {
    return {
      error: createSecureResponse(
        { success: false, message: "Resource not found" },
        404,
      ),
    };
  }

  const ownerId = resource.organizationId || resource.userId;
  if (ownerId && ownerId !== userId) {
    // Log unauthorized access attempt
    if (options.auditLog) {
      try {
        await AuditService.createAuditLog(
          userId,
          "UNAUTHORIZED_ACCESS",
          options.entityType || "RESOURCE",
          options.entityId,
          `Attempted to access ${options.entityType || "resource"} ${options.entityId || ""}`,
          options.ipAddress || "unknown",
          options.userAgent || "unknown",
        );
      } catch (e) {
        console.error("Audit log failed:", e);
      }
    }

    return {
      error: createSecureResponse(
        { success: false, message: "Access denied to this resource" },
        403,
      ),
    };
  }

  return {};
}

/**
 * Helper to validate and parse ID parameter
 */
export function validateIdParam(id: string | undefined | null): {
  error?: ReturnType<typeof createSecureResponse>;
  id?: number;
} {
  if (!id || !isValidId(id)) {
    return {
      error: createSecureResponse(
        { success: false, message: "Invalid ID format" },
        400,
      ),
    };
  }

  return { id: parseInt(id, 10) };
}

/**
 * Create audit log entry
 */
export async function createAuditLog(
  context: SecurityContext,
  action: string,
  entity: string,
  entityId?: number,
  description?: string,
): Promise<void> {
  try {
    await AuditService.createAuditLog(
      context.userId,
      action,
      entity,
      entityId,
      description || `${action} on ${entity}`,
      context.ipAddress,
      context.userAgent,
    );
  } catch (e) {
    console.error("Audit log failed:", e);
  }
}

/**
 * Preset security configurations for common endpoint types
 */
export const SecurityPresets = {
  /** Public endpoints (no auth required) */
  public: {
    requireAuth: false,
    rateLimit: RateLimitConfig.read,
    auditLog: false,
  },

  /** Authentication endpoints (strict rate limiting) */
  auth: {
    requireAuth: false,
    rateLimit: RateLimitConfig.auth,
    auditLog: true,
    auditAction: "AUTH_ATTEMPT",
    auditEntity: "AUTH",
  },

  /** Admin read endpoints */
  adminRead: {
    requireAuth: true,
    requiredRole: "admin" as const,
    rateLimit: RateLimitConfig.admin,
    auditLog: true,
  },

  /** Admin write endpoints */
  adminWrite: {
    requireAuth: true,
    requiredRole: "admin" as const,
    rateLimit: RateLimitConfig.write,
    auditLog: true,
  },

  /** Organization read endpoints */
  organizationRead: {
    requireAuth: true,
    requiredRole: "organization" as const,
    rateLimit: RateLimitConfig.read,
    auditLog: false,
  },

  /** Organization write endpoints */
  organizationWrite: {
    requireAuth: true,
    requiredRole: "organization" as const,
    rateLimit: RateLimitConfig.write,
    auditLog: true,
  },

  /** Voter read endpoints */
  voterRead: {
    requireAuth: true,
    requiredRole: "voter" as const,
    rateLimit: RateLimitConfig.read,
    auditLog: false,
  },

  /** Voting endpoints (critical) */
  voting: {
    requireAuth: true,
    requiredRole: "voter" as const,
    rateLimit: RateLimitConfig.vote,
    auditLog: true,
    auditAction: "VOTE",
    auditEntity: "VOTE",
  },

  /** User profile endpoints */
  userProfile: {
    requireAuth: true,
    rateLimit: RateLimitConfig.read,
    auditLog: false,
  },
} as const;
