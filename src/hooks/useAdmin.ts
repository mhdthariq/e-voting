import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SystemStatistics, AuditLog, OrganizationRegistration, User, PaginatedResponse } from "@/types";

// Fetcher functions
async function fetchSystemStats(): Promise<SystemStatistics> {
  const token = localStorage.getItem("accessToken");
  const res = await fetch("/api/admin/stats", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch system stats");
  const data = await res.json();
  return data.data;
}

async function fetchAuditLogs(limit: number = 10): Promise<AuditLog[]> {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`/api/admin/audit?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  const data = await res.json();
  return data.data;
}

async function fetchPendingOrganizations(): Promise<OrganizationRegistration[]> {
  const token = localStorage.getItem("accessToken");
  const res = await fetch("/api/admin/organizations/pending", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch pending organizations");
  const data = await res.json();
  return data.data;
}

interface UserFilters {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

async function fetchUsers(filters: UserFilters): Promise<PaginatedResponse<User>> {
  const token = localStorage.getItem("accessToken");
  const queryParams = new URLSearchParams({
    page: filters.page.toString(),
    limit: filters.limit.toString(),
    ...(filters.search && { search: filters.search }),
    ...(filters.role && { role: filters.role }),
    ...(filters.status && { status: filters.status }),
    ...(filters.sortBy && { sortBy: filters.sortBy }),
    ...(filters.sortOrder && { sortOrder: filters.sortOrder }),
  });

  const res = await fetch(`/api/admin/users?${queryParams}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch users");
  return await res.json();
}

// Hooks
export function useSystemStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchSystemStats,
  });
}

export function useAuditLogs(limit: number = 10) {
  return useQuery({
    queryKey: ["admin", "audit-logs", limit],
    queryFn: () => fetchAuditLogs(limit),
  });
}

export function usePendingOrganizations() {
  return useQuery({
    queryKey: ["admin", "organizations", "pending"],
    queryFn: fetchPendingOrganizations,
  });
}

export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: ["admin", "users", filters],
    queryFn: () => fetchUsers(filters),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });
}

// Mutations
export function useApproveOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`/api/admin/organizations/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to approve organization");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useRejectOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`/api/admin/organizations/${id}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to reject organization");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations", "pending"] });
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: number) => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: number; updates: any }) => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId, updates }),
      });
      if (!res.ok) throw new Error("Failed to update user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}
