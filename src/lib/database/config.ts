import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

/**
 * Database configuration and connection management for BlockVote
 */

export class DatabaseConfig {
  private static instance: Database.Database | null = null;
  private static dbPath: string =
    process.env.DATABASE_URL || "./data/blockvote.db";

  /**
   * Get database instance (singleton pattern)
   */
  static getInstance(): Database.Database {
    if (!this.instance) {
      this.instance = this.createConnection();
    }
    return this.instance;
  }

  /**
   * Create database connection
   */
  private static createConnection(): Database.Database {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Create database connection
      const db = new Database(this.dbPath);

      // Configure database settings
      db.pragma("journal_mode = WAL"); // Write-Ahead Logging for better performance
      db.pragma("synchronous = NORMAL"); // Balance between performance and safety
      db.pragma("cache_size = 1000"); // Cache 1000 pages in memory
      db.pragma("temp_store = memory"); // Store temporary tables in memory
      db.pragma("mmap_size = 268435456"); // Use memory-mapped I/O (256MB)

      console.log(`Database connected: ${this.dbPath}`);

      // Initialize database schema
      this.initializeSchema(db);

      return db;
    } catch (error) {
      console.error("Database connection error:", error);
      throw error;
    }
  }

  /**
   * Initialize database schema
   */
  private static initializeSchema(db: Database.Database): void {
    try {
      // Enable foreign keys
      db.pragma("foreign_keys = ON");

      // Create tables
      this.createUsersTable(db);
      this.createElectionsTable(db);
      this.createCandidatesTable(db);
      this.createVotesTable(db);
      this.createBlockchainBlocksTable(db);
      this.createAuditLogsTable(db);

      // Create indexes for performance
      this.createIndexes(db);

      // Insert default admin user if not exists
      this.createDefaultAdmin(db);

      console.log("Database schema initialized successfully");
    } catch (error) {
      console.error("Schema initialization error:", error);
      throw error;
    }
  }

  /**
   * Create users table
   */
  private static createUsersTable(db: Database.Database): void {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'organization', 'voter')),
        public_key TEXT,
        private_key_encrypted TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    db.exec(createUsersTable);

    // Create trigger to update updated_at
    const updateTrigger = `
      CREATE TRIGGER IF NOT EXISTS update_users_timestamp
      AFTER UPDATE ON users
      BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `;
    db.exec(updateTrigger);
  }

  /**
   * Create elections table
   */
  private static createElectionsTable(db: Database.Database): void {
    const createElectionsTable = `
      CREATE TABLE IF NOT EXISTS elections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        organization_id INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended')),
        start_date DATETIME,
        end_date DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    db.exec(createElectionsTable);

    // Create trigger to update updated_at
    const updateTrigger = `
      CREATE TRIGGER IF NOT EXISTS update_elections_timestamp
      AFTER UPDATE ON elections
      BEGIN
        UPDATE elections SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `;
    db.exec(updateTrigger);
  }

  /**
   * Create candidates table
   */
  private static createCandidatesTable(db: Database.Database): void {
    const createCandidatesTable = `
      CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        election_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
      )
    `;
    db.exec(createCandidatesTable);
  }

  /**
   * Create votes table (minimal info for privacy)
   */
  private static createVotesTable(db: Database.Database): void {
    const createVotesTable = `
      CREATE TABLE IF NOT EXISTS votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        election_id INTEGER NOT NULL,
        voter_id INTEGER NOT NULL,
        block_hash VARCHAR(64) NOT NULL,
        transaction_hash VARCHAR(64) NOT NULL,
        voted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
        FOREIGN KEY (voter_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(election_id, voter_id) -- Prevent double voting
      )
    `;
    db.exec(createVotesTable);
  }

  /**
   * Create blockchain blocks table
   */
  private static createBlockchainBlocksTable(db: Database.Database): void {
    const createBlocksTable = `
      CREATE TABLE IF NOT EXISTS blockchain_blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        block_index INTEGER NOT NULL,
        previous_hash VARCHAR(64) NOT NULL,
        merkle_root VARCHAR(64) NOT NULL,
        timestamp DATETIME NOT NULL,
        election_id INTEGER NOT NULL,
        nonce INTEGER NOT NULL DEFAULT 0,
        hash VARCHAR(64) NOT NULL UNIQUE,
        votes_data TEXT NOT NULL, -- JSON array of vote transactions
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
      )
    `;
    db.exec(createBlocksTable);
  }

  /**
   * Create audit logs table
   */
  private static createAuditLogsTable(db: Database.Database): void {
    const createAuditTable = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action VARCHAR(255) NOT NULL,
        resource VARCHAR(255) NOT NULL,
        resource_id INTEGER,
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `;
    db.exec(createAuditTable);
  }

  /**
   * Create database indexes for performance
   */
  private static createIndexes(db: Database.Database): void {
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)",
      "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
      "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
      "CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)",

      "CREATE INDEX IF NOT EXISTS idx_elections_organization ON elections(organization_id)",
      "CREATE INDEX IF NOT EXISTS idx_elections_status ON elections(status)",
      "CREATE INDEX IF NOT EXISTS idx_elections_dates ON elections(start_date, end_date)",

      "CREATE INDEX IF NOT EXISTS idx_candidates_election ON candidates(election_id)",

      "CREATE INDEX IF NOT EXISTS idx_votes_election ON votes(election_id)",
      "CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter_id)",
      "CREATE INDEX IF NOT EXISTS idx_votes_hash ON votes(transaction_hash)",

      "CREATE INDEX IF NOT EXISTS idx_blocks_election ON blockchain_blocks(election_id)",
      "CREATE INDEX IF NOT EXISTS idx_blocks_hash ON blockchain_blocks(hash)",
      "CREATE INDEX IF NOT EXISTS idx_blocks_index ON blockchain_blocks(block_index)",

      "CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource, resource_id)",
      "CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)",
    ];

    indexes.forEach((indexSql) => {
      try {
        db.exec(indexSql);
      } catch (error) {
        console.error("Error creating index:", error);
      }
    });
  }

  /**
   * Create default admin user
   */
  private static createDefaultAdmin(db: Database.Database): void {
    try {
      const adminUsername = process.env.ADMIN_USERNAME || "admin";
      const adminEmail = process.env.ADMIN_EMAIL || "admin@blockvote.org";
      const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

      // Check if admin already exists
      const existingAdmin = db
        .prepare("SELECT id FROM users WHERE role = ? AND username = ?")
        .get("admin", adminUsername);

      if (!existingAdmin) {
        const passwordHash = bcrypt.hashSync(adminPassword, 12);

        db.prepare(
          `
          INSERT INTO users (username, email, password_hash, role, status)
          VALUES (?, ?, ?, 'admin', 'active')
        `,
        ).run(adminUsername, adminEmail, passwordHash);

        console.log(`Default admin user created: ${adminUsername}`);
      }
    } catch (error) {
      console.error("Error creating default admin:", error);
    }
  }

  /**
   * Close database connection
   */
  static close(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
      console.log("Database connection closed");
    }
  }

  /**
   * Execute raw SQL (for migrations or complex queries)
   */
  static executeSql(sql: string, params: unknown[] = []): unknown {
    const db = this.getInstance();
    return db.prepare(sql).all(...params);
  }

  /**
   * Begin transaction
   */
  static beginTransaction(): Database.Transaction {
    const db = this.getInstance();
    return db.transaction(() => {});
  }

  /**
   * Get database statistics
   */
  static getStatistics(): {
    users: { count: number };
    elections: { count: number };
    candidates: { count: number };
    votes: { count: number };
    blocks: { count: number };
    auditLogs: { count: number };
    dbSize: number;
    recentVotes: { count: number };
    activeElections: { count: number };
  } {
    const db = this.getInstance();

    const stats = {
      users: db.prepare("SELECT COUNT(*) as count FROM users").get() as {
        count: number;
      },
      elections: db
        .prepare("SELECT COUNT(*) as count FROM elections")
        .get() as { count: number },
      candidates: db
        .prepare("SELECT COUNT(*) as count FROM candidates")
        .get() as { count: number },
      votes: db.prepare("SELECT COUNT(*) as count FROM votes").get() as {
        count: number;
      },
      blocks: db
        .prepare("SELECT COUNT(*) as count FROM blockchain_blocks")
        .get() as { count: number },
      auditLogs: db
        .prepare("SELECT COUNT(*) as count FROM audit_logs")
        .get() as { count: number },

      // File size
      dbSize: fs.statSync(this.dbPath).size,

      // Recent activity
      recentVotes: db
        .prepare(
          `
        SELECT COUNT(*) as count FROM votes
        WHERE voted_at > datetime('now', '-24 hours')
      `,
        )
        .get() as { count: number },

      activeElections: db
        .prepare(
          `
        SELECT COUNT(*) as count FROM elections
        WHERE status = 'active'
      `,
        )
        .get() as { count: number },
    };

    return stats;
  }

  /**
   * Backup database
   */
  static backup(backupPath: string): void {
    try {
      const db = this.getInstance();
      db.backup(backupPath);
      console.log(`Database backed up to: ${backupPath}`);
    } catch (error) {
      console.error("Backup error:", error);
      throw error;
    }
  }

  /**
   * Vacuum database (optimize and reclaim space)
   */
  static vacuum(): void {
    try {
      const db = this.getInstance();
      db.exec("VACUUM");
      console.log("Database vacuumed successfully");
    } catch (error) {
      console.error("Vacuum error:", error);
      throw error;
    }
  }

  /**
   * Check database integrity
   */
  static checkIntegrity(): boolean {
    try {
      const db = this.getInstance();
      const result = db.prepare("PRAGMA integrity_check").get() as {
        integrity_check: string;
      };
      return result.integrity_check === "ok";
    } catch (error) {
      console.error("Integrity check error:", error);
      return false;
    }
  }
}

// Export database instance getter for convenience
export const getDatabase = () => DatabaseConfig.getInstance();

// Graceful shutdown handler
process.on("SIGINT", () => {
  DatabaseConfig.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  DatabaseConfig.close();
  process.exit(0);
});
