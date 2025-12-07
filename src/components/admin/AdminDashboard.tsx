"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "./AdminLayout";
import OverviewTab from "./OverviewTab";
import UsersTab from "./UsersTab";
import OrganizationsTab from "./OrganizationsTab";
import AuditLogsTab from "./AuditLogsTab";
import ElectionsTab from "./ElectionsTab";
import SettingsTab from "./SettingsTab";
import { GlassCard } from "@/components/ui/glass-card";
import { Settings, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { User } from "@/types";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "organizations" | "system" | "logs" | "elections">("overview");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Auth check
    const checkAuth = () => {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("accessToken");

      if (!storedUser || !token) {
        router.push("/auth/login");
        return;
      }

      const userData = JSON.parse(storedUser);
      if (userData.role !== "admin") {
        router.push("/auth/login");
        return;
      }

      setUser(userData);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
       <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
       </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab />;
      case "users":
        return <UsersTab />;
      case "organizations":
        return <OrganizationsTab />;
      case "logs":
        return <AuditLogsTab />;
      case "elections":
        return <ElectionsTab />;
      case "system":
        return <SettingsTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <AdminLayout 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      user={user}
    >
      {renderTabContent()}
    </AdminLayout>
  );
}
