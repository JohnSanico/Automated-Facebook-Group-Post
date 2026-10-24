// File: src/types.ts
import type { Cookie as PlaywrightCookie } from 'playwright';

/**
 * Re-export Playwright's Cookie type for centralized cookie management.
 */
export type Cookie = PlaywrightCookie;

/**
 * Defines the structure of an automated Facebook group posting task.
 */
export interface PostingTask {
  source_url: string;
  groups: string[];
  message: string;
}