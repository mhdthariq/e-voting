/**
 * Validation utilities for BlockVote application
 * Provides consistent validation schemas and utilities using Zod
 */

import { z } from "zod";

// Base validation schemas
export const baseSchemas = {
  // Email validation
  email: z
    .string()
    .min(1, "Email is required")
    .max(255, "Email too long")
    .trim()
    .toLowerCase()
    .pipe(z.email("Invalid email format")),

  // Password validation
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),

  // Username validation
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username too long")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, hyphens, and underscores",
    )
    .toLowerCase(),

  // Name validation
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "Name can only contain letters, spaces, hyphens, and apostrophes",
    )
    .trim(),

  // Phone number validation
  phone: z
    .string()
    .regex(/^\+?[\d\s\-\(\)]+$/, "Invalid phone number format")
    .transform((phone) => phone.replace(/\D/g, "")),

  // URL validation
  url: z.url("Invalid URL format").max(2048, "URL too long"),

  // UUID validation
  uuid: z.uuid("Invalid UUID format"),

  // Date validation
  dateString: z.iso.datetime("Invalid date format"),

  // Positive integer
  positiveInt: z
    .number()
    .int("Must be an integer")
    .positive("Must be positive"),

  // Non-negative integer
  nonNegativeInt: z
    .number()
    .int("Must be an integer")
    .nonnegative("Must be non-negative"),
};

// User-related validation schemas
export const userSchemas = {
  // User registration
  register: z
    .object({
      username: baseSchemas.username,
      email: baseSchemas.email,
      password: baseSchemas.password,
      firstName: baseSchemas.name,
      lastName: baseSchemas.name,
      role: z.enum(["admin", "organization", "voter"]),
      organizationName: z.string().min(1).max(255).optional(),
    })
    .refine((data) => data.role !== "organization" || data.organizationName, {
      message: "Organization name is required for organization users",
      path: ["organizationName"],
    }),

  // User login
  login: z.object({
    identifier: z.string().min(1, "Email or username is required"),
    password: z.string().min(1, "Password is required"),
  }),

  // Password reset request
  passwordResetRequest: z.object({
    email: baseSchemas.email,
  }),

  // Password reset
  passwordReset: z
    .object({
      token: z.string().min(1, "Reset token is required"),
      password: baseSchemas.password,
      confirmPassword: z.string().min(1, "Password confirmation is required"),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),

  // Profile update
  profileUpdate: z.object({
    firstName: baseSchemas.name.optional(),
    lastName: baseSchemas.name.optional(),
    email: baseSchemas.email.optional(),
    phone: baseSchemas.phone.optional(),
    organizationName: z.string().min(1).max(255).optional(),
  }),

  // Password change
  passwordChange: z
    .object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: baseSchemas.password,
      confirmPassword: z.string().min(1, "Password confirmation is required"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),
};

// Election-related validation schemas
export const electionSchemas = {
  // Election creation
  create: z
    .object({
      title: z
        .string()
        .min(3, "Election title must be at least 3 characters")
        .max(255, "Election title too long"),
      description: z.string().max(2000, "Description too long").optional(),
      startDate: baseSchemas.dateString,
      endDate: baseSchemas.dateString,
      isPublic: z.boolean().default(false),
      allowMultipleVotes: z.boolean().default(false),
      requireVerification: z.boolean().default(true),
    })
    .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
      message: "End date must be after start date",
      path: ["endDate"],
    })
    .refine((data) => new Date(data.startDate) > new Date(), {
      message: "Start date must be in the future",
      path: ["startDate"],
    }),

  // Election update
  update: z.object({
    title: z
      .string()
      .min(3, "Election title must be at least 3 characters")
      .max(255, "Election title too long")
      .optional(),
    description: z.string().max(2000, "Description too long").optional(),
    startDate: baseSchemas.dateString.optional(),
    endDate: baseSchemas.dateString.optional(),
    isPublic: z.boolean().optional(),
    allowMultipleVotes: z.boolean().optional(),
    requireVerification: z.boolean().optional(),
  }),

  // Candidate creation
  addCandidate: z.object({
    name: baseSchemas.name,
    description: z
      .string()
      .max(1000, "Candidate description too long")
      .optional(),
    imageUrl: baseSchemas.url.optional(),
    party: z.string().max(100, "Party name too long").optional(),
    position: baseSchemas.nonNegativeInt.optional(),
  }),

  // Voter invitation
  inviteVoter: z.object({
    email: baseSchemas.email,
    firstName: baseSchemas.name,
    lastName: baseSchemas.name,
  }),

  // Bulk voter invitation
  bulkInviteVoters: z.object({
    voters: z
      .array(
        z.object({
          email: baseSchemas.email,
          firstName: baseSchemas.name,
          lastName: baseSchemas.name,
        }),
      )
      .min(1, "At least one voter is required")
      .max(1000, "Too many voters"),
  }),
};

// Voting-related validation schemas
export const voteSchemas = {
  // Cast vote
  cast: z.object({
    electionId: baseSchemas.uuid,
    candidateId: baseSchemas.uuid,
    signature: z.string().min(1, "Vote signature is required"),
  }),

  // Verify vote
  verify: z.object({
    voteId: baseSchemas.uuid,
    signature: z.string().min(1, "Signature is required"),
  }),
};

// API-related validation schemas
export const apiSchemas = {
  // Pagination
  pagination: z.object({
    page: z
      .string()
      .regex(/^\d+$/, "Page must be a number")
      .default("1")
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0, "Page must be greater than 0"),
    limit: z
      .string()
      .regex(/^\d+$/, "Limit must be a number")
      .default("10")
      .transform((val) => parseInt(val, 10))
      .refine(
        (val) => val > 0 && val <= 100,
        "Limit must be between 1 and 100",
      ),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),

  // Search
  search: z.object({
    query: z
      .string()
      .min(1, "Search query is required")
      .max(100, "Search query too long"),
    category: z.string().optional(),
  }),

  // Filter
  filter: z.object({
    status: z.string().optional(),
    role: z.string().optional(),
    startDate: baseSchemas.dateString.optional(),
    endDate: baseSchemas.dateString.optional(),
  }),
};

// File upload validation schemas
export const fileSchemas = {
  // Image upload
  image: z.object({
    file: z
      .any()
      .refine(
        (file) => file?.size <= 5 * 1024 * 1024,
        "File size must be less than 5MB",
      )
      .refine(
        (file) =>
          ["image/jpeg", "image/png", "image/webp"].includes(file?.type),
        "File must be a JPEG, PNG, or WebP image",
      ),
  }),

  // CSV upload
  csv: z.object({
    file: z
      .any()
      .refine(
        (file) => file?.size <= 10 * 1024 * 1024,
        "File size must be less than 10MB",
      )
      .refine(
        (file) => file?.type === "text/csv" || file?.name?.endsWith(".csv"),
        "File must be a CSV file",
      ),
  }),
};

// System configuration validation schemas
export const configSchemas = {
  // Email configuration
  email: z.object({
    host: z.string().min(1, "Email host is required"),
    port: z.number().int().min(1).max(65535),
    secure: z.boolean(),
    username: z.string().min(1, "Email username is required"),
    password: z.string().min(1, "Email password is required"),
    fromEmail: baseSchemas.email,
    fromName: z.string().min(1, "From name is required"),
  }),

  // Security configuration
  security: z.object({
    jwtSecret: z.string().min(32, "JWT secret must be at least 32 characters"),
    jwtExpiresIn: z
      .string()
      .regex(/^\d+[smhd]$/, "Invalid JWT expiration format"),
    bcryptRounds: z.number().int().min(10).max(15),
    rateLimitWindow: z.number().int().min(60), // seconds
    rateLimitMax: z.number().int().min(1),
  }),
};

// Validation helper functions
export const validationUtils = {
  /**
   * Validate data against a schema and return formatted errors
   */
  validate<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
  ): {
    success: boolean;
    data?: T;
    errors?: Record<string, string>;
  } {
    const result = schema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    const errors: Record<string, string> = {};
    result.error.issues.forEach((error) => {
      const path = error.path.join(".");
      errors[path] = error.message;
    });

    return {
      success: false,
      errors,
    };
  },

  /**
   * Validate and throw on error
   */
  validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const result = this.validate(schema, data);
    if (!result.success) {
      const errorMessage = Object.entries(result.errors!)
        .map(([path, message]) => `${path}: ${message}`)
        .join(", ");
      throw new Error(`Validation failed: ${errorMessage}`);
    }
    return result.data!;
  },

  /**
   * Create a validation middleware for API routes
   */
  createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
    return (data: unknown) => {
      const result = this.validate(schema, data);
      if (!result.success) {
        return {
          isValid: false,
          errors: result.errors,
        };
      }
      return {
        isValid: true,
        data: result.data,
      };
    };
  },

  /**
   * Sanitize string input
   */
  sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, "") // Remove potential HTML tags
      .replace(/javascript:/gi, "") // Remove javascript: URLs
      .replace(/on\w+=/gi, ""); // Remove event handlers
  },

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const result = baseSchemas.email.safeParse(email);
    return result.success;
  },

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score++;
    else feedback.push("Use at least 8 characters");

    if (/[a-z]/.test(password)) score++;
    else feedback.push("Include lowercase letters");

    if (/[A-Z]/.test(password)) score++;
    else feedback.push("Include uppercase letters");

    if (/\d/.test(password)) score++;
    else feedback.push("Include numbers");

    if (/[@$!%*?&]/.test(password)) score++;
    else feedback.push("Include special characters");

    return {
      isValid: score >= 4,
      score,
      feedback,
    };
  },

  /**
   * Validate UUID format
   */
  isValidUUID(uuid: string): boolean {
    const result = baseSchemas.uuid.safeParse(uuid);
    return result.success;
  },

  /**
   * Validate date range
   */
  isValidDateRange(startDate: string, endDate: string): boolean {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return start < end && start > new Date();
    } catch {
      return false;
    }
  },
};

// Export all schemas grouped by category
export const schemas = {
  base: baseSchemas,
  user: userSchemas,
  election: electionSchemas,
  vote: voteSchemas,
  api: apiSchemas,
  file: fileSchemas,
  config: configSchemas,
};

// Export validation utilities
export { validationUtils as utils };

// Export commonly used validators
export const validators = {
  email: validationUtils.isValidEmail,
  password: validationUtils.validatePasswordStrength,
  uuid: validationUtils.isValidUUID,
  dateRange: validationUtils.isValidDateRange,
  sanitize: validationUtils.sanitizeString,
};
