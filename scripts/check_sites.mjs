#!/usr/bin/env node
// Website health + social-link extractor for the outreach pipeline.
//
// Usage:
//   node scripts/check_sites.mjs <input.json> [concurrency=6]
//
// <input.json> is an array of { "row": <sheet row number>, "url": "<website>" }.
// Prints a JSON array (one object per input row) to stdout with raw signals the
// agents use to decide "Website Status" and write the "Website Comment".
// It never decides the verdict itself; the agent applies the criteria in
// .claude/outreach/criteria.md to these signals.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// require() resolves the globally pre-installed Playwright; ESM import would not.
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const [, , inputPath, concArg] = process.argv;
if (!inputPath) {
  console.error('usage: node scripts/check_sites.mjs <input.json> [concurrency]');
  process.exit(2);
}
const items = JSON.parse(readFileSync(inputPath, 'utf8'));
const CONCURRENCY = Math.max(1, Number(concArg) || 6);
const NAV_TIMEOUT = 25000;

const SOCIAL_PATTERNS = {
  facebook: /^https?:\/\/(www\.|m\.|web\.)?(facebook|fb)\.com\/(?!sharer|share|dialog|plugins|tr\b|login)[^?#]+/i,
  instagram: /^https?:\/\/(www\.)?instagram\.com\/(?!p\/|reel\/|explore|accounts)[^?#]+/i,
  linkedin: /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/(company|in|school)\/[^?#]+/i,
  twitter: /^https?:\/\/(www\.)?(twitter|x)\.com\/(?!intent|share|home|search)[^?#]+/i,
  youtube: /^https?:\/\/(www\.)?youtube\.com\/(channel\/|c\/|user\/|@)[^?#]+/i,
  tiktok: /^https?:\/\/(www\.)?tiktok\.com\/@[^?#]+/i,
  pinterest: /^https?:\/\/([a-z]{2}\.)?pinterest\.[a-z.]+\/(?!pin\/)[^?#]+/i,
};

const PARKED_HINTS = [
  'domain is for sale', 'buy this domain', 'this domain may be for sale',
  'parked free', 'parkingcrew', 'sedoparking', 'hugedomains', 'dan.com',
  'domain parking', 'is parked', 'godaddy.com/domainsearch', 'afternic',
];
const CONSTRUCTION_HINTS = [
  'under construction', 'coming soon', 'site is under maintenance',
  'website coming soon', 'launching soon', 'we\'ll be back soon',
];
const SUSPENDED_HINTS = [
  'account suspended', 'account has been suspended', 'this site can’t be reached',
  'default web site page', 'apache2 ubuntu default page', 'welcome to nginx',
  'index of /', 'site not found', 'no such app', 'there isn\'t a github pages site here',
];

function normalizeUrl(u) {
  if (!u) return null;
  let s = String(u).trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  return s;
}

function cleanSocial(href) {
  try {
    const u = new URL(href);
    u.hash = '';
    // Facebook profile.php pages are identified by ?id=; keep only that.
    const id = /profile\.php$/i.test(u.pathname) ? u.searchParams.get('id') : null;
    u.search = id ? `?id=${id}` : '';
    return u.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

async function checkOne(browser, item) {
  const out = {
    row: item.row,
    input_url: item.url ?? '',
    final_url: null,
    http_status: null,
    https: null,
    load_ms: null,
    title: null,
    meta_description: null,
    has_viewport_meta: null,
    copyright_years: [],
    latest_year_on_page: null,
    word_count: null,
    has_contact_form: null,
    has_phone_on_page: null,
    has_email_on_page: null,
    has_booking_or_cta: null,
    cms_hints: [],
    flags: [],
    socials: {},
    error: null,
  };
  const url = normalizeUrl(item.url);
  if (!url) {
    out.flags.push('no_website');
    return out;
  }

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  const t0 = Date.now();
  try {
    let resp;
    try {
      resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    } catch (e) {
      // Retry over plain http if https failed outright.
      if (url.startsWith('https://')) {
        out.flags.push('https_failed');
        out.https_error = String(e?.message || e).split('\n')[0].slice(0, 160);
        resp = await page.goto(url.replace(/^https:/, 'http:'), {
          waitUntil: 'domcontentloaded',
          timeout: NAV_TIMEOUT,
        });
      } else {
        throw e;
      }
    }
    await page.waitForTimeout(1500); // let JS-rendered sites paint
    out.load_ms = Date.now() - t0;
    out.http_status = resp ? resp.status() : null;
    out.final_url = page.url();
    out.https = out.final_url.startsWith('https://');

    try {
      const inHost = new URL(url).hostname.replace(/^www\./, '');
      const outHost = new URL(out.final_url).hostname.replace(/^www\./, '');
      if (inHost !== outHost) out.flags.push(`redirected_to:${outHost}`);
    } catch {}

    const data = await page.evaluate(() => {
      const text = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
      const html = document.documentElement.outerHTML;
      const links = [...document.querySelectorAll('a[href]')]
        .map((a) => (typeof a.href === 'string' ? a.href : a.getAttribute('href') || ''))
        .filter(Boolean);
      return {
        title: document.title || null,
        metaDesc: document.querySelector('meta[name="description"]')?.content || null,
        viewport: !!document.querySelector('meta[name="viewport"]'),
        text: text.slice(0, 60000),
        htmlHead: html.slice(0, 200000),
        links,
        forms: document.querySelectorAll('form').length,
      };
    });

    out.title = data.title;
    out.meta_description = data.metaDesc;
    out.has_viewport_meta = data.viewport;
    out.word_count = data.text ? data.text.split(' ').length : 0;
    const lower = (data.text + ' ' + (data.title || '')).toLowerCase();
    const htmlLower = data.htmlHead.toLowerCase();

    const years = [...lower.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/g)].map((m) =>
      Number(m[1]),
    );
    out.copyright_years = [...new Set(years)];
    const allYears = [...lower.matchAll(/\b(20[0-3]\d)\b/g)].map((m) => Number(m[1]));
    out.latest_year_on_page = allYears.length ? Math.max(...allYears) : null;

    out.has_contact_form = data.forms > 0;
    out.has_phone_on_page = /(\+?\d[\d\s().-]{7,}\d)/.test(data.text) || data.links.some((l) => l.startsWith('tel:'));
    out.has_email_on_page = data.links.some((l) => l.startsWith('mailto:')) || /[\w.+-]+@[\w-]+\.[\w.]+/.test(data.text);
    out.has_booking_or_cta = /(book now|book online|schedule|appointment|get a quote|free quote|request a quote|order online|call now|contact us)/.test(lower);

    const cms = [];
    if (htmlLower.includes('wp-content')) cms.push('WordPress');
    if (htmlLower.includes('wix.com') || htmlLower.includes('wixstatic')) cms.push('Wix');
    if (htmlLower.includes('squarespace')) cms.push('Squarespace');
    if (htmlLower.includes('cdn.shopify')) cms.push('Shopify');
    if (htmlLower.includes('godaddy') && htmlLower.includes('website builder')) cms.push('GoDaddy Builder');
    if (htmlLower.includes('webflow')) cms.push('Webflow');
    if (htmlLower.includes('weebly')) cms.push('Weebly');
    out.cms_hints = cms;

    if (out.http_status && out.http_status >= 400) out.flags.push(`http_${out.http_status}`);
    if (PARKED_HINTS.some((h) => lower.includes(h) || htmlLower.includes(h))) out.flags.push('parked_or_for_sale');
    if (CONSTRUCTION_HINTS.some((h) => lower.includes(h))) out.flags.push('under_construction');
    if (SUSPENDED_HINTS.some((h) => lower.includes(h))) out.flags.push('suspended_or_default_page');
    if (out.word_count < 60) out.flags.push('very_little_content');
    if (!out.has_viewport_meta) out.flags.push('not_mobile_friendly');
    if (out.load_ms > 8000) out.flags.push('slow_load');

    const socials = {};
    for (const href of data.links) {
      for (const [name, re] of Object.entries(SOCIAL_PATTERNS)) {
        if (!socials[name] && re.test(href)) {
          const c = cleanSocial(href);
          if (c) socials[name] = c;
        }
      }
    }
    out.socials = socials;
  } catch (e) {
    out.load_ms = Date.now() - t0;
    const msg = String(e?.message || e);
    out.error = msg.split('\n')[0].slice(0, 200);
    if (/ERR_NAME_NOT_RESOLVED|ENOTFOUND/i.test(msg)) out.flags.push('dns_not_resolved');
    else if (/timeout/i.test(msg)) out.flags.push('timeout');
    else if (/ERR_CONNECTION_REFUSED/i.test(msg)) out.flags.push('connection_refused');
    else if (/SSL|CERT/i.test(msg)) out.flags.push('ssl_error');
    else out.flags.push('load_error');
  } finally {
    await context.close().catch(() => {});
  }
  return out;
}

// Route Chromium through the environment's proxy when one is configured
// (e.g. cloud sessions); on a normal machine this is a no-op.
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY;
const launchOpts = {};
if (proxyUrl) {
  const p = new URL(proxyUrl);
  launchOpts.proxy = {
    server: `${p.protocol}//${p.host}`,
    ...(p.username ? { username: decodeURIComponent(p.username), password: decodeURIComponent(p.password) } : {}),
  };
}
const browser = await chromium.launch(launchOpts);
const results = new Array(items.length);
let next = 0;
async function worker() {
  while (next < items.length) {
    const i = next++;
    results[i] = await checkOne(browser, items[i]);
  }
}
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
await browser.close();
process.stdout.write(JSON.stringify(results, null, 2) + '\n');
