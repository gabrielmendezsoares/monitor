/**
 * ## getLocalDate
 * 
 * Retrieves the current local date and time adjusted for the local timezone.
 * 
 * @description This function creates a new Date object representing the current date and time,
 * then adjusts it to the local timezone by subtracting the timezone offset in milliseconds.
 * 
 * This adjustment ensures that the returned date reflects the local time, making it suitable for
 * displaying or processing local date and time information.
 * 
 * @returns A Date object representing the current local date and time.
 */
export const getLocalDate = (): Date => {
  const utcDate = new Date();
  const timezoneOffset = utcDate.getTimezoneOffset();
  
  return new Date(utcDate.getTime() - timezoneOffset * 60_000);
};

/**
 * ## formatAsDayMonthYear
 * 
 * Formats a Date object as a DD-MM-YYYY string.
 * 
 * @description Converts a JavaScript Date object to a string in the format "DD-MM-YYYY".
 * The function ensures that both day and month values are zero-padded to two digits,
 * creating a consistent format suitable for display and sorting.
 * 
 * This format follows the day-month-year convention used in many regions globally.
 * 
 * @param date - The Date object to format.
 * 
 * @returns A string in DD-MM-YYYY format (e.g., "05-01-2023" for January 5, 2023).
 */
export const formatAsDayMonthYear = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${ day }-${ month }-${ year }`;
};

/**
 * ## formatAsHoursMinutesSeconds
 * 
 * Formats a Date object's time as an HH:MM:SS string.
 * 
 * @description Extracts the time components from a Date object and returns a string
 * in 24-hour "HH:MM:SS" format. Minutes and seconds are zero-padded to two digits,
 * while hours are displayed without padding.
 * 
 * @param date - The Date object to format.
 * 
 * @returns A string in HH:MM:SS format (e.g., "9:05:02" for 9:05:02 AM).
 */
export const formatAsHoursMinutesSeconds = (date: Date): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${ hours }:${ minutes }:${ seconds }`;
};

/**
 * ## formatAsDayMonthYearHoursMinutesSeconds
 * 
 * Formats a Date object as a combined date and time string.
 * 
 * @description Creates a complete timestamp by combining the results of
 * formatAsDayMonthYear and formatAsHoursMinutesSeconds functions, separated by a space.
 * 
 * This format provides a complete datetime representation suitable for logs,
 * audit trails, and other timestamp needs.
 * 
 * @param date - The Date object to format.
 * 
 * @returns A string in DD-MM-YYYY HH:MM:SS format (e.g., "05-01-2023 9:05:02").
 */
export const formatAsDayMonthYearHoursMinutesSeconds = (date: Date): string => {
  return `${ formatAsDayMonthYear(date) } ${ formatAsHoursMinutesSeconds(date) }`;
};

/**
 * ## formatDuration
 * 
 * Formats a duration in minutes into a string representation using years, days, hours, and minutes.
 * Only shows non-zero values, and uses the format "Na Nd Nh Nm" where N is the number.
 * 
 * @param totalMinutes - The total duration in minutes.
 * 
 * @returns A formatted string like "1a 1d 1h 1m" (omitting any zero values).
 */
export const formatDuration = (totalMinutes: number): string => {
  totalMinutes = Math.floor(totalMinutes);

  const MINUTES_IN_HOUR = 60;
  const HOURS_IN_DAY = 24;
  const DAYS_IN_YEAR = 365;
  
  const minutes = totalMinutes % MINUTES_IN_HOUR;
  const hours = Math.floor(totalMinutes / MINUTES_IN_HOUR) % HOURS_IN_DAY;
  const days = Math.floor(totalMinutes / (MINUTES_IN_HOUR * HOURS_IN_DAY)) % DAYS_IN_YEAR;
  const years = Math.floor(totalMinutes / (MINUTES_IN_HOUR * HOURS_IN_DAY * DAYS_IN_YEAR));
  
  const parts: string[] = [];
  
  if (years > 0) {
    parts.push(`${ years }a`);
  }
  
  if (days > 0) {
    parts.push(`${ days }d`);
  }
  
  if (hours > 0) {
    parts.push(`${ hours }h`);
  }
  
  if (minutes > 0) {
    parts.push(`${ minutes }m`);
  }
  
  if (parts.length === 0) {
    return "0m";
  }
  
  return parts.join(" ");
};
