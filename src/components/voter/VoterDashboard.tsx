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
  organization: {
    username: string;
    email: string;
  };
  candidates: Candidate[];
  hasVoted: boolean;
  voteId?: number;
  votedAt?: string;
  canVote: boolean;
  remainingTime?: number;
}

interface Candidate {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
  electionId: number;
  voteCount?: number;
}

interface VoteStats {
  totalElections: number;
  availableElections: number;
  completedVotes: number;
  pendingVotes: number;
  participationRate: number;
}

export default function VoterDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [elections, setElections] = useState<Election[]>([]);
  const [stats, setStats] = useState<VoteStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "elections" | "vote" | "history" | "profile"
  >("overview");
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("accessToken");

      if (!storedUser || !token) {
        router.push("/auth/login");
        return;
      }

      const userData = JSON.parse(storedUser);
      if (userData.role !== "VOTER") {
        router.push("/auth/login");
        return;
      }

      setUser(userData);
    };

    checkAuth();
    loadDashboardData();

    // Set up real-time updates for elections
    const interval = setInterval(loadDashboardData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
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

      // Load voter elections
      const electionsResponse = await fetch("/api/voter/elections", {
        headers,
      });
      if (electionsResponse.ok) {
        const electionsData = await electionsResponse.json();
        setElections(electionsData.data || []);
      }

      // Load voter statistics
      const statsResponse = await fetch("/api/voter/stats", {
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

  const handleVoteInElection = (election: Election) => {
    if (!election.canVote) {
      setError("You are not eligible to vote in this election");
      return;
    }
    if (election.hasVoted) {
      setError("You have already voted in this election");
      return;
    }
    if (election.status !== "ACTIVE") {
      setError("This election is not currently active");
      return;
    }

    setSelectedElection(election);
    setActiveTab("vote");
    setSelectedCandidate(null);
  };

  const handleCastVote = async () => {
    if (!selectedElection || !selectedCandidate) {
      setError("Please select a candidate");
      return;
    }

    setIsVoting(true);
    setError(null);

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/voter/vote", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          electionId: selectedElection.id,
          candidateId: selectedCandidate,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Show success message and redirect
        alert(`Vote cast successfully! Transaction ID: ${result.transactionId}`);
        await loadDashboardData();
        setActiveTab("overview");
        setSelectedElection(null);
        setSelectedCandidate(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to cast vote");
      }
    } catch (err) {
      console.error("Error casting vote:", err);
      setError("Failed to cast vote");
    } finally {
      setIsVoting(false);
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

  const getTimeRemaining = (endDate: string) => {
    const now = new Date().getTime();
    const end = new Date(endDate).getTime();
    const diff = end - now;

    if (diff <= 0) return "Election ended";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
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
                Voter Dashboard
              </h1>
              <p className="text-sm text-gray-500">
                BlockVote Secure Voting Platform
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
              { key: "elections", label: "Available Elections" },
              { key: "vote", label: "Vote", disabled: !selectedElection },
              { key: "history", label: "Voting History" },
              { key: "profile", label: "Profile" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() =>
                  !tab.disabled &&
                  setActiveTab(
                    tab.key as
                      | "overview"
                      | "elections"
                      | "vote"
                      | "history"
                      | "profile"
                  )
                }
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? "border-blue-500 text-blue-600"
                    : tab.disabled
                    ? "border-transparent text-gray-300 cursor-not-allowed"
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
                          Available Elections
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats?.availableElections || 0}
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
                          Votes Cast
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats?.completedVotes || 0}
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
                        className="h-6 w-6 text-yellow-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Pending Votes
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats?.pendingVotes || 0}
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
                          {stats?.participationRate?.toFixed(1) || 0}%
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Elections */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Active Elections
                </h3>
                <div className="space-y-4">
                  {elections
                    .filter((election) => election.status === "ACTIVE")
                    .map((election) => (
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
                                  election.status
                                )}`}
                              >
                                {election.status}
                              </span>
                              <span className="text-xs text-gray-500">
                                Ends: {formatDate(election.endDate)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {getTimeRemaining(election.endDate)}
                              </span>
                              {election.hasVoted && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Voted
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            {election.hasVoted ? (
                              <span className="text-sm text-green-600 font-medium">
                                Vote Cast
                              </span>
                            ) : election.canVote ? (
                              <button
                                onClick={() => handleVoteInElection(election)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                              >
                                Vote Now
                              </button>
                            ) : (
                              <span className="text-sm text-gray-500">
                                Not Eligible
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  {elections.filter((election) => election.status === "ACTIVE")
                    .length === 0 && (
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
                        No active elections
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Check back later for new elections to participate in.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Elections Tab */}
        {activeTab === "elections" && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                All Elections
              </h3>
              <div className="space-y-4">
                {elections.map((election) => (
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
                        <p className="text-sm text-gray-500 mt-1">
                          Organized by: {election.organization.username}
                        </p>
                        <div className="flex items-center mt-2 space-x-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                              election.status
                            )}`}
                          >
                            {election.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(election.startDate)} -{" "}
                            {formatDate(election.endDate)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {election.candidates.length} candidates
                          </span>
                          {election.hasVoted && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Voted on {formatDate(election.votedAt!)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        {election.status === "ACTIVE" &&
                          !election.hasVoted &&
                          election.canVote && (
                            <button
                              onClick={() => handleVoteInElection(election)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                              Vote Now
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Vote Tab */}
        {activeTab === "vote" && selectedElection && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="mb-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Cast Your Vote
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {selectedElection.title}
                </p>
                <div className="mt-2 flex items-center space-x-4">
                  <span className="text-sm text-gray-500">
                    Ends: {formatDate(selectedElection.endDate)}
                  </span>
                  <span className="text-sm text-red-600 font-medium">
                    {getTimeRemaining(selectedElection.endDate)}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">
                  Select a candidate:
                </h4>
                {selectedElection.candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedCandidate === candidate.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedCandidate(candidate.id)}
                  >
                    <div className="flex items-start">
                      <input
                        type="radio"
                        name="candidate"
                        value={candidate.id}
                        checked={selectedCandidate === candidate.id}
                        onChange={() => setSelectedCandidate(candidate.id)}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <h5 className="text-sm font-medium text-gray-900">
                          {candidate.name}
                        </h5>
                        <p className="text-sm text-gray-600 mt-1">
                          {candidate.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex space-x-4">
                <button
                  onClick={handleCastVote}
                  disabled={!selectedCandidate || isVoting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md text-sm font-medium"
                >
                  {isVoting ? "Casting Vote..." : "Cast Vote"}
                </button>
                <button
                  onClick={() => {
                    setActiveTab("overview");
                    setSelectedElection(null);
                    setSelectedCandidate(null);
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md text-sm font-medium"
                >
                  Cancel
                </button>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Important Notice
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Your vote will be recorded on the blockchain and cannot
                        be changed. Please ensure you have selected the correct
                        candidate before casting your vote.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs placeholder */}
        {(activeTab === "history" || activeTab === "profile") && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}{" "}
                {activeTab === "history" ? "& Records" : "Management"}
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
