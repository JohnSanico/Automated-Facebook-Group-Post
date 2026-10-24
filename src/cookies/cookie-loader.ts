// cookies/cookie-loader.ts
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { BrowserContext, Cookie } from 'playwright';
import { COOKIE_FILE } from '../config/settings.js';

function normalizeSameSite(value: unknown): 'Strict' | 'Lax' | 'None' {
  const v = String(value ?? '').toLowerCase();
  if (v === 'no_restriction' || v === 'none') return 'None';
  if (v === 'strict') return 'Strict';
  if (v === 'lax') return 'Lax';
  return 'Lax';
}

export async function loadCookies(context: BrowserContext): Promise<boolean> {
  if (!existsSync(COOKIE_FILE)) {
    console.error(`❌ Error: Cookie file '${COOKIE_FILE}' not found.`);
    console.info('➡️  Please ensure you are logged in and have saved your cookies.');
    return false;
  }

  try {
    const raw = await readFile(COOKIE_FILE, 'utf-8');
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null) {
      console.error('❌ Invalid cookie format: Expected an object or array.');
      return false;
    }

    const cookieObj = parsed as Record<string, unknown>;
    let cookies: unknown[];

    if (Array.isArray(parsed)) {
      cookies = parsed;
    } else if ('cookies' in cookieObj && Array.isArray(cookieObj.cookies)) {
      cookies = cookieObj.cookies;
    } else {
      cookies = Object.entries(cookieObj).map(([name, value]) => ({
        name,
        value,
        domain: '.facebook.com',
        path: '/',
      }));
    }

    const cookieList: Cookie[] = cookies.map((rawCookie): Cookie => {
      const c = rawCookie as Record<string, unknown>;

      const domain =
        typeof c.domain === 'string' && c.domain.length > 0
          ? c.domain
          : '.facebook.com';

      const cookiePath =
        typeof c.path === 'string' && c.path.length > 0 ? c.path : '/';

      const expiresRaw = c.expires ?? c.expirationDate;
      const expires =
        typeof expiresRaw === 'number' && Number.isFinite(expiresRaw)
          ? expiresRaw
          : -1;

      return {
        name: String(c.name),
        value: String(c.value),
        domain,
        path: cookiePath,
        expires,
        httpOnly: Boolean(c.httpOnly),
        secure: typeof c.secure === 'boolean' ? c.secure : true,
        sameSite: normalizeSameSite(c.sameSite),
      };
    });

    await context.addCookies(cookieList);
    console.info('🍪 Cookies loaded successfully into browser context.');
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ Error loading cookies: ${message}`);
    return false;
  }
}