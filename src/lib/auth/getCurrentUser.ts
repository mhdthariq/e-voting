// lib/auth/getCurrentUser.ts
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { UserService } from "@/lib/database/services/user.service";

export async function getCurrentUser() {
  const token = (await cookies()).get("accessToken")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await UserService.findById(parseInt(decoded.userId));
    if (!user || user.status !== "active") return null;

    return {
      id: user.id,
      name: user.username,
      email: user.email,
      role: user.role,
    };
  } catch {
    return null;
  }
}
