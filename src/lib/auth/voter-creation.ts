/**
 * Automatic Voter Account Creation System for BlockVote
 * Provides bulk voter account creation with credential generation and email distribution
 */

import { log } from "@/utils/logger";
import prisma from "@/lib/database/client";
import { password } from "./password";
// UserRole and UserStatus will be used as string literals

// Voter creation configuration
const VOTER_CREATION_CONFIG = {
  defaultPasswordLength: 12,
  batchSize: 50, // Process voters in batches
  maxVotersPerElection: 10000,
  requireUniqueEmails: true,
  requireUniqueUsernames: true,
  autoGenerateUsernames: true,
  credentialExpiryHours: 72, // How long credentials are valid before first login
};

// Voter data interface
export interface VoterData {
  name: string;
  email: string;
  username?: string;
  metadata?: {
    department?: string;
    studentId?: string;
    employeeId?: string;
    class?: string;
    [key: string]: unknown;
  };
}

// Bulk voter creation request
export interface BulkVoterCreationRequest {
  electionId: number;
  organizationId: number;
  voters: VoterData[];
  generatePasswords?: boolean;
  passwordLength?: number;
  sendCredentials?: boolean;
  createdBy: number;
  ipAddress?: string;
  userAgent?: string;
}

// Voter creation result
export interface VoterCreationResult {
  success: boolean;
  message: string;
  totalVoters: number;
  created: number;
  skipped: number;
  failed: number;
  errors: Array<{
    voter: VoterData;
    error: string;
  }>;
  credentials?: Array<{
    name: string;
    email: string;
    username: string;
    password: string;
    tempPassword: boolean;
  }>;
}

// Individual voter creation result
export interface IndividualVoterResult {
  success: boolean;
  voter?: {
    id: number;
    name: string;
    email: string;
    username: string;
    password?: string;
    tempPassword: boolean;
  };
  error?: string;
}

// Voter credentials
export interface VoterCredentials {
  voterId: number;
  name: string;
  email: string;
  username: string;
  password: string;
  tempPassword: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Voter Creation Manager Class
 */
class VoterCreationManager {
  /**
   * Generate secure random password
   */
  private generateVoterPassword(
    length: number = VOTER_CREATION_CONFIG.defaultPasswordLength,
  ): string {
    return password.generate(length);
  }

  /**
   * Generate username from email
   */
  private generateUsername(
    email: string,
    existingUsernames: Set<string>,
  ): string {
    const baseUsername = email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    let username = baseUsername;
    let counter = 1;

    while (existingUsernames.has(username)) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    existingUsernames.add(username);
    return username;
  }

  /**
   * Validate voter data
   */
  private validateVoterData(voter: VoterData): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate name
    if (!voter.name || voter.name.trim().length < 2) {
      errors.push("Name must be at least 2 characters long");
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!voter.email || !emailRegex.test(voter.email)) {
      errors.push("Invalid email address");
    }

    // Validate username if provided
    if (voter.username) {
      if (voter.username.length < 3 || voter.username.length > 30) {
        errors.push("Username must be between 3 and 30 characters");
      }
      if (!/^[a-zA-Z0-9_]+$/.test(voter.username)) {
        errors.push(
          "Username can only contain letters, numbers, and underscores",
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check for duplicate voters in batch
   */
  private findDuplicatesInBatch(
    voters: VoterData[],
  ): Array<{ index: number; duplicateOf: number; field: string }> {
    const duplicates: Array<{
      index: number;
      duplicateOf: number;
      field: string;
    }> = [];
    const emailMap = new Map<string, number>();
    const usernameMap = new Map<string, number>();

    voters.forEach((voter, index) => {
      // Check email duplicates
      const existingEmailIndex = emailMap.get(voter.email.toLowerCase());
      if (existingEmailIndex !== undefined) {
        duplicates.push({
          index,
          duplicateOf: existingEmailIndex,
          field: "email",
        });
      } else {
        emailMap.set(voter.email.toLowerCase(), index);
      }

      // Check username duplicates
      if (voter.username) {
        const existingUsernameIndex = usernameMap.get(
          voter.username.toLowerCase(),
        );
        if (existingUsernameIndex !== undefined) {
          duplicates.push({
            index,
            duplicateOf: existingUsernameIndex,
            field: "username",
          });
        } else {
          usernameMap.set(voter.username.toLowerCase(), index);
        }
      }
    });

    return duplicates;
  }

  /**
   * Create individual voter account
   */
  private async createIndividualVoter(
    voterData: VoterData,
    electionId: number,
    generatePassword: boolean,
    passwordLength: number,
    existingUsernames: Set<string>,
  ): Promise<IndividualVoterResult> {
    try {
      // Validate voter data
      const validation = this.validateVoterData(voterData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(", "),
        };
      }

      // Generate username if not provided
      let username = voterData.username;
      if (!username && VOTER_CREATION_CONFIG.autoGenerateUsernames) {
        username = this.generateUsername(voterData.email, existingUsernames);
      }

      if (!username) {
        return {
          success: false,
          error: "Username is required",
        };
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email: voterData.email }, { username: username }],
        },
      });

