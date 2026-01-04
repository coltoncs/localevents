/**
 * Format a date string to "Month Day, Year" format in US Eastern Time
 * @param dateString - Date string in YYYY-MM-DD format or ISO format
 * @returns Formatted date string (e.g., "December 25, 2025")
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';

  // Parse the date and format it in US Eastern Time
  const date = new Date(dateString + 'T00:00:00');

  return date.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Get today's date in YYYY-MM-DD format in US Eastern Time
 */
export function getTodayEastern(): string {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
    .toISOString().split('T')[0];
}
