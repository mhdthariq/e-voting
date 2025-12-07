import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge tailwind classes safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const theme = {
  colors: {
    brand: {
      primary: "var(--brand-primary)",
      accent: "var(--brand-accent)",
    },
    glass: {
      bg: "var(--glass-bg)",
    }
  },
  animation: {
    duration: {
      fast: 0.2,
      normal: 0.5,
      slow: 0.8
    }
  }
};
