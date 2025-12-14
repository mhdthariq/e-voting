/**
 * Timezone utilities for BlockVote application
 * Configured to use GMT+7 (Asia/Bangkok timezone)
 * Ensures consistent timezone handling across the application regardless of server location
 */

import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";

// Application timezone constant - GMT+7 (Asia/Bangkok)
export const APP_TIMEZONE = "Asia/Bangkok";
export const GMT_OFFSET = "+07:00";

/**
 * Convert any date to the application timezone (GMT+7)
 */
export function toAppTimezone(date: Date | string | number): Date {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) {
      throw new Error("Invalid date");
    }
    return toZonedTime(dateObj, APP_TIMEZONE);
  } catch (error) {
    console.error("Error converting to app timezone:", error);
    return new Date();
  }
}

/**
 * Convert from application timezone to UTC
 */
export function fromAppTimezone(date: Date | string | number): Date {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) {
      throw new Error("Invalid date");
    }
    return fromZonedTime(dateObj, APP_TIMEZONE);
  } catch (error) {
    console.error("Error converting from app timezone:", error);
    return new Date();
  }
}

/**
 * Get current time in application timezone (GMT+7)
 */
export function now(): Date {
  return toZonedTime(new Date(), APP_TIMEZONE);
}

/**
 * Format date in application timezone
 */
export function formatInAppTimezone(
  date: Date | string | number,
  pattern: string = "MMM dd, yyyy HH:mm",
): string {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) {
      return "Invalid Date";
    }
    return formatInTimeZone(dateObj, APP_TIMEZONE, pattern);
  } catch (error) {
    console.error("Error formatting date in app timezone:", error);
    return "Invalid Date";
  }
}

/**
 * Timezone-aware date utilities
 */
