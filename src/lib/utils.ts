import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a standard Google Drive share link into a direct streaming/download link.
 * Supports various formats: /file/d/ID/view, ?id=ID, open?id=ID
 */
export function getDirectDriveLink(url: string | undefined): string {
  if (!url) return '';
  
  // Regular expressions to match Google Drive file IDs from different formats
  const driveRegex = /\/file\/d\/([^\/]+)/;
  const driveIdMatch = url.match(driveRegex);
  
  const idParamRegex = /[?&]id=([^&]+)/;
  const idParamMatch = url.match(idParamRegex);

  const fileId = driveIdMatch?.[1] || idParamMatch?.[1];

  if (fileId && (url.includes('drive.google.com') || url.includes('docs.google.com'))) {
    // Using docs.google.com/uc is more reliable for streaming in <audio> tags
    return `https://docs.google.com/uc?export=open&id=${fileId}`;
  }
  
  return url;
}
