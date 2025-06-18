/**
 * ## formatDuration
 * 
 * Formats a duration given in total minutes into a human-readable string.
 * 
 * The output will be in the format of "Xd Xh Xm" where:
 * 
 * - Xd is the number of days
 * - Xh is the number of hours
 * - Xm is the number of minutes
 * 
 * @param totalMinutes - The total duration in minutes.
 * 
 * @returns A formatted string like "1d 1h 1m" or "0m" if the duration is zero.
 */
export const formatDuration = (totalMinutes: number): string => {
  totalMinutes = Math.floor(totalMinutes);

  const MINUTES_IN_HOUR = 60;
  const HOURS_IN_DAY = 24;

  const days = Math.floor(totalMinutes / (MINUTES_IN_HOUR * HOURS_IN_DAY));
  const hours = Math.floor(totalMinutes / MINUTES_IN_HOUR) % HOURS_IN_DAY;
  const minutes = totalMinutes % MINUTES_IN_HOUR;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  if (parts.length === 0) {
    return "0m";
  }

  return parts.join(" ");
};
