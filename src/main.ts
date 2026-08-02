// src/main.ts
import 'dotenv/config';
import { launchBrowser } from './core/browser.js';
import { switchProfile } from './profiles/profile-switcher.js';
import { shareToGroup } from './posting/group-poster.js';
import { saveSession } from './session/saveSession.js';
import {
  FACEBOOK_HOME_URL,
  TARGET_PROFILE_NAME,
  POSTING_TASKS,
} from './config/settings.js';

async function automateFacebookPosting(): Promise<void> {
  const sessionPath = process.env.FACEBOOK_SESSION_PATH;
  if (!sessionPath) {
    console.error('❌ FACEBOOK_SESSION_PATH is not set in your .env file.');
    process.exit(1);
  }

  // Launch browser with the saved session – already logged in
  const { browser, context, page } = await launchBrowser(sessionPath);
  console.info('Browser launching...');

  try {
    await page.goto(FACEBOOK_HOME_URL, { waitUntil: 'load', timeout: 40_000 });
    console.info('🏠 Facebook home page loaded.');

    await switchProfile(page, TARGET_PROFILE_NAME);

    const results: string[] = [];
    for (const task of POSTING_TASKS) {
      for (const groupName of task.groups) {
        const success = await shareToGroup(page, task.source_url, groupName, task.message);
        results.push(`${groupName}: ${success ? '✅ SUCCESS' : '❌ FAILURE'}`);
        // Wait between groups to avoid rate‑limiting
        await new Promise(resolve => setTimeout(resolve, 5_000));
      }
    }

    // Save the updated session for next time
    await saveSession(context, sessionPath);

    console.info('\n===============================');
    console.info('🎯 AUTOMATION COMPLETE');
    console.info('===============================');
    for (const result of results) {
      console.info(result);
    }
  } catch (err) {
    console.error('❌ Fatal automation error:', err);
  } finally {
    await browser.close();
  }
}

automateFacebookPosting().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});