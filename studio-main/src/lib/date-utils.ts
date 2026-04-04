import { format } from 'date-fns';

/**
 * Safely formats a Firebase Timestamp or a server-generated timestamp object.
 * It checks if the object is valid and has a toDate() method.
 * @param timestamp The Firebase timestamp object.
 * @returns A formatted date string (e.g., "dd/MM/yyyy"), or an empty string if the timestamp is invalid.
 */
export function safeFormatFirebaseTimestamp(timestamp: any): string {
  // Check if the timestamp object is valid and has the toDate method
  if (timestamp && typeof timestamp.toDate === 'function') {
    try {
      const date = timestamp.toDate();
      // Format the date. Example: "25/12/2024"
      return format(date, 'dd/MM/yyyy');
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return ''; // Return empty string on formatting error
    }
  }
  return ''; // Return empty string if timestamp is not valid
}
