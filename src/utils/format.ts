/**
 * Formatting utilities for BlockVote application
 * Provides consistent formatting for dates, numbers, text, and other data types
 * All date/time operations use GMT+7 (Asia/Bangkok) timezone
 */

import { timezoneUtils } from "./timezone";

// Date formatting utilities - all use GMT+7 timezone
export const dateUtils = {
  /**
   * Format date to human-readable string in GMT+7
   */
  format(
    date: Date | string | number,
    pattern: string = "MMM dd, yyyy",
  ): string {
    return timezoneUtils.format(date, pattern);
  },

  /**
   * Format date and time in GMT+7
   */
  formatDateTime(date: Date | string | number): string {
    return timezoneUtils.formatDateTime(date);
  },

  /**
   * Format date only in GMT+7
   */
  formatDate(date: Date | string | number): string {
    return timezoneUtils.formatDate(date);
  },

  /**
   * Format time only in GMT+7 (12-hour format)
   */
  formatTime(date: Date | string | number): string {
    return timezoneUtils.formatTime12(date);
  },

  /**
   * Format time only in GMT+7 (24-hour format)
   */
  formatTime24(date: Date | string | number): string {
    return timezoneUtils.formatTime24(date);
  },

  /**
   * Format relative time (e.g., "2 hours ago") - timezone aware
   */
  formatRelative(date: Date | string | number): string {
    return timezoneUtils.formatRelative(date);
  },

  /**
   * Format duration in milliseconds to human readable
   */
  formatDuration(milliseconds: number): string {
    return timezoneUtils.formatDuration(milliseconds);
  },

  /**
   * Format with timezone indicator (GMT+7)
   */
  formatWithTimezone(date: Date | string | number): string {
    return timezoneUtils.formatWithTimezone(date);
  },

  /**
   * Format in local Thai style (dd/MM/yyyy)
   */
  formatLocal(date: Date | string | number): string {
    return timezoneUtils.formatLocal(date);
  },

  /**
   * Format in local Thai style with time (dd/MM/yyyy HH:mm)
   */
  formatLocalDateTime(date: Date | string | number): string {
    return timezoneUtils.formatLocalDateTime(date);
  },
};

// Number formatting utilities
export const numberUtils = {
  /**
   * Format number with thousand separators
   */
  format(num: number, decimals: number = 0): string {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  },

  /**
   * Format percentage
   */
  formatPercentage(num: number, decimals: number = 1): string {
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num / 100);
  },

  /**
   * Format currency
   */
  formatCurrency(num: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(num);
  },

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 Bytes";

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`;
  },

  /**
   * Format large numbers with suffixes (K, M, B)
   */
  formatCompact(num: number): string {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(num);
  },
};

// Text formatting utilities
export const textUtils = {
  /**
   * Capitalize first letter
   */
  capitalize(text: string): string {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  },

  /**
   * Convert to title case
   */
  titleCase(text: string): string {
    if (!text) return "";
    return text
      .split(" ")
      .map((word) => this.capitalize(word))
      .join(" ");
  },

  /**
   * Convert camelCase to readable text
   */
  camelToReadable(text: string): string {
    return text
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  },

  /**
   * Truncate text with ellipsis
   */
  truncate(text: string, maxLength: number, suffix: string = "..."): string {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength - suffix.length) + suffix;
  },

  /**
   * Remove extra whitespace and normalize
   */
  normalize(text: string): string {
    return text.replace(/\s+/g, " ").trim();
  },

  /**
   * Convert to slug (URL-friendly)
   */
  slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  },

  /**
   * Mask sensitive text (e.g., email, phone)
   */
  mask(text: string, visibleChars: number = 3, maskChar: string = "*"): string {
    if (!text || text.length <= visibleChars * 2) return text;

    const start = text.slice(0, visibleChars);
    const end = text.slice(-visibleChars);
    const masked = maskChar.repeat(text.length - visibleChars * 2);

    return start + masked + end;
  },

  /**
   * Extract initials from name
   */
  getInitials(name: string, maxInitials: number = 2): string {
    return name
      .split(" ")
      .filter((word) => word.length > 0)
      .slice(0, maxInitials)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
  },
};

// Election-specific formatting utilities
export const electionUtils = {
  /**
   * Format election status
   */
  formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      draft: "Draft",
      scheduled: "Scheduled",
      active: "Active",
      paused: "Paused",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return statusMap[status.toLowerCase()] || textUtils.titleCase(status);
  },

  /**
   * Format user role
   */
  formatRole(role: string): string {
    const roleMap: Record<string, string> = {
      admin: "Administrator",
      organization: "Organization",
      voter: "Voter",
    };
    return roleMap[role.toLowerCase()] || textUtils.titleCase(role);
  },

  /**
   * Format vote count with proper pluralization
   */
  formatVoteCount(count: number): string {
    return `${numberUtils.format(count)} ${count === 1 ? "vote" : "votes"}`;
  },

  /**
   * Format blockchain hash for display
   */
  formatHash(hash: string, length: number = 8): string {
    if (!hash || hash.length < length * 2) return hash;
    return `${hash.slice(0, length)}...${hash.slice(-length)}`;
  },

  /**
   * Format election ID for display
   */
  formatElectionId(id: string): string {
    return `#${id.slice(-8).toUpperCase()}`;
  },
};

