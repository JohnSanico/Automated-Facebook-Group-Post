// profiles/profile-switcher.ts
import type { Page } from 'playwright';
import { FACEBOOK_HOME_URL } from '../config/settings.js';

// ------------------------------
// Profile switching
// ------------------------------
export async function switchProfile(page: Page, profileName: string): Promise<void> {
  console.info(`🧑‍💻 Attempting to switch to profile: ${profileName}...`);
  try {
    // Click the main profile icon (top-right)
    // Playwright has a handy locator for the profile picture in the header
    const profileIcon = page.locator('[aria-label="Your profile"]').first();
    await profileIcon.click({ timeout: 5_000 });

    // Look for "See all profiles" and click if present
    const seeAllProfiles = page.getByText('See all profiles');
    if (await seeAllProfiles.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await seeAllProfiles.click();
    }

    // Click the target profile (exact text match on the second occurrence, as in the original)
    const profileLocator = page.getByText(profileName, { exact: true }).nth(1);
    await profileLocator.waitFor({ state: 'visible', timeout: 20_000 });
    await profileLocator.click();

    console.info(`✅ Successfully switched profile to ${profileName}.`);
    await page.waitForURL(FACEBOOK_HOME_URL, { timeout: 15_000 });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Timeout')) {
      console.warn(`⚠️ Could not find UI to switch to profile '${profileName}'. Possibly already active.`);
    } else {
      console.error(`❌ Error during profile switch: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}