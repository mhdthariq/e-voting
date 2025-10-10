#!/usr/bin/env ts-node

/**
 * Debug Authentication Issues
 * Isolates and tests individual components to find the root cause
 */

import { config } from "dotenv";
import { join } from "path";

// Load environment variables
config({ path: join(__dirname, "../.env") });

async function debugAuthentication() {
  console.log("🔍 Debug: Authentication Components\n");

  // Test 1: Environment variables
  console.log("1. Environment Variables:");
  console.log(
    `   JWT_SECRET: ${process.env.JWT_SECRET ? "✅ Set" : "❌ Missing"}`,
  );
  console.log(
    `   DATABASE_URL: ${process.env.DATABASE_URL ? "✅ Set" : "❌ Missing"}`,
  );

  // Test 2: Database connection
  console.log("\n2. Database Connection:");
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log("   ✅ Database connected successfully");

    // Test user lookup
    const user = await prisma.user.findUnique({
      where: { email: "admin@blockvote.com" },
    });
    console.log(`   ✅ Admin user found: ${user ? "Yes" : "No"}`);

    await prisma.$disconnect();
  } catch (error) {
    console.log(`   ❌ Database error: ${error}`);
  }

  // Test 3: UserService
  console.log("\n3. UserService:");
  try {
    const { UserService } = await import(
      "../src/lib/database/services/user.service"
    );
    const user = await UserService.findByEmail("admin@blockvote.com");
    console.log(
      `   ✅ UserService.findByEmail: ${user ? "Success" : "Failed"}`,
    );

    if (user) {
      const passwordValid = await UserService.verifyPassword(user, "admin123!");
      console.log(
        `   ✅ Password verification: ${passwordValid ? "Success" : "Failed"}`,
      );
    }
  } catch (error) {
    console.log(`   ❌ UserService error: ${error}`);
  }

  // Test 4: JWT utilities
  console.log("\n4. JWT Utilities:");
  try {
    const { auth } = await import("../src/lib/auth/jwt");
    const testPayload = {
      userId: "1",
      username: "admin",
      email: "admin@test.com",
      role: "admin" as const,
    };
    const tokens = auth.login(testPayload);
    console.log(
      `   ✅ Token generation: ${tokens.accessToken ? "Success" : "Failed"}`,
    );

    const verified = auth.verifyToken(tokens.accessToken);
    console.log(
      `   ✅ Token verification: ${verified.isValid ? "Success" : "Failed"}`,
    );
  } catch (error) {
    console.log(`   ❌ JWT error: ${error}`);
  }

  // Test 5: Password utilities
  console.log("\n5. Password Utilities:");
  try {
    const { password } = await import("../src/lib/auth/password");
    const hashed = await password.hash("Admin123!");
    const verified = await password.verify("Admin123!", hashed);
    console.log(`   ✅ Password hashing: Success`);
    console.log(
      `   ✅ Password verification: ${verified ? "Success" : "Failed"}`,
    );
  } catch (error) {
    console.log(`   ❌ Password utilities error: ${error}`);
  }

  // Test 6: Validation schemas
  console.log("\n6. Validation Schemas:");
  try {
    const { schemas } = await import("../src/utils/validation");
    const result = schemas.user.login.safeParse({
      identifier: "admin@blockvote.com",
      password: "admin123!",
    });
    console.log(
      `   ✅ Login schema validation: ${result.success ? "Success" : "Failed"}`,
    );
    if (!result.success) {
      console.log(`   Error details:`, result.error.format());
    }
  } catch (error) {
    console.log(`   ❌ Validation error: ${error}`);
  }

  // Test 7: Full login simulation
  console.log("\n7. Full Login Simulation:");
  try {
    const { UserService } = await import(
      "../src/lib/database/services/user.service"
    );
    const { auth } = await import("../src/lib/auth/jwt");
    const { schemas } = await import("../src/utils/validation");

    // Validate input
    const validation = schemas.user.login.safeParse({
      identifier: "admin@blockvote.com",
      password: "admin123!",
    });

    if (!validation.success) {
      throw new Error("Validation failed");
    }

    const { identifier, password: plainPassword } = validation.data;

    // Find user
    const user = await UserService.findByUsernameOrEmail(identifier);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify password
    const isValidPassword = await UserService.verifyPassword(
      user,
      plainPassword,
    );
    if (!isValidPassword) {
      throw new Error("Invalid password");
    }

    // Generate tokens
    const tokens = auth.login({
      userId: user.id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    });

    console.log("   ✅ Full login simulation: Success");
    console.log(`   Access Token: ${tokens.accessToken.substring(0, 20)}...`);
    console.log(`   Refresh Token: ${tokens.refreshToken.substring(0, 20)}...`);
  } catch (error) {
    console.log(`   ❌ Full login simulation failed: ${error}`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("🔍 Debug completed. Check results above for issues.");
}

// Run debug if called directly
if (require.main === module) {
  debugAuthentication().catch(console.error);
}

export { debugAuthentication };
