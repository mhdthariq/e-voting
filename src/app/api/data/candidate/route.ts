import { NextResponse } from "next/server";
import { CandidateService } from "@/lib/database/services/candidate.service";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Optional: get electionId from query param ?electionId=1
    const { searchParams } = new URL(req.url);
    const electionIdParam = searchParams.get("electionId");
    const electionId = electionIdParam ? parseInt(electionIdParam, 10) : null;

    let data;

    // ✅ Fetch candidates per election if provided, else all
    if (electionId) {
      data = await CandidateService.getByElectionId(electionId);
    } else {
      data = await CandidateService.findAll();
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("❌ Candidate API error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch candidates" },
      { status: 500 }
    );
  }
}
