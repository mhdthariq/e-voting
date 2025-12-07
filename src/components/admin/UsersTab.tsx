"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUsers, useDeleteUser, useUpdateUser } from "@/hooks/useAdmin";
import { Search, Trash2, Edit2, Shield, User, CheckCircle, XCircle, MoreVertical } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/Badge";

export default function UsersTab() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: "",
    role: "",
    status: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const { data, isLoading } = useUsers(filters);
  const deleteMutation = useDeleteUser();
  const updateMutation = useUpdateUser();
  const { showToast } = useToast();

  const handleDelete = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteMutation.mutateAsync(userId);
      showToast("User deleted successfully", "success");
    } catch (error) {
      showToast("Failed to delete user", "error");
    }
  };

  const handleStatusToggle = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await updateMutation.mutateAsync({ userId, updates: { status: newStatus } });
      showToast(`User ${newStatus === "active" ? "activated" : "deactivated"}`, "success");
    } catch (error) {
      showToast("Failed to update user status", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters & Actions */}
      <GlassCard className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search users..."
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500/50"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            />
          </div>
          <select
            className="bg-gray-800/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="voter">Voter</option>
            <option value="organization">Organization</option>
          </select>
          <select
             className="bg-gray-800/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
             value={filters.status}
             onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
           >
             <option value="">All Status</option>
             <option value="active">Active</option>
             <option value="inactive">Inactive</option>
           </select>
        </div>
        <Button className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white">
          Create User
        </Button>
      </GlassCard>

      {/* Users Table */}
      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 border-b border-white/10 text-gray-400 font-medium uppercase text-xs">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading users...</td></tr>
              ) : data?.data.length === 0 ? (
                 <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No users found</td></tr>
              ) : (
                data?.data.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                          {user.username.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{user.fullName || user.username}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.role === 'admin' ? 'info' : user.role === 'organization' ? 'warning' : 'default'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                         <span className={user.status === 'active' ? "text-emerald-400" : "text-gray-500"}>
                           {user.status === 'active' ? "Active" : "Inactive"}
                         </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                       {/* Simplified actions for now */}
                       <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleStatusToggle(user.id, user.status)}
                            className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors"
                            title={user.status === 'active' ? "Deactivate" : "Activate"}
                          >
                            {user.status === 'active' ? <XCircle size={16} /> : <CheckCircle size={16} />}
                          </button>
                          <button 
                             onClick={() => handleDelete(user.id)}
                             className="p-1.5 text-gray-400 hover:text-red-400 rounded hover:bg-red-500/10 transition-colors"
                             title="Delete"
                          >
                             <Trash2 size={16} />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {data && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between">
            <p className="text-sm text-gray-500">
               Page {filters.page} of {data.pagination.totalPages}
            </p>
            <div className="flex gap-2">
               <Button 
                 variant="outline" 
                 size="sm" 
                 disabled={filters.page === 1}
                 onClick={() => setFilters({...filters, page: filters.page - 1})}
                 className="bg-transparent border-white/10 text-white hover:bg-white/5"
               >
                 Previous
               </Button>
               <Button 
                 variant="outline" 
                 size="sm" 
                 disabled={filters.page >= data.pagination.totalPages}
                 onClick={() => setFilters({...filters, page: filters.page + 1})}
                 className="bg-transparent border-white/10 text-white hover:bg-white/5"
               >
                 Next
               </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
