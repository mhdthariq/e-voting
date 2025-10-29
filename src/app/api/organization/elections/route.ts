import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth/jwt";
import { AuditService } from "@/lib/database/services/audit.service";

const prisma = new PrismaClient();

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
    const decoded = auth.verifyToken(token).payload;

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 },
      );
    }

    // Get user and verify organization role
    const user = await prisma.user.findUnique({
      where: { id: parseInt(decoded.userId) },
    });

    if (!user || user.role !== "ORGANIZATION") {
      return NextResponse.json(
        { success: false, message: "Organization access required" },
        { status: 403 },
      );
    }

    // Get organization elections with related data
    const elections = await prisma.election.findMany({
      where: {
        organizationId: user.id,
      },
      include: {
        candidates: {
          orderBy: { id: "asc" },
        },
        _count: {
          select: {
            votes: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Create audit log
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

    return NextResponse.json({
      success: true,
      data: elections,
    });
  } catch (error) {
    console.error("Error fetching organization elections:", error);
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
  } finally {
    await prisma.$disconnect();
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
    const decoded = auth.verifyToken(token).payload;

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 },
      );
    }

    // Get user and verify organization role
    const user = await prisma.user.findUnique({
      where: { id: parseInt(decoded.userId) },
    });

    if (!user || user.role !== "ORGANIZATION") {
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

    // Create election with candidates in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the election
      const election = await tx.election.create({
        data: {
          title,
          description,
          startDate: start,
          endDate: end,
          organizationId: user.id,
          status: "DRAFT",
        },
      });

      // Create candidates
      const createdCandidates = await Promise.all(
        candidates.map((candidate: { name: string; description: string }) =>
          tx.candidate.create({
            data: {
              electionId: election.id,
              name: candidate.name,
              description: candidate.description,
            },
          }),
        ),
      );

      // Initialize election statistics
      await tx.electionStatistics.create({
        data: {
          electionId: election.id,
          totalRegisteredVoters: 0,
          totalVotesCast: 0,
          participationRate: 0.0,
        },
      });

      return { election, candidates: createdCandidates };
    });

    // Create audit log
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
  } finally {
    await prisma.$disconnect();
  }
}
