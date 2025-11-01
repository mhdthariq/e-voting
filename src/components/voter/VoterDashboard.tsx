"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  studentId?: string;
  username: string;
  email: string;
  firstName?: string;
  lastName: string;
  role: "admin" | "organization" | "voter";
  status: "active" | "inactive";
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

interface Election {
  id: number;
  title: string;
  description: string;
  status: "draft" | "active" | "ended";
  startDate: string;
  endDate: string;
  organization: {
    id: number;
    username: string;
    email: string;
  };
  _count: {
    votes: number;
    voters: number;
  };
}

interface UserElectionParticipation {
  id: number;
  userId: number;
  electionId: number;
  inviteStatus: "pending" | "accepted" | "declined";
  hasVoted: boolean;
  invitedAt: string;
  respondedAt?: string;
  votedAt?: string;
  election?: Election;
}

interface VoterDashboardData {
  participations: UserElectionParticipation[];
  activeElections: Election[];
  votingHistory: UserElectionParticipation[];
  pendingInvitations: UserElectionParticipation[];
  statistics: {
    totalInvitations: number;
    totalVoted: number;
    participationRate: number;
    pendingInvitations: number;
  };
}

export default function VoterDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [dashboardData, setDashboardData] = useState<VoterDashboardData>({
    participations: [],
    activeElections: [],
    votingHistory: [],
    pendingInvitations: [],
    statistics: {
      totalInvitations: 0,
      totalVoted: 0,
      participationRate: 0,
      pendingInvitations: 0,
    },
  });
  const [activeTab, setActiveTab] = useState<
    "overview" | "active" | "history" | "invitations"
  >("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("accessToken");

      if (!storedUser || !token) {
        router.push("/auth/login");
        return;
      }

      const userData = JSON.parse(storedUser);
      if (userData.role !== "voter") {
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

      // This endpoint will be created to fetch voter dashboard data
      const response = await fetch("/api/voter/dashboard", { headers });
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.data);
      } else {
        setError("Failed to load dashboard data");
      }
    } catch (err) {
      setError("Failed to load dashboard data");
      console.error("Dashboard loading error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvitationResponse = async (
    participationId: number,
    action: "accept" | "decline",
  ) => {
    try {
      const token = localStorage.getItem("accessToken");
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const response = await fetch("/api/voter/invitations", {
        method: "POST",
        headers,
        body: JSON.stringify({
          participationId,
          action,
        }),
      });

      if (response.ok) {
        loadDashboardData(); // Refresh data
      } else {
        alert("Failed to respond to invitation");
      }
    } catch (error) {
      console.error("Error responding to invitation:", error);
      alert("Failed to respond to invitation");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.push("/auth/login");
  };

  const getElectionStatusBadge = (status: string) => {
    const statusStyles = {
      active: "bg-green-100 text-green-800",
      draft: "bg-yellow-100 text-yellow-800",
      ended: "bg-gray-100 text-gray-800",
    };
    return (
      statusStyles[status as keyof typeof statusStyles] || statusStyles.draft
    );
  };

  const isElectionActive = (election: Election) => {
    const now = new Date();
    const start = new Date(election.startDate);
    const end = new Date(election.endDate);
    return election.status === "active" && now >= start && now <= end;
  };

  const formatTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return "Ended";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Voter Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Welcome back,{" "}
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.username}
                {user?.studentId && ` (${user.studentId})`}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { key: "overview", label: "Overview" },
              { key: "active", label: "Active Elections" },
              {
                key: "invitations",
                label: `Invitations (${dashboardData.statistics.pendingInvitations})`,
              },
              { key: "history", label: "Voting History" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() =>
                  setActiveTab(
                    tab.key as
                      | "overview"
                      | "active"
                      | "history"
                      | "invitations",
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
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Invitations
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {dashboardData.statistics.totalInvitations}
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
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Votes Cast
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {dashboardData.statistics.totalVoted}
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
                      <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Pending Invitations
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {dashboardData.statistics.pendingInvitations}
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
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Participation Rate
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {dashboardData.statistics.participationRate.toFixed(
                            1,
                          )}
                          %
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Elections Preview */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Active Elections
                </h3>
                {dashboardData.activeElections.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No active elections at the moment
                  </p>
                ) : (
                  <div className="space-y-4">
                    {dashboardData.activeElections
                      .slice(0, 3)
                      .map((election) => (
                        <div
                          key={election.id}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {election.title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {election.description}
                              </p>
                              <div className="flex items-center mt-2 text-xs text-gray-500">
                                <span>By {election.organization.username}</span>
                                <span className="mx-2">•</span>
                                <span>{election._count.votes} votes</span>
                              </div>
                            </div>
                            <div className="ml-4 flex flex-col items-end">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getElectionStatusBadge(election.status)}`}
                              >
                                {isElectionActive(election)
                                  ? "Active"
                                  : election.status}
                              </span>
                              {isElectionActive(election) && (
                                <span className="text-xs text-gray-500 mt-1">
                                  {formatTimeRemaining(election.endDate)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Active Elections Tab */}
        {activeTab === "active" && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                All Active Elections
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Elections currently accepting votes. You can see all ongoing
                elections for transparency.
              </p>
              {dashboardData.activeElections.length === 0 ? (
                <div className="text-center py-8">
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
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No active elections
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    There are currently no active elections.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardData.activeElections.map((election) => (
                    <div
                      key={election.id}
                      className="border border-gray-200 rounded-lg p-6"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h4 className="text-lg font-medium text-gray-900">
                              {election.title}
                            </h4>
                            <span
                              className={`ml-3 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getElectionStatusBadge(election.status)}`}
                            >
                              {isElectionActive(election)
                                ? "Active Now"
                                : election.status}
                            </span>
                          </div>
                          <p className="text-gray-600 mt-2">
                            {election.description}
                          </p>

                          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-500">
                                Organization:
                              </span>
                              <span className="ml-2 text-gray-900">
                                {election.organization.username}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-500">
                                Total Votes:
                              </span>
                              <span className="ml-2 text-gray-900">
                                {election._count.votes}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-500">
                                Start Date:
                              </span>
                              <span className="ml-2 text-gray-900">
                                {new Date(election.startDate).toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-500">
                                End Date:
                              </span>
                              <span className="ml-2 text-gray-900">
                                {new Date(election.endDate).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="ml-6 flex flex-col items-end">
                          {isElectionActive(election) && (
                            <div className="text-right">
                              <div className="text-sm font-medium text-green-600">
                                {formatTimeRemaining(election.endDate)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Time remaining
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invitations Tab */}
        {activeTab === "invitations" && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Election Invitations
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Respond to election invitations from organizations.
              </p>
              {dashboardData.pendingInvitations.length === 0 ? (
                <div className="text-center py-8">
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
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v1M7 8h10l-1 8H8l-1-8z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No pending invitations
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You have no pending election invitations.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardData.pendingInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="border border-yellow-200 bg-yellow-50 rounded-lg p-6"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900">
                            {invitation.election?.title}
                          </h4>
                          <p className="text-gray-600 mt-2">
                            {invitation.election?.description}
                          </p>

                          <div className="mt-4 text-sm">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-500">
                                Organization:
                              </span>
                              <span className="ml-2 text-gray-900">
                                {invitation.election?.organization.username}
                              </span>
                            </div>
                            <div className="flex items-center mt-1">
                              <span className="font-medium text-gray-500">
                                Invited on:
                              </span>
                              <span className="ml-2 text-gray-900">
                                {new Date(
                                  invitation.invitedAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            {invitation.election && (
                              <div className="flex items-center mt-1">
                                <span className="font-medium text-gray-500">
                                  Election period:
                                </span>
                                <span className="ml-2 text-gray-900">
                                  {new Date(
                                    invitation.election.startDate,
                                  ).toLocaleDateString()}{" "}
                                  -{" "}
                                  {new Date(
                                    invitation.election.endDate,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="ml-6 flex space-x-2">
                          <button
                            onClick={() =>
                              handleInvitationResponse(invitation.id, "accept")
                            }
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() =>
                              handleInvitationResponse(invitation.id, "decline")
                            }
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voting History Tab */}
        {activeTab === "history" && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Your Voting History
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Track your participation in past elections and view results.
              </p>
              {dashboardData.votingHistory.length === 0 ? (
                <div className="text-center py-8">
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
                    No voting history
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You haven&apos;t participated in any elections yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardData.votingHistory.map((record) => (
                    <div
                      key={record.id}
                      className="border border-gray-200 rounded-lg p-6"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h4 className="text-lg font-medium text-gray-900">
                              {record.election?.title}
                            </h4>
                            <span className="ml-3 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Voted
                            </span>
                          </div>
                          <p className="text-gray-600 mt-2">
                            {record.election?.description}
                          </p>

                          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-500">
                                Organization:
                              </span>
                              <span className="ml-2 text-gray-900">
                                {record.election?.organization.username}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-500">
                                Your vote cast:
                              </span>
                              <span className="ml-2 text-gray-900">
                                {record.votedAt
                                  ? new Date(record.votedAt).toLocaleString()
                                  : "N/A"}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-500">
                                Total votes:
                              </span>
                              <span className="ml-2 text-gray-900">
                                {record.election?._count.votes}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-500">
                                Status:
                              </span>
                              <span
                                className={`ml-2 font-medium ${
                                  record.election?.status === "ended"
                                    ? "text-gray-600"
                                    : "text-blue-600"
                                }`}
                              >
                                {record.election?.status === "ended"
                                  ? "Results Available"
                                  : "In Progress"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="ml-6">
                          {record.election?.status === "ended" && (
                            <button
                              onClick={() =>
                                router.push(
                                  `/voter/election/${record.election?.id}/results`,
                                )
                              }
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                              View Results
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
