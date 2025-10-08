#!/usr/bin/env ts-node

import { execSync } from "child_process";
import { existsSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

interface DatabaseConfig {
  provider: "sqlite" | "postgresql" | "mysql";
  url: string;
  migrationCommand: string;
  description: string;
}

const configs: Record<string, DatabaseConfig> = {
  development: {
    provider: "sqlite",
    url: "file:./dev.db",
    migrationCommand: "db:push",
    description: "SQLite database for local development",
  },
  test: {
    provider: "sqlite",
    url: "file:./test.db",
    migrationCommand: "db:push",
    description: "SQLite database for testing",
  },
  production: {
    provider: "postgresql",
    url:
      process.env.DATABASE_URL ||
      "postgresql://user:password@localhost:5432/blockvote?schema=public",
    migrationCommand: "db:migrate:prod",
    description: "PostgreSQL database for production",
  },
  staging: {
    provider: "postgresql",
    url:
      process.env.STAGING_DATABASE_URL ||
      "postgresql://user:password@localhost:5432/blockvote_staging?schema=public",
    migrationCommand: "db:migrate",
    description: "PostgreSQL database for staging",
  },
};

class DatabaseSetup {
  private environment: string;
  private config: DatabaseConfig;
  private projectRoot: string;

  constructor(environment: string = "development") {
    this.environment = environment;
    this.projectRoot = join(__dirname, "..");

    if (!configs[environment]) {
      throw new Error(
        `Unknown environment: ${environment}. Available: ${Object.keys(configs).join(", ")}`,
      );
    }

    this.config = configs[environment];
  }

  // Setup database for the specified environment
  async setup(): Promise<void> {
    console.log(
      `🔧 Setting up database for ${this.environment} environment...`,
    );
    console.log(`📝 ${this.config.description}`);
    console.log(`🗄️  Provider: ${this.config.provider}`);
    console.log(`🔗 URL: ${this.maskDatabaseUrl(this.config.url)}`);

    try {
      // 1. Create appropriate .env file
      await this.createEnvFile();

      // 2. Use appropriate schema file
      await this.setupSchema();

      // 3. Generate Prisma client
      await this.generateClient();

      // 4. Run database migrations/push
      await this.runMigrations();

      // 5. Seed database if development
      if (this.environment === "development") {
        await this.seedDatabase();
      }

      console.log(`✅ Database setup completed for ${this.environment}!`);
      this.printConnectionInfo();
    } catch (error) {
      console.error(`❌ Database setup failed:`, error);
      process.exit(1);
    }
  }

  // Create .env file for the environment
  private async createEnvFile(): Promise<void> {
    const envFile =
      this.environment === "production" ? ".env.production" : ".env";
    const envPath = join(this.projectRoot, envFile);

    console.log(`📄 Creating ${envFile}...`);

    const envContent = this.generateEnvContent();
    writeFileSync(envPath, envContent);

    // Also create/update main .env file for current setup
    if (this.environment !== "production") {
      const mainEnvPath = join(this.projectRoot, ".env");
      writeFileSync(mainEnvPath, envContent);
    }

    console.log(`✅ Environment file created: ${envFile}`);
  }

  // Generate environment file content
  private generateEnvContent(): string {
    const baseConfig = `# Database Configuration - ${this.environment}
DATABASE_URL="${this.config.url}"

# JWT Configuration
JWT_SECRET="${this.generateSecretKey()}"
JWT_EXPIRES_IN="7d"

# Email Configuration
EMAIL_SERVICE="gmail"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
EMAIL_FROM="BlockVote System <noreply@yourdomain.com>"

# Blockchain Configuration
BLOCKCHAIN_DIFFICULTY="4"
BLOCKCHAIN_STORAGE_PATH="./data/blockchain"
PROOF_OF_WORK_ENABLED="true"
MAX_VOTES_PER_BLOCK="100"

# Application Configuration
NODE_ENV="${this.environment}"
PORT="3000"
NEXT_PUBLIC_APP_URL="${this.getAppUrl()}"

# Security Configuration
BCRYPT_ROUNDS="12"
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX_REQUESTS="100"

# File Upload Configuration
MAX_FILE_SIZE="5242880"
UPLOAD_PATH="./uploads"

# Development Configuration
ENABLE_LOGGING="true"
LOG_LEVEL="${this.environment === "production" ? "warn" : "info"}"
DEBUG_MODE="${this.environment === "development" ? "true" : "false"}"
`;

    return baseConfig;
  }

  // Setup appropriate schema file
  private async setupSchema(): Promise<void> {
    const schemaPath = join(this.projectRoot, "prisma", "schema.prisma");

    if (this.config.provider === "sqlite") {
      console.log(`📋 Using SQLite schema...`);
      // Current schema.prisma is already configured for SQLite
      return;
    }

    console.log(`📋 Switching to ${this.config.provider} schema...`);

    // Read the production schema and update it
    const productionSchemaPath = join(
      this.projectRoot,
      "prisma",
      "schema.production.template",
    );

    if (!existsSync(productionSchemaPath)) {
      throw new Error("Production schema template file not found");
    }

    let schemaContent = readFileSync(productionSchemaPath, "utf-8");

    // Update provider if needed
    if (this.config.provider === "mysql") {
      schemaContent = schemaContent.replace(
        'provider = "postgresql"',
        'provider = "mysql"',
      );

      // Update specific PostgreSQL types for MySQL compatibility
      schemaContent = schemaContent
        .replace(/@db\.Timestamptz\(6\)/g, "@db.DateTime(6)")
        .replace(/@db\.DoublePrecision/g, "@db.Double")
        .replace(/@db\.Text/g, "@db.LongText");
    }

    // Write the updated schema
    writeFileSync(schemaPath, schemaContent);
    console.log(`✅ Schema updated for ${this.config.provider}`);
  }

  // Generate Prisma client
  private async generateClient(): Promise<void> {
    console.log(`🔧 Generating Prisma client...`);

    try {
      execSync("npx prisma generate", {
        cwd: this.projectRoot,
        stdio: "inherit",
      });
      console.log(`✅ Prisma client generated`);
    } catch (error) {
      throw new Error(`Failed to generate Prisma client: ${error}`);
    }
  }

  // Run database migrations
  private async runMigrations(): Promise<void> {
    console.log(`🚀 Running database migrations...`);

    try {
      execSync(`npm run ${this.config.migrationCommand}`, {
        cwd: this.projectRoot,
        stdio: "inherit",
      });
      console.log(`✅ Database migrations completed`);
    } catch (error) {
      throw new Error(`Failed to run migrations: ${error}`);
    }
  }

  // Seed database with initial data
  private async seedDatabase(): Promise<void> {
    console.log(`🌱 Seeding database...`);

    try {
      execSync("npm run db:seed", {
        cwd: this.projectRoot,
        stdio: "inherit",
      });
      console.log(`✅ Database seeded successfully`);
    } catch (error) {
      console.warn(
        `⚠️  Database seeding failed (this might be okay if already seeded):`,
        error,
      );
    }
  }

  // Generate a random secret key
  private generateSecretKey(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let result = "";
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Get app URL based on environment
  private getAppUrl(): string {
    switch (this.environment) {
      case "production":
        return process.env.PRODUCTION_URL || "https://blockvote.com";
      case "staging":
        return process.env.STAGING_URL || "https://staging.blockvote.com";
      default:
        return "http://localhost:3000";
    }
  }

  // Mask sensitive parts of database URL
  private maskDatabaseUrl(url: string): string {
    return url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
  }

  // Print connection information
  private printConnectionInfo(): void {
    console.log(`\n📊 Database Information:`);
    console.log(`Environment: ${this.environment}`);
    console.log(`Provider: ${this.config.provider}`);
    console.log(`URL: ${this.maskDatabaseUrl(this.config.url)}`);

    if (this.environment === "development") {
      console.log(`\n🔑 Default Login Credentials:`);
      console.log(`Admin: admin@blockvote.com / admin123!`);
      console.log(`Organization: org@blockvote.com / org123!`);
      console.log(`Voters: voter1@blockvote.com / voter123! (voter1-voter5)`);
    }

    console.log(`\n🛠️  Next Steps:`);
    console.log(`1. Update environment variables in .env if needed`);
    console.log(`2. Run 'npm run dev' to start the development server`);
    console.log(`3. Run 'npm run db:studio' to open Prisma Studio`);

    if (this.config.provider !== "sqlite") {
      console.log(
        `4. Ensure ${this.config.provider} server is running and accessible`,
      );
    }
  }

  // Reset database (dangerous operation)
  async reset(): Promise<void> {
    console.log(`⚠️  Resetting database for ${this.environment}...`);

    if (this.environment === "production") {
      throw new Error("Database reset is not allowed in production!");
    }

    try {
      execSync("npm run db:reset -- --force", {
        cwd: this.projectRoot,
        stdio: "inherit",
      });
      console.log(`✅ Database reset completed`);
    } catch (error) {
      throw new Error(`Failed to reset database: ${error}`);
    }
  }

  // Health check
  async healthCheck(): Promise<void> {
    console.log(`🏥 Checking database health...`);

    try {
      // Try to connect to database
      const { checkDatabaseHealth } = await import("../src/lib/database");
      const isHealthy = await checkDatabaseHealth();

      if (isHealthy) {
        console.log(`✅ Database is healthy and accessible`);
      } else {
        console.log(`❌ Database health check failed`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Database health check error:`, error);
      process.exit(1);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "setup";
  const environment = args[1] || process.env.NODE_ENV || "development";

  const dbSetup = new DatabaseSetup(environment);

  try {
    switch (command) {
      case "setup":
        await dbSetup.setup();
        break;
      case "reset":
        await dbSetup.reset();
        break;
      case "health":
        await dbSetup.healthCheck();
        break;
      case "help":
        console.log(`
🗄️  Database Setup Script

Usage: npm run db:setup [command] [environment]

Commands:
  setup   - Setup database for specified environment (default)
  reset   - Reset database (not allowed in production)
  health  - Check database health
  help    - Show this help message

Environments:
  development - SQLite database for local development (default)
  test        - SQLite database for testing
  staging     - PostgreSQL database for staging
  production  - PostgreSQL database for production

Examples:
  npm run db:setup                    # Setup development database
  npm run db:setup setup production   # Setup production database
  npm run db:setup reset development  # Reset development database
  npm run db:setup health production  # Check production database health

Environment Variables:
  DATABASE_URL         - Database connection URL
  STAGING_DATABASE_URL - Staging database URL
  PRODUCTION_URL       - Production app URL
  STAGING_URL          - Staging app URL
        `);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Run "npm run db:setup help" for usage information');
        process.exit(1);
    }
  } catch (error) {
    console.error("Setup failed:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

export { DatabaseSetup };
