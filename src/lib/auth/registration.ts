/**
 * Organization Registration System for BlockVote
 * Provides secure organization registration with approval workflow
 */

import crypto from "crypto";
import { log } from "@/utils/logger";
import prisma from "@/lib/database/client";
import { password } from "./password";
// UserRole and UserStatus will be used as string literals

// Registration configuration
const REGISTRATION_CONFIG = {
  tokenLength: 32,
  tokenExpiryHours: 24, // 24 hours to verify email
  requireEmailVerification: true,
  requireAdminApproval: true,
  maxPendingRegistrations: 10, // Per IP per day
};

// Registration status enum
export enum RegistrationStatus {
  PENDING_VERIFICATION = "pending_verification",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  REJECTED = "rejected",
  EXPIRED = "expired",
}

// Organization registration request
export interface OrganizationRegistrationRequest {
  // Organization details
  organizationName: string;
  contactEmail: string; // Main contact email (will be used for login)
  contactName: string; // Main contact person name
  phone?: string;
  website?: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  // Organization login credentials
  // The organization will use these credentials to log in as an admin
  username: string; // Organization's login username
  password: string; // Organization's login password

  // Request metadata
  ipAddress?: string;
  userAgent?: string;
}

// Registration verification
export interface RegistrationVerification {
  token: string;
  ipAddress?: string;
  userAgent?: string;
}

// Registration approval
export interface RegistrationApproval {
  registrationId: string;
  approved: boolean;
  adminNotes?: string;
  approvedBy: number; // System admin user ID who approved/rejected
  ipAddress?: string;
  userAgent?: string;
}

// Registration result
export interface RegistrationResult {
  success: boolean;
  message: string;
  registrationId?: string;
  verificationToken?: string;
  expiresAt?: Date;
}

// Registration record
export interface RegistrationRecord {
  id: string;
  organizationName: string;
  contactEmail: string;
  contactName: string;
  phone?: string;
  website?: string;
  description: string;
  address: unknown;
  username: string;
  passwordHash: string;
  status: RegistrationStatus;
  verificationToken?: string;
  verificationTokenExpires?: Date;
  approvedBy?: number;
  approvedAt?: Date;
  rejectedReason?: string;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Organization Registration Manager Class
 */
class OrganizationRegistrationManager {
  /**
   * Generate secure verification token
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(REGISTRATION_CONFIG.tokenLength).toString("hex");
  }

  /**
   * Register new organization
   */
  async registerOrganization(
    request: OrganizationRegistrationRequest,
  ): Promise<RegistrationResult> {
    try {
      // Check for existing organization with same email or username
      const existingOrg = await prisma.user.findFirst({
        where: {
          OR: [{ email: request.contactEmail }, { username: request.username }],
        },
      });

      if (existingOrg) {
        log.security("Registration attempted with existing credentials", {
          contactEmail: request.contactEmail,
          username: request.username,
          ipAddress: request.ipAddress,
        });

        return {
          success: false,
          message:
            "An organization with this email or username already exists.",
        };
      }

      // Check rate limiting
      const recentRegistrations = await this.getRecentRegistrations(
        request.ipAddress,
      );
      if (recentRegistrations >= REGISTRATION_CONFIG.maxPendingRegistrations) {
        log.security("Too many registration attempts", {
          ipAddress: request.ipAddress,
          attempts: recentRegistrations,
        });

        return {
          success: false,
          message: "Too many registration attempts. Please try again later.",
        };
      }

      // Validate organization password
      const passwordValidation = password.validate(request.password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: `Password validation failed: ${passwordValidation.feedback.join(", ")}`,
        };
      }

      // Generate verification token
      const verificationToken = this.generateVerificationToken();
      const expiresAt = new Date(
        Date.now() + REGISTRATION_CONFIG.tokenExpiryHours * 60 * 60 * 1000,
      );

      // Hash organization password
      const hashedPassword = await password.hash(request.password);

      // Store registration request
      const registrationData = {
        organizationName: request.organizationName,
        contactEmail: request.contactEmail,
        contactName: request.contactName,
        phone: request.phone,
        website: request.website,
        description: request.description,
        address: request.address,
        username: request.username,
        passwordHash: hashedPassword,
        status: REGISTRATION_CONFIG.requireEmailVerification
          ? RegistrationStatus.PENDING_VERIFICATION
          : RegistrationStatus.PENDING_APPROVAL,
        verificationToken: REGISTRATION_CONFIG.requireEmailVerification
          ? verificationToken
          : undefined,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      };

      const registrationRecord = await prisma.systemConfig.create({
        data: {
          key: `org_registration_${crypto.randomUUID()}`,
          value: JSON.stringify(registrationData),
          type: "JSON",
        },
      });

      log.auth("Organization registration submitted", {
        registrationId: registrationRecord.id,
        organizationName: request.organizationName,
        contactEmail: request.contactEmail,
        status: registrationData.status,
        ipAddress: request.ipAddress,
      });

      return {
        success: true,
        message: REGISTRATION_CONFIG.requireEmailVerification
          ? "Registration submitted successfully. Please check your email to verify your account."
          : "Registration submitted successfully. Your application is pending admin approval.",
        registrationId: registrationRecord.id.toString(),
        verificationToken: REGISTRATION_CONFIG.requireEmailVerification
          ? verificationToken
          : undefined,
        expiresAt,
      };
    } catch (error) {
      log.exception(error as Error, "AUTH", {
        operation: "registerOrganization",
        organizationName: request.organizationName,
      });

      return {
        success: false,
        message: "Failed to process registration request.",
      };
    }
  }