export const timezoneUtils = {
  /**
   * Format date to human-readable string in GMT+7
   */
  format(
    date: Date | string | number,
    pattern: string = "MMM dd, yyyy",
  ): string {
    return formatInAppTimezone(date, pattern);
  },

  /**
   * Format date and time in GMT+7
   */
  formatDateTime(date: Date | string | number): string {
    return formatInAppTimezone(date, "MMM dd, yyyy HH:mm");
  },

  /**
   * Format date only in GMT+7
   */
  formatDate(date: Date | string | number): string {
    return formatInAppTimezone(date, "MMM dd, yyyy");
  },

  /**
   * Format time only in GMT+7 (24-hour format)
   */
  formatTime24(date: Date | string | number): string {
    return formatInAppTimezone(date, "HH:mm");
  },

  /**
   * Format time only in GMT+7 (12-hour format with AM/PM)
   */
  formatTime12(date: Date | string | number): string {
    return formatInAppTimezone(date, "hh:mm a");
  },

  /**
   * Format with timezone indicator
   */
  formatWithTimezone(date: Date | string | number): string {
    return formatInAppTimezone(date, "MMM dd, yyyy HH:mm zzz");
  },

  /**
   * Format for display in local format (Thai style: dd/MM/yyyy)
   */
  formatLocal(date: Date | string | number): string {
    return formatInAppTimezone(date, "dd/MM/yyyy");
  },

  /**
   * Format for display in local format with time
   */
  formatLocalDateTime(date: Date | string | number): string {
    return formatInAppTimezone(date, "dd/MM/yyyy HH:mm");
  },

  /**
   * Format relative time (e.g., "2 hours ago") - timezone aware
   */
  formatRelative(date: Date | string | number): string {
    try {
      const dateObj =
        typeof date === "string" ? parseISO(date) : new Date(date);
      if (!isValid(dateObj)) {
        return "Invalid Date";
      }
      // Convert to app timezone before calculating relative time
      const zonedDate = toZonedTime(dateObj, APP_TIMEZONE);
      return formatDistanceToNow(zonedDate, { addSuffix: true });
    } catch (error) {
      console.error("Error formatting relative date:", error);
      return "Invalid Date";
    }
  },

  /**
   * Format ISO string in GMT+7
   */
  toISOString(date: Date | string | number): string {
    try {
      const dateObj =
        typeof date === "string" ? parseISO(date) : new Date(date);
      if (!isValid(dateObj)) {
        throw new Error("Invalid date");
      }
      const zonedDate = toZonedTime(dateObj, APP_TIMEZONE);
      return zonedDate.toISOString();
    } catch (error) {
      console.error("Error converting to ISO string:", error);
      return new Date().toISOString();
    }
  },

  /**
   * Parse string to Date in GMT+7 timezone
   */
  parse(dateString: string): Date {
    try {
      const parsedDate = parseISO(dateString);
      if (!isValid(parsedDate)) {
        throw new Error("Invalid date string");
      }
      return toZonedTime(parsedDate, APP_TIMEZONE);
    } catch (error) {
      console.error("Error parsing date:", error);
      return now();
    }
  },

  /**
   * Get start of day in GMT+7
   */
  startOfDay(date: Date | string | number = new Date()): Date {
    const dateObj = typeof date === "string" ? parseISO(date) : new Date(date);
    const zonedDate = toZonedTime(dateObj, APP_TIMEZONE);
    zonedDate.setHours(0, 0, 0, 0);
    return zonedDate;
  },

  /**
   * Get end of day in GMT+7
   */
  endOfDay(date: Date | string | number = new Date()): Date {
    const dateObj = typeof date === "string" ? parseISO(date) : new Date(date);
    const zonedDate = toZonedTime(dateObj, APP_TIMEZONE);
    zonedDate.setHours(23, 59, 59, 999);
    return zonedDate;
  },

  /**
   * Check if date is in the past (GMT+7 timezone)
   */
  isPast(date: Date | string | number): boolean {
    const dateObj = typeof date === "string" ? parseISO(date) : new Date(date);
    const zonedDate = toZonedTime(dateObj, APP_TIMEZONE);
    const currentDate = now();
    return zonedDate < currentDate;
  },

  /**
   * Check if date is in the future (GMT+7 timezone)
   */
  isFuture(date: Date | string | number): boolean {
    const dateObj = typeof date === "string" ? parseISO(date) : new Date(date);
    const zonedDate = toZonedTime(dateObj, APP_TIMEZONE);
    const currentDate = now();
    return zonedDate > currentDate;
  },

  /**
   * Check if date is today (GMT+7 timezone)
   */
  isToday(date: Date | string | number): boolean {
    const dateObj = typeof date === "string" ? parseISO(date) : new Date(date);
    const zonedDate = toZonedTime(dateObj, APP_TIMEZONE);
    const today = now();

    return (
      zonedDate.getFullYear() === today.getFullYear() &&
      zonedDate.getMonth() === today.getMonth() &&
      zonedDate.getDate() === today.getDate()
    );
  },

  /**
   * Add days to date in GMT+7 timezone
   */
  addDays(date: Date | string | number, days: number): Date {
    const dateObj = typeof date === "string" ? parseISO(date) : new Date(date);
    const zonedDate = toZonedTime(dateObj, APP_TIMEZONE);
    zonedDate.setDate(zonedDate.getDate() + days);
    return zonedDate;
  },

  /**
   * Add hours to date in GMT+7 timezone
   */
  addHours(date: Date | string | number, hours: number): Date {
    const dateObj = typeof date === "string" ? parseISO(date) : new Date(date);
    const zonedDate = toZonedTime(dateObj, APP_TIMEZONE);
    zonedDate.setHours(zonedDate.getHours() + hours);
    return zonedDate;
  },

  /**
   * Get difference in days between two dates (GMT+7 timezone)
   */
  differenceInDays(
    dateLeft: Date | string | number,
    dateRight: Date | string | number,
  ): number {
    const leftObj =
      typeof dateLeft === "string" ? parseISO(dateLeft) : new Date(dateLeft);
    const rightObj =
      typeof dateRight === "string" ? parseISO(dateRight) : new Date(dateRight);

    const zonedLeft = toZonedTime(leftObj, APP_TIMEZONE);
    const zonedRight = toZonedTime(rightObj, APP_TIMEZONE);

    const diffTime = Math.abs(zonedLeft.getTime() - zonedRight.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Get difference in hours between two dates (GMT+7 timezone)
   */
  differenceInHours(
    dateLeft: Date | string | number,
    dateRight: Date | string | number,
  ): number {
    const leftObj =
      typeof dateLeft === "string" ? parseISO(dateLeft) : new Date(dateLeft);
    const rightObj =
      typeof dateRight === "string" ? parseISO(dateRight) : new Date(dateRight);

    const zonedLeft = toZonedTime(leftObj, APP_TIMEZONE);
    const zonedRight = toZonedTime(rightObj, APP_TIMEZONE);

    const diffTime = Math.abs(zonedLeft.getTime() - zonedRight.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60));
  },

  /**
   * Format duration in milliseconds to human readable (timezone independent)
   */
  formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }
    if (milliseconds < 60000) {
      return `${Math.round(milliseconds / 1000)}s`;
    }
    if (milliseconds < 3600000) {
      return `${Math.round(milliseconds / 60000)}m`;
    }
    if (milliseconds < 86400000) {
      return `${Math.round(milliseconds / 3600000)}h`;
    }
    return `${Math.round(milliseconds / 86400000)}d`;
  },

  /**
   * Create a Date object for input[type="datetime-local"] in GMT+7
   */
  toDateTimeLocalString(date: Date | string | number = new Date()): string {
    const dateObj = typeof date === "string" ? parseISO(date) : new Date(date);
    const zonedDate = toZonedTime(dateObj, APP_TIMEZONE);

    const year = zonedDate.getFullYear();
    const month = String(zonedDate.getMonth() + 1).padStart(2, "0");
    const day = String(zonedDate.getDate()).padStart(2, "0");
    const hours = String(zonedDate.getHours()).padStart(2, "0");
    const minutes = String(zonedDate.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  },

  /**
   * Parse datetime-local input value to Date in GMT+7
   */
  fromDateTimeLocalString(dateTimeLocalString: string): Date {
    // Input format: "YYYY-MM-DDTHH:mm"
    const date = new Date(dateTimeLocalString);
    return fromZonedTime(date, APP_TIMEZONE);
  },
};

