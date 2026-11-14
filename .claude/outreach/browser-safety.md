# Using the owner's real browser safely

`social-checker` and `gbp-checker` use the owner's own Chrome on Windows
through the **Claude in Chrome** extension (`mcp__claude-in-chrome__*` tools).
That browser is logged in to the owner's personal Facebook, Instagram and
TikTok accounts. Getting those accounts flagged, rate-limited or banned is far
worse than finishing a batch late. **Slow and steady always wins over fast.**

## Look, never touch

- Read-only. Open profile pages and read them. Nothing else.
- Never like, follow, unfollow, comment, react, share, save, message, accept
  cookies prompts beyond what is needed to see the page, join groups, or click
  "See translation", ads or sponsored content.
- Never type into the platform's search box. Go to profile URLs directly with
  `navigate` (from the sheet). If there is no link, do not hunt for one.
- Never log in, log out, switch accounts, change settings, or enter any password
  or code. If the owner is logged out, stop and tell them.
- Never solve a captcha or a "confirm you're human" check, and never click
  through a security checkpoint. Stop instead (see below).

## Pace, every time

Before **every** page visit on Facebook, Instagram, TikTok, X or Google Maps,
run the pacing script for that platform and obey its exit code:

```bash
node scripts/pace.mjs <facebook|instagram|tiktok|x|google_maps>
```

Run it with a Bash timeout of 600000 ms (10 minutes): it sleeps until the
next visit is allowed and adds random human-like gaps and longer breaks.

| Exit | Meaning | Do this |
|---|---|---|
| 0 `OK` | Allowed now; visit recorded | Visit the one page. |
| 3 `WAIT` | Still inside a break | Run the same command again. |
| 4 `DAILY_CAP` | Today's limit for this platform is used up | Stop that platform. Mark its remaining rows `unverified (daily limit reached)`, carry on with the other platforms, and tell the collector. |
| 5 `BLOCKED` | 24 h cool-down after a warning | Same as 4, reason `platform cool-down`. |

Never skip the script, run it once for several pages, or run several pages
in parallel. One platform page at a time, in one tab.

## Behave like a person on the page

- Open **one** tab of your own with `tabs_create_mcp` (call `tabs_context_mcp`
  first) and do all your work in it. Never touch the owner's other tabs.
  Close your tab when you finish.
- After a page loads, read it (`get_page_text` or `read_page`). To see recent
  posts, scroll down **at most 2 or 3 times**, a screen at a time with the
  `computer` scroll action on your tab, pausing a few seconds between scrolls.
  Do not open individual posts unless the profile shows no dates at all, and
  then open at most one.
- Do not reload pages repeatedly. If a page fails, move on; one retry later
  at most.
- Mix platforms naturally: for each lead, check its profiles one after
  another (e.g. Facebook, then Instagram, then TikTok) rather than doing 100
  Instagram profiles in a row.

## Stop signs: stop the platform immediately

If a page shows any of: a captcha; "confirm it's you" or a security
checkpoint; "you're temporarily blocked", "try again later", "rate limit",
"suspicious activity", "we limit how often"; a forced logout; or a page that
suddenly asks for a login while the owner was logged in:

1. Do not interact with it. Close nothing on the owner's side, just stop.
2. Run `node scripts/pace.mjs <platform> --block "<what was shown>"`.
3. Mark the remaining rows for that platform `unverified (platform warning)`.
4. Tell the collector straight away, with the exact message seen, so the
   owner can check their account.

If Claude in Chrome is not connected or stops responding, do not retry in a
loop: mark the rows `Unverified (browser not connected)` and report back.
