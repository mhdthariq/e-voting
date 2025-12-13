import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth/jwt";
import { AuditService } from "@/lib/database/services/audit.service";

const prisma = new PrismaClient();

/**
 * GET /api/admin/elections
 * Get all elections for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify Authentication
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

    // Convert userId to number if string
    const userId =
      typeof decoded.userId === "string"
        ? parseInt(decoded.userId, 10)
        : decoded.userId;

    // 2. Verify Admin Role
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 },
      );
    }

    // 3. Fetch Elections with Details
    const elections = await prisma.election.findMany({
      include: {
        organization: {
          select: {
            username: true,
            email: true,
            profileImage: true,
          }
        },
        _count: {
          select: {
            votes: true,
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 4. Create Audit Log (Optional but good for tracking)
    // Don't await strictly if performance is key, but good practice to ensure log
    await AuditService.createAuditLog(
      user.id,
      "VIEW",
      "ALL_ELECTIONS",
      undefined,
      `Admin viewed all ${elections.length} elections`,
      request.headers.get("x-forwarded-for") || "unknown",
      request.headers.get("user-agent") || "unknown",
    );

    return NextResponse.json({
      success: true,
      data: elections,
    });

  } catch (error) {
    console.error("Error fetching all elections:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
      },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
