/**
 * Password Utilities for BlockVote Authentication
 * Provides secure password hashing, verification, and strength validation
 */

import bcrypt from "bcryptjs";

// Fallback logger to prevent import issues
const log = {
  auth: (msg: string, meta?: Record<string, unknown>) =>
    console.log(`[AUTH] ${msg}`, meta || ""),
  error: (msg: string, context?: string, meta?: Record<string, unknown>) =>
    console.error(`[${context || "ERROR"}] ${msg}`, meta || ""),
  exception: (error: Error, context?: string, meta?: Record<string, unknown>) =>
    console.error(`[${context || "EXCEPTION"}]`, error.message, meta || ""),
  warn: (msg: string, context?: string, meta?: Record<string, unknown>) =>
    console.warn(`[${context || "WARN"}] ${msg}`, meta || ""),
  info: (msg: string, context?: string, meta?: Record<string, unknown>) =>
    console.info(`[${context || "INFO"}] ${msg}`, meta || ""),
  debug: (msg: string, context?: string, meta?: Record<string, unknown>) =>
    console.debug(`[${context || "DEBUG"}] ${msg}`, meta || ""),
  security: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(`[SECURITY] ${msg}`, meta || ""),
  audit: (action: string, userId?: string, meta?: Record<string, unknown>) =>
    console.log(
      `[AUDIT] ${action} ${userId ? `by user ${userId}` : ""}`,
      meta || "",
    ),
};

// Password configuration
const PASSWORD_CONFIG = {
  saltRounds: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: "@$!%*?&",
};

// Password strength levels
export enum PasswordStrength {
  VERY_WEAK = 0,
  WEAK = 1,
  FAIR = 2,
  GOOD = 3,
  STRONG = 4,
  VERY_STRONG = 5,
}

// Password validation result
export interface PasswordValidationResult {
  isValid: boolean;
  strength: PasswordStrength;
  score: number;
  feedback: string[];
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    specialChars: boolean;
  };
}

// Password hash result
export interface PasswordHashResult {
  hash: string;
  salt: string;
  rounds: number;
  timestamp: Date;
}

/**
 * Password Manager Class
 */
