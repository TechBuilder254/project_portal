/**
 * Utility functions for meeting tracking system
 */

import type { Meeting, MeetingAttendance } from '../types';

/**
 * Check if current time is within the check-in window
 * Check-in is allowed 15 minutes before and 15 minutes after scheduled time
 * Uses Kenyan timezone for comparison
 */
export function isCheckInWindowOpen(meeting: Meeting): boolean {
  const now = new Date(); // Current UTC time
  const scheduledTime = new Date(meeting.scheduled_at);
  
  // 15 minutes in milliseconds
  const windowMs = 15 * 60 * 1000;
  
  const windowStart = new Date(scheduledTime.getTime() - windowMs);
  const windowEnd = new Date(scheduledTime.getTime() + windowMs);
  
  return now >= windowStart && now <= windowEnd;
}

/**
 * Check if meeting time has passed
 */
export function hasMeetingTimePassed(meeting: Meeting): boolean {
  const now = new Date();
  const scheduledTime = new Date(meeting.scheduled_at);
  const windowMs = 15 * 60 * 1000; // 15 minutes after
  const windowEnd = new Date(scheduledTime.getTime() + windowMs);
  
  return now > windowEnd;
}

/**
 * Check if student has already checked in
 */
export function hasCheckedIn(attendance: MeetingAttendance | null | undefined): boolean {
  return attendance?.checked_in_at !== null && attendance?.checked_in_at !== undefined;
}

/**
 * Check if student can check in (window is open and hasn't checked in yet)
 */
export function canCheckIn(meeting: Meeting, attendance: MeetingAttendance | null | undefined): boolean {
  return isCheckInWindowOpen(meeting) && !hasCheckedIn(attendance);
}

/**
 * Kenyan timezone constant (EAT - East Africa Time, UTC+3)
 */
export const KENYA_TIMEZONE = 'Africa/Nairobi';

/**
 * Get current time in Kenyan timezone
 */
export function getKenyaTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: KENYA_TIMEZONE }));
}

/**
 * Format date to Kenyan timezone string
 */
export function formatToKenyaTime(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  const kenyaTimeString = d.toLocaleString('en-US', { timeZone: KENYA_TIMEZONE });
  return new Date(kenyaTimeString);
}

/**
 * Format meeting date/time for display in Kenyan time
 */
export function formatMeetingDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-KE', {
    timeZone: KENYA_TIMEZONE,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format date/time with timezone indicator
 */
export function formatDateTimeWithTimezone(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-KE', {
    timeZone: KENYA_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }) + ' EAT';
}

/**
 * Get meeting status badge color
 */
export function getMeetingStatusColor(status: string): string {
  const colors: Record<string, string> = {
    scheduled: 'blue',
    in_progress: 'orange',
    completed: 'green',
    cancelled: 'gray',
    missed: 'red',
  };
  return colors[status] || 'gray';
}

/**
 * Get attendance status badge color
 */
export function getAttendanceStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'gray',
    checked_in: 'orange',
    confirmed: 'green',
    disputed: 'red',
    missed: 'red',
  };
  return colors[status] || 'gray';
}

/**
 * Get recap status badge color
 */
export function getRecapStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'gray',
    submitted: 'orange',
    approved: 'green',
    rejected: 'red',
    revised: 'blue',
  };
  return colors[status] || 'gray';
}

/**
 * Calculate time until meeting (using Kenyan timezone)
 */
export function getTimeUntilMeeting(dateString: string): string {
  const now = new Date();
  const meetingTime = new Date(dateString);
  const diffMs = meetingTime.getTime() - now.getTime();
  
  if (diffMs < 0) {
    return 'Past';
  }
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Convert local datetime string to ISO string for Kenyan timezone
 * Used when submitting datetime-local inputs
 * datetime-local input is interpreted as Kenyan time (EAT, UTC+3)
 */
export function convertToKenyaISOString(localDateTimeString: string): string {
  // datetime-local gives us a string like "2024-02-16T14:30"
  // We interpret this as Kenyan time (EAT, UTC+3) and convert to ISO UTC
  const [datePart, timePart] = localDateTimeString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = (timePart || '00:00').split(':').map(Number);
  
  // Create ISO string assuming the input is in Kenyan time (UTC+3)
  // Format: YYYY-MM-DDTHH:mm:ss+03:00
  const kenyaISOString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+03:00`;
  
  // Convert to UTC ISO string
  return new Date(kenyaISOString).toISOString();
}

/**
 * Convert ISO datetime string to datetime-local format for Kenyan timezone
 * Used to populate datetime-local inputs with Kenyan time
 */
export function convertFromKenyaISOToLocal(isoString: string): string {
  const date = new Date(isoString);
  
  // Convert to Kenyan timezone and format for datetime-local input
  const kenyaDate = new Date(date.toLocaleString('en-US', { timeZone: KENYA_TIMEZONE }));
  
  const year = kenyaDate.getFullYear();
  const month = String(kenyaDate.getMonth() + 1).padStart(2, '0');
  const day = String(kenyaDate.getDate()).padStart(2, '0');
  const hours = String(kenyaDate.getHours()).padStart(2, '0');
  const minutes = String(kenyaDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Format any date to Kenyan timezone string (for general use)
 */
export function formatKenyaDateTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleString('en-KE', {
    timeZone: KENYA_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format date only (no time) in Kenyan timezone
 */
export function formatKenyaDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-KE', {
    timeZone: KENYA_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time only in Kenyan timezone
 */
export function formatKenyaTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleTimeString('en-KE', {
    timeZone: KENYA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Get user's geolocation (optional)
 */
export async function getCurrentLocation(): Promise<{ lat: number; lng: number; address?: string } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        resolve(null);
      }
    );
  });
}
