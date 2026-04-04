import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a standard Google Drive share link into a direct streaming link.
 * Also handles extracting URLs from iframe strings.
 * If the link is not from Google Drive, it returns it as-is to support external direct links.
 */
export function getDirectDriveLink(url: string | undefined): string {
  if (!url) return '';
  
  let cleanUrl = url.trim();

  // 1. If the input is an iframe tag, extract the src attribute
  if (cleanUrl.toLowerCase().startsWith('<iframe')) {
    const srcMatch = cleanUrl.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      cleanUrl = srcMatch[1];
    }
  }

  // 2. Identify if it's a Google Drive link
  const isGoogleDrive = cleanUrl.includes('drive.google.com') || cleanUrl.includes('docs.google.com');

  if (isGoogleDrive) {
    // Extract File ID using various common patterns (file/d/ID, id=ID, etc.)
    const driveIdMatch = cleanUrl.match(/\/d\/([-\w]+)/) || cleanUrl.match(/[?&]id=([-\w]+)/);
    const fileId = driveIdMatch?.[1];

    if (fileId) {
      // Use export=media for direct streaming compatibility with audio/video tags
      // This is the most reliable way to stream from Google Drive
      return `https://drive.google.com/uc?id=${fileId}&export=media`;
    }
  }
  
  // 3. If it's not a Drive link (or ID extraction failed), return it as-is
  // This allows direct MP3/MP4 links from any external server to work.
  return cleanUrl;
}
