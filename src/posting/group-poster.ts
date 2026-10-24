// File: posting/group-poster.ts
// src/posting/group-poster.ts
import type { Page } from 'playwright';

export async function shareToGroup(
  page: Page,
  sourceUrl: string,
  groupName: string,
  postMessage: string, // Available if you uncomment the message‑filling code below
): Promise<boolean> {
  console.info(`\n📢 Sharing post to group: ${groupName}`);
  await page.waitForTimeout(2_000);

  try {
    await page.goto(sourceUrl, { waitUntil: 'load', timeout: 60_000 });
    console.info('🔗 Navigated to source post.');
    await page.waitForTimeout(3_000);

    await page.getByRole('button', { name: 'Send this to friends or post' }).click({ timeout: 30_000 });
    console.info("🖱️ Clicked 'Share' button.");
    await page.waitForTimeout(3_000);

    await page.getByRole('button', { name: 'Group' }).click({ timeout: 10_000 });
    console.info("📌 Selected 'Share to a Group' option.");

    const searchInput = page.locator('input[placeholder="Search for groups"]');
    await searchInput.waitFor({ state: 'visible', timeout: 10_000 });
    await searchInput.fill(groupName);
    console.info(`🔍 Searching group: ${groupName}`);

    const groupButton = page.locator('div[role="button"]').filter({ hasText: groupName });
    await groupButton.click({ timeout: 10_000 });
    console.info(`✅ Selected group: ${groupName}`);
    await page.waitForTimeout(2_000);

    // Uncomment to type a custom message before posting
    // const textArea = page.locator('.xzsf02u.x1a2a7pz.x1n2onr6.x14wi4xw.x9f619');
    // await textArea.waitFor({ state: 'visible', timeout: 10_000 });
    // await textArea.fill(postMessage);
    // console.info('✏️ Filled post message.');
    // await page.waitForTimeout(2_000);

    await page.getByRole('button', { name: 'Post', exact: true }).click();
    console.info("🚀 Clicked 'Post' button. Waiting for confirmation...");

    await page.waitForSelector('div[role="dialog"]', { state: 'hidden', timeout: 20_000 });
    console.info(`✅ Successfully posted to ${groupName}`);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Timeout')) {
      console.error(`❌ Timeout while posting to ${groupName}. Facebook UI may have changed.`);
    } else {
      console.error(`❌ Unexpected error while posting to ${groupName}: ${message}`);
    }
    return false;
  }
}