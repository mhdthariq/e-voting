
/**
 * @jest-environment node
 */
import { PrismaClient } from "@prisma/client";
import { UserService } from "@/lib/database/services/user.service";
import { AuditService } from "@/lib/database/services/audit.service";
import { cleanupDatabase } from "@/lib/database/client";
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

describe("Database Integration Tests", () => {
    let prisma: PrismaClient;

    beforeAll(async () => {
        prisma = new PrismaClient();
        await prisma.$connect();
        // Ensure clean state before start
        if (process.env.NODE_ENV === 'test') {
             await cleanupDatabase();
        }
    });

    afterAll(async () => {
        // Clean up dummy data created during tests
        if (process.env.NODE_ENV === 'test') {
             await cleanupDatabase();
        }
        await prisma.$disconnect();
    });

    describe('User CRUD', () => {
        let createdUserId: number;
        const testUser = {
            username: "jest_test_user_" + Date.now(),
            email: `jest_test_${Date.now()}@test.com`,
            password: "TestPassword123!",
            role: "voter" as const
        };

        it('should create a user', async () => {
            const user = await UserService.createUser(testUser);
            expect(user).toBeDefined();
            expect(user.id).toBeDefined();
            expect(user.email).toBe(testUser.email);
            createdUserId = user.id;
        });

        it('should find user by id', async () => {
             const user = await UserService.findById(createdUserId);
             expect(user).toBeDefined();
             expect(user?.id).toBe(createdUserId);
        });

        it('should find user by email', async () => {
             const user = await UserService.findByEmail(testUser.email);
             expect(user).toBeDefined();
             expect(user?.id).toBe(createdUserId);
        });

        it('should verify password', async () => {
             const user = await UserService.findById(createdUserId);
             if(user) {
                 const isValid = await UserService.verifyPassword(user, testUser.password);
                 expect(isValid).toBe(true);
             }
        });

        it('should delete user', async () => {
             const result = await UserService.deleteUser(createdUserId);
             expect(result).toBeDefined();
             
             // Verify soft delete or hard delete depending on implementation
             // Assuming soft delete based on previous script usage, checking if retrieval fails or marked deleted
             // But UserService.deleteUser might be soft. Let's check hard delete cleanup
             await UserService.hardDeleteUser(createdUserId);
             const user = await UserService.findById(createdUserId);
             expect(user).toBeNull();
        });
    });

    describe('Audit Logs', () => {
        it('should create and retrieve audit logs', async () => {
             // Create a user for the audit log
             const user = await UserService.createUser({
                 username: "audit_test_user",
                 email: "audit@test.com",
                 password: "Password123!",
                 role: "voter"
             });

             await AuditService.createAuditLog(user.id, "JEST_TEST", "DB", 1, "Test Log", "127.0.0.1", "jest");
             const logs = await AuditService.getUserAuditLogs(user.id, 1, 5);
             expect(logs.data.length).toBeGreaterThan(0);
             expect(logs.data[0].action).toBe("JEST_TEST");
        });
    });

    describe('Schema Existence', () => {
        it('should have required tables accessible', async () => {
             // Just checking a few key tables to ensure DB is up and schema seeded
             const countUsers = await prisma.user.count();
             expect(countUsers).toBeGreaterThanOrEqual(0); // DB might be empty after cleanup
             
             const elections = await prisma.election.count();
             expect(elections).toBeGreaterThanOrEqual(0);
        });
    });
});
