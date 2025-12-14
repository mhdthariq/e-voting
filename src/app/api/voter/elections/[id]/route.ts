import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth/jwt";

const prisma = new PrismaClient();

// FIX: Change the type definition to use Promise
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    // FIX: Await the params before accessing id
    const params = await props.params;

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try { const verification = await auth.verifyToken(token); decoded = verification.payload; } catch { return NextResponse.json({ success: false }, { status: 401 }); }
    
    const userId = typeof decoded?.userId === "string" ? parseInt(decoded.userId, 10) : decoded?.userId;
    if (!userId) return NextResponse.json({ success: false }, { status: 401 });

    const electionId = parseInt(params.id);
    if (isNaN(electionId)) return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });

    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        organization: { select: { username: true } },
        candidates: { orderBy: { id: 'asc' } }
      }
    });

    if (!election) {
      return NextResponse.json({ success: false, message: "Election not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: election
    });

  } catch (error) {
    console.error("Detail Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}