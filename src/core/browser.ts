// src/core/browser.ts
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

/**
 * Launch a Chromium browser and create a new page.
 * If `sessionPath` is provided, the context will be created with that
 * storage state, restoring a previously saved logged‑in session.
 */
export async function launchBrowser(sessionPath?: string): Promise<{
  browser: Browser;
  context: BrowserContext;
  page: Page;
  }> {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    args: [
      '--start-maximized',
      '--disable-gpu-sandbox',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  const context = sessionPath
    ? await browser.newContext({ storageState: sessionPath })
    : await browser.newContext();

  const page = await context.newPage();
  return { browser, context, page };
}
