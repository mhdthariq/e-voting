/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Bulk Voter Creation API Endpoints
 * Handles bulk voter creation and management
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { voterCreation } from "@/lib/auth/voter-creation";
import { log } from "@/utils/logger";
import { withAdminOrOrgAuth, withAuth } from "@/lib/auth/guard";
import { AuthenticatedRequest } from "@/lib/auth/middleware";

// Validation schemas
const voterDataSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .optional(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const bulkVoterCreationSchema = z.object({
  electionId: z.number().int().positive("Invalid election ID"),
  organizationId: z.number().int().positive("Invalid organization ID"),
  voters: z.array(voterDataSchema).min(1, "At least one voter is required"),
  generatePasswords: z.boolean().default(true),
  passwordLength: z.number().int().min(8).max(32).default(12),
  sendCredentials: z.boolean().default(false),
});

const csvUploadSchema = z.object({
  electionId: z.number().int().positive("Invalid election ID"),
  organizationId: z.number().int().positive("Invalid organization ID"),
  csvContent: z.string().min(1, "CSV content is required"),
  generatePasswords: z.boolean().default(true),
  passwordLength: z.number().int().min(8).max(32).default(12),
  sendCredentials: z.boolean().default(false),
});

// Helper to get client info
function getClientInfo(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return {
    ipAddress: forwarded?.split(",")[0] || realIp || "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  };
}

/**
 * POST /api/voters - Create bulk voters
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const POST = withAdminOrOrgAuth(async (req: AuthenticatedRequest) => {
  const request = req;
  try {
    const body = await request.json();
    const clientInfo = getClientInfo(request);
    
    // User is guaranteed to exist by the guard
    const user = request.user!;

    // Validate request body
    const validation = bulkVoterCreationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid input",
          errors: validation.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const voterData = validation.data;

    // Create bulk voters
    const result = await voterCreation.createBulk({
      ...voterData,
      createdBy: parseInt(user.userId),
      ...clientInfo,
    });

    const statusCode = result.success ? 201 : 400;

    log.auth("Bulk voter creation attempt", {
      electionId: voterData.electionId,
      organizationId: voterData.organizationId,
      totalVoters: voterData.voters.length,
      created: result.created,
      failed: result.failed,
      createdBy: user.userId,
      ...clientInfo,
    });

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        totalVoters: result.totalVoters,
        created: result.created,
        skipped: result.skipped,
        failed: result.failed,
        errors: result.errors,
        credentials: result.credentials,
      },
      { status: statusCode },
    );
  } catch (error) {
    log.exception(error as Error, "AUTH", {
      operation: "bulkVoterCreation",
    });

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
});

/**
 * PUT /api/voters - Upload CSV and create voters
 */
export const PUT = withAdminOrOrgAuth(async (req) => {
  const request = req as AuthenticatedRequest;
  try {
    const body = await request.json();
    const clientInfo = getClientInfo(request);
    
    const user = request.user!;

    // Validate request body
    const validation = csvUploadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid input",
          errors: validation.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const csvData = validation.data;

    // Parse CSV content
    const parseResult = voterCreation.parseCSV(csvData.csvContent);
    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "CSV parsing failed",
          errors: parseResult.errors,
        },
        { status: 400 },
      );
    }

    if (parseResult.voters.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid voters found in CSV",
        },
        { status: 400 },
      );
    }

    // Create bulk voters
    const result = await voterCreation.createBulk({
      electionId: csvData.electionId,
      organizationId: csvData.organizationId,
      voters: parseResult.voters,
      generatePasswords: csvData.generatePasswords,
      passwordLength: csvData.passwordLength,
      sendCredentials: csvData.sendCredentials,
      createdBy: parseInt(user.userId),
      ...clientInfo,
    });

    const statusCode = result.success ? 201 : 400;

    log.auth("CSV voter creation attempt", {
      electionId: csvData.electionId,
      organizationId: csvData.organizationId,
      totalVoters: parseResult.voters.length,
      created: result.created,
      failed: result.failed,
      createdBy: user.userId,
      ...clientInfo,
    });

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        totalVoters: result.totalVoters,
        created: result.created,
        skipped: result.skipped,
        failed: result.failed,
        errors: result.errors,
        credentials: result.credentials,
      },
      { status: statusCode },
    );
  } catch (error) {
    log.exception(error as Error, "AUTH", {
      operation: "csvVoterCreation",
    });

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
});

/**
 * GET /api/voters?electionId=... - Get voter statistics
 */
export const GET = withAuth(async (req) => {
  // Use generic withAuth because this might be accessible by multiple roles if we expand it
  // But for now it's mostly admin/org. Original code just checked login.
  // Original allowed any logged in user? No, original checked:
  // if (user.role !== "admin" && user.role !== "organization") (implied by bulk/csv endpoints? No GET also checked?)
  // Wait, GET is for stats. Original GET code:
  // Authenticate user -> getUserFromToken
  // No role check explicit in GET logic in original code I pasted?
  // Let me check the original GET code again.
  // "const user = await getUserFromToken(request); if (!user) ... return 401;"
  // Then "if (action === 'stats' ...)"
  // Does it check role? No. So any user could get stats?
  // The POST/PUT checked role.
  // I will check if I should restrict GET. The audit didn't specify. I'll stick to preserving original behavior which was just "Authenticated".
  // Actually, I should probably restrict stats to admin/org too for consistency, but to be safe I'll just use withAuth (any authenticated user).
  
  const request = req as AuthenticatedRequest;
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get("electionId");
    const action = searchParams.get("action");

    if (action === "stats" && electionId) {
      // Get voter statistics
      const stats = await voterCreation.getStats(parseInt(electionId));

      return NextResponse.json({
        success: true,
        statistics: stats,
      });
    }

    // Default: return API info
    return NextResponse.json({
      success: true,
      message: "Voter creation API is active",
      endpoints: {
        "POST /api/voters": "Create bulk voters",
        "PUT /api/voters": "Upload CSV and create voters",
        "GET /api/voters?action=stats&electionId=N": "Get voter statistics",
      },
    });
  } catch (error) {
    log.exception(error as Error, "AUTH", {
      operation: "voterStats",
    });

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
});
