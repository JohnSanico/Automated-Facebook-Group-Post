// File: src/session/saveFacebookSession.ts
// Run this script ONCE to log in manually and save the session file.
// Usage: npx ts-node --esm src/session/saveFacebookSession.ts
import 'dotenv/config';
import { chromium, type BrowserContext, type Page } from 'playwright';
import path from 'node:path';
import * as readline from 'node:readline';

async function saveFacebookSession(): Promise<void> {
  const cookieFile = process.env.COOKIE_FILE || './facebookcookies.json';
  const userDataDir = path.join(process.cwd(), 'chrome_data');

  console.info('🚀 Launching persistent browser context for manual login...');
  const context: BrowserContext = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chrome',
    headless: false,
    args: ['--start-maximized'],
  });

  const page: Page = await context.newPage();

  try {
    await page.goto('https://www.facebook.com', { waitUntil: 'load' });
    console.info('🔑 Please log in to Facebook manually in the opened Chrome window.');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    await new Promise<void>((resolve) => {
      rl.question('✅ Press ENTER here after you are fully logged in and your feed is visible...', () => {
        rl.close();
        resolve();
      });
    });

    // Save cookies directly using the cookieFile path from .env
    await context.storageState({ path: cookieFile });
    console.info(`💾 Session cookies successfully saved to: '${cookieFile}'`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error saving session: ${message}`);
  } finally {
    await context.close();
    process.exit(0);
  }
}

saveFacebookSession();