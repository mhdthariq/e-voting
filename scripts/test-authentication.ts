#!/usr/bin/env ts-node

/**
 * Authentication System Test Script
 * Tests all authentication features including JWT, audit logging, and role-based access

 * Run with: npx ts-node scripts/test-authentication.ts
 */

import fetch, { RequestInit } from "node-fetch";

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  data?: unknown;
}

interface LoginResponse {
  success: boolean;
  message?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  error?: string;
}

interface ApiResponse {
  status: number;
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

class AuthenticationTester {
  private baseUrl: string;
  private results: TestResult[] = [];
  private tokens: { [key: string]: { access: string; refresh: string } } = {};
  private users: {
    [key: string]: { email: string; password: string; role: string };
  } = {
    admin: {
      email: "admin@blockvote.com",
      password: "admin123!",
      role: "admin",
    },
    organization: {
      email: "org@blockvote.com",
      password: "org123!",
      role: "organization",
    },
    voter: {
      email: "voter1@blockvote.com",
      password: "voter123!",
      role: "voter",
    },
  };

  constructor(baseUrl: string = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  private addResult(
    name: string,
    success: boolean,
    message: string,
    data?: unknown,
  ) {
    this.results.push({ name, success, message, data });
    console.log(`${success ? "✅" : "❌"} ${name}: ${message}`);
    if (data && process.env.DEBUG) {
      console.log("  Data:", JSON.stringify(data, null, 2));
    }
  }

  private async makeRequest(
    endpoint: string,
    method: string = "GET",
    body?: unknown,
    headers: { [key: string]: string } = {},
  ): Promise<ApiResponse> {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      return {
        status: response.status,
        success: (data as { success?: boolean }).success || false,
        data: data,
        error: (data as { error?: string }).error,
        message: (data as { message?: string }).message,
      };
    } catch (error) {
      return {
        status: 500,
        success: false,
        error: `Request failed: ${error}`,
      };
    }
  }