  /**
   * Verify email for registration
   */
  async verifyRegistration(
    verification: RegistrationVerification,
  ): Promise<RegistrationResult> {
    try {
      // Find registration by verification token
      const registrations = await prisma.systemConfig.findMany({
        where: {
          key: { startsWith: "org_registration_" },
        },
      });

      let registrationRecord = null;
      let registrationData = null;

      for (const reg of registrations) {
        try {
          const data = JSON.parse(reg.value);
          if (data.verificationToken === verification.token) {
            registrationRecord = reg;
            registrationData = data;
            break;
          }
        } catch {
          // Skip invalid records
        }
      }

      if (!registrationRecord || !registrationData) {
        log.security("Invalid registration verification token used", {
          token: verification.token.substring(0, 8) + "...",
          ipAddress: verification.ipAddress,
        });

        return {
          success: false,
          message: "Invalid or expired verification token.",
        };
      }

      // Check if registration is expired
      if (new Date() > new Date(registrationData.expiresAt)) {
        log.security("Expired registration verification attempted", {
          registrationId: registrationRecord.id,
          organizationName: registrationData.organizationName,
          expiredAt: registrationData.expiresAt,
          ipAddress: verification.ipAddress,
        });

        return {
          success: false,
          message:
            "Verification token has expired. Please submit a new registration.",
        };
      }

      // Check if already verified
      if (registrationData.status !== RegistrationStatus.PENDING_VERIFICATION) {
        return {
          success: false,
          message: "Registration has already been processed.",
        };
      }

      // Update registration status
      const updatedData = {
        ...registrationData,
        status: REGISTRATION_CONFIG.requireAdminApproval
          ? RegistrationStatus.PENDING_APPROVAL
          : RegistrationStatus.APPROVED,
        verifiedAt: new Date().toISOString(),
        verificationToken: undefined, // Remove token after verification
      };

      await prisma.systemConfig.update({
        where: { id: registrationRecord.id },
        data: {
          value: JSON.stringify(updatedData),
        },
      });

      // If no admin approval required, create the organization account immediately
      if (!REGISTRATION_CONFIG.requireAdminApproval) {
        await this.createOrganizationAccount(registrationRecord.id.toString());
      }

      log.auth("Registration email verified", {
        registrationId: registrationRecord.id,
        organizationName: registrationData.organizationName,
        contactEmail: registrationData.contactEmail,
        newStatus: updatedData.status,
        ipAddress: verification.ipAddress,
      });

      return {
        success: true,
        message: REGISTRATION_CONFIG.requireAdminApproval
          ? "Email verified successfully. Your application is now pending admin approval."
          : "Email verified successfully. Your organization account has been created.",
      };
    } catch (error) {
      log.exception(error as Error, "AUTH", {
        operation: "verifyRegistration",
        token: verification.token.substring(0, 8) + "...",
      });

      return {
        success: false,
        message: "Failed to verify registration.",
      };
    }
  }

