#!/usr/bin/env node
// Rate limiter for browsing logged-in platforms like a person would.
//
//   node scripts/pace.mjs <platform>            wait until the next visit is allowed, then record it
//   node scripts/pace.mjs <platform> --status   show today's count and limits, no wait
//   node scripts/pace.mjs <platform> --block "<reason>"
//                                               the platform showed a warning / captcha / checkpoint:
//                                               stop all visits to it for 24 hours
//
// Call it BEFORE every profile / page visit on that platform. Exit codes:
//   0  OK, go ahead (the visit has been recorded)
//   3  WAIT    still inside a pause longer than one call may sleep; run the same command again
//   4  DAILY_CAP  today's limit is reached; stop this platform until tomorrow
//   5  BLOCKED    the platform is in a 24 h cool-down after a warning
//
// State lives in .outreach-state/pace-<platform>.json (git-ignored), one file
// per platform so agents working on different platforms never collide.
// PACE_SCALE=0.01 shrinks every delay (for testing only).

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Conservative limits: a few hundred profile views a day is ordinary use;
// bursts are what trip bot detection, so the gaps and breaks matter most.
const LIMITS = {
  instagram:   { gap: [30, 60], perHour: 35, perDay: 120, breakEvery: [12, 18], breakSec: [300, 720] },
  facebook:    { gap: [25, 55], perHour: 45, perDay: 160, breakEvery: [15, 22], breakSec: [300, 600] },
  tiktok:      { gap: [20, 45], perHour: 50, perDay: 200, breakEvery: [18, 25], breakSec: [240, 540] },
  x:           { gap: [20, 40], perHour: 50, perDay: 200, breakEvery: [18, 25], breakSec: [240, 480] },
  google_maps: { gap: [10, 25], perHour: 100, perDay: 400, breakEvery: [30, 45], breakSec: [120, 300] },
};
const MAX_SLEEP_PER_CALL = 540; // stay under the agent's 10-minute command timeout
const SCALE = Number(process.env.PACE_SCALE) || 1;

const [, , platform, flag, reason] = process.argv;
const L = LIMITS[platform];
if (!L) {
  console.error(`usage: node scripts/pace.mjs <${Object.keys(LIMITS).join('|')}> [--status | --block "<reason>"]`);
  process.exit(2);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, '.outreach-state');
mkdirSync(dir, { recursive: true });
const file = join(dir, `pace-${platform}.json`);
const today = new Date().toISOString().slice(0, 10);
const rand = ([a, b]) => a + Math.random() * (b - a);

let s = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
if (s.day !== today) s = { ...s, day: today, countToday: 0, sinceBreak: 0 };
s.visits = (s.visits || []).filter((t) => Date.now() - t < 3600_000);
s.nextBreakAt ??= Math.round(rand(L.breakEvery));
const save = () => writeFileSync(file, JSON.stringify(s, null, 2));

if (flag === '--block') {
  s.blockedUntil = Date.now() + 24 * 3600_000;
  s.blockReason = reason || 'warning shown';
  save();
  console.log(`BLOCKED ${platform} for 24 h: ${s.blockReason}`);
  process.exit(5);
}

if (s.blockedUntil && Date.now() < s.blockedUntil) {
  console.log(`BLOCKED ${platform} until ${new Date(s.blockedUntil).toISOString()} (${s.blockReason})`);
  process.exit(5);
}

if (flag === '--status') {
  console.log(JSON.stringify({ platform, today: s.countToday, perDay: L.perDay, lastHour: s.visits.length, perHour: L.perHour }));
  process.exit(0);
}

if (s.countToday >= L.perDay) {
  console.log(`DAILY_CAP ${platform}: ${s.countToday}/${L.perDay} visits today. Stop this platform until tomorrow.`);
  process.exit(4);
}

// Earliest time the next visit may happen.
let readyAt = s.readyAt || 0;
if (s.visits.length >= L.perHour) readyAt = Math.max(readyAt, s.visits[0] + 3600_000 + rand([30, 120]) * 1000);

const waitMs = readyAt - Date.now();
if (waitMs > 0) {
  const sleepMs = Math.min(waitMs, MAX_SLEEP_PER_CALL * 1000 * SCALE);
  await new Promise((r) => setTimeout(r, sleepMs));
  if (sleepMs < waitMs) {
    console.log(`WAIT ${platform}: ${Math.round((waitMs - sleepMs) / 1000)} s of pause left. Run the same command again.`);
    process.exit(3);
  }
}

// Record this visit and schedule the earliest next one.
s.visits.push(Date.now());
s.countToday += 1;
s.sinceBreak += 1;
let gap = rand(L.gap);
let note = '';
if (s.sinceBreak >= s.nextBreakAt) {
  gap = rand(L.breakSec);
  s.sinceBreak = 0;
  s.nextBreakAt = Math.round(rand(L.breakEvery));
  note = ` (break of ${Math.round(gap / 60)} min scheduled after this visit)`;
}
s.readyAt = Date.now() + gap * 1000 * SCALE;
save();
console.log(`OK ${platform}: visit ${s.countToday}/${L.perDay} today${note}`);
process.exit(0);
