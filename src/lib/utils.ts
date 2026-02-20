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

  // Robust regex to extract Google Drive File ID
  // Matches IDs in: /file/d/[ID]/..., /file/d/[ID], /open?id=[ID], /uc?id=[ID]
  const driveIdMatch = cleanUrl.match(/\/d\/([-\w]+)/) || cleanUrl.match(/[?&]id=([-\w]+)/);
  
  const fileId = driveIdMatch?.[1];

  if (fileId && (cleanUrl.includes('drive.google.com') || cleanUrl.includes('docs.google.com'))) {
    // export=media is essential for direct streaming in audio tags
    return `https://drive.google.com/uc?id=${fileId}&export=media`;
  }
  
  return cleanUrl;
}
