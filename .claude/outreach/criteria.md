# Outreach pipeline: shared rules

Every agent in the pipeline (the lead collector, `website-checker`,
`social-checker`) follows this file. Change a rule here and all three pick it up.

## Google Sheet layout (tab name: `Leads`, header in row 1)

| Col | Header | Written by |
|---|---|---|
| A | Lead # | collector |
| B | Company Name | collector |
| C | Niche | collector |
| D | City | collector |
| E | State/Region | collector |
| F | Country | collector |
| G | Website | collector |
| H | Company Phone | collector |
| I | Company Email | collector |
| J | Contact Name | collector |
| K | Contact Title | collector |
| L | Contact Email | collector |
| M | Contact LinkedIn | collector |
| N | Company LinkedIn | collector |
| O | Employees | collector |
| P | Industry | collector |
| Q | Website Status | collector / website-checker |
| R | Website Comment | collector / website-checker |
| S | Facebook | collector / website-checker |
| T | Instagram | collector / website-checker |
| U | X / Twitter | collector / website-checker |
| V | LinkedIn (from site) | collector / website-checker |
| W | YouTube | collector / website-checker |
| X | TikTok | collector / website-checker |
| Y | Social Status | social-checker |
| Z | Social Details | social-checker |
| AA | Social Comment | social-checker |
| AB | Last Updated | whoever wrote last |

**Who writes where.** The collector writes A–P when it adds rows. The website
check (Q–X) for each row is done by exactly one agent: whichever the
collector assigned that row to. The social check (Y–AA) is done only by
`social-checker`. Because no two agents ever write the same cell, they can run
at the same time without overwriting each other.

**How to write.** Use `mcp__Google_Sheets__update_values` with an exact range
such as `Leads!Q12:X12` (or one block like `Leads!Q2:X51` for many rows). Never
use `append_values` for check results: append writes after the last row,
which may not be the row being checked. Leave a cell as `""` when there is
nothing to put in it, never a made-up value. Put the date (YYYY-MM-DD) in AB.

## Website Status (column Q): pick exactly one

| Status | When |
|---|---|
| `Active` | Loads (HTTP 2xx after redirects), real business content (60+ words), not parked, and shows signs of upkeep: a copyright year or dated content from the last 2 years. |
| `Active - Outdated` | Loads with real content, but the latest year on the page is older than 2 years, or the design is clearly dated (no mobile viewport, broken layout, Flash, tables-based layout). |
| `Under Construction` | "Coming soon", "under construction" or maintenance page. |
| `Parked / For Sale` | Domain parking or for-sale page. |
| `Redirects Elsewhere` | Ends up on a different business's domain or a generic directory. (A redirect to the same brand on a new domain counts as `Active`; mention the new domain in the comment.) |
| `Down / Error` | DNS fails, connection refused, timeout, HTTP 4xx/5xx, SSL errors with no fallback, hosting "account suspended" or server default page. |
| `No Website` | No URL in LeadOcean and none found by a quick web search for the company name and city. |
| `Unverified` | Could not reach the site for a reason on our side (network blocked, tool error). Say why in the comment. Never guess a status. |

## Website Comment (column R)

One or two plain sentences an outreach rep can use as an opening angle. Cover
what applies, from what was actually seen on the page:

- design and age: modern / dated, mobile-friendly or not, builder (Wix, WordPress, Squarespace...);
- speed: slow load (over 8 s) if noted;
- conversion: has / lacks a contact form, click-to-call phone, booking or quote button;
- trust and upkeep: latest copyright year, broken HTTPS, thin content;
- for non-Active statuses, what exactly was seen (e.g. "GoDaddy parking page", "DNS does not resolve").

Example: `Dated WordPress site (© 2019), not mobile-friendly, no booking or quote form; phone only in the footer. Strong redesign candidate.`

## Social links (columns S–X)

Take links found on the website first (header, footer, contact page). If the
homepage has none, check `/contact` or `/about` once. Store clean profile URLs
(no tracking parameters, no share/intent links). Leave a cell empty if no
link was found. Do not search the web for profiles unless the user asked for
that: an unconfirmed profile may belong to a different business.

## Social Status (column Y): overall verdict

Check each linked profile, then sum up:

| Status | When |
|---|---|
| `Active` | At least one profile posted within the last 30 days. |
| `Low Activity` | Newest post on any profile is 31 to 180 days old. |
| `Inactive` | Profiles exist but nothing was posted in the last 180 days. |
| `Broken Links` | Every linked profile is missing, deleted or the link is wrong. |
| `No Socials` | No social links were found (columns S–X are all empty). |
| `Unverified` | Profiles exist but could not be read (login wall, blocked). |

## Social Details (column Z)

One short entry per platform, separated by ` | `, in the form
`Platform: state, last post <date or age>, <followers if visible>`.
Example: `FB: active, last post 3 days ago, 1.2k followers | IG: inactive, last post Mar 2024, 340 followers | X: link broken`

## Social Comment (column AA)

One or two sentences on quality, from what was seen: posting frequency,
content quality (original photos vs reposts/stock, branded or not), engagement
(likes and comments relative to followers), whether the bio and contact
details are complete and consistent with the website, and the clearest
opportunity. Example: `Facebook posts weekly but only stock images with almost no engagement; Instagram abandoned since 2024. Good fit for a social media management offer.`

## Honesty rules

- Write only what was observed. If a page could not be loaded or read, the
  status is `Unverified` and the comment says why.
- Never fill in contact details, follower counts or dates you did not see.
- Facebook, Instagram, LinkedIn and TikTok often hide posts behind a login
  wall. If the public page shows no post dates, say so rather than guessing.
