import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a standard Google Drive share link into a direct streaming link.
 * Uses export=media which is more reliable for <audio> and <video> tags.
 */
export function getDirectDriveLink(url: string | undefined): string {
  if (!url) return '';
  
  const cleanUrl = url.trim();

  // Regular expressions to match Google Drive file IDs
  const driveRegex = /\/file\/d\/([^\/\?]+)/;
  const driveIdMatch = cleanUrl.match(driveRegex);
  
  const idParamRegex = /[?&]id=([^&]+)/;
  const idParamMatch = cleanUrl.match(idParamRegex);

  const fileId = driveIdMatch?.[1] || idParamMatch?.[1];

  if (fileId && (cleanUrl.includes('drive.google.com') || cleanUrl.includes('docs.google.com'))) {
    // export=media is generally better for streaming in audio tags than export=download
    return `https://drive.google.com/uc?id=${fileId}&export=media`;
  }
  
  return cleanUrl;
}
