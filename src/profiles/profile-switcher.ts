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
    console.info('Clicking the main profile icon...');
    const profileIcon = page.locator('[aria-label="Your profile"]').first();
    await profileIcon.click({ timeout: 5_000 });
    console.info('The main profile icon has been clicked...');


    // Look for "See all profiles" and click if present
    console.info('Clicking the See all profile icon...');
    const seeAllProfiles = page.locator('[aria-label="See all profiles"]');
    await seeAllProfiles.click({ timeout: 5_000});
    console.info('The see all profile icon has been clicked...');

    // Click the target profile (exact text match on the second occurrence, as in the original)
    console.info('Clicking the target profile...');
    const profileLocator = page.getByText(profileName, { exact: true }).nth(1);
    await profileLocator.waitFor({ state: 'visible', timeout: 20_000 });
    await profileLocator.click();
    console.info('The see target profile has been clicked...');

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