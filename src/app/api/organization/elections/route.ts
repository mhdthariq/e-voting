import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/jwt";
import { UserService } from "@/services/UserService";
import { ElectionService } from "@/services/ElectionService";
import { AuditService } from "@/lib/database/services/audit.service";

const userService = new UserService();
const electionService = new ElectionService();

/**
 * GET /api/organization/elections
 * Get elections for the authenticated organization
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = auth.verifyToken(token).payload;
    } catch (error) {
      console.error("Token verification failed:", error);
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 },
      );
    }

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, message: "Invalid token payload" },
        { status: 401 },
      );
    }

    // Convert userId to number
    const userId =
      typeof decoded.userId === "string"
        ? parseInt(decoded.userId, 10)
        : decoded.userId;

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, message: "Invalid user ID in token" },
        { status: 401 },
      );
    }

    // Get user and verify organization role
    const user = await userService.getUserProfile(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    if ((user.role as string).toUpperCase() !== "ORGANIZATION") {
      return NextResponse.json(
        { success: false, message: "Organization access required" },
        { status: 403 },
      );
    }

    // Get organization elections with related data
    const elections = await electionService.getElectionsByOrganizationWithStats(user.id);

    // Create audit log (don't fail if this errors)
    try {
      await AuditService.createAuditLog(
        user.id,
        "VIEW",
        "ORGANIZATION_ELECTIONS",
        undefined,
        `Viewed ${elections.length} elections`,
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown",
        request.headers.get("user-agent") || "unknown",
      );
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json({
      success: true,
      data: elections,
    });
  } catch (error) {
    console.error("Error fetching organization elections:", error);

    // Log detailed error information
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/organization/elections
 * Create a new election for the authenticated organization
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = auth.verifyToken(token).payload;
    } catch (error) {
      console.error("Token verification failed:", error);
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 },
      );
    }

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, message: "Invalid token payload" },
        { status: 401 },
      );
    }

    // Convert userId to number
    const userId =
      typeof decoded.userId === "string"
        ? parseInt(decoded.userId, 10)
        : decoded.userId;

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, message: "Invalid user ID in token" },
        { status: 401 },
      );
    }

    // Get user and verify organization role
    const user = await userService.getUserProfile(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    if ((user.role as string).toUpperCase() !== "ORGANIZATION") {
      return NextResponse.json(
        { success: false, message: "Organization access required" },
        { status: 403 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, description, startDate, endDate, candidates } = body;

    // Validate required fields
    if (!title || !description || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (start < now) {
      return NextResponse.json(
        { success: false, message: "Start date cannot be in the past" },
        { status: 400 },
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { success: false, message: "End date must be after start date" },
        { status: 400 },
      );
    }

    // Validate candidates
    if (!candidates || !Array.isArray(candidates) || candidates.length < 2) {
      return NextResponse.json(
        { success: false, message: "At least 2 candidates are required" },
        { status: 400 },
      );
    }

    // Validate each candidate
    for (const candidate of candidates) {
      if (!candidate.name || !candidate.description) {
        return NextResponse.json(
          {
            success: false,
            message: "All candidates must have name and description",
          },
          { status: 400 },
        );
      }
    }

    // Create election with candidates through Service
    const result = await electionService.createElectionWithCandidates(
      {
        title,
        description,
        startDate: start,
        endDate: end,
        organization: { connect: { id: user.id } },
        status: "DRAFT",
      },
      candidates
    );

    // Create audit log (don't fail if this errors)
    try {
      await AuditService.createAuditLog(
        user.id,
        "CREATE",
        "ELECTION",
        result.election.id,
        `Created election: ${title}`,
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown",
        request.headers.get("user-agent") || "unknown",
      );
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result.election,
        candidates: result.candidates,
      },
      message: "Election created successfully",
    });
  } catch (error) {
    console.error("Error creating election:", error);

    // Log detailed error information
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 },
    );
  }
}