      if (existingUser) {
        // Check if user is already registered for this election
        const existingVoter = await prisma.electionVoter.findFirst({
          where: {
            electionId: electionId,
            email: voterData.email,
          },
        });

        if (existingVoter) {
          return {
            success: false,
            error: "Voter already registered for this election",
          };
        }

        // Add existing user to election
        const electionVoter = await prisma.electionVoter.create({
          data: {
            electionId: electionId,
            name: voterData.name,
            email: voterData.email,
            username: existingUser.username,
            password: null, // Use existing user's password
            hasVoted: false,
          },
        });

        return {
          success: true,
          voter: {
            id: electionVoter.id,
            name: voterData.name,
            email: voterData.email,
            username: existingUser.username,
            tempPassword: false,
          },
        };
      }

      // Generate password if requested
      let voterPassword = "";
      let tempPassword = false;
      if (generatePassword) {
        voterPassword = this.generateVoterPassword(passwordLength);
        tempPassword = true;
      }

      // Hash password if provided
      let hashedPassword = null;
      if (voterPassword) {
        hashedPassword = await password.hash(voterPassword);
      }

      // Create user account
      const user = await prisma.user.create({
        data: {
          username: username,
          email: voterData.email,
          passwordHash: hashedPassword || "",
          role: "VOTER",
          status: "ACTIVE",
        },
      });

      // Create election voter record
      const electionVoter = await prisma.electionVoter.create({
        data: {
          electionId: electionId,
          name: voterData.name,
          email: voterData.email,
          username: username,
          password: voterPassword || null,
          hasVoted: false,
        },
      });

      // Store voter metadata if provided
      if (voterData.metadata && Object.keys(voterData.metadata).length > 0) {
        await prisma.systemConfig.create({
          data: {
            key: `voter_metadata_${user.id}`,
            value: JSON.stringify(voterData.metadata),
            type: "JSON",
          },
        });
      }

