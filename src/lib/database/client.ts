import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

// 1. Prevent multiple instances of Prisma Client in development (Singleton Pattern)
const prismaClientSingleton = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  }).$extends(withAccelerate());
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

// 4. Database connection helper
// Extended client manages connection automatically, but we can verify it roughly.
export const connectToDatabase = async () => {
  try {
    // Extended client doesn't have explicit $connect. We trigger a query to check.
    // However, for compatibility with old calls, we just mock success or try a query.
    await prisma.$queryRaw`SELECT 1`; 
    console.log("✅ Database connected successfully (Accelerate)");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
};

// 5. Database disconnection helper
export const disconnectFromDatabase = async () => {
    // Accelerate handles this, usually no-op is fine or unavailable.
    // console.log("Database disconnection handled by Accelerate");
};

// 6. Health check function
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
};

// 7. Transaction helper
export const executeTransaction = async <T>(
  fn: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma: any
  ) => Promise<T>,
): Promise<T> => {
  return await prisma.$transaction(fn);
};

// 8. Database cleanup for tests
export const cleanupDatabase = async () => {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Database cleanup is only allowed in test environment");
  }

  // Detect database provider from URL
  const isSQLite = process.env.DATABASE_URL?.startsWith("file:");

  if (isSQLite) {
    // SQLite Cleanup
    const tablenames = await prisma.$queryRaw<
      Array<{ name: string }>
    >`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_migrations';`;

    for (const { name } of tablenames) {
      await prisma.$executeRawUnsafe(`DELETE FROM "${name}";`);
      await prisma.$executeRawUnsafe(
        `DELETE FROM sqlite_sequence WHERE name='${name}';`,
      );
    }
  } else {
    // PostgreSQL Cleanup
    const tablenames = await prisma.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE '_prisma_migrations';`;

    for (const { tablename } of tablenames) {
      await prisma.$executeRawUnsafe(`DELETE FROM "${tablename}";`);
    }
  }
};

// 9. Export Default
export default prisma;