  /**
   * Approve or reject registration (admin function)
   */
  async processRegistration(
    approval: RegistrationApproval,
  ): Promise<RegistrationResult> {
    try {
      const registrationRecord = await prisma.systemConfig.findUnique({
        where: { id: parseInt(approval.registrationId) },
      });

      if (
        !registrationRecord ||
        !registrationRecord.key.startsWith("org_registration_")
      ) {
        return {
          success: false,
          message: "Registration not found.",
        };
      }

      const registrationData = JSON.parse(registrationRecord.value);

      // Check if registration is in correct status
      if (registrationData.status !== RegistrationStatus.PENDING_APPROVAL) {
        return {
          success: false,
          message: "Registration is not in pending approval status.",
        };
      }

      // Update registration status
      const updatedData = {
        ...registrationData,
        status: approval.approved
          ? RegistrationStatus.APPROVED
          : RegistrationStatus.REJECTED,
        approvedAt: approval.approved ? new Date().toISOString() : undefined,
        rejectedAt: !approval.approved ? new Date().toISOString() : undefined,
        adminNotes: approval.adminNotes,
        processedBy: approval.approvedBy,
      };

      await prisma.systemConfig.update({
        where: { id: parseInt(approval.registrationId) },
        data: {
          value: JSON.stringify(updatedData),
        },
      });

      // If approved, create the organization account
      if (approval.approved) {
        await this.createOrganizationAccount(approval.registrationId);
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: approval.approvedBy,
          action: approval.approved
            ? "REGISTRATION_APPROVED"
            : "REGISTRATION_REJECTED",
          resource: "registration",
          resourceId: parseInt(approval.registrationId),
          details: `Organization registration ${approval.approved ? "approved" : "rejected"}: ${registrationData.organizationName}`,
          ipAddress: approval.ipAddress || "unknown",
          userAgent: approval.userAgent || "unknown",
        },
      });

      log.auth("Registration processed by admin", {
        registrationId: approval.registrationId,
        organizationName: registrationData.organizationName,
        approved: approval.approved,
        approvedBy: approval.approvedBy,
        adminNotes: approval.adminNotes,
        ipAddress: approval.ipAddress,
      });

