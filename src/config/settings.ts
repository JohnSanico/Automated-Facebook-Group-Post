// File: src/config/settings.ts
import { existsSync } from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Export environment configuration variables directly from process.env
export const COOKIE_FILE = process.env.COOKIE_FILE || './facebookcookies.json';
export const GROUP_LIST_FILE = process.env.GROUP_LIST_FILE || '';
export const TARGET_PROFILE_NAME = process.env.TARGET_PROFILE_NAME || '';
export const SOURCE_URL = process.env.SOURCE_URL || '';
export const FACEBOOK_HOME_URL = 'https://www.facebook.com';

export interface GroupConfig {
  profileName: string;
  groupName: string;
  groupUrl?: string;
}

/**
 * Clean strings by safely handling primitives, ExcelJS rich text objects, 
 * formula results, and hyperlinks, while trimming whitespace and removing UTF-8 Byte Order Marks (\ufeff).
 */
function cleanString(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }

  // Handle ExcelJS complex object types
  if (typeof val === 'object' && val !== null) {
    // 1. Handle Rich Text arrays (e.g., multi-styled text in one cell)
    if ('richText' in val && Array.isArray((val as { richText: unknown[] }).richText)) {
      return (val as { richText: Array<{ text?: string }> }).richText
        .map(rt => rt.text || '')
        .join('')
        .trim();
    }

    // 2. Handle Formula cells (extract the calculated result)
    if ('result' in val) {
      return cleanString((val as { result: unknown }).result);
    }

    // 3. Handle Hyperlink cells (extract the display text)
    if ('text' in val) {
      return cleanString((val as { text: unknown }).text);
    }
  }

  // Fallback for standard strings/numbers
  return String(val).replace(/^\ufeff/, '').trim();
}

/**
 * Parses target profile and group lists dynamically from process.env configuration.
 * Supports both:
 * 1. Columnar layout (Column Header = Profile Name, Rows = Group Names)
 * 2. Tabular layout (Columns = "Profile" and "Group")
 */
export async function loadGroupSettings(): Promise<GroupConfig[]> {
  const targetProfile = TARGET_PROFILE_NAME.trim().toLowerCase();

  if (!targetProfile) {
    throw new Error('❌ TARGET_PROFILE_NAME is not defined or empty in your .env file.');
  }

  const filePath = path.resolve(GROUP_LIST_FILE);
  if (!existsSync(filePath)) {
    throw new Error(`❌ Group list spreadsheet not found at path: '${filePath}'`);
  }

  const workbook = new ExcelJS.Workbook();
  const fileExtension = filePath.split('.').pop()?.toLowerCase();

  // Explicitly reject legacy .xls binary format with a descriptive error
  if (fileExtension === 'xls') {
    throw new Error(
      `❌ Legacy .xls format is not supported. Please open your spreadsheet and save it as an .xlsx or .csv file.`
    );
  }

  if (fileExtension === 'csv') {
    await workbook.csv.readFile(filePath);
  } else {
    await workbook.xlsx.readFile(filePath);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('❌ The provided spreadsheet contains no active worksheets.');
  }

  const groupConfigs: GroupConfig[] = [];
  const seenGroups = new Set<string>(); // Tracks unique groups to prevent duplicate entries

  // Strategy 1: Columnar Layout (Column Header == process.env.TARGET_PROFILE_NAME)
  let directColumnIndex = -1;
  let directHeaderRowIndex = -1;

  worksheet.eachRow((row, rowIndex) => {
    if (directColumnIndex !== -1) return;

    row.eachCell((cell, colIndex) => {
      const headerText = cleanString(cell.value).toLowerCase();
      if (headerText === targetProfile) {
        directColumnIndex = colIndex;
        directHeaderRowIndex = rowIndex;
      }
    });
  });

  if (directColumnIndex !== -1) {
    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex <= directHeaderRowIndex) return;

      const groupName = cleanString(row.getCell(directColumnIndex).value);
      const normalizedGroup = groupName.toLowerCase();

      if (groupName && !seenGroups.has(normalizedGroup)) {
        seenGroups.add(normalizedGroup);
        groupConfigs.push({
          profileName: TARGET_PROFILE_NAME,
          groupName,
        });
      }
    });

    console.info(`📋 Loaded ${groupConfigs.length} unique group(s) for profile "${TARGET_PROFILE_NAME}" (Columnar Layout)`);
    return groupConfigs;
  }

  // Strategy 2: Fallback to Tabular Layout ("Profile" and "Group" side-by-side columns)
  let profileColIndex = -1;
  let groupColIndex = -1;
  let tabularHeaderRowIndex = -1;

  worksheet.eachRow((row, rowIndex) => {
    if (tabularHeaderRowIndex !== -1) return;

    row.eachCell((cell, colIndex) => {
      const headerText = cleanString(cell.value).toLowerCase();
      if (headerText.includes('profile') || headerText.includes('target') || headerText.includes('name')) {
        if (profileColIndex === -1) profileColIndex = colIndex;
      }
      if (headerText.includes('group') || headerText.includes('community')) {
        if (groupColIndex === -1) groupColIndex = colIndex;
      }
    });

    if (profileColIndex !== -1 && groupColIndex !== -1) {
      tabularHeaderRowIndex = rowIndex;
    }
  });

  if (tabularHeaderRowIndex !== -1) {
    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex <= tabularHeaderRowIndex) return;

      const rawProfile = cleanString(row.getCell(profileColIndex).value);
      const rawGroup = cleanString(row.getCell(groupColIndex).value);
      const normalizedGroup = rawGroup.toLowerCase();

      if (rawProfile.toLowerCase() === targetProfile && rawGroup && !seenGroups.has(normalizedGroup)) {
        seenGroups.add(normalizedGroup);
        groupConfigs.push({
          profileName: TARGET_PROFILE_NAME,
          groupName: rawGroup,
        });
      }
    });

    console.info(`📋 Loaded ${groupConfigs.length} unique group(s) for profile "${TARGET_PROFILE_NAME}" (Tabular Layout)`);
    return groupConfigs;
  }

  throw new Error(
    `❌ Could not find group list for profile "${TARGET_PROFILE_NAME}" in '${GROUP_LIST_FILE}'. Please check your .env TARGET_PROFILE_NAME.`
  );
}