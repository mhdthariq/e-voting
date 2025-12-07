"use client";

import React from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { usePendingOrganizations, useUsers } from "@/hooks/useAdmin";
import { Badge } from "@/components/ui/Badge";
import { Building2, CheckCircle, Clock } from "lucide-react";
import OverviewTab from "./OverviewTab"; // Reuse pending logic if needed or just display active orgs here

export default function OrganizationsTab() {
  // reusing useUsers with role=organization to get active ones
  const { data: orgUsers, isLoading } = useUsers({ 
    page: 1, 
    limit: 50, 
    role: "organization",
    sortBy: "createdAt",
    sortOrder: "desc"
  });

  return (
    <div className="space-y-6">
      {/* Active Organizations List */}
      <div className="flex items-center justify-between">
         <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="text-emerald-400" />
            Registered Organizations
         </h2>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 border-b border-white/10 text-gray-400 font-medium uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Organization Name</th>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Contact Email</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading organizations...</td></tr>
              ) : orgUsers?.data.length === 0 ? (
                 <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No organizations found</td></tr>
              ) : (
                orgUsers?.data.map((org) => (
                  <tr key={org.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{org.fullName || org.username}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{org.username}</td>
                    <td className="px-6 py-4 text-gray-400">{org.email}</td>
                    <td className="px-6 py-4">
                      <Badge variant={org.status === 'active' ? 'success' : 'default'}>
                        {org.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
      
      {/* Tip */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3 text-blue-400 text-sm">
         <Clock className="shrink-0" />
         <p>Pending organization requests can be managed from the Overview tab.</p>
      </div>
    </div>
  );
}
