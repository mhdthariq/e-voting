/**
 * Utility functions index for BlockVote application
 * Exports all utility functions for easy importing
 */

// Export everything from individual utility modules
export * from "./logger";
export * from "./format";
export * from "./validation";

// Re-export commonly used utilities with simpler names
import { logger } from "./logger";
import { formatters } from "./format";
import { validators } from "./validation";

export const utils = {
  logger,
  format: formatters,
  validate: validators,
};
