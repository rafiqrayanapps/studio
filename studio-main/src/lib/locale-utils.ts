'use client';
import type { Locale } from '@/hooks/use-locale';
import type { LocalizedString } from '@/lib/definitions';

export function getLocalizedString(
  field: string | LocalizedString | undefined | null,
  locale: Locale
): string {
  if (!field) {
    return '';
  }
  // If field is a string, return it directly for backward compatibility
  if (typeof field === 'string') {
    return field;
  }
  // If it's an object, return the value for the current locale, or fallback
  return field[locale] || field.ar || '';
}
