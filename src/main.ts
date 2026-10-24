// File: src/main.ts
import 'dotenv/config';
import { launchBrowser } from './core/browser.js';
import { switchProfile } from './profiles/profile-switcher.js';
import { shareToGroup } from './posting/group-poster.js';
import { saveSession } from './session/saveSession.js';
import { loadCookies } from './cookies/cookie-loader.js';
import {
  loadGroupSettings,
  TARGET_PROFILE_NAME,
  SOURCE_URL,
  COOKIE_FILE,
} from './config/settings.js';
import type { PostingTask } from './types.js';

const FACEBOOK_HOME_URL = 'https://www.facebook.com';

async function automateFacebookPosting(): Promise<void> {
  // 1. Validate required environment variables
  if (!TARGET_PROFILE_NAME) {
    console.error('❌ TARGET_PROFILE_NAME is not set in your .env file.');
    process.exit(1);
  }

  if (!SOURCE_URL) {
    console.error('❌ SOURCE_URL is not set in your .env file.');
    process.exit(1);
  }

  // 2. Load group list dynamically from Excel/CSV spreadsheet
  const groupConfigs = await loadGroupSettings();
  if (groupConfigs.length === 0) {
    console.warn(`⚠️ No matching groups found in spreadsheet for profile: "${TARGET_PROFILE_NAME}".`);
    return;
  }

  // 3. Construct PostingTask from spreadsheet groups and .env SOURCE_URL
  const task: PostingTask = {
    source_url: SOURCE_URL,
    groups: groupConfigs.map(g => g.groupName),
    message: '', // Message payload can be attached here if required
  };

  // 4. Launch browser context
  const { browser, context, page } = await launchBrowser();
  console.info('🚀 Browser initialized.');

  try {
    // 5. Inject Facebook cookies into browser context
    const cookiesLoaded = await loadCookies(context);
    if (!cookiesLoaded) {
      console.error('❌ Aborting automation due to cookie loading failure.');
      return;
    }

    // 6. Navigate to Facebook Home
    await page.goto(FACEBOOK_HOME_URL, { waitUntil: 'load', timeout: 40_000 });
    console.info('🏠 Facebook home page loaded.');

    // 7. Ensure correct profile is active
    await switchProfile(page, TARGET_PROFILE_NAME);

    // 8. Execute group posting loop
    const results: string[] = [];
    for (const groupName of task.groups) {
      console.info(`⏳ Sharing source URL to group: "${groupName}"...`);
      const success = await shareToGroup(page, task.source_url, groupName, task.message);
      results.push(`${groupName}: ${success ? '✅ SUCCESS' : '❌ FAILURE'}`);
      
      // Delay between posts to mitigate rate-limiting
      await new Promise(resolve => setTimeout(resolve, 5_000));
    }

    // 9. Save active session state if needed
    await saveSession(context, COOKIE_FILE);

    // 10. Summary Report
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