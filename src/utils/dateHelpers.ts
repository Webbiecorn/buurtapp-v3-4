/**
 * Date formatting and parsing utilities
 * Consolidated from multiple duplicate implementations
 */

import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

/**
 * Safely convert any date-like value to a Date object
 * Handles: Date, Timestamp, ISO string, Unix timestamp
 */
export function toDate(value: unknown): Date | null {
  if (!value) return null;

  // Already a Date
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  // Firebase Timestamp
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as Timestamp).toDate();
  }

  // ISO string
  if (typeof value === 'string') {
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : null;
  }

  // Unix timestamp (number)
  if (typeof value === 'number') {
    const date = new Date(value);
    return isValid(date) ? date : null;
  }

  return null;
}

/**
 * Safely get timestamp (ms since epoch) from any date-like value
 */
export function getTimeSafe(value: unknown): number {
  const date = toDate(value);
  return date ? date.getTime() : 0;
}

/**
 * Format a date with a custom format string
 * Returns fallback string if date is invalid
 */
export function formatSafe(
  value: unknown,
  formatStr: string,
  fallback: string = 'Onbekend'
): string {
  const date = toDate(value);
  if (!date) return fallback;

  try {
    return format(date, formatStr, { locale: nl });
  } catch {
    return fallback;
  }
}

/**
 * Format a date relative to now (e.g., "2 dagen geleden")
 */
export function formatRelative(value: unknown, fallback: string = 'Onbekend'): string {
  const date = toDate(value);
  if (!date) return fallback;

  try {
    return formatDistanceToNow(date, { addSuffix: true, locale: nl });
  } catch {
    return fallback;
  }
}

/**
 * Format a date for display in forms (datetime-local input)
 */
export function formatDateTime(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Format a date for display (e.g., "15 jan 2026")
 */
export function formatShort(value: unknown): string {
  return formatSafe(value, 'd MMM yyyy');
}

/**
 * Format a date with time (e.g., "15 jan 2026, 14:30")
 */
export function formatWithTime(value: unknown): string {
  return formatSafe(value, 'd MMM yyyy, HH:mm');
}

/**
 * Format only the time (e.g., "14:30")
 */
export function formatTime(value: unknown): string {
  return formatSafe(value, 'HH:mm');
}

/**
 * Format date for API/storage (ISO 8601)
 */
export function formatISO(value: unknown): string | null {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}
