"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  username: string;
  email: string;
  role: "ADMIN" | "ORGANIZATION" | "VOTER";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
}

interface Election {
  id: number;
  title: string;
  description: string;
  status: "DRAFT" | "ACTIVE" | "ENDED";
  startDate: string;
  endDate: string;
  organizationId: number;
  candidates: Candidate[];
  voters: ElectionVoter[];
  _count: {
    votes: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Candidate {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
  electionId: number;
}

interface ElectionVoter {
  id: number;
  electionId: number;
  name: string;
  email: string;
  username: string;
  votedAt?: string;
}

interface ElectionStats {
  totalElections: number;
  activeElections: number;
  draftElections: number;
  endedElections: number;
  totalVoters: number;
  totalVotes: number;
  averageParticipation: number;
}

export default function OrganizationDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [elections, setElections] = useState<Election[]>([]);
  const [stats, setStats] = useState<ElectionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "elections" | "create" | "voters" | "results"
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
      if (userData.role !== "ORGANIZATION") {
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

      // Load organization elections
      const electionsResponse = await fetch("/api/organization/elections", {
        headers,
      });
      if (electionsResponse.ok) {
        const electionsData = await electionsResponse.json();
        setElections(electionsData.data || []);
      }

      // Load organization statistics
      const statsResponse = await fetch("/api/organization/stats", {
        headers,
      });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
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

  const handleCreateElection = () => {
    // TODO: Implement election creation modal
    alert(
      "Election creation functionality will be implemented in the next phase",
    );
  };

  const handleDeleteElection = async (electionId: number) => {
    if (!confirm("Are you sure you want to delete this election?")) return;

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `/api/organization/elections/${electionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        await loadDashboardData();
      } else {
        setError("Failed to delete election");
      }
    } catch (err) {
      console.error("Error deleting election:", err);
      setError("Failed to delete election");
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      DRAFT: "bg-gray-100 text-gray-800",
      ACTIVE: "bg-green-100 text-green-800",
      ENDED: "bg-blue-100 text-blue-800",
    };
    return badges[status as keyof typeof badges] || badges.DRAFT;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
                Organization Dashboard
              </h1>
              <p className="text-sm text-gray-500">
                BlockVote Election Management
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
              { key: "elections", label: "Elections" },
              { key: "create", label: "Create Election" },
              { key: "voters", label: "Voter Management" },
              { key: "results", label: "Results & Analytics" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() =>
                  setActiveTab(
                    tab.key as
                      | "overview"
                      | "elections"
                      | "create"
                      | "voters"
                      | "results",
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
            {/* Statistics Cards */}
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
                          {stats?.totalElections || 0}
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
                        className="h-6 w-6 text-green-400"
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
                          Active Elections
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats?.activeElections || 0}
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
                        className="h-6 w-6 text-blue-400"
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
                          Total Voters
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats?.totalVoters || 0}
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
                        className="h-6 w-6 text-purple-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                        />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Participation Rate
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats?.averageParticipation?.toFixed(1) || 0}%
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Elections */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Recent Elections
                  </h3>
                  <button
                    onClick={handleCreateElection}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Create New Election
                  </button>
                </div>
                <div className="overflow-hidden">
                  {elections.length === 0 ? (
                    <div className="text-center py-12">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                        />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No elections yet
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by creating your first election.
                      </p>
                      <div className="mt-6">
                        <button
                          onClick={handleCreateElection}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Create Election
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {elections.slice(0, 5).map((election) => (
                        <div
                          key={election.id}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900">
                                {election.title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {election.description}
                              </p>
                              <div className="flex items-center mt-2 space-x-4">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                                    election.status,
                                  )}`}
                                >
                                  {election.status}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatDate(election.startDate)} -{" "}
                                  {formatDate(election.endDate)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {election._count.votes} votes
                                </span>
                              </div>
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteElection(election.id)
                                }
                                className="text-red-600 hover:text-red-900 text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs placeholder */}
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
