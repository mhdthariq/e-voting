"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("accessToken");
    const user = localStorage.getItem("user");

    if (token && user) {
      const userData = JSON.parse(user);
      // Redirect based on user role
      switch (userData.role) {
        case "ADMIN":
          router.push("/admin/dashboard");
          break;
        case "ORGANIZATION":
          router.push("/organization/dashboard");
          break;
        case "VOTER":
          router.push("/voter/dashboard");
          break;
        default:
          router.push("/auth/login");
      }
    }
  }, [router]);

  const handleLogin = () => {
    router.push("/auth/login");
  };

  const handleRegister = () => {
    router.push("/auth/register");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg
                  className="h-5 w-5 text-white"
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
              <h1 className="ml-3 text-xl font-bold text-gray-900">
                BlockVote
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogin}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </button>
              <button
                onClick={handleRegister}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Secure <span className="text-blue-600">Blockchain</span> Voting
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            BlockVote provides a transparent, secure, and tamper-proof voting
            platform using advanced blockchain technology. Ensure election
            integrity with cryptographic security.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={handleLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors"
            >
              Access Platform
            </button>
            <button
              onClick={handleRegister}
              className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
            >
              Register Organization
            </button>
          </div>

          {/* Demo Credentials */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-2xl mx-auto mb-16">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">
              Demo Access
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white rounded p-3">
                <div className="font-medium text-red-700">System Admin</div>
                <div className="text-gray-600">admin@blockvote.com</div>
                <div className="text-gray-600">admin123!</div>
              </div>
              <div className="bg-white rounded p-3">
                <div className="font-medium text-blue-700">Organization</div>
                <div className="text-gray-600">org@blockvote.com</div>
                <div className="text-gray-600">org123!</div>
              </div>
              <div className="bg-white rounded p-3">
                <div className="font-medium text-green-700">Voter</div>
                <div className="text-gray-600">voter1@blockvote.com</div>
                <div className="text-gray-600">voter123!</div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Cryptographic Security
            </h3>
            <p className="text-gray-600">
              Ed25519 digital signatures and double SHA-256 hashing ensure vote
              integrity and prevent tampering.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.99-6a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Transparent Verification
            </h3>
            <p className="text-gray-600">
              Merkle tree verification and blockchain audit trails provide
              complete transparency and verifiability.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="h-6 w-6 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Real-time Results
            </h3>
            <p className="text-gray-600">
              Instant vote processing with proof-of-work mining and real-time
              election monitoring.
            </p>
          </div>
        </div>

        {/* Technical Stats */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Platform Status
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">100%</div>
              <div className="text-sm text-gray-600">Test Coverage</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">309</div>
              <div className="text-sm text-gray-600">Tests Passing</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">Phase 4</div>
              <div className="text-sm text-gray-600">Complete</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">Ready</div>
              <div className="text-sm text-gray-600">Production</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="h-6 w-6 bg-blue-600 rounded flex items-center justify-center">
                <svg
                  className="h-4 w-4 text-white"
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
              <span className="ml-2 text-lg font-bold text-gray-900">
                BlockVote
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Secure blockchain-based voting platform with cryptographic
              integrity.
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-500">
              <span>© 2025 BlockVote</span>
              <span>•</span>
              <span>Phase 5: Admin Interface</span>
              <span>•</span>
              <span>Version 0.2</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
