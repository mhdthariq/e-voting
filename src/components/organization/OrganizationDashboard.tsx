"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import DashboardNavbar from "@/components/common/DashboardNavbar";
import OrganizationAnalytics from "./OrganizationAnalytics";
import { GlassCard } from "@/components/ui/glass-card";
import { User } from "@/types";

// ---------- Types ----------
interface ElectionSummary {
  id: number;
  title: string;
  description: string;
  status: "DRAFT" | "ACTIVE" | "ENDED";
  startDate: string;
  endDate: string;
  candidateCount: number;
  voterCount: number;
  voteCount: number;
  participationRate: number;
}

interface DetailedStatistic {
  electionId: number;
  electionTitle: string;
  electionStatus: string;
  totalRegisteredVoters: number;
  totalVotesCast: number;
  participationRate: number;
  startDate: string;
  endDate: string;
}

interface OrganizationStats {
  totalElections: number;
  activeElections: number;
  draftElections: number;
  endedElections: number;
  totalVotes: number;
  totalVoters: number;
  averageParticipation: number;
  recentVotes: number;
  recentElections: ElectionSummary[];
  performance: {
    mostActiveElection: { id: number; title: string; voteCount: number } | null;
    averageVotesPerElection: number;
    totalEngagement: number;
  };
  detailedStatistics: DetailedStatistic[];
}

// "Create" telah dihapus dari tipe Tab
type Tab = "Overview" | "Elections" | "Voters" | "Results";

