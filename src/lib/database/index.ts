/* eslint-disable @typescript-eslint/no-explicit-any */
// Database client and utilities
import prismaClient, {
  connectToDatabase,
  disconnectFromDatabase,
  checkDatabaseHealth,
  executeTransaction,
  cleanupDatabase,
} from "./client";

// Database services
export { UserService } from "./services/user.service";
export { ElectionService } from "./services/election.service";
export { VoteService } from "./services/vote.service";
export { BlockchainService } from "./services/blockchain.service";

// Export client and utilities
export const prisma = prismaClient;
export {
  connectToDatabase,
  disconnectFromDatabase,
  checkDatabaseHealth,
  executeTransaction,
  cleanupDatabase,
};

// Re-export Prisma types for convenience
export type {
  UserRole,
  UserStatus,
  ElectionStatus,
  EmailTemplate,
  EmailStatus,
  ConfigType,
} from "@prisma/client";

// Database utilities and helpers
export const DatabaseUtils = {
  // Format date for database
  formatDate: (date: Date | string): Date => {
    return typeof date === "string" ? new Date(date) : date;
  },

  // Parse JSON safely
  parseJSON: <T>(jsonString: string, fallback: T): T => {
    try {
      return JSON.parse(jsonString);
    } catch {
      return fallback;
    }
  },

  // Generate pagination metadata
  generatePagination: (page: number, limit: number, total: number) => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1,
  }),

  // Validate pagination parameters
  validatePagination: (page?: number, limit?: number) => {
    const validPage = Math.max(1, page || 1);
    const validLimit = Math.min(100, Math.max(1, limit || 10));
    return { page: validPage, limit: validLimit };
  },
};

// Database error handling
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

// Common database operations
export const CommonQueries = {
  // Check if record exists
  exists: async (
    model: string,
    where: Record<string, any>,
  ): Promise<boolean> => {
    const record = await (prismaClient as any)[model].findFirst({ where });
    return !!record;
  },

  // Count records
  count: async (
    model: string,
    where?: Record<string, any>,
  ): Promise<number> => {
    return await (prismaClient as any)[model].count({ where });
  },

  // Get first record
  findFirst: async (
    model: string,
    where: Record<string, any>,
  ): Promise<any> => {
    return await (prismaClient as any)[model].findFirst({ where });
  },

  // Soft delete (update status to inactive)
  softDelete: async (model: string, id: number): Promise<boolean> => {
    try {
      await (prismaClient as any)[model].update({
        where: { id },
        data: { status: "INACTIVE" },
      });
      return true;
    } catch {
      return false;
    }
  },
};

// Database initialization
export const initializeDatabase = async (): Promise<boolean> => {
  try {
    // Connect to database
    const connected = await connectToDatabase();
    if (!connected) {
      throw new Error("Failed to connect to database");
    }

    // Check database health
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      throw new Error("Database health check failed");
    }

    console.log("✅ Database initialized successfully");
    return true;
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    return false;
  }
};

// Database seeding utilities
export const DatabaseSeeder = {
  // Create admin user
  createAdminUser: async (userData: {
    username: string;
    email: string;
    password: string;
  }) => {
    const { UserService } = await import("./services/user.service");
    return await UserService.createUser({
      ...userData,
      role: "admin",
    });
  },

  // Create system configuration
  createSystemConfig: async (
    configs: Array<{ key: string; value: string; type?: string }>,
  ) => {
    for (const config of configs) {
      await prismaClient.systemConfig.upsert({
        where: { key: config.key },
        update: { value: config.value },
        create: {
          key: config.key,
          value: config.value,
          type: (config.type as any) || "STRING",
        },
      });
    }
  },

  // Initialize system statistics
  initializeSystemStats: async () => {
    await prismaClient.systemStatistics.create({
      data: {
        totalUsers: 0,
        totalElections: 0,
        totalVotes: 0,
        totalBlocks: 0,
        averageBlockTime: 0,
        systemUptime: 0,
      },
    });
  },
};
