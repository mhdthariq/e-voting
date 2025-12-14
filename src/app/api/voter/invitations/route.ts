/**
 * Voter Invitations API Route for BlockVote
 * POST /api/voter/invitations - Respond to election invitations (accept/decline)
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth/jwt";
import { AuditService } from "@/lib/database/services/audit.service";
import { log } from "@/utils/logger";
import { z } from "zod";

const prisma = new PrismaClient();

// Validation schema for invitation response
const invitationResponseSchema = z.object({
  participationId: z.number().int().positive("Participation ID must be a positive integer"),
  // FIX: Gunakan properti 'message' (atau 'invalid_type_error' jika didukung) 
  // karena 'errorMap' tidak dikenali oleh overload tipe ini.
  action: z.enum(["accept", "decline"], {
    message: "Action must be either 'accept' or 'decline'",
  }),
});

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie or header
    let token = null;
    const authHeader = request.headers.get("authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        const cookies = cookieHeader
          .split(";")
          .map((c) => c.trim())
          .reduce(
            (acc, cookie) => {
              const [key, value] = cookie.split("=");
              if (key && value) {
                acc[key] = decodeURIComponent(value);
              }
              return acc;
            },
            {} as Record<string, string>,
          );
        token = cookies.accessToken;
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const tokenResult = await auth.verifyToken(token);
    if (!tokenResult.isValid || !tokenResult.payload?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: tokenResult.expired ? "Token expired" : "Invalid token",
        },
        { status: 401 }
      );
    }

    const userId = parseInt(tokenResult.payload.userId);

    // Get user and verify voter role
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // FIX 1: Handle Case Sensitivity for Role (VOTER vs voter)
    const userRole = (user.role as string).toLowerCase();
    if (userRole !== "voter") {
      return NextResponse.json(
        { success: false, message: "Voter access required" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = invitationResponseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request data",
          errors: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { participationId, action } = validation.data;

    // Find the participation record
    const participation = await prisma.userElectionParticipation.findUnique({
      where: { id: participationId },
      include: {
        election: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!participation) {
      return NextResponse.json(
        { success: false, message: "Invitation not found" },
        { status: 404 }
      );
    }

    // Verify the invitation belongs to the current user
    if (participation.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "You can only respond to your own invitations" },
        { status: 403 }
      );
    }

    // FIX 2: Check against Uppercase "PENDING"
    // Prisma Enums are returned as "PENDING", so checking against "pending" would fail
    // and make the system think you already responded.
    if (participation.inviteStatus !== "PENDING") {
      return NextResponse.json(
        { 
          success: false, 
          message: `You have already ${participation.inviteStatus} this invitation` 
        },
        { status: 400 }
      );
    }

    // FIX 3: Use Uppercase Enum Values for Update
    const inviteStatus = action === "accept" ? "ACCEPTED" : "DECLINED";
    
    const updatedParticipation = await prisma.userElectionParticipation.update({
      where: { id: participationId },
      data: {
        // //@ts-ignore - Prisma types might complain about string vs Enum, but string literal works
        inviteStatus: inviteStatus, 
        respondedAt: new Date(),
      },
    });

    // NOTE: We removed the duplicate insert into electionVoter table
    // relying on UserElectionParticipation status being 'ACCEPTED' for voting eligibility.

    // Create audit log
    await AuditService.createAuditLog(
      userId,
      `INVITATION_${action.toUpperCase()}`,
      "PARTICIPATION",
      participationId,
      `Voter ${action}ed invitation to election ${participation.electionId}`,
      request.headers.get("x-forwarded-for") || "unknown",
      request.headers.get("user-agent") || "unknown"
    );

    log.info(`Invitation ${action}ed successfully`, "VOTER_INVITATION", {
      userId,
      participationId,
      electionId: participation.electionId,
      action,
    });

    return NextResponse.json({
      success: true,
      message: `Invitation ${action}ed successfully`,
      data: {
        participationId: updatedParticipation.id,
        electionId: updatedParticipation.electionId,
        inviteStatus,
        respondedAt: updatedParticipation.respondedAt?.toISOString(),
      },
    });
  } catch (error) {
    log.exception(error as Error, "VOTER_INVITATION", {
      path: "/api/voter/invitations",
    });

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}