import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.reject('Clipboard API not available');
}

export function isValidHex(hex: string): boolean {
  return /^([0-9A-F]{3}){1,2}$/i.test(hex.replace("#", ""));
}

const adminEmails = ['admin@example.com', 'kingbaybars.yo1@gmail.com'];

export function isAdminUser(email: string | null | undefined): boolean {
    if (!email) return false;
    return adminEmails.includes(email);
}
