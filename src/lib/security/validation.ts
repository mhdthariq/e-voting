/**
 * Input Validation and Sanitization Utility
 * Prevents injection attacks and validates data
 */

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";

  return input
    .replace(/[<>]/g, "") // Remove < and >
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .trim()
    .slice(0, 1000); // Limit length
}

/**
 * Sanitize email
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== "string") return "";

  return email
    .toLowerCase()
    .trim()
    .slice(0, 254); // RFC 5321
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate username (alphanumeric, dash, underscore)
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(username);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  if (password.length > 128) {
    errors.push("Password must be less than 128 characters");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain lowercase letter");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain uppercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain number");
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain special character");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate ID (positive integer)
 */
export function isValidId(id: unknown): boolean {
  if (typeof id === "number") {
    return Number.isInteger(id) && id > 0;
  }
  if (typeof id === "string") {
    const num = parseInt(id, 10);
    return !isNaN(num) && num > 0 && num.toString() === id;
  }
  return false;
}

/**
 * Validate date string
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate election status
 */
export function isValidElectionStatus(status: string): boolean {
  return ["DRAFT", "ACTIVE", "ENDED"].includes(status);
}

/**
 * Validate user role
 */
export function isValidUserRole(role: string): boolean {
  return ["admin", "organization", "voter"].includes(role.toLowerCase());
}

/**
 * Sanitize object by removing dangerous properties
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  allowedKeys: string[]
): Partial<T> {
  const sanitized: Record<string, unknown> = {};

  for (const key of allowedKeys) {
    if (key in obj) {
      const value = obj[key];

      // Sanitize string values
      if (typeof value === "string") {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === "number" || typeof value === "boolean") {
        sanitized[key] = value;
      } else if (value === null) {
        sanitized[key] = null;
      }
      // Skip undefined, functions, and other complex types
    }
  }

  return sanitized as Partial<T>;
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  page?: string | number,
  perPage?: string | number
): {
  page: number;
  perPage: number;
} {
  let pageNum = 1;
  let perPageNum = 10;

  if (page !== undefined) {
    const parsed = typeof page === "string" ? parseInt(page, 10) : page;
    if (!isNaN(parsed) && parsed > 0 && parsed <= 1000) {
      pageNum = parsed;
    }
  }

  if (perPage !== undefined) {
    const parsed = typeof perPage === "string" ? parseInt(perPage, 10) : perPage;
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      perPageNum = parsed;
    }
  }

  return { page: pageNum, perPage: perPageNum };
}

/**
 * Prevent SQL injection in search queries
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== "string") return "";

  return query
    .replace(/[';"`]/g, "") // Remove quotes
    .replace(/--/g, "") // Remove SQL comments
    .replace(/\/\*/g, "") // Remove block comments
    .trim()
    .slice(0, 200); // Limit length
}

/**
 * Validate JWT token format
 */
export function isValidJWTFormat(token: string): boolean {
  if (typeof token !== "string") return false;
  const parts = token.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

/**
 * Validate IP address format
 */
export function isValidIP(ip: string): boolean {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split(".");
    return parts.every((part) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  // IPv6 (basic check)
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;
  return ipv6Regex.test(ip);
}

/**
 * Validate file name (no path traversal)
 */
export function sanitizeFileName(fileName: string): string {
  if (typeof fileName !== "string") return "";

  return fileName
    .replace(/\.\./g, "") // Remove ..
    .replace(/[/\\]/g, "") // Remove slashes
    .replace(/[<>:"|?*]/g, "") // Remove invalid chars
    .trim()
    .slice(0, 255);
}

/**
 * Validate URL
 */
export function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Rate limit validator - check if value is within limits
 */
export function isWithinLimit(value: number, min: number, max: number): boolean {
  return typeof value === "number" && !isNaN(value) && value >= min && value <= max;
}
