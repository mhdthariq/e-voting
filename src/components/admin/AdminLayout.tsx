"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Settings, 
  FileText, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AdminNavbar from "./AdminNavbar";

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: "overview" | "users" | "organizations" | "system" | "logs" | "elections";
  onTabChange: (tab: "overview" | "users" | "organizations" | "system" | "logs" | "elections") => void;
  user: User | null;
}

export default function AdminLayout({ 
  children, 
  activeTab, 
  onTabChange,
  user 
}: AdminLayoutProps) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.push("/auth/login");
  };

  const navItems = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "users", label: "Users & Voters", icon: Users },
    { key: "elections", label: "Election Management", icon: FileText },
    { key: "organizations", label: "Organizations", icon: Building2 },
    { key: "system", label: "System Settings", icon: Settings },
    { key: "logs", label: "Audit Logs", icon: FileText },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex font-sans selection:bg-emerald-500/30">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900/50 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 lg:transform-none flex flex-col",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="font-bold text-white text-lg">B</span>
            </div>
            <span className="font-bold text-xl tracking-tight">BlockVote</span>
          </div>
          <button 
            className="ml-auto lg:hidden text-gray-400 hover:text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            
            return (
              <button
                key={item.key}
                onClick={() => {
                  onTabChange(item.key);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm" 
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon size={18} className={isActive ? "text-emerald-400" : "text-gray-500 group-hover:text-white"} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>


      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-gray-950">
        
        {/* New Top Admin Navbar */}
        <div className="hidden lg:block">
           <AdminNavbar user={user} />
        </div>

        {/* Mobile Header */}
        <header className="lg:hidden h-16 flex items-center justify-between px-4 bg-gray-900/50 border-b border-white/10 backdrop-blur-md">
          <button 
            className="text-gray-400 hover:text-white"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <span className="font-bold text-lg">Admin Dashboard</span>
          <div className="w-6" /> {/* Spacer */}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                {navItems.find(i => i.key === activeTab)?.label}
              </h1>
              <div className="text-sm text-gray-500 font-medium">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
            
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
