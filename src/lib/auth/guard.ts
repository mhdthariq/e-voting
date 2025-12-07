import { NextRequest, NextResponse } from "next/server";
import { protect, MiddlewareConfig, AuthenticatedRequest } from "./middleware";

type RouteHandler = (req: AuthenticatedRequest, context?: unknown) => Promise<NextResponse>;

/**
 * Wrapper for API routes to enforce authentication and access control.
 * 
 * Usage:
 * export const POST = withAuth(async (req) => {
 *   // req.user is available here
 *   return NextResponse.json({ ... });
 * }, { allowedRoles: ["admin"] });
 */
export function withAuth(
  handler: RouteHandler,
  config: MiddlewareConfig = { requireAuth: true }
) {
  return async (req: NextRequest, context?: unknown) => {
    const middleware = protect.api(config);
    return middleware(req, (authenticatedReq) => handler(authenticatedReq, context));
  };
}

/**
 * Wrapper specifically for Admin-only routes
 */
export function withAdminAuth(handler: RouteHandler) {
  return withAuth(handler, { allowedRoles: ["admin"], requireAuth: true });
}

/**
 * Wrapper specifically for Organization-only routes
 */
export function withOrgAuth(handler: RouteHandler) {
  return withAuth(handler, { allowedRoles: ["organization"], requireAuth: true });
}

/**
 * Wrapper for routes accessible by Admin or Organization
 */
export function withAdminOrOrgAuth(handler: RouteHandler) {
  return withAuth(handler, { allowedRoles: ["admin", "organization"], requireAuth: true });
}

/**
 * Wrapper for Voter-only routes
 */
export function withVoterAuth(handler: RouteHandler) {
  return withAuth(handler, { allowedRoles: ["voter"], requireAuth: true });
}
