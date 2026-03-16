/**
 * MD5 Hash Utility
 * Uses Deno standard library for MD5 hashing
 */

import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

/**
 * Calculate MD5 hash of a string
 * @param message - The string to hash
 * @returns MD5 hash as lowercase hex string
 */
export async function md5(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('MD5', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
