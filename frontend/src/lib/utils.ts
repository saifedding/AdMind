import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInDays, format, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAdDuration(startDateStr?: string, endDateStr?: string, isActive?: boolean): string | null {
  if (!startDateStr) return null;

  try {
    const startDate = parseISO(startDateStr);
    const endDate = endDateStr ? parseISO(endDateStr) : new Date();
    
    // Ensure dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return null;
    }
    
    let duration = differenceInDays(endDate, startDate);
    // The difference might be 0 for a single day, so we ensure it's at least 1 day.
    duration = Math.max(duration, 1); 

    const formattedStartDate = format(startDate, 'MMM d, yyyy');

    if (isActive) {
      return `Running since ${formattedStartDate} (${duration} ${duration > 1 ? 'days' : 'day'})`;
    }

    const formattedEndDate = endDateStr ? format(parseISO(endDateStr), 'MMM d, yyyy') : 'now';
    return `Ran from ${formattedStartDate} to ${formattedEndDate} (${duration} ${duration > 1 ? 'days' : 'day'})`;

  } catch (error) {
    console.error("Error formatting ad duration:", error);
    return null;
  }
}

/**
 * Format a date string to a more readable format
 * @param dateString Date string in ISO format
 * @returns Formatted date string (e.g., "Jan 15, 2023")
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}