      return {
        success: true,
        message: approval.approved
          ? "Registration approved successfully. Organization account has been created."
          : "Registration rejected.",
      };
    } catch (error) {
      log.exception(error as Error, "AUTH", {
        operation: "processRegistration",
        registrationId: approval.registrationId,
      });

      return {
        success: false,
        message: "Failed to process registration.",
      };
    }
  }

  /**
   * Create organization account after approval
   */
  private async createOrganizationAccount(
    registrationId: string,
  ): Promise<void> {
    const registrationRecord = await prisma.systemConfig.findUnique({
      where: { id: parseInt(registrationId) },
    });

    if (!registrationRecord) {
      throw new Error("Registration record not found");
    }

    const registrationData = JSON.parse(registrationRecord.value);

    // Create the organization user account
    const organizationUser = await prisma.user.create({
      data: {
        username: registrationData.username,
        email: registrationData.contactEmail,
        passwordHash: registrationData.passwordHash,
        role: "ORGANIZATION",
        status: "ACTIVE",
      },
    });

    // Store organization details in system config
    await prisma.systemConfig.create({
      data: {
        key: `org_details_${organizationUser.id}`,
        value: JSON.stringify({
          organizationName: registrationData.organizationName,
          contactEmail: registrationData.contactEmail,
          contactName: registrationData.contactName,
          phone: registrationData.phone,
          website: registrationData.website,
          description: registrationData.description,
          address: registrationData.address,
          username: registrationData.username,
        }),
        type: "JSON",
      },
    });

    log.auth("Organization account created", {
      userId: organizationUser.id,
      organizationName: registrationData.organizationName,
      email: registrationData.contactEmail,
      registrationId,
    });
  }

  /**
   * Get pending registrations (admin function)
   */
  async getPendingRegistrations(): Promise<RegistrationRecord[]> {
    try {
      const registrations = await prisma.systemConfig.findMany({
        where: {
          key: { startsWith: "org_registration_" },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      const pendingRegistrations: RegistrationRecord[] = [];

      for (const reg of registrations) {
        try {
          const data = JSON.parse(reg.value);
          if (
            data.status === RegistrationStatus.PENDING_VERIFICATION ||
            data.status === RegistrationStatus.PENDING_APPROVAL
          ) {
            pendingRegistrations.push({
              id: reg.id.toString(),
              organizationName: data.organizationName,
              contactEmail: data.contactEmail,
              contactName: data.contactName,
              phone: data.phone,
              website: data.website,
              description: data.description,
              address: data.address,
              username: data.username,
              passwordHash: "[REDACTED]", // Don't expose password
              status: data.status,
              verificationToken: data.verificationToken,
              verificationTokenExpires: data.verificationTokenExpires,
              approvedBy: data.approvedBy,
              approvedAt: data.approvedAt,
              rejectedReason: data.rejectedReason,
              createdAt: new Date(data.createdAt),
              updatedAt: new Date(data.updatedAt),
              ipAddress: data.ipAddress,
              userAgent: data.userAgent,
            });
          }
        } catch {
          // Skip invalid records
        }
      }

      return pendingRegistrations;
    } catch (error) {
      log.exception(error as Error, "AUTH", {
        operation: "getPendingRegistrations",
      });
      return [];
    }
  }

  /**
   * Get recent registration attempts for rate limiting
   */
  private async getRecentRegistrations(ipAddress?: string): Promise<number> {
    if (!ipAddress) return 0;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const registrations = await prisma.systemConfig.findMany({
      where: {
        key: { startsWith: "org_registration_" },
        updatedAt: { gte: oneDayAgo },
      },
    });

    let count = 0;
    for (const reg of registrations) {
      try {
        const data = JSON.parse(reg.value);
        if (data.ipAddress === ipAddress) {
          count++;
        }
      } catch {
        // Skip invalid records
      }
    }

    return count;
  }

  /**
   * Clean up expired registrations
   */
  async cleanupExpiredRegistrations(): Promise<number> {
    try {
      const now = new Date();
      const registrations = await prisma.systemConfig.findMany({
        where: {
          key: { startsWith: "org_registration_" },
        },
      });

      let deletedCount = 0;

      for (const reg of registrations) {
        try {
          const data = JSON.parse(reg.value);
          const expiresAt = new Date(data.expiresAt);

          if (
            now > expiresAt &&
            (data.status === RegistrationStatus.PENDING_VERIFICATION ||
              data.status === RegistrationStatus.PENDING_APPROVAL)
          ) {
            await prisma.systemConfig.delete({
              where: { id: reg.id },
            });
            deletedCount++;
          }
        } catch {
          // If we can't parse, delete it
          await prisma.systemConfig.delete({
            where: { id: reg.id },
          });
          deletedCount++;
        }
      }

      log.info("Expired registrations cleaned up", "AUTH", {
        deletedCount,
        totalChecked: registrations.length,
      });

      return deletedCount;
    } catch (error) {
      log.exception(error as Error, "AUTH", {
        operation: "cleanupExpiredRegistrations",
      });
      return 0;
    }
  }
}

// Create singleton instance
const organizationRegistrationManager = new OrganizationRegistrationManager();

// Export convenience functions
export const registration = {
  /**
   * Register organization
   */
  register: (request: OrganizationRegistrationRequest) =>
    organizationRegistrationManager.registerOrganization(request),

  /**
   * Verify registration email
   */
  verify: (verification: RegistrationVerification) =>
    organizationRegistrationManager.verifyRegistration(verification),

  /**
   * Process registration (admin)
   */
  process: (approval: RegistrationApproval) =>
    organizationRegistrationManager.processRegistration(approval),

  /**
   * Get pending registrations (admin)
   */
  getPending: () => organizationRegistrationManager.getPendingRegistrations(),

  /**
   * Clean expired registrations
   */
  cleanup: () => organizationRegistrationManager.cleanupExpiredRegistrations(),
};

// Export utilities
export { organizationRegistrationManager, REGISTRATION_CONFIG };

// Default export
export default registration;
