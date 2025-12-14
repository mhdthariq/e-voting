import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database/client";
import { auth } from "@/lib/auth/jwt";
import { Prisma } from "@prisma/client";

// GET /api/admin/blockchain
export async function GET(req: NextRequest) {
  try {
    // 1. Auth Check (Admin Only)
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const decoded = await auth.verifyToken(token);
    if (!decoded.isValid || !decoded.payload || decoded.payload.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    // 2. Parse Query Params
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const electionId = searchParams.get("electionId");

    const skip = (page - 1) * limit;

    // 3. Build Where Clause
    const where: Prisma.BlockchainBlockWhereInput = {};
    if (electionId && electionId !== "ALL") {
      where.electionId = parseInt(electionId);
    }

    // 4. Fetch Data
    const [blocks, total] = await Promise.all([
      prisma.blockchainBlock.findMany({
        where,
        orderBy: { blockIndex: "asc" },
        skip,
        take: limit,
        include: {
          election: {
            select: {
              title: true,
            },
          },
        },
      }),
      prisma.blockchainBlock.count({ where }),
    ]);

    // 5. Enhance Data (Parse JSON votesData)
    const enhancedBlocks = blocks.map((block) => {
        let parsedVotes = [];
        try {
            parsedVotes = JSON.parse(block.votesData);
        } catch {
            console.error("Failed to parse votesData for block", block.id);
        }

        return {
            ...block,
            voteCount: parsedVotes.length,
            parsedVotes: parsedVotes
        };
    });

    return NextResponse.json({
      success: true,
      data: enhancedBlocks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Blockchain API Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
