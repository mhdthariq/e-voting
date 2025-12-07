"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { useAuditLogs } from "@/hooks/useAdmin";
import { FileText, Search, Shield, AlertTriangle, User, Globe } from "lucide-react";

export default function AuditLogsTab() {
  const [limit, setLimit] = useState(50);
  const { data: logs, isLoading } = useAuditLogs(limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
           <Shield className="text-emerald-400" />
           Security Audit Logs
        </h2>
      </div>

      <GlassCard className="p-0 overflow-hidden">
         <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
            <p className="text-sm text-gray-400">Showing last {limit} system events</p>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
               <thead className="bg-white/5 border-b border-white/10 text-gray-400 font-medium uppercase text-xs">
                  <tr>
                     <th className="px-6 py-4">Timestamp</th>
                     <th className="px-6 py-4">User</th>
                     <th className="px-6 py-4">Action</th>
                     <th className="px-6 py-4">Resource</th>
                     <th className="px-6 py-4">Details</th>
                     <th className="px-6 py-4">IP Address</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                     <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading logs...</td></tr>
                  ) : logs?.length === 0 ? (
                     <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No logs found</td></tr>
                  ) : (
                     logs?.map((log) => (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                           <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleString()}
                           </td>
                           <td className="px-6 py-4 font-medium text-emerald-400">
                              {log.user?.username || `User #${log.userId}`}
                           </td>
                           <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium border ${
                                 log.action === 'LOGIN' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                 log.action === 'ERROR' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}>
                                 {log.action}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-gray-400">{log.resource}</td>
                           <td className="px-6 py-4 text-gray-300 max-w-xs truncate" title={log.details}>
                              {log.details}
                           </td>
                           <td className="px-6 py-4 text-gray-500 text-xs font-mono">
                              {log.ipAddress}
                           </td>
                        </tr>
                     ))
                  )}
               </tbody>
            </table>
         </div>
      </GlassCard>
    </div>
  );
}