      return {
        success: true,
        voter: {
          id: electionVoter.id,
          name: voterData.name,
          email: voterData.email,
          username: username,
          password: voterPassword || undefined,
          tempPassword,
        },
      };
    } catch (error) {
      log.exception(error as Error, "AUTH", {
        operation: "createIndividualVoter",
        voterEmail: voterData.email,
      });

      return {
        success: false,
        error: "Failed to create voter account",
      };
    }
  }

  /**
   * Create bulk voter accounts
   */
  async createBulkVoters(
    request: BulkVoterCreationRequest,
  ): Promise<VoterCreationResult> {
    try {
      // Validate request
      if (!request.voters || request.voters.length === 0) {
        return {
          success: false,
          message: "No voters provided",
          totalVoters: 0,
          created: 0,
          skipped: 0,
          failed: 0,
          errors: [],
        };
      }

      if (request.voters.length > VOTER_CREATION_CONFIG.maxVotersPerElection) {
        return {
          success: false,
          message: `Maximum ${VOTER_CREATION_CONFIG.maxVotersPerElection} voters allowed per batch`,
          totalVoters: request.voters.length,
          created: 0,
          skipped: 0,
          failed: 0,
          errors: [],
        };
      }

      // Check if election exists
      const election = await prisma.election.findUnique({
        where: { id: request.electionId },
      });

      if (!election) {
        return {
          success: false,
          message: "Election not found",
          totalVoters: request.voters.length,
          created: 0,
          skipped: 0,
          failed: 0,
          errors: [],
        };
      }

      // Find duplicates in batch
      const duplicates = this.findDuplicatesInBatch(request.voters);

      let created = 0;
      let skipped = 0;
      let failed = 0;
      const errors: Array<{ voter: VoterData; error: string }> = [];
      const credentials: Array<{
        name: string;
        email: string;
        username: string;
        password: string;
        tempPassword: boolean;
      }> = [];

      // Get existing usernames to avoid conflicts
      const existingUsers = await prisma.user.findMany({
        select: { username: true },
      });
      const existingUsernames = new Set(
        existingUsers.map((u) => u.username.toLowerCase()),
      );

      // Process voters in batches
      const batchSize = VOTER_CREATION_CONFIG.batchSize;
      for (let i = 0; i < request.voters.length; i += batchSize) {
        const batch = request.voters.slice(i, i + batchSize);

        for (let j = 0; j < batch.length; j++) {
          const globalIndex = i + j;
          const voter = batch[j];

          // Check if this voter is a duplicate
          const isDuplicate = duplicates.some((d) => d.index === globalIndex);
          if (isDuplicate) {
            const duplicate = duplicates.find((d) => d.index === globalIndex);
            errors.push({
              voter,
              error: `Duplicate ${duplicate?.field || "unknown"} with voter at position ${(duplicate?.duplicateOf || 0) + 1}`,
            });
            skipped++;
            continue;
          }

          // Create voter
          const result = await this.createIndividualVoter(
            voter,
            request.electionId,
            request.generatePasswords || false,
            request.passwordLength ||
              VOTER_CREATION_CONFIG.defaultPasswordLength,
            existingUsernames,
          );

          if (result.success && result.voter) {
            created++;

            // Add to credentials if password was generated
            if (result.voter.password) {
              credentials.push({
                name: result.voter.name,
                email: result.voter.email,
                username: result.voter.username,
                password: result.voter.password,
                tempPassword: result.voter.tempPassword,
              });
            }
          } else {
            failed++;
            errors.push({
              voter,
              error: result.error || "Unknown error",
            });
          }
        }

        // Small delay between batches to prevent overwhelming the database
        if (i + batchSize < request.voters.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: request.createdBy,
          action: "BULK_VOTER_CREATION",
          resource: "election",
          resourceId: request.electionId,
          details: `Bulk voter creation: ${created} created, ${skipped} skipped, ${failed} failed`,
          ipAddress: request.ipAddress || "unknown",
          userAgent: request.userAgent || "unknown",
        },
      });

      log.auth("Bulk voter creation completed", {
        electionId: request.electionId,
        organizationId: request.organizationId,
        totalVoters: request.voters.length,
        created,
        skipped,
        failed,
        createdBy: request.createdBy,
      });

      const isSuccess =
        created > 0 || (created === 0 && skipped === request.voters.length);

      return {
        success: isSuccess,
        message: `Voter creation completed: ${created} created, ${skipped} skipped, ${failed} failed`,
        totalVoters: request.voters.length,
        created,
        skipped,
        failed,
        errors,
        credentials: request.generatePasswords ? credentials : undefined,
      };
    } catch (error) {
      log.exception(error as Error, "AUTH", {
        operation: "createBulkVoters",
        electionId: request.electionId,
      });

      return {
        success: false,
        message: "Failed to process bulk voter creation",
        totalVoters: request.voters.length,
        created: 0,
        skipped: 0,
        failed: request.voters.length,
        errors: [],
      };
    }
  }

  /**
   * Parse CSV data to voter data array
   */
  parseCsvToVoters(csvContent: string): {
    voters: VoterData[];
    errors: string[];
  } {
    try {
      const lines = csvContent.trim().split("\n");
      const errors: string[] = [];
      const voters: VoterData[] = [];

      if (lines.length === 0) {
        return { voters: [], errors: ["CSV file is empty"] };
      }

      // Parse header
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

      // Validate required columns
      const requiredColumns = ["name", "email"];
      const missingColumns = requiredColumns.filter(
        (col) => !headers.includes(col),
      );

      if (missingColumns.length > 0) {
        return {
          voters: [],
          errors: [`Missing required columns: ${missingColumns.join(", ")}`],
        };
      }

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines

        const values = line.split(",").map((v) => v.trim());

        if (values.length !== headers.length) {
          errors.push(`Row ${i + 1}: Column count mismatch`);
          continue;
        }

        const voter: VoterData = {
          name: "",
          email: "",
          metadata: {},
        };

        // Map values to voter data
        headers.forEach((header, index) => {
          const value = values[index];

          switch (header) {
            case "name":
              voter.name = value;
              break;
            case "email":
              voter.email = value.toLowerCase();
              break;
            case "username":
              voter.username = value;
              break;
            default:
              // Store other columns as metadata
              if (value && voter.metadata) {
                voter.metadata[header] = value;
              }
              break;
          }
        });

        voters.push(voter);
      }

      return { voters, errors };
    } catch (error) {
      log.exception(error as Error, "AUTH", {
        operation: "parseCsvToVoters",
      });

      return {
        voters: [],
        errors: ["Failed to parse CSV content"],
      };
    }
  }

  /**
   * Get voter statistics for election
   */
  async getVoterStatistics(electionId: number): Promise<{
    totalVoters: number;
    activeVoters: number;
    votedCount: number;
    pendingCount: number;
    participationRate: number;
  }> {
    try {
      const totalVoters = await prisma.electionVoter.count({
        where: { electionId },
      });

      const votedCount = await prisma.electionVoter.count({
        where: { electionId, hasVoted: true },
      });

      const activeVoters = await prisma.electionVoter.count({
        where: { electionId },
      });

      const pendingCount = totalVoters - votedCount;
      const participationRate =
        totalVoters > 0 ? (votedCount / totalVoters) * 100 : 0;

      return {
        totalVoters,
        activeVoters,
        votedCount,
        pendingCount,
        participationRate: Math.round(participationRate * 100) / 100,
      };
    } catch (error) {
      log.exception(error as Error, "AUTH", {
        operation: "getVoterStatistics",
        electionId,
      });

      return {
        totalVoters: 0,
        activeVoters: 0,
        votedCount: 0,
        pendingCount: 0,
        participationRate: 0,
      };
    }
  }

  /**
   * Reset voter password
   */
  async resetVoterPassword(
    voterId: number,
    newPassword?: string,
  ): Promise<{ success: boolean; password?: string; message: string }> {
    try {
      const voter = await prisma.electionVoter.findUnique({
        where: { id: voterId },
      });

      if (!voter) {
        return {
          success: false,
          message: "Voter not found",
        };
      }

      // Generate new password if not provided
      const resetPassword = newPassword || this.generateVoterPassword();
      const hashedPassword = await password.hash(resetPassword);

      // Update user password
      await prisma.user.update({
        where: { email: voter.email },
        data: { passwordHash: hashedPassword },
      });

      // Update election voter password
      await prisma.electionVoter.update({
        where: { id: voterId },
        data: { password: resetPassword },
      });

      log.auth("Voter password reset", {
        voterId,
        voterEmail: voter.email,
      });

      return {
        success: true,
        password: resetPassword,
        message: "Password reset successfully",
      };
    } catch (error) {
      log.exception(error as Error, "AUTH", {
        operation: "resetVoterPassword",
        voterId,
      });

      return {
        success: false,
        message: "Failed to reset password",
      };
    }
  }
}

// Create singleton instance
const voterCreationManager = new VoterCreationManager();

// Export convenience functions
export const voterCreation = {
  /**
   * Create bulk voters
   */
  createBulk: (request: BulkVoterCreationRequest) =>
    voterCreationManager.createBulkVoters(request),

  /**
   * Parse CSV to voters
   */
  parseCSV: (csvContent: string) =>
    voterCreationManager.parseCsvToVoters(csvContent),

  /**
   * Get voter statistics
   */
  getStats: (electionId: number) =>
    voterCreationManager.getVoterStatistics(electionId),

  /**
   * Reset voter password
   */
  resetPassword: (voterId: number, newPassword?: string) =>
    voterCreationManager.resetVoterPassword(voterId, newPassword),
};

// Export utilities
export { voterCreationManager, VOTER_CREATION_CONFIG };

// Default export
export default voterCreation;
