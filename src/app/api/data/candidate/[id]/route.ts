import { NextResponse } from "next/server";
import { CandidateService } from "@/lib/database/services/candidate.service";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const candidateId = parseInt(params.id, 10);
    if (isNaN(candidateId)) {
      return NextResponse.json({ success: false, message: "Invalid candidate ID" }, { status: 400 });
    }

    const candidate = await CandidateService.findById(candidateId);
    if (!candidate) {
      return NextResponse.json({ success: false, message: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: candidate }, { status: 200 });
  } catch (error) {
    console.error("❌ Candidate by ID API error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch candidate" },
      { status: 500 }
    );
  }
}
