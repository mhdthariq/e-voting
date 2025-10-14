/**
 * Password Reset System for BlockVote Authentication
 * Provides secure password reset functionality with time-limited tokens
 */

import crypto from "crypto";
import { log } from "@/utils/logger";
import prisma from "@/lib/database/client";
import { password } from "./password";

// Password reset configuration
const RESET_CONFIG = {
  tokenLength: 32,
  tokenExpiryHours: 1, // 1 hour expiry
  maxResetAttempts: 3, // Max attempts per hour
  cleanupIntervalHours: 24, // Clean expired tokens every 24 hours
};

// Password reset token interface
export interface PasswordResetToken {
  id: string;
  userId: number;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Password reset request interface
export interface PasswordResetRequest {
  email: string;
  ipAddress?: string;
  userAgent?: string;
}

// Password reset verification interface
export interface PasswordResetVerification {
  token: string;
  newPassword: string;
  ipAddress?: string;
  userAgent?: string;
}

// Password reset result interface
export interface PasswordResetResult {
  success: boolean;
  message: string;
  tokenId?: string;
  expiresAt?: Date;
}

/**
 * Password Reset Manager Class
 */
class PasswordResetManager {
  /**
   * Generate secure reset token
   */
  private generateResetToken(): string {
    return crypto.randomBytes(RESET_CONFIG.tokenLength).toString("hex");
  }

