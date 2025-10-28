// app/dashboard/user/layout.tsx
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { redirect } from "next/navigation";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // ✅ Only allow voter-level users
  if (!user || user.role !== "voter") {
    redirect("/dashboard"); // fallback to main router logic
  }

  return <>{children}</>;
}