class PasswordManager {
  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    try {
      // Validate password before hashing
      const validation = this.validatePassword(password);
      if (!validation.isValid) {
        throw new Error(
          `Password validation failed: ${validation.feedback.join(", ")}`,
        );
      }

      const hash = await bcrypt.hash(password, PASSWORD_CONFIG.saltRounds);

      log.auth("Password hashed successfully", {
        rounds: PASSWORD_CONFIG.saltRounds,
        strength: PasswordStrength[validation.strength],
      });

      return hash;
    } catch (error) {
      log.exception(error as Error, "AUTH", { operation: "hashPassword" });
      throw new Error("Failed to hash password");
    }
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hash);

      log.auth("Password verification attempt", {
        success: isValid,
        operation: "verifyPassword",
      });

      return isValid;
    } catch (error) {
      log.exception(error as Error, "AUTH", { operation: "verifyPassword" });
      return false;
    }
  }

  /**
   * Validate password strength and requirements
   */
  validatePassword(password: string): PasswordValidationResult {
    const feedback: string[] = [];
    const requirements = {
      length: false,
      uppercase: false,
      lowercase: false,
      numbers: false,
      specialChars: false,
    };

    let score = 0;

    // Check length
    if (password.length >= PASSWORD_CONFIG.minLength) {
      requirements.length = true;
      score += 1;
    } else {
      feedback.push(
        `Password must be at least ${PASSWORD_CONFIG.minLength} characters long`,
      );
    }

    if (password.length > PASSWORD_CONFIG.maxLength) {
      feedback.push(
        `Password must not exceed ${PASSWORD_CONFIG.maxLength} characters`,
      );
      return {
        isValid: false,
        strength: PasswordStrength.VERY_WEAK,
        score: 0,
        feedback,
        requirements,
      };
    }

    // Check uppercase letters
    if (/[A-Z]/.test(password)) {
      requirements.uppercase = true;
      score += 1;
    } else if (PASSWORD_CONFIG.requireUppercase) {
      feedback.push("Password must contain at least one uppercase letter");
    }

    // Check lowercase letters
    if (/[a-z]/.test(password)) {
      requirements.lowercase = true;
      score += 1;
    } else if (PASSWORD_CONFIG.requireLowercase) {
      feedback.push("Password must contain at least one lowercase letter");
    }

    // Check numbers
    if (/\d/.test(password)) {
      requirements.numbers = true;
      score += 1;
    } else if (PASSWORD_CONFIG.requireNumbers) {
      feedback.push("Password must contain at least one number");
    }

    // Check special characters
    const specialCharRegex = new RegExp(
      `[${PASSWORD_CONFIG.specialChars.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}]`,
    );
    if (specialCharRegex.test(password)) {
      requirements.specialChars = true;
      score += 1;
    } else if (PASSWORD_CONFIG.requireSpecialChars) {
      feedback.push(
        `Password must contain at least one special character (${PASSWORD_CONFIG.specialChars})`,
      );
    }

    // Additional strength checks
    const bonusPoints = this.calculateBonusPoints(password);
    score += bonusPoints;

    // Determine strength level
    const strength = this.calculatePasswordStrength(score);

    // Check if password meets minimum requirements
    const isValid =
      requirements.length &&
      (!PASSWORD_CONFIG.requireUppercase || requirements.uppercase) &&
      (!PASSWORD_CONFIG.requireLowercase || requirements.lowercase) &&
      (!PASSWORD_CONFIG.requireNumbers || requirements.numbers) &&
      (!PASSWORD_CONFIG.requireSpecialChars || requirements.specialChars);

    // Add strength-based feedback
    if (isValid) {
      switch (strength) {
        case PasswordStrength.VERY_WEAK:
        case PasswordStrength.WEAK:
          feedback.push("Consider using a stronger password");
          break;
        case PasswordStrength.FAIR:
          feedback.push("Password strength is acceptable");
          break;
        case PasswordStrength.GOOD:
          feedback.push("Good password strength");
          break;
        case PasswordStrength.STRONG:
          feedback.push("Strong password");
          break;
        case PasswordStrength.VERY_STRONG:
          feedback.push("Excellent password strength");
          break;
      }
    }

    return {
      isValid,
      strength,
      score,
      feedback,
      requirements,
    };
  }

  /**
   * Calculate bonus points for additional security features
   */
  private calculateBonusPoints(password: string): number {
    let bonus = 0;

    // Length bonus
    if (password.length >= 12) bonus += 1;
    if (password.length >= 16) bonus += 1;

    // Character variety bonus
    const uniqueChars = new Set(password.split("")).size;
    if (uniqueChars >= password.length * 0.7) bonus += 1;

    // No common patterns
    if (!this.hasCommonPatterns(password)) bonus += 1;

    // Mixed case throughout (not just first/last)
    if (this.hasMixedCaseThroughout(password)) bonus += 1;

    return bonus;
  }

  /**
   * Calculate password strength based on score and characteristics
   */
  private calculatePasswordStrength(score: number): PasswordStrength {
    if (score <= 1) return PasswordStrength.VERY_WEAK;
    if (score <= 2) return PasswordStrength.WEAK;
    if (score <= 4) return PasswordStrength.FAIR;
    if (score <= 6) return PasswordStrength.GOOD;
    if (score <= 8) return PasswordStrength.STRONG;
    return PasswordStrength.VERY_STRONG;
  }

  /**
   * Check for common password patterns
   */
  private hasCommonPatterns(password: string): boolean {
    const commonPatterns = [
      /123/,
      /abc/,
      /qwerty/i,
      /password/i,
      /admin/i,
      /login/i,
      /(.)\1{2,}/, // Repeated characters (3+ times)
      /^(.)(.*\1){2,}$/, // Same character repeated throughout
    ];

    return commonPatterns.some((pattern) => pattern.test(password));
  }

  /**
   * Check if password has mixed case throughout (not just at beginning/end)
   */
  private hasMixedCaseThroughout(password: string): boolean {
    if (password.length < 4) return false;

    const middle = password.slice(1, -1);
    return /[A-Z]/.test(middle) && /[a-z]/.test(middle);
  }

  /**
   * Generate secure random password
   */
  generateSecurePassword(length: number = 16): string {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const specialChars = PASSWORD_CONFIG.specialChars;

    const allChars = lowercase + uppercase + numbers + specialChars;
    let password = "";

    // Ensure at least one character from each required category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];

    // Fill remaining length with random characters
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password to avoid predictable patterns
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  /**
   * Check if password needs to be rehashed (due to changed salt rounds)
   */
  needsRehash(hash: string): boolean {
    try {
      const rounds = bcrypt.getRounds(hash);
      return rounds < PASSWORD_CONFIG.saltRounds;
    } catch (error) {
      log.exception(error as Error, "AUTH", { operation: "needsRehash" });
      return true; // If we can't determine, assume it needs rehashing
    }
  }

  /**
   * Get password hash information
   */
  getHashInfo(hash: string): { rounds: number; valid: boolean } {
    try {
      const rounds = bcrypt.getRounds(hash);
      return {
        rounds,
        valid: true,
      };
    } catch {
      return {
        rounds: 0,
        valid: false,
      };
    }
  }

  /**
   * Validate password configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (PASSWORD_CONFIG.saltRounds < 10 || PASSWORD_CONFIG.saltRounds > 15) {
      errors.push(
        "Salt rounds should be between 10 and 15 for security and performance balance",
      );
    }

    if (PASSWORD_CONFIG.minLength < 8) {
      errors.push("Minimum password length should be at least 8 characters");
    }

    if (PASSWORD_CONFIG.maxLength < PASSWORD_CONFIG.minLength) {
      errors.push("Maximum password length cannot be less than minimum length");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Create singleton instance
const passwordManager = new PasswordManager();

// Export convenience functions
export const password = {
  /**
   * Hash password
   */
  hash: (password: string) => passwordManager.hashPassword(password),

  /**
   * Verify password against hash
   */
  verify: (password: string, hash: string) =>
    passwordManager.verifyPassword(password, hash),

  /**
   * Validate password strength
   */
  validate: (password: string) => passwordManager.validatePassword(password),

  /**
   * Generate secure password
   */
  generate: (length?: number) => passwordManager.generateSecurePassword(length),

  /**
   * Check if hash needs rehashing
   */
  needsRehash: (hash: string) => passwordManager.needsRehash(hash),

  /**
   * Get hash information
   */
  getHashInfo: (hash: string) => passwordManager.getHashInfo(hash),

  /**
   * Validate configuration
   */
  validateConfig: () => passwordManager.validateConfig(),
};

// Export utilities
export { passwordManager, PASSWORD_CONFIG };

// Default export
export default password;