/**
 * Election-specific timezone utilities
 */
export const electionTimezoneUtils = {
  /**
   * Check if election is currently active (based on GMT+7 time)
   */
  isElectionActive(startDate: Date | string, endDate: Date | string): boolean {
    const start = toAppTimezone(startDate);
    const end = toAppTimezone(endDate);
    const current = now();

    return current >= start && current <= end;
  },

  /**
   * Check if election has started (based on GMT+7 time)
   */
  hasElectionStarted(startDate: Date | string): boolean {
    const start = toAppTimezone(startDate);
    const current = now();
    return current >= start;
  },

  /**
   * Check if election has ended (based on GMT+7 time)
   */
  hasElectionEnded(endDate: Date | string): boolean {
    const end = toAppTimezone(endDate);
    const current = now();
    return current > end;
  },

  /**
   * Get time remaining until election starts (in milliseconds)
   */
  getTimeUntilStart(startDate: Date | string): number {
    const start = toAppTimezone(startDate);
    const current = now();
    return Math.max(0, start.getTime() - current.getTime());
  },

  /**
   * Get time remaining until election ends (in milliseconds)
   */
  getTimeUntilEnd(endDate: Date | string): number {
    const end = toAppTimezone(endDate);
    const current = now();
    return Math.max(0, end.getTime() - current.getTime());
  },

  /**
   * Format election period for display
   */
  formatElectionPeriod(
    startDate: Date | string,
    endDate: Date | string,
  ): string {
    const start = timezoneUtils.formatDateTime(startDate);
    const end = timezoneUtils.formatDateTime(endDate);
    return `${start} - ${end} (GMT+7)`;
  },

  /**
   * Format countdown for upcoming election
   */
  formatCountdown(targetDate: Date | string): string {
    const target = toAppTimezone(targetDate);
    const current = now();
    const diff = target.getTime() - current.getTime();

    if (diff <= 0) return "Started";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  },
};

// Export convenience functions
export const tz = timezoneUtils;
export const electionTz = electionTimezoneUtils;

// Default export
const timezoneConfig = {
  ...timezoneUtils,
  election: electionTimezoneUtils,
  APP_TIMEZONE,
  GMT_OFFSET,
  now,
  toAppTimezone,
  fromAppTimezone,
};

export default timezoneConfig;
