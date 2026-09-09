// src/config/settings.ts
import path from 'node:path';
import * as XLSX from 'xlsx';
import type { PostingTask } from '../types.js';

export const FACEBOOK_HOME_URL = 'https://www.facebook.com/';

export const TARGET_PROFILE_NAME = process.env.TARGET_PROFILE_NAME;
export const GROUP_POST_MESSAGE = process.env.GROUP_POST_MESSAGE || '@Everyone';

// --------------------------------------------------------------------
// Remove the old GROUP_FILE_HEADER_LABELS and isHeaderLabel
// They are no longer needed.
// --------------------------------------------------------------------

/**
 * Reads group names from an Excel/CSV file, selecting the column whose header
 * contains the target profile name (case‑insensitive).
 *
 * @param groupFilePathRaw - Path to the Excel/CSV file.
 * @param targetProfileName - The profile name to match in the header row.
 * @returns Array of group names from the matching column.
 */
function readGroupsFromFile(groupFilePathRaw: string, targetProfileName: string): string[] {
  const groupFilePath = path.resolve(groupFilePathRaw);
  let workbook: XLSX.WorkBook;

  try {
    workbook = XLSX.readFile(groupFilePath);
  } catch (error) {
    console.error(`❌ Unable to read GROUP_LIST_FILE: ${groupFilePath}`);
    console.error(error);
    process.exit(1);
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    console.error(`❌ GROUP_LIST_FILE has no worksheets: ${groupFilePath}`);
    process.exit(1);
  }

  const firstSheet = workbook.Sheets[firstSheetName];
  if (!firstSheet) {
    console.error(`❌ GROUP_LIST_FILE first worksheet is missing: ${groupFilePath}`);
    process.exit(1);
  }

  // Get all rows as arrays of strings (raw: false gives strings)
  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(firstSheet, {
    header: 1,
    raw: false,
  });

  if (rows.length === 0) {
    console.error('❌ GROUP_LIST_FILE is empty.');
    process.exit(1);
  }

  // First row is expected to be the header row
  const headerRow = rows[0].map((cell) => String(cell ?? '').trim());
  const targetLower = targetProfileName.toLowerCase();

  // Find the column index whose header includes the target profile name
  let columnIndex = -1;
  headerRow.forEach((header, idx) => {
    if (header.toLowerCase().includes(targetLower)) {
      columnIndex = idx;
    }
  });

  if (columnIndex === -1) {
    console.error(
      `❌ Could not find a column header containing "${targetProfileName}" in the first row of ${groupFilePath}`
    );
    process.exit(1);
  }

  // Extract group names from that column (skip header row)
  const groups: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cellValue = rows[i]?.[columnIndex];
    const value = String(cellValue ?? '').trim();
    if (value.length > 0) {
      groups.push(value);
    }
  }

  return groups;
}

function readGroupsFromEnv(groupListRaw: string): string[] {
  return groupListRaw.split(',').map(g => g.trim()).filter(g => g.length > 0);
}

// Build posting tasks from environment variables
function buildPostingTasks(): PostingTask[] {
  const sourceUrl = process.env.SOURCE_URL;
  const groupListRaw = process.env.GROUP_LIST;
  const groupListFile = process.env.GROUP_LIST_FILE;

  if (!sourceUrl) {
    console.error('❌ SOURCE_URL must be set in .env');
    process.exit(1);
  }

  if (!groupListRaw && !groupListFile) {
    console.error('❌ Set GROUP_LIST_FILE (CSV/XLSX path) or GROUP_LIST in .env');
    process.exit(1);
  }

  let groups: string[];

  if (groupListFile) {
    // When reading from file, TARGET_PROFILE_NAME is required to select the column
    if (!TARGET_PROFILE_NAME) {
      console.error('❌ TARGET_PROFILE_NAME must be set when using GROUP_LIST_FILE');
      process.exit(1);
    }
    groups = readGroupsFromFile(groupListFile, TARGET_PROFILE_NAME);
  } else {
    groups = readGroupsFromEnv(groupListRaw ?? '');
  }

  if (groups.length === 0) {
    console.error('❌ Group source must contain at least one group name');
    process.exit(1);
  }

  return [
    {
      source_url: sourceUrl,
      groups,
      message: `[Bossink LPG] - ${GROUP_POST_MESSAGE}`,
    },
  ];
}

export const POSTING_TASKS: PostingTask[] = buildPostingTasks();