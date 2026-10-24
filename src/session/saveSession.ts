// File: session/saveSession.ts
// src/session/saveSession.ts
import type { BrowserContext } from 'playwright';

/**
 * Saves the current browser storage state (cookies, localStorage, etc.)
 * to a file, so the session can be reused later without manual login.
 */
export async function saveSession(context: BrowserContext, path: string): Promise<void> {
  await context.storageState({ path });
  console.info(`💾 Session saved to ${path}`);
}