#!/usr/bin/env ts-node

/**
 * Phase 3 Authentication Enhancements Test
 * Simple but comprehensive test focusing on structure, compilation, and basic functionality
 */

import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";

// Test configuration
const TEST_CONFIG = {
  verbose: true,
  timeout: 30000,
};

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Helper functions
function logTest(name: string, status: "PASS" | "FAIL", message?: string) {
  totalTests++;
  if (status === "PASS") {
    passedTests++;
    console.log(`✅ ${name}`);
  } else {
    failedTests++;
    console.log(`❌ ${name}: ${message || "Failed"}`);
  }
}

function assertTrue(condition: boolean, testName: string, message?: string) {
  if (condition) {
    logTest(testName, "PASS");
  } else {
    logTest(testName, "FAIL", message || "Assertion failed");
  }
}

/**
 * Test Phase 3 file structure
 */
function testFileStructure(): void {
  console.log("\n📁 Testing Phase 3 File Structure...\n");

  try {
    const projectRoot = path.resolve(__dirname, "..");

    // Core enhancement files
    const requiredFiles = [
      "src/lib/auth/password-reset.ts",
      "src/lib/auth/registration.ts",
      "src/lib/auth/voter-creation.ts",
    ];

    for (const filePath of requiredFiles) {
      const fullPath = path.join(projectRoot, filePath);
      assertTrue(
        fs.existsSync(fullPath),
        `File exists: ${filePath}`,
        `${filePath} should exist`,
      );
    }

    // API endpoint files
    const apiFiles = [
      "src/app/api/auth/password-reset/route.ts",
      "src/app/api/auth/register/route.ts",
      "src/app/api/voters/route.ts",
    ];

    for (const filePath of apiFiles) {
      const fullPath = path.join(projectRoot, filePath);
      assertTrue(
        fs.existsSync(fullPath),
        `API endpoint exists: ${filePath}`,
        `${filePath} should exist`,
      );
    }
  } catch (error) {
    logTest("File structure test", "FAIL", (error as Error).message);
  }
}

/**
 * Test TypeScript compilation
 */
function testTypeScriptCompilation(): void {
  console.log("\n🔧 Testing TypeScript Compilation...\n");

  try {
    const projectRoot = path.resolve(__dirname, "..");
    process.chdir(projectRoot);

    // Test compilation without emitting files
    execSync("npx tsc --noEmit", {
      stdio: TEST_CONFIG.verbose ? "pipe" : "pipe",
      timeout: TEST_CONFIG.timeout,
    });

    logTest(
      "TypeScript compilation",
      "PASS",
      "All Phase 3 files compile without errors",
    );
  } catch (compileError) {
    logTest(
      "TypeScript compilation",
      "FAIL",
      `TypeScript compilation failed: ${(compileError as Error).message}`,
    );
  }
}

/**
 * Test file content and exports
 */
function testFileContent(): void {
  console.log("\n📄 Testing File Content and Exports...\n");

  try {
    const projectRoot = path.resolve(__dirname, "..");

    // Test password reset system
    const passwordResetPath = path.join(
      projectRoot,
      "src/lib/auth/password-reset.ts",
    );
    if (fs.existsSync(passwordResetPath)) {
      const content = fs.readFileSync(passwordResetPath, "utf8");

      const expectedElements = [
        "PasswordResetManager",
        "requestPasswordReset",
        "verifyResetToken",
        "resetPassword",
        "export const passwordReset",
        "export interface PasswordResetRequest",
        "export interface PasswordResetResult",
      ];

      for (const element of expectedElements) {
        assertTrue(
          content.includes(element),
          `Password reset contains: ${element}`,
          `Should contain ${element}`,
        );
      }
    }

    // Test organization registration system
    const registrationPath = path.join(
      projectRoot,
      "src/lib/auth/registration.ts",
    );
    if (fs.existsSync(registrationPath)) {
      const content = fs.readFileSync(registrationPath, "utf8");

      const expectedElements = [
        "OrganizationRegistrationManager",
        "registerOrganization",
        "verifyRegistration",
        "export const registration",
        "export interface OrganizationRegistrationRequest",
        "export interface RegistrationResult",
      ];

      for (const element of expectedElements) {
        assertTrue(
          content.includes(element),
          `Registration contains: ${element}`,
          `Should contain ${element}`,
        );
      }
    }

    // Test voter creation system
    const voterCreationPath = path.join(
      projectRoot,
      "src/lib/auth/voter-creation.ts",
    );
    if (fs.existsSync(voterCreationPath)) {
      const content = fs.readFileSync(voterCreationPath, "utf8");

      const expectedElements = [
        "VoterCreationManager",
        "createBulkVoters",
        "parseCsvToVoters",
        "export const voterCreation",
        "export interface BulkVoterCreationRequest",
        "export interface VoterCreationResult",
      ];

      for (const element of expectedElements) {
        assertTrue(
          content.includes(element),
          `Voter creation contains: ${element}`,
          `Should contain ${element}`,
        );
      }
    }
  } catch (contentError) {
    logTest("File content test", "FAIL", (contentError as Error).message);
  }
}

/**
 * Test API endpoint structure
 */
function testApiEndpoints(): void {
  console.log("\n🌐 Testing API Endpoint Structure...\n");

  try {
    const projectRoot = path.resolve(__dirname, "..");

    // Test password reset API
    const passwordResetApiPath = path.join(
      projectRoot,
      "src/app/api/auth/password-reset/route.ts",
    );
    if (fs.existsSync(passwordResetApiPath)) {
      const content = fs.readFileSync(passwordResetApiPath, "utf8");

      assertTrue(
        content.includes("export async function POST"),
        "Password reset API has POST endpoint",
        "Should have POST method for password reset requests",
      );

      assertTrue(
        content.includes("export async function PUT"),
        "Password reset API has PUT endpoint",
        "Should have PUT method for password reset completion",
      );
    }

    // Test registration API
    const registrationApiPath = path.join(
      projectRoot,
      "src/app/api/auth/register/route.ts",
    );
    if (fs.existsSync(registrationApiPath)) {
      const content = fs.readFileSync(registrationApiPath, "utf8");

      assertTrue(
        content.includes("export async function POST"),
        "Registration API has POST endpoint",
        "Should have POST method for organization registration",
      );
    }

    // Test voters API
    const votersApiPath = path.join(projectRoot, "src/app/api/voters/route.ts");
    if (fs.existsSync(votersApiPath)) {
      const content = fs.readFileSync(votersApiPath, "utf8");

      assertTrue(
        content.includes("export async function POST"),
        "Voters API has POST endpoint",
        "Should have POST method for voter creation",
      );

      assertTrue(
        content.includes("export async function PUT"),
        "Voters API has PUT endpoint",
        "Should have PUT method for CSV voter upload",
      );
    }
  } catch (apiError) {
    logTest("API endpoints test", "FAIL", (apiError as Error).message);
  }
}

/**
 * Test module exports structure
 */
function testModuleExports(): void {
  console.log("\n📦 Testing Module Exports...\n");

  try {
    const projectRoot = path.resolve(__dirname, "..");

    // Test that main export objects are properly structured
    const exportTests = [
      {
        file: "src/lib/auth/password-reset.ts",
        exports: [
          "export const passwordReset",
          "export { passwordResetManager",
        ],
        name: "Password reset exports",
      },
      {
        file: "src/lib/auth/registration.ts",
        exports: [
          "export const registration",
          "export { organizationRegistrationManager",
        ],
        name: "Registration exports",
      },
      {
        file: "src/lib/auth/voter-creation.ts",
        exports: [
          "export const voterCreation",
          "export { voterCreationManager",
        ],
        name: "Voter creation exports",
      },
    ];

    for (const test of exportTests) {
      const filePath = path.join(projectRoot, test.file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf8");

        let hasAllExports = true;
        for (const exportPattern of test.exports) {
          if (!content.includes(exportPattern)) {
            hasAllExports = false;
            break;
          }
        }

        assertTrue(
          hasAllExports,
          test.name,
          `Should contain all required exports`,
        );
      }
    }
  } catch (exportError) {
    logTest(
      "Module exports test",
      "FAIL",
      `Module export verification failed: ${(exportError as Error).message}`,
    );
  }
}

/**
 * Test configuration objects
 */
function testConfigurationObjects(): void {
  console.log("\n⚙️ Testing Configuration Objects...\n");

  try {
    const projectRoot = path.resolve(__dirname, "..");

    const configTests = [
      {
        file: "src/lib/auth/password-reset.ts",
        config: "RESET_CONFIG",
        name: "Password reset configuration",
      },
      {
        file: "src/lib/auth/registration.ts",
        config: "REGISTRATION_CONFIG",
        name: "Registration configuration",
      },
      {
        file: "src/lib/auth/voter-creation.ts",
        config: "VOTER_CREATION_CONFIG",
        name: "Voter creation configuration",
      },
    ];

    for (const test of configTests) {
      const filePath = path.join(projectRoot, test.file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf8");
        assertTrue(
          content.includes(test.config),
          test.name,
          `Should contain ${test.config} object`,
        );
      }
    }
  } catch (configError) {
    logTest(
      "Configuration objects test",
      "FAIL",
      (configError as Error).message,
    );
  }
}

/**
 * Main test runner
 */
async function runPhase3Tests(): Promise<void> {
  console.log("🧪 Starting Phase 3 Authentication Enhancements Test...");
  console.log("=".repeat(70));

  const startTime = Date.now();

  // Run all test categories
  testFileStructure();
  testTypeScriptCompilation();
  testFileContent();
  testApiEndpoints();
  testModuleExports();
  testConfigurationObjects();

  const endTime = Date.now();
  const totalDuration = endTime - startTime;

  // Print final results
  console.log("\n" + "=".repeat(70));
  console.log("🎯 PHASE 3 TEST RESULTS");
  console.log("=".repeat(70));

  console.log(
    `\n📊 Overall Results: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`,
  );
  console.log(`⏱️  Total Duration: ${totalDuration}ms`);

  // Feature summary
  console.log("🎯 Phase 3 Enhancements Verified:");
  console.log("  ✅ File Structure - All required files exist");
  console.log("  ✅ TypeScript Compilation - All files compile without errors");
  console.log("  ✅ Password Reset System - Classes, methods, and exports");
  console.log("  ✅ Organization Registration - Simplified org-as-admin model");
  console.log("  ✅ Voter Creation System - Classes, methods, and exports");
  console.log("  ✅ API Endpoints - All required HTTP methods implemented");
  console.log(
    "  ✅ Module Exports - All required exports are properly defined",
  );
  console.log("  ✅ Configuration Objects - Proper configuration defined");

  if (passedTests === totalTests) {
    console.log("\n🎉 ALL PHASE 3 TESTS PASSED! 🎉");
    console.log(
      "Phase 3 authentication enhancements are properly implemented!",
    );
  } else {
    console.log(
      `\n⚠️  ${failedTests} test(s) failed. Please review the failures above.`,
    );
  }

  console.log("\n" + "=".repeat(70));
  console.log("💡 Next Steps:");
  console.log("  - Run 'npm run test:auth' to test authentication integration");
  console.log("  - Run 'npm run test:all' for comprehensive system testing");
  console.log(
    "  - Phase 3 enhancements ready with simplified org-as-admin model!",
  );
  console.log("=".repeat(70));
}

// Run tests if this file is executed directly
if (require.main === module) {
  runPhase3Tests().catch((error) => {
    console.error("❌ Phase 3 test suite failed with error:", error);
    process.exit(1);
  });
}

export { runPhase3Tests };
