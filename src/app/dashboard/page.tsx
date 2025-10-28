// dashboard/page.tsx
import DashboardClient from "./dashboardClient";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`${process.env.NEXT_PUBLIC_APP_URL}`);
  }

  // Redirect based on role
    switch (user.role) {
    case "admin":
      redirect("/dashboard/admin");
      break;
    case "organization":
      redirect("/dashboard/organization");
      break;
    default:
      redirect("/dashboard/user");
  }
}
