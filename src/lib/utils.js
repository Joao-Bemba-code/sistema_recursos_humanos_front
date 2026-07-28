import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes with proper conflict resolution.
 * Combines clsx conditional classes with tailwind-merge deduplication.
 *
 * @param {...(string|object|array)} inputs - Class values to merge
 * @returns {string} - Merged and deduplicated class string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string to locale format
 */
export function formatDate(date) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

/**
 * Format currency values
 */
export function formatCurrency(value, currency = "AOA") {
  if (value === null || value === undefined) return "—";
  try {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
}

/**
 * Get user initials from full name
 */
export function getInitials(name) {
  if (!name) return "??";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str, len = 50) {
  if (!str) return "";
  if (str.length <= len) return str;
  return str.substring(0, len) + "...";
}

/**
 * Debounce a function call
 */
export function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