// Validation and parsing utilities
export const parseUtils = {
  /**
   * Parse and validate email
   */
  parseEmail(email: string): { isValid: boolean; formatted: string } {
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return {
      isValid: emailRegex.test(trimmed),
      formatted: trimmed,
    };
  },

  /**
   * Parse phone number
   */
  parsePhone(phone: string): { isValid: boolean; formatted: string } {
    const cleaned = phone.replace(/\D/g, "");
    const isValid = cleaned.length >= 10 && cleaned.length <= 15;

    let formatted = cleaned;
    if (cleaned.length === 10) {
      formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    return { isValid, formatted };
  },

  /**
   * Parse JSON safely
   */
  parseJSON<T>(json: string, fallback: T): T {
    try {
      return JSON.parse(json);
    } catch {
      return fallback;
    }
  },
};

// CSS class utilities
export const cssUtils = {
  /**
   * Conditionally join CSS classes
   */
  cn(...classes: (string | undefined | null | boolean)[]): string {
    return classes
      .filter((cls): cls is string => typeof cls === "string" && cls.length > 0)
      .join(" ");
  },

  /**
   * Generate status badge classes
   */
  statusClasses(status: string): string {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";

    const statusClasses: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      completed: "bg-blue-100 text-blue-800",
      draft: "bg-gray-100 text-gray-800",
      scheduled: "bg-yellow-100 text-yellow-800",
      paused: "bg-orange-100 text-orange-800",
      cancelled: "bg-red-100 text-red-800",
      pending: "bg-purple-100 text-purple-800",
    };

    return this.cn(baseClasses, statusClasses[status.toLowerCase()]);
  },

  /**
   * Generate role badge classes
   */
  roleClasses(role: string): string {
    const baseClasses = "px-2 py-1 rounded text-xs font-medium";

    const roleClasses: Record<string, string> = {
      admin: "bg-red-100 text-red-800",
      organization: "bg-blue-100 text-blue-800",
      voter: "bg-green-100 text-green-800",
    };

    return this.cn(baseClasses, roleClasses[role.toLowerCase()]);
  },
};

// Export all utilities
export {
  dateUtils as date,
  numberUtils as number,
  textUtils as text,
  electionUtils as election,
  parseUtils as parse,
  cssUtils as css,
};

// Export timezone utilities
export {
  timezoneUtils as timezone,
  electionTimezoneUtils as electionTimezone,
} from "./timezone";

// Export convenience functions
export const formatters = {
  date: dateUtils.formatDate,
  dateTime: dateUtils.formatDateTime,
  time: dateUtils.formatTime,
  time24: dateUtils.formatTime24,
  relative: dateUtils.formatRelative,
  duration: dateUtils.formatDuration,
  withTimezone: dateUtils.formatWithTimezone,
  local: dateUtils.formatLocal,
  localDateTime: dateUtils.formatLocalDateTime,
  number: numberUtils.format,
  percentage: numberUtils.formatPercentage,
  currency: numberUtils.formatCurrency,
  fileSize: numberUtils.formatFileSize,
  compact: numberUtils.formatCompact,
  capitalize: textUtils.capitalize,
  titleCase: textUtils.titleCase,
  truncate: textUtils.truncate,
  slugify: textUtils.slugify,
  mask: textUtils.mask,
  initials: textUtils.getInitials,
  hash: electionUtils.formatHash,
  status: electionUtils.formatStatus,
  role: electionUtils.formatRole,
  voteCount: electionUtils.formatVoteCount,
};