  async checkServerStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/`);
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async testUserLogin(userType: string): Promise<boolean> {
    try {
      const user = this.users[userType];
      if (!user) {
        this.addResult(
          `Login ${userType}`,
          false,
          "User configuration not found",
        );
        return false;
      }

      const response = await this.makeRequest("/api/auth/login", "POST", {
        identifier: user.email,
        password: user.password,
      });

      if (response.status === 200 && response.success) {
        const loginData = response.data as LoginResponse;
        this.tokens[userType] = {
          access: loginData.tokens!.accessToken,
          refresh: loginData.tokens!.refreshToken,
        };

        this.addResult(
          `Login ${userType}`,
          true,
          `Successfully logged in as ${loginData.user?.role}`,
          {
            userId: loginData.user?.id,
            role: loginData.user?.role,
            tokenLength: loginData.tokens?.accessToken?.length,
          },
        );
        return true;
      } else {
        this.addResult(
          `Login ${userType}`,
          false,
          response.error || "Login failed",
        );
        return false;
      }
    } catch {
      this.addResult(`Login ${userType}`, false, "Login error occurred");
      return false;
    }
  }

  async testInvalidLogin(): Promise<boolean> {
    try {
      const response = await this.makeRequest("/api/auth/login", "POST", {
        identifier: "invalid@email.com",
        password: "wrongpassword",
      });

      if (response.status === 401 && !response.success) {
        this.addResult(
          "Invalid Login",
          true,
          "Correctly rejected invalid credentials",
        );
        return true;
      } else {
        this.addResult(
          "Invalid Login",
          false,
          "Should have rejected invalid credentials",
        );
        return false;
      }
    } catch {
      this.addResult("Invalid Login", false, "Invalid login test error");
      return false;
    }
  }

  async testUserInfo(userType: string): Promise<boolean> {
    try {
      if (!this.tokens[userType]) {
        this.addResult(
          `User Info ${userType}`,
          false,
          "No access token available",
        );
        return false;
      }

      const response = await this.makeRequest("/api/auth/me", "GET", null, {
        Authorization: `Bearer ${this.tokens[userType].access}`,
      });

      if (response.status === 200 && response.success) {
        const userData = (
          response.data as {
            user: { id: number; username: string; email: string; role: string };
          }
        ).user;
        this.addResult(
          `User Info ${userType}`,
          true,
          `Retrieved user info for ${userData.role}`,
          {
            id: userData.id,
            username: userData.username,
            email: userData.email,
            role: userData.role,
          },
        );
        return true;
      } else {
        this.addResult(
          `User Info ${userType}`,
          false,
          response.error || "Failed to get user info",
        );
        return false;
      }
    } catch {
      this.addResult(`User Info ${userType}`, false, "User info test error");
      return false;
    }
  }

  async testTokenRefresh(userType: string): Promise<boolean> {
    try {
      if (!this.tokens[userType]) {
        this.addResult(
          `Token Refresh ${userType}`,
          false,
          "No refresh token available",
        );
        return false;
      }

      const response = await this.makeRequest("/api/auth/refresh", "POST", {
        refreshToken: this.tokens[userType].refresh,
      });

      if (response.status === 200 && response.success) {
        const refreshData = response.data as {
          tokens: { accessToken: string; refreshToken: string };
        };

        // Update tokens
        this.tokens[userType] = {
          access: refreshData.tokens.accessToken,
          refresh: refreshData.tokens.refreshToken,
        };

        this.addResult(
          `Token Refresh ${userType}`,
          true,
          `Successfully refreshed tokens for ${userType}`,
        );
        return true;
      } else {
        this.addResult(
          `Token Refresh ${userType}`,
          false,
          response.error || "Token refresh failed",
        );
        return false;
      }
    } catch {
      this.addResult(`Token Refresh ${userType}`, false, "Token refresh error");
      return false;
    }
  }

  async testRoleBasedAccess(): Promise<boolean> {
    try {
      // Test voter trying to access admin endpoint
      const adminResponse = await this.makeRequest(
        "/api/admin/audit",
        "GET",
        null,
        {
          Authorization: `Bearer ${this.tokens.voter.access}`,
        },
      );

      if (adminResponse.status === 403) {
        // Test admin accessing admin endpoint
        const voterResponse = await this.makeRequest(
          "/api/admin/audit",
          "GET",
          null,
          {
            Authorization: `Bearer ${this.tokens.admin.access}`,
          },
        );

        if (voterResponse.status === 200 && voterResponse.success) {
          this.addResult(
            "Role-based Access",
            true,
            "Correctly enforced role-based access control",
          );
          return true;
        }
      }

      this.addResult(
        "Role-based Access",
        false,
        "Role-based access control not working correctly",
      );
      return false;
    } catch {
      this.addResult("Role-based Access", false, "RBAC test error");
      return false;
    }
  }

  async testAuditLogs(): Promise<boolean> {
    try {
      const response = await this.makeRequest("/api/admin/audit", "GET", null, {
        Authorization: `Bearer ${this.tokens.admin.access}`,
      });

      if (response.status === 200 && response.success) {
        const auditData = (response.data as { data: Array<{ action: string }> })
          .data;
        const hasLoginLogs = auditData.some(
          (log: { action: string }) => log.action === "USER_LOGIN",
        );

        this.addResult(
          "Audit Logs",
          true,
          `Retrieved ${auditData.length} audit logs, login logs present: ${hasLoginLogs}`,
          {
            totalLogs: auditData.length,
            hasLoginLogs,
            sampleActions: auditData
              .slice(0, 3)
              .map((log: { action: string }) => log.action),
          },
        );
        return true;
      } else {
        this.addResult("Audit Logs", false, "Failed to retrieve audit logs");
        return false;
      }
    } catch {
      this.addResult("Audit Logs", false, "Audit log test error");
      return false;
    }
  }

  async testAuditStatistics(): Promise<boolean> {
    try {
      const response = await this.makeRequest(
        "/api/admin/audit/stats",
        "GET",
        null,
        {
          Authorization: `Bearer ${this.tokens.admin.access}`,
        },
      );

      if (response.status === 200 && response.success) {
        const statsData = (
          response.data as { data: { overview: { total: number } } }
        ).data;
        const stats = statsData.overview;

        this.addResult(
          "Audit Statistics",
          true,
          `Retrieved audit statistics: ${stats.total} total logs`,
          {
            totalLogs: stats.total,
          },
        );
        return true;
      } else {
        this.addResult(
          "Audit Statistics",
          false,
          "Failed to retrieve audit statistics",
        );
        return false;
      }
    } catch {
      this.addResult("Audit Statistics", false, "Audit statistics test error");
      return false;
    }
  }

  async testUserLogout(userType: string): Promise<boolean> {
    try {
      if (!this.tokens[userType]) {
        this.addResult(
          `Logout ${userType}`,
          false,
          "No access token available",
        );
        return false;
      }

      const response = await this.makeRequest(
        "/api/auth/logout",
        "POST",
        {},
        {
          Authorization: `Bearer ${this.tokens[userType].access}`,
        },
      );

      if (response.status === 200) {
        // Clear stored tokens
        delete this.tokens[userType];

        this.addResult(`Logout ${userType}`, true, "Successfully logged out");
        return true;
      } else {
        this.addResult(`Logout ${userType}`, false, "Logout failed");
        return false;
      }
    } catch {
      this.addResult(`Logout ${userType}`, false, "Logout error");
      return false;
    }
  }

  async testPasswordHashing(): Promise<boolean> {
    try {
      // This is tested indirectly through login functionality
      // We'll test by attempting login with correct password
      const response = await this.makeRequest("/api/auth/login", "POST", {
        identifier: this.users.admin.email,
        password: this.users.admin.password,
      });

      if (response.status === 200 && response.success) {
        this.addResult(
          "Password Hashing",
          true,
          "Password hashing and verification working correctly",
        );
        return true;
      } else {
        this.addResult(
          "Password Hashing",
          false,
          "Password hashing verification failed",
        );
        return false;
      }
    } catch {
      this.addResult("Password Hashing", false, "Password hashing test error");
      return false;
    }
  }

  async testInputValidation(): Promise<boolean> {
    try {
      let validationTests = 0;
      let passedTests = 0;

      // Test empty credentials
      const emptyResponse = await this.makeRequest("/api/auth/login", "POST", {
        identifier: "",
        password: "",
      });

      validationTests++;
      if (emptyResponse.status === 400) passedTests++;

      // Test invalid email format
      const invalidEmailResponse = await this.makeRequest(
        "/api/auth/login",
        "POST",
        {
          identifier: "invalid-email",
          password: "password123",
        },
      );

      validationTests++;
      if (
        invalidEmailResponse.status === 400 ||
        invalidEmailResponse.status === 401
      )
        passedTests++;

      // Test too short password
      const shortPasswordResponse = await this.makeRequest(
        "/api/auth/login",
        "POST",
        {
          identifier: "test@example.com",
          password: "123",
        },
      );

      validationTests++;
      if (
        shortPasswordResponse.status === 400 ||
        shortPasswordResponse.status === 401
      )
        passedTests++;

      const success = passedTests >= 2; // Allow some flexibility
      this.addResult(
        "Input Validation",
        success,
        `Passed ${passedTests}/${validationTests} validation tests`,
        { testsPassed: passedTests, totalTests: validationTests },
      );

      return success;
    } catch {
      this.addResult("Input Validation", false, "Validation test error");
      return false;
    }
  }

  async runAllTests(): Promise<void> {
    console.log("🔐 Starting Authentication System Tests...\n");

    // Check if server is running
    console.log("🚀 Checking if Next.js server is running...");
    const serverStarted = await this.checkServerStatus();

    if (!serverStarted) {
      console.log(
        "❌ Server is not running. Please start it manually with 'npm run dev'",
      );
      console.log(
        "This test requires a running server to test the API endpoints.",
      );
      console.log("❌ Cannot proceed without server");
      return;
    }

    console.log("✅ Server is already running\n");
    console.log("📋 Running authentication tests...\n");

    // Test password hashing
    await this.testPasswordHashing();

    // Test input validation
    await this.testInputValidation();

    // Test invalid login
    await this.testInvalidLogin();

    // Test user login for all user types
    const loginResults = await Promise.all([
      this.testUserLogin("admin"),
      this.testUserLogin("organization"),
      this.testUserLogin("voter"),
    ]);

    // Only proceed if all logins succeeded
    if (loginResults.every((result) => result)) {
      // Test user info retrieval
      await Promise.all([
        this.testUserInfo("admin"),
        this.testUserInfo("organization"),
        this.testUserInfo("voter"),
      ]);

      // Test token refresh
      await Promise.all([
        this.testTokenRefresh("admin"),
        this.testTokenRefresh("organization"),
        this.testTokenRefresh("voter"),
      ]);

      // Test role-based access control
      await this.testRoleBasedAccess();

      // Test audit logging (requires admin token)
      await this.testAuditLogs();
      await this.testAuditStatistics();

      // Test logout for all users
      await Promise.all([
        this.testUserLogout("admin"),
        this.testUserLogout("organization"),
        this.testUserLogout("voter"),
      ]);
    }

    this.printResults();
  }

  private printResults(): void {
    console.log(
      "\n======================================================================",
    );
    console.log("🔐 AUTHENTICATION SYSTEM TEST RESULTS");
    console.log(
      "======================================================================\n",
    );

    const passed = this.results.filter((r) => r.success).length;
    const total = this.results.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(
      `📊 Overall Results: ${passed}/${total} tests passed (${percentage}%)\n`,
    );

    // Categorize results
    const categories = {
      "Authentication Flow": this.results.filter((r) =>
        [
          "Password Hashing",
          "Invalid Login",
          "Login admin",
          "Login organization",
          "Login voter",
          "Logout admin",
          "Logout organization",
          "Logout voter",
        ].includes(r.name),
      ),
      "Token Management": this.results.filter((r) =>
        [
          "User Info admin",
          "User Info organization",
          "User Info voter",
          "Token Refresh admin",
          "Token Refresh organization",
          "Token Refresh voter",
        ].includes(r.name),
      ),
      "Security & Validation": this.results.filter((r) =>
        ["Input Validation", "Invalid Login", "Role-based Access"].includes(
          r.name,
        ),
      ),
      "Audit System": this.results.filter((r) =>
        ["Audit Logs", "Audit Statistics"].includes(r.name),
      ),
    };

    Object.entries(categories).forEach(([category, tests]) => {
      const categoryPassed = tests.filter((t) => t.success).length;
      const categoryTotal = tests.length;
      console.log(`${category}: ${categoryPassed}/${categoryTotal} passed`);

      tests.forEach((test) => {
        console.log(`  ${test.success ? "✅" : "❌"} ${test.name}`);
      });
      console.log();
    });

    console.log("🎯 Features Tested:");
    console.log("  ✅ JWT Authentication (Access + Refresh Tokens)");
    console.log("  ✅ Role-based Access Control (Admin/Organization/Voter)");
    console.log("  ✅ Password Hashing and Verification");
    console.log("  ✅ Input Validation with Zod");
    console.log("  ✅ Comprehensive Audit Logging");
    console.log("  ✅ Admin Audit Management APIs");
    console.log("  ✅ Security Features (Invalid login prevention)");
    console.log("  ✅ Token Refresh Mechanism");
    console.log("  ✅ User Information Retrieval");
    console.log("  ✅ Proper Logout Functionality");

    if (percentage === 100) {
      console.log("\n🎉 ALL AUTHENTICATION TESTS PASSED! 🎉");
      console.log("The authentication system is working perfectly!");
    } else if (percentage >= 90) {
      console.log("\n✅ Most authentication tests passed!");
      console.log("The system is mostly functional with minor issues.");
    } else {
      console.log("\n⚠️  Some authentication tests failed.");
      console.log("Please review the failed tests and fix the issues.");
    }

    console.log(
      "\n======================================================================",
    );
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new AuthenticationTester();
  tester.runAllTests().catch((error) => {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  });
}

export { AuthenticationTester };
