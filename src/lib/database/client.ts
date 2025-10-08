import { PrismaClient } from "@prisma/client";

// Prevent multiple instances of Prisma Client in development
declare global {
  var __prisma: PrismaClient | undefined;
}

// Database client configuration
const createPrismaClient = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    errorFormat: "pretty",
  });
};

// Use global variable in development to prevent hot reload issues
const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV === "development") {
  globalThis.__prisma = prisma;
}

// Database connection helper
export const connectToDatabase = async () => {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
};

// Database disconnection helper
export const disconnectFromDatabase = async () => {
  try {
    await prisma.$disconnect();
    console.log("✅ Database disconnected successfully");
  } catch (error) {
    console.error("❌ Database disconnection failed:", error);
  }
};

// Health check function
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
};

// Transaction helper
export const executeTransaction = async <T>(
  fn: (
    prisma: Omit<
      PrismaClient,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
    >,
  ) => Promise<T>,
): Promise<T> => {
  return await prisma.$transaction(fn);
};

// Database cleanup for tests
export const cleanupDatabase = async () => {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Database cleanup is only allowed in test environment");
  }

  const tablenames = await prisma.$queryRaw<
    Array<{ name: string }>
  >`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_migrations';`;

  for (const { name } of tablenames) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${name}";`);
    await prisma.$executeRawUnsafe(
      `DELETE FROM sqlite_sequence WHERE name='${name}';`,
    );
  }
};

export default prisma;
