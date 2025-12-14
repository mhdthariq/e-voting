import { PrismaClient } from "@prisma/client";

// 1. Prevent multiple instances of Prisma Client in development (Singleton Pattern)
declare global {
  var __prisma: PrismaClient | undefined;
}

// 2. Database client configuration
const createPrismaClient = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    // errorFormat: "pretty", // Optional: bisa di-uncomment jika ingin log error yang lebih cantik di terminal
  });
};

// 3. Use global variable in development to prevent hot reload issues
const globalForPrisma = globalThis as unknown as { __prisma: PrismaClient | undefined };

const prisma = globalForPrisma.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}

// ==============================================================================
// HELPER FUNCTIONS (FITUR TAMBAHAN ANDA)
// ==============================================================================

// 4. Database connection helper
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

// 5. Database disconnection helper
export const disconnectFromDatabase = async () => {
  try {
    await prisma.$disconnect();
    console.log("✅ Database disconnected successfully");
  } catch (error) {
    console.error("❌ Database disconnection failed:", error);
  }
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
    prisma: Omit<
      PrismaClient,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
    >,
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
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    }
  }
};

// 9. Export Default untuk digunakan di API Routes
export default prisma;