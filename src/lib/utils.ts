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
  
  // Clean the URL from any trailing slashes or spaces
  const cleanUrl = url.trim();

  // Regular expressions to match Google Drive file IDs from different formats
  const driveRegex = /\/file\/d\/([^\/\?]+)/;
  const driveIdMatch = cleanUrl.match(driveRegex);
  
  const idParamRegex = /[?&]id=([^&]+)/;
  const idParamMatch = cleanUrl.match(idParamRegex);

  const fileId = driveIdMatch?.[1] || idParamMatch?.[1];

  if (fileId && (cleanUrl.includes('drive.google.com') || cleanUrl.includes('docs.google.com'))) {
    // drive.google.com/uc is generally more reliable for direct streaming
    return `https://drive.google.com/uc?id=${fileId}&export=download`;
  }
  
  return cleanUrl;
}
