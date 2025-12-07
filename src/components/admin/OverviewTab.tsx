"use client";

import React from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { useSystemStats, useAuditLogs, usePendingOrganizations, useApproveOrganization, useRejectOrganization } from "@/hooks/useAdmin";
import { Users, Vote, Box, Server, Clock, Activity, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function OverviewTab() {
  const { data: stats, isLoading: statsLoading } = useSystemStats();
  const { data: recentLogs, isLoading: logsLoading } = useAuditLogs(5);
  const { data: pendingOrgs, isLoading: orgsLoading } = usePendingOrganizations();
  const approveMutation = useApproveOrganization();
  const rejectMutation = useRejectOrganization();
  const { showToast } = useToast();

  const handleApprove = async (id: number) => {
    try {
      await approveMutation.mutateAsync(id);
      showToast("Organization approved successfully", "success");
    } catch (error) {
      showToast("Failed to approve organization", "error");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectMutation.mutateAsync(id);
      showToast("Organization rejected", "info");
    } catch (error) {
      showToast("Failed to reject organization", "error");
    }
  };

  if (statsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-800/50 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="p-6 flex items-center justify-between bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <div>
            <p className="text-sm font-medium text-blue-400">Total Users</p>
            <h3 className="text-3xl font-bold text-white mt-1">{stats?.totalUsers || 0}</h3>
            <p className="text-xs text-blue-300/60 mt-2">Registers voters & admins</p>
          </div>
          <div className="p-3 bg-blue-500/20 rounded-xl ring-1 ring-blue-500/40">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
        </GlassCard>

        <GlassCard className="p-6 flex items-center justify-between bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <div>
            <p className="text-sm font-medium text-emerald-400">Total Votes</p>
            <h3 className="text-3xl font-bold text-white mt-1">{stats?.totalVotes || 0}</h3>
            <p className="text-xs text-emerald-300/60 mt-2">Across all elections</p>
          </div>
          <div className="p-3 bg-emerald-500/20 rounded-xl ring-1 ring-emerald-500/40">
            <Vote className="w-6 h-6 text-emerald-400" />
          </div>
        </GlassCard>

        <GlassCard className="p-6 flex items-center justify-between bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <div>
            <p className="text-sm font-medium text-purple-400">Mined Blocks</p>
            <h3 className="text-3xl font-bold text-white mt-1">{stats?.totalBlocks || 0}</h3>
            <p className="text-xs text-purple-300/60 mt-2">Avg time: {stats?.averageBlockTime || 0}ms</p>
          </div>
          <div className="p-3 bg-purple-500/20 rounded-xl ring-1 ring-purple-500/40">
            <Box className="w-6 h-6 text-purple-400" />
          </div>
        </GlassCard>

        <GlassCard className="p-6 flex items-center justify-between bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <div>
            <p className="text-sm font-medium text-amber-400">System Uptime</p>
            <h3 className="text-3xl font-bold text-white mt-1">{Math.floor((stats?.systemUptime || 0) / 3600)}h</h3>
            <p className="text-xs text-amber-300/60 mt-2">Since last restart</p>
          </div>
          <div className="p-3 bg-amber-500/20 rounded-xl ring-1 ring-amber-500/40">
            <Server className="w-6 h-6 text-amber-400" />
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <GlassCard className="p-0 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Pending Organizations
            </h3>
            <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/20">
              {pendingOrgs?.length || 0} Waiting
            </span>
          </div>
          <div className="flex-1 p-4 space-y-3 min-h-[300px]">
            {orgsLoading ? (
              <div className="text-center py-8 text-gray-500">Loading requests...</div>
            ) : pendingOrgs && pendingOrgs.length > 0 ? (
              pendingOrgs.map((org) => (
                <div key={org.id} className="p-4 rounded-lg bg-gray-800/50 border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-white">{org.organizationName}</h4>
                      <p className="text-sm text-gray-400 mt-1">Contact: {org.contactName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{org.contactEmail}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(org.id)}
                        disabled={approveMutation.isPending}
                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:scale-105 transition-all"
                        title="Approve"
                      >
                        <CheckCircle size={18} />
                      </button>
                      <button
                        onClick={() => handleReject(org.id)}
                        disabled={rejectMutation.isPending}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:scale-105 transition-all"
                        title="Reject"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <Clock size={12} />
                    <span>Submitted {new Date(org.submittedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2">
                <CheckCircle className="w-8 h-8 opacity-20" />
                <p>No pending approvals</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Recent Activity */}
        <GlassCard className="p-0 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Recent System Activity
            </h3>
          </div>
          <div className="flex-1 p-0">
            {logsLoading ? (
               <div className="text-center py-8 text-gray-500">Loading logs...</div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentLogs?.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-white/5 transition-colors">
                    <div className="flex justify-between">
                      <div className="flex gap-3">
                         <div className={`mt-1 w-2 h-2 rounded-full ${
                             log.action === "LOGIN" ? "bg-emerald-500" : 
                             log.action === "ERROR" ? "bg-red-500" : "bg-blue-500"
                         }`} />
                         <div>
                            <p className="text-sm font-medium text-gray-200">
                               {log.action} <span className="text-gray-500">on</span> {log.resource}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{log.details}</p>
                         </div>
                      </div>
                      <span className="text-xs text-gray-600 font-mono">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                )) || (
                  <div className="p-8 text-center text-gray-500">No recent activity</div>
                )}
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
