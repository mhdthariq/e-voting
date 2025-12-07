"use client";

import React, { useState } from "react";
import { User as UserType } from "@/types";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Settings, ChevronDown, User as UserIcon, Shield, Building2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

interface DashboardNavbarProps {
  user: UserType | null;
  roleLabel?: string;
}

export default function DashboardNavbar({ user, roleLabel }: DashboardNavbarProps) {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.push("/auth/login");
  };

  const getRoleIcon = () => {
     if (user?.role === "admin") return <Shield className="w-5 h-5 text-emerald-400" />;
     if (user?.role === "organization") return <Building2 className="w-5 h-5 text-blue-400" />;
     return <UserIcon className="w-5 h-5 text-gray-400" />;
  };

  return (
    <nav className="sticky top-0 z-50 px-6 py-4 flex justify-between items-center bg-gray-950/80 backdrop-blur-md border-b border-white/10">
      {/* Brand */}
      <div className="flex items-center gap-3">
         <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="text-white font-bold text-lg">B</span>
         </div>
         <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            BlockVote <span className="text-emerald-500 text-xs uppercase tracking-wider ml-1">{roleLabel || user?.role}</span>
         </h1>
      </div>

      {/* Profile Section */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-3 focus:outline-none group"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
              {user?.username || "Guest"}
            </p>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
              {roleLabel || user?.role || "User"}
            </p>
          </div>

          <div className="relative">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center overflow-hidden ring-2 ring-transparent group-hover:ring-emerald-500/50 transition-all">
                {user?.profileImage ? (
                  <img 
                    src={user.profileImage} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getRoleIcon()
                )}
             </div>
             <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-gray-950"></div>
          </div>
          
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-3 w-56 origin-top-right z-50"
            >
              <GlassCard className="p-1 border border-white/10 shadow-xl shadow-black/50">
                 <div className="px-3 py-2 border-b border-white/5 mb-1 sm:hidden">
                    <p className="text-sm font-medium text-white">{user?.username}</p>
                    <p className="text-xs text-gray-500 uppercase">{roleLabel || user?.role}</p>
                 </div>
                 
                 <button
                    onClick={() => router.push("/settings")} // Or handle internally
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                 >
                    <Settings className="w-4 h-4" />
                    Account Settings
                 </button>
                 
                 <div className="my-1 border-t border-white/5"></div>
                 
                 <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                 >
                    <LogOut className="w-4 h-4" />
                    Logout
                 </button>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
