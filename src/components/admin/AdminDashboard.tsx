"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  username: string;
  email: string;
  role: "admin" | "organization" | "voter";
  status: "active" | "inactive" | "suspended";
  createdAt: string;
}

interface SystemStats {
  totalUsers: number;
  totalElections: number;
  totalVotes: number;
  totalBlocks: number;
  averageBlockTime: number;
  systemUptime: number;
}

interface AuditLog {
  id: number;
  userId: number;
  action: string;
  resource: string;
  resourceId: number | null;
  details: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  user: {
    username: string;
    email: string;
    role: string;
  };
}

interface OrganizationRegistration {
  id: number;
  organizationName: string;
  contactName: string;
  contactEmail: string;
  username: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [recentAuditLogs, setRecentAuditLogs] = useState<AuditLog[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<
    OrganizationRegistration[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "organizations" | "system" | "logs"
  >("overview");

  useEffect(() => {
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
    };

    checkAuth();
    loadDashboardData();
  }, [router]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("accessToken");
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Load system statistics
      const statsResponse = await fetch("/api/admin/stats", { headers });
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setSystemStats(stats.data);
      }

      // Load recent audit logs
      const auditResponse = await fetch("/api/admin/audit?limit=10", {
        headers,
      });
      if (auditResponse.ok) {
        const auditData = await auditResponse.json();
        setRecentAuditLogs(auditData.data || []);
      }

      // Load pending organization registrations
      const registrationsResponse = await fetch(
        "/api/admin/organizations/pending",
        { headers },
      );
      if (registrationsResponse.ok) {
        const regData = await registrationsResponse.json();
        setPendingRegistrations(regData.data || []);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.push("/auth/login");
  };

  const approveOrganization = async (registrationId: number) => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `/api/admin/organizations/${registrationId}/approve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        // Refresh pending registrations
        loadDashboardData();
      } else {
        setError("Failed to approve organization");
      }
    } catch (err) {
      console.error("Error approving organization:", err);
      setError("Failed to approve organization");
    }
  };

  const rejectOrganization = async (registrationId: number) => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `/api/admin/organizations/${registrationId}/reject`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        // Refresh pending registrations
        loadDashboardData();
      } else {
        setError("Failed to reject organization");
      }
    } catch (err) {
      console.error("Error rejecting organization:", err);
      setError("Failed to reject organization");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-500">
                BlockVote System Administration
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <p className="text-gray-900 font-medium">{user?.username}</p>
                <p className="text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { key: "overview", label: "Overview" },
              { key: "users", label: "User Management" },
              { key: "organizations", label: "Organizations" },
              { key: "system", label: "System Settings" },
              { key: "logs", label: "Audit Logs" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() =>
                  setActiveTab(
                    tab.key as
                      | "overview"
                      | "users"
                      | "organizations"
                      | "system"
                      | "logs",
                  )
                }
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* System Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-6 w-6 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                        />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Users
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {systemStats?.totalUsers || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-6 w-6 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                        />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Elections
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {systemStats?.totalElections || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-6 w-6 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Votes
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {systemStats?.totalVotes || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-6 w-6 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                        />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Blockchain Blocks
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {systemStats?.totalBlocks || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Organizations */}
            {pendingRegistrations.length > 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Pending Organization Registrations (
                    {pendingRegistrations.length})
                  </h3>
                  <div className="space-y-4">
                    {pendingRegistrations.map((registration) => (
                      <div
                        key={registration.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {registration.organizationName}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Contact: {registration.contactName}
                            </p>
                            <p className="text-sm text-gray-600">
                              Email: {registration.contactEmail}
                            </p>
                            <p className="text-sm text-gray-600">
                              Username: {registration.username}
                            </p>
                            <p className="text-xs text-gray-500">
                              Submitted:{" "}
                              {new Date(
                                registration.submittedAt,
                              ).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() =>
                                approveOrganization(registration.id)
                              }
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                rejectOrganization(registration.id)
                              }
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Recent Activity
                </h3>
                <div className="flow-root">
                  <ul role="list" className="-mb-8">
                    {recentAuditLogs.map((log, logIdx) => (
                      <li key={log.id}>
                        <div className="relative pb-8">
                          {logIdx !== recentAuditLogs.length - 1 ? (
                            <span
                              className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                              aria-hidden="true"
                            />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <svg
                                className="h-4 w-4 text-blue-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div>
                                <div className="text-sm">
                                  <span className="font-medium text-gray-900">
                                    {log.user.username}
                                  </span>
                                  <span className="text-gray-500">
                                    {" "}
                                    {log.action.toLowerCase()}{" "}
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {log.resource.toLowerCase()}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-sm text-gray-500">
                                  {log.details}
                                </p>
                              </div>
                              <div className="mt-2 text-sm text-gray-500">
                                <time dateTime={log.createdAt}>
                                  {new Date(log.createdAt).toLocaleString()}
                                </time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs can be implemented similarly */}
        {activeTab !== "overview" && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}{" "}
                Management
              </h3>
              <p className="text-gray-600">
                This section is under development. Coming soon!
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
