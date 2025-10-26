// dashboard/page.tsx
import DashboardClient from "./dashboardClient";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`${process.env.NEXT_PUBLIC_APP_URL}`);
  }

  return <DashboardClient user={user} />;
}
