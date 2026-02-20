import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a standard Google Drive share link into a direct download link.
 * Works for formats: /file/d/ID/view and ?id=ID
 */
export function getDirectDriveLink(url: string | undefined): string {
  if (!url) return '';
  
  // Regular expression to match Google Drive file IDs
  const driveRegex = /\/file\/d\/([^\/]+)\//;
  const driveIdMatch = url.match(driveRegex);
  
  const idParamRegex = /[?&]id=([^&]+)/;
  const idParamMatch = url.match(idParamRegex);

  const fileId = driveIdMatch?.[1] || idParamMatch?.[1];

  if (fileId && url.includes('drive.google.com')) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  
  return url;
}