// ---------- Component ----------
export default function OrganizationDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [darkMode, setDarkMode] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voters, setVoters] = useState<User[]>([]);
  const [votersLoading, setVotersLoading] = useState(false);
  const [votersError, setVotersError] = useState<string | null>(null);

  // Fungsi fetch voters
  const loadVoters = async (token: string) => {
    setVotersLoading(true);
    setVotersError(null);
    try {
      const res = await fetch("/api/organization/voters", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setVoters(data.data);
      else setVotersError(data.message || "Failed to load voters");
    } catch (err) {
      console.error(err);
      setVotersError("Failed to load voters");
    } finally {
      setVotersLoading(false);
    }
  };

  // ---------- Auth check ----------
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("accessToken");
    if (!storedUser || !token) {
      router.push("/auth/login");
      return;
    }
    const userData = JSON.parse(storedUser);
    if (userData.role !== "organization") {
      router.push("/auth/login");
      return;
    }
    setUser(userData);
    loadStats(token);
  }, [router]);
  // ---------- Fetch voters setiap kali tab "Voters" aktif ----------
  useEffect(() => {
    if (activeTab === "Voters") {
      const token = localStorage.getItem("accessToken");
      if (token) loadVoters(token);
    }
  }, [activeTab]);

  // ---------- Load stats ----------
  const loadStats = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch("/api/organization/stats", { headers });
      const data = await res.json();
      if (data.success) setStats(data.data);
      else setError(data.message || "Failed to load stats");
    } catch (err) {
      console.error(err);
      setError("Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.push("/auth/login");
  };

  const formatDate = (date: string | Date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div
      className={
        darkMode
          ? "min-h-screen flex flex-col bg-gradient-to-br from-black via-neutral-900 to-emerald-950 text-white"
          : "min-h-screen flex flex-col bg-gradient-to-br from-gray-100 via-gray-50 to-white text-gray-900"
      }
    >
      {/* Theme toggle */}
      {/* Navbar */}
      <DashboardNavbar user={user} roleLabel="Organization" />

      {/* Tabs */}
      <nav className="bg-white/5 border-b border-white/10 backdrop-blur-sm sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-6">
            {["Overview", "Elections", "Voters", "Results"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as Tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-gray-400 hover:text-white hover:border-emerald-500/50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 min-h-screen">
        {error && <p className="text-red-400 bg-red-500/10 p-4 rounded-lg border border-red-500/20">{error}</p>}

        {/* Overview */}
        {activeTab === "Overview" && stats && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "Total Elections", value: stats.totalElections },
                { label: "Active Elections", value: stats.activeElections },
                { label: "Total Voters", value: stats.totalVoters },
                {
                  label: "Participation Rate",
                  value: `${stats.averageParticipation.toFixed(1)}%`,
                },
              ].map((card, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.02 }}
                  className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-xl"
                >
                  <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">
                    {card.label}
                  </p>
                  <p className="text-3xl font-bold mt-2 text-white">{card.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Active Elections */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                 <span className="w-2 h-8 bg-emerald-500 rounded-full"></span>
                 Active Elections
              </h2>
              {stats.recentElections.filter(e => e.status === "ACTIVE").length === 0 ? (
                <p className="text-gray-500 italic">No active elections currently.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {stats.recentElections
                    .filter(e => e.status === "ACTIVE")
                    .map((e) => (
                      <GlassCard key={e.id} className="p-6 hover:border-emerald-500/50 transition-colors group cursor-pointer">
                        <div className="flex justify-between items-start mb-4">
                           <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">{e.title}</h3>
                           <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">ACTIVE</span>
                        </div>
                        <div className="space-y-2 text-sm text-gray-400">
                           <div className="flex justify-between"><span>Voters:</span> <span className="text-white">{e.voterCount}</span></div>
                           <div className="flex justify-between"><span>Votes Cast:</span> <span className="text-white">{e.voteCount}</span></div>
                           <div className="flex justify-between"><span>Turnout:</span> <span className="text-emerald-400">{e.participationRate}%</span></div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-500 flex justify-between">
                           <span>Start: {formatDate(e.startDate)}</span>
                        </div>
                      </GlassCard>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Elections Tab */}
        {activeTab === "Elections" && stats && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
              <div>
                 <h2 className="text-xl font-bold text-white">Election Management</h2>
                 <p className="text-sm text-gray-400">Manage all your organization's elections</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/organization/elections/create")}
                className="px-6 py-3 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                <Plus size={18} /> Create New Election
              </motion.button>
            </div>

            <div className="grid grid-cols-1 gap-4">
               {stats.recentElections.length === 0 ? (
                  <div className="text-center py-20 text-gray-500">
                     <p>No elections found. Start by creating one!</p>
                  </div>
               ) : (
                  stats.recentElections.map((e) => (
                     <GlassCard key={e.id} className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex-1">
                           <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-bold text-white">{e.title}</h3>
                              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                 e.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-400" :
                                 e.status === "ENDED" ? "bg-gray-700 text-gray-300" :
                                 "bg-yellow-500/20 text-yellow-400"
                              }`}>{e.status}</span>
                           </div>
                           <p className="text-sm text-gray-400 line-clamp-1">{e.description}</p>
                           <div className="mt-2 flex gap-4 text-xs text-gray-500">
                              <span>{formatDate(e.startDate)} - {formatDate(e.endDate)}</span>
                              <span>•</span>
                              <span>{e.voterCount} Voters</span>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium border border-white/10">
                              Manage
                           </button>
                           <button className="px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-medium border border-emerald-500/20">
                              View Results
                           </button>
                        </div>
                     </GlassCard>
                  ))
               )}
            </div>
          </div>
        )}
        
        {/* Voters Tab */}
        {activeTab === "Voters" && (
          <GlassCard className="overflow-hidden">
             <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="font-bold text-white">Registered Voters</h3>
                <button className="text-emerald-400 text-sm hover:text-emerald-300 font-medium">+ Invite Voter</button>
             </div>
            {votersLoading ? (
              <div className="p-8 text-center text-gray-400">Loading voters...</div>
            ) : voters.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No voters found.</div>
            ) : (
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-white/5 text-gray-200 uppercase text-xs font-bold">
                  <tr>
                    <th className="px-6 py-4">Username</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Joined</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {voters.map((v) => (
                    <tr key={v.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">{v.username}</td>
                      <td className="px-6 py-4">{v.email}</td>
                      <td className="px-6 py-4">
                         <span className={`px-2 py-1 rounded-full text-xs font-bold ${v.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                            {v.status}
                         </span>
                      </td>
                      <td className="px-6 py-4">{formatDate(v.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                         <button className="text-gray-400 hover:text-white">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </GlassCard>
        )}

        {/* Results / Analytics Tab */}
        {activeTab === "Results" && (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Election Analytics</h2>
                <select className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg p-2.5 outline-none focus:border-emerald-500">
                   <option>All Time</option>
                   <option>Last 30 Days</option>
                   <option>This Year</option>
                </select>
             </div>
             <OrganizationAnalytics />
          </div>
        )}
      </main>
    </div>
  );
}