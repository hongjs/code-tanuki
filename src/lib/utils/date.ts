import { format } from 'date-fns';

/**
 * Safely format a date string or Date object.
 * Returns a fallback value (default '—') if the date is invalid.
 */
export function safeFormat(
  date: string | Date | undefined | null,
  formatStr: string,
  fallback: string = '—'
): string {
  if (!date) return fallback;
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Check for "Invalid Date"
  if (isNaN(d.getTime())) {
    return fallback;
  }
  
  try {
    return format(d, formatStr);
  } catch (err) {
    console.error('safeFormat error:', err, { date, formatStr });
    return fallback;
  }
}

/**
 * Safely check if two dates are valid and compare them.
 */
export function isAfterSafe(dateA: string | undefined | null, dateB: string | undefined | null): boolean {
  if (!dateA || !dateB) return false;
  
  const d1 = new Date(dateA);
  const d2 = new Date(dateB);
  
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return false;
  }
  
  return d1.getTime() > d2.getTime();
}
