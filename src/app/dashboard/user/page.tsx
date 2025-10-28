import DashboardClient from "../dashboardClient";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export default async function UserHomePage() {
  const user = await getCurrentUser();

  return (
    <div>
      <DashboardClient user={user || { name: "Voter" }} />
    </div>
  );
}