  /**
   * Request password reset - generates token and stores in database
   */
  async requestPasswordReset(
    request: PasswordResetRequest,
  ): Promise<PasswordResetResult> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: request.email },
      });

      if (!user) {
        // Don't reveal if email exists - return success to prevent enumeration
        log.security("Password reset requested for non-existent email", {
          email: request.email,
          ipAddress: request.ipAddress,
        });

        return {
          success: true,
          message:
            "If an account with this email exists, a password reset link has been sent.",
        };
      }

      // Check if user has too many recent reset attempts
      const recentAttempts = await this.getRecentResetAttempts(user.id);
      if (recentAttempts >= RESET_CONFIG.maxResetAttempts) {
        log.security("Too many password reset attempts", {
          userId: user.id,
          email: request.email,
          attempts: recentAttempts,
          ipAddress: request.ipAddress,
        });

        return {
          success: false,
          message: "Too many reset attempts. Please try again later.",
        };
      }

      // Generate reset token
      const resetToken = this.generateResetToken();
      const expiresAt = new Date(
        Date.now() + RESET_CONFIG.tokenExpiryHours * 60 * 60 * 1000,
      );

      // Store reset token in system config table (we'll use it as a simple token store)
      const tokenRecord = await prisma.systemConfig.create({
        data: {
          key: `password_reset_${resetToken}`,
          value: JSON.stringify({
            userId: user.id,
            email: user.email,
            expiresAt: expiresAt.toISOString(),
            used: false,
            ipAddress: request.ipAddress,
            userAgent: request.userAgent,
            createdAt: new Date().toISOString(),
          }),
          type: "JSON",
        },
      });

      log.auth("Password reset token generated", {
        userId: user.id,
        email: user.email,
        tokenId: tokenRecord.id,
        expiresAt,
        ipAddress: request.ipAddress,
      });

      return {
        success: true,
        message:
          "If an account with this email exists, a password reset link has been sent.",
        tokenId: tokenRecord.id.toString(),
        expiresAt,
      };
    } catch (error) {
      log.exception(error as Error, "AUTH", {
        operation: "requestPasswordReset",
        email: request.email,
      });

      return {
        success: false,
        message: "Failed to process password reset request.",
      };
    }
  }

  /**
   * Verify reset token and update password
   */
  async resetPassword(
    verification: PasswordResetVerification,
  ): Promise<PasswordResetResult> {
    try {
      // Find token record
      const tokenRecord = await prisma.systemConfig.findUnique({
        where: { key: `password_reset_${verification.token}` },
      });

      if (!tokenRecord) {
        log.security("Invalid password reset token used", {
          token: verification.token.substring(0, 8) + "...",
          ipAddress: verification.ipAddress,
        });

        return {
          success: false,
          message: "Invalid or expired reset token.",
        };
      }

      // Parse token data
      const tokenData = JSON.parse(tokenRecord.value);

      // Check if token is expired
      if (new Date() > new Date(tokenData.expiresAt)) {
        log.security("Expired password reset token used", {
          userId: tokenData.userId,
          token: verification.token.substring(0, 8) + "...",
          expiredAt: tokenData.expiresAt,
          ipAddress: verification.ipAddress,
        });

        // Clean up expired token
        await prisma.systemConfig.delete({
          where: { id: tokenRecord.id },
        });

        return {
          success: false,
          message: "Reset token has expired. Please request a new one.",
        };
      }

      // Check if token is already used
      if (tokenData.used) {
        log.security("Used password reset token attempted", {
          userId: tokenData.userId,
          token: verification.token.substring(0, 8) + "...",
          ipAddress: verification.ipAddress,
        });

        return {
          success: false,
          message: "Reset token has already been used.",
        };
      }

      // Validate new password
      const passwordValidation = password.validate(verification.newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: `Password validation failed: ${passwordValidation.feedback.join(", ")}`,
        };
      }

      // Hash new password
      const hashedPassword = await password.hash(verification.newPassword);

      // Update user password
      await prisma.user.update({
        where: { id: tokenData.userId },
        data: { passwordHash: hashedPassword },
      });

      // Mark token as used
      await prisma.systemConfig.update({
        where: { id: tokenRecord.id },
        data: {
          value: JSON.stringify({
            ...tokenData,
            used: true,
            usedAt: new Date().toISOString(),
            usedIpAddress: verification.ipAddress,
            usedUserAgent: verification.userAgent,
          }),
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: tokenData.userId,
          action: "PASSWORD_RESET",
          resource: "user",
          resourceId: tokenData.userId,
          details: "Password reset completed successfully",
          ipAddress: verification.ipAddress || "unknown",
          userAgent: verification.userAgent || "unknown",
        },
      });

      log.auth("Password reset completed successfully", {
        userId: tokenData.userId,
        email: tokenData.email,
        ipAddress: verification.ipAddress,
      });

      return {
        success: true,
        message:
          "Password has been reset successfully. You can now log in with your new password.",
      };
    } catch (error) {
      log.exception(error as Error, "AUTH", {
        operation: "resetPassword",
        token: verification.token.substring(0, 8) + "...",
      });

      return {
        success: false,
        message: "Failed to reset password. Please try again.",
      };
    }
  }

  /**
   * Verify if reset token is valid without using it
   */
  async verifyResetToken(token: string): Promise<{
    valid: boolean;
    expired?: boolean;
    used?: boolean;
    email?: string;
  }> {
    try {
      const tokenRecord = await prisma.systemConfig.findUnique({
        where: { key: `password_reset_${token}` },
      });

      if (!tokenRecord) {
        return { valid: false };
      }

      const tokenData = JSON.parse(tokenRecord.value);
      const now = new Date();
      const expiresAt = new Date(tokenData.expiresAt);

      return {
        valid: !tokenData.used && now <= expiresAt,
        expired: now > expiresAt,
        used: tokenData.used,
        email: tokenData.email,
      };
    } catch (error) {
      log.exception(error as Error, "AUTH", {
        operation: "verifyResetToken",
        token: token.substring(0, 8) + "...",
      });

      return { valid: false };
    }
  }

  /**
   * Get recent reset attempts for user (within last hour)
   */
  private async getRecentResetAttempts(userId: number): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const attempts = await prisma.systemConfig.count({
      where: {
        key: {
          startsWith: "password_reset_",
        },
        updatedAt: {
          gte: oneHourAgo,
        },
        value: {
          contains: `"userId":${userId}`,
        },
      },
    });

    return attempts;
  }

  /**
   * Clean up expired reset tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const now = new Date();

      // Find all password reset tokens
      const resetTokens = await prisma.systemConfig.findMany({
        where: {
          key: {
            startsWith: "password_reset_",
          },
        },
      });

      let deletedCount = 0;

      for (const token of resetTokens) {
        try {
          const tokenData = JSON.parse(token.value);
          const expiresAt = new Date(tokenData.expiresAt);

          if (now > expiresAt) {
            await prisma.systemConfig.delete({
              where: { id: token.id },
            });
            deletedCount++;
          }
        } catch {
          // If we can't parse the token, delete it
          await prisma.systemConfig.delete({
            where: { id: token.id },
          });
          deletedCount++;
        }
      }

      log.info("Expired password reset tokens cleaned up", "AUTH", {
        deletedCount,
        totalChecked: resetTokens.length,
      });

      return deletedCount;
    } catch (error) {
      log.exception(error as Error, "AUTH", {
        operation: "cleanupExpiredTokens",
      });
      return 0;
    }
  }

  /**
   * Get all active reset tokens for admin monitoring
   */
  async getActiveResetTokens(): Promise<
    Array<{
      tokenId: string;
      userId: number;
      email: string;
      createdAt: Date;
      expiresAt: Date;
      ipAddress?: string;
    }>
  > {
    try {
      const resetTokens = await prisma.systemConfig.findMany({
        where: {
          key: {
            startsWith: "password_reset_",
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      const activeTokens = [];
      const now = new Date();

      for (const token of resetTokens) {
        try {
          const tokenData = JSON.parse(token.value);
          const expiresAt = new Date(tokenData.expiresAt);

          if (!tokenData.used && now <= expiresAt) {
            activeTokens.push({
              tokenId: token.id.toString(),
              userId: tokenData.userId,
              email: tokenData.email,
              createdAt: new Date(tokenData.createdAt),
              expiresAt,
              ipAddress: tokenData.ipAddress,
            });
          }
        } catch {
          // Skip invalid tokens
        }
      }

      return activeTokens;
    } catch (error) {
      log.exception(error as Error, "AUTH", {
        operation: "getActiveResetTokens",
      });
      return [];
    }
  }

  /**
   * Revoke a reset token (admin function)
   */
  async revokeResetToken(tokenId: string): Promise<boolean> {
    try {
      const tokenRecord = await prisma.systemConfig.findUnique({
        where: { id: parseInt(tokenId) },
      });

      if (!tokenRecord || !tokenRecord.key.startsWith("password_reset_")) {
        return false;
      }

      const tokenData = JSON.parse(tokenRecord.value);

      await prisma.systemConfig.update({
        where: { id: parseInt(tokenId) },
        data: {
          value: JSON.stringify({
            ...tokenData,
            used: true,
            revokedAt: new Date().toISOString(),
            revokedBy: "admin",
          }),
        },
      });

      log.auth("Password reset token revoked by admin", {
        tokenId,
        userId: tokenData.userId,
        email: tokenData.email,
      });

      return true;
    } catch (error) {
      log.exception(error as Error, "AUTH", {
        operation: "revokeResetToken",
        tokenId,
      });
      return false;
    }
  }
}

// Create singleton instance
const passwordResetManager = new PasswordResetManager();

// Export convenience functions
export const passwordReset = {
  /**
   * Request password reset
   */
  request: (request: PasswordResetRequest) =>
    passwordResetManager.requestPasswordReset(request),

  /**
   * Reset password with token
   */
  reset: (verification: PasswordResetVerification) =>
    passwordResetManager.resetPassword(verification),

  /**
   * Verify reset token
   */
  verify: (token: string) => passwordResetManager.verifyResetToken(token),

  /**
   * Clean expired tokens
   */
  cleanup: () => passwordResetManager.cleanupExpiredTokens(),

  /**
   * Get active tokens (admin)
   */
  getActive: () => passwordResetManager.getActiveResetTokens(),

  /**
   * Revoke token (admin)
   */
  revoke: (tokenId: string) => passwordResetManager.revokeResetToken(tokenId),
};

// Export utilities
export { passwordResetManager, RESET_CONFIG };

// Default export
export default passwordReset;
