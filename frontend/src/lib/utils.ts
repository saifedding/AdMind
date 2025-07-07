import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInDays, format, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAdDuration(startDateStr?: string, endDateStr?: string, isActive?: boolean): { formattedDate: string | null, duration: number | null, isActive: boolean } {
  if (!startDateStr) return { formattedDate: null, duration: null, isActive: false };

  try {
    const startDate = parseISO(startDateStr);
    const endDate = endDateStr ? parseISO(endDateStr) : new Date();
    
    // Ensure dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { formattedDate: null, duration: null, isActive: false };
    }
    
    let duration = differenceInDays(endDate, startDate);
    // The difference might be 0 for a single day, so we ensure it's at least 1 day.
    duration = Math.max(duration, 1); 

    const formattedStartDate = format(startDate, 'MMM d, yyyy');
    const formattedEndDate = endDateStr ? format(parseISO(endDateStr), 'MMM d, yyyy') : 'Present';

    if (isActive) {
      return {
        formattedDate: `Since ${formattedStartDate}`,
        duration,
        isActive: true
      };
    }

    return {
      formattedDate: `${formattedStartDate} - ${formattedEndDate}`,
      duration,
      isActive: false
    };

  } catch (error) {
    console.error("Error formatting ad duration:", error);
    return { formattedDate: null, duration: null, isActive: false };
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
