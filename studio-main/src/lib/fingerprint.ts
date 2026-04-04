'use client';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

// Generates a unique and stable browser fingerprint.
export async function getDeviceFingerprint(): Promise<string> {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  return result.visitorId;
}
