/**
 * Date utility functions to handle dates without timezone issues
 * 
 * The problem: When using new Date(string) with 'YYYY-MM-DD' format,
 * JavaScript interprets it as UTC midnight, which can cause the date
 * to appear as the previous day in negative UTC offset timezones.
 * 
 * Solution: Parse and format dates using local date components only.
 */

/**
 * Format a Date object to 'YYYY-MM-DD' string using local timezone
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a 'YYYY-MM-DD' string to Date object using local timezone
 * This avoids UTC interpretation issues
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get the start of today in local timezone
 */
export function getToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
