# Outreach pipeline: shared rules

Every agent in the pipeline follows this file: the lead collector (main),
`website-checker`, `social-checker`, `gbp-checker`, and the final scoring
pass. Change a rule here and all of them pick it up.

**The goal of the pipeline:** find local businesses that are real and
operating but have gaps in their online presence (website, Google Business
Profile, social media) that we can fix: a beautiful website, more Google Maps
visibility, a stronger social presence. Every status and comment should help
answer "what is missing, and how would we pitch fixing it?"

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
| V | LinkedIn (not checked) | collector / website-checker |
| W | YouTube | collector / website-checker |
| X | TikTok | collector / website-checker |
| Y | Social Status | social-checker |
| Z | Social Details | social-checker |
| AA | Social Comment | social-checker |
| AB | GBP Status | gbp-checker |
| AC | GBP Rating | gbp-checker |
| AD | GBP Review Count | gbp-checker |
| AE | GBP Latest Review | gbp-checker |
| AF | GBP Link | gbp-checker |
| AG | GBP Comment | gbp-checker |
| AH | Website Grade | scoring (collector) |
| AI | Social Grade | scoring (collector) |
| AJ | GBP Grade | scoring (collector) |
| AK | Outreach Priority | scoring (collector) |
| AL | Lead Type | scoring (collector) |
| AM | Services to Pitch | scoring (collector) |
| AN | Pitch Angle | scoring (collector) |

**Who writes where.** Each agent writes only its own columns, and only the
rows it was given. No two agents ever write the same cell, so they can run at
the same time without overwriting each other.

**How to write.** Use `mcp__Google_Sheets__update_values` with an exact range
such as `Leads!Q12:X12` (or one block like `Leads!Q2:X51`). Never use
`append_values` for check results: append writes after the last row, which
may not be the row being checked. Leave a cell `""` when there is nothing to
put in it, never a made-up value.

## Website Status (column Q): pick exactly one

| Status | When |
|---|---|
| `Active` | Loads (HTTP 2xx after redirects), real business content (60+ words), not parked, and shows upkeep: a copyright year or dated content from the last 2 years. |
| `Active - Outdated` | Loads with real content, but the latest year on the page is over 2 years old, or the design is clearly dated (no mobile viewport, broken layout, table layout). |
| `Under Construction` | "Coming soon", "under construction" or maintenance page. |
| `Parked / For Sale` | Domain parking or for-sale page. |
| `Redirects Elsewhere` | Ends up on a different business or a generic directory. (A redirect to the same brand on a new domain counts as `Active`; note the new domain.) |
| `Down / Error` | DNS fails, connection refused, timeout, HTTP 4xx/5xx, SSL errors with no fallback, "account suspended" or server default page. |
| `No Website` | No URL in LeadOcean and none found by a quick web search for the company name and city. A Facebook page or a directory listing is not a website. |
| `Unverified` | Could not reach the site for a reason on our side (network blocked, tool error). Say why in the comment. Never guess. |

## Website Comment (column R)

One or two sentences an outreach rep can use as an opening, from what was
actually seen: design and age (modern / dated, builder used), mobile-friendly
or not, speed, conversion (contact form, click-to-call, booking or quote
button), upkeep (latest copyright year, HTTPS, thin content). For non-Active
statuses, say exactly what was seen.

Example: `Dated WordPress site (© 2019), not mobile-friendly, no booking or quote form. Strong redesign candidate.`

## Social links (columns S–X)

Take links found on the website first (header, footer, contact page). If the
homepage has none, check `/contact` or `/about` once. Store clean profile URLs
(no tracking parameters, no share/intent links). Leave a cell empty if no link
was found. LinkedIn links are recorded in V but **never visited or checked**.

## Social Status (column Y): overall verdict

Covers Facebook, Instagram, TikTok, X and YouTube. **LinkedIn is skipped.**

| Status | When |
|---|---|
| `Active` | At least one checked profile posted within the last 30 days. |
| `Low Activity` | Newest post on any profile is 31 to 180 days old. |
| `Inactive` | Profiles exist but nothing was posted in the last 180 days. |
| `Broken Links` | Every linked profile is missing, deleted or points to another account. |
| `No Socials` | No links to Facebook, Instagram, TikTok, X or YouTube were found. |
| `Unverified` | Profiles exist but could not be read (login wall, platform limit reached, browser not connected). |

## Social Details (column Z)

One entry per checked platform, separated by ` | `:
`Platform: state, last post <date or age>, <followers if visible>`.
Example: `FB: active, last post 3 days ago, 1.2k followers | IG: inactive, last post Mar 2024, 340 followers | TikTok: no link`

## Social Comment (column AA)

One or two sentences on quality: how often they post, content quality
(original photos and video vs stock or reposts, branded or not), engagement
relative to followers, whether bio and contact info are complete and match the
website, and the clearest opportunity.

## Google Business Profile (columns AB–AG)

### GBP Status (AB): pick exactly one

| Status | When |
|---|---|
| `Strong` | Claimed, rating 4.3+, 50+ reviews, a review in the last 60 days, hours, phone and website filled in, recent owner photos (last 6 months). |
| `Good` | Claimed and in decent shape, but misses one or two of the `Strong` marks. |
| `Weak` | Found, but several of: rating under 4.0, fewer than 15 reviews, no review in 6+ months, missing hours / website / phone, few or old photos, owner never replies to reviews. |
| `Unclaimed` | The profile shows "Own this business?" / "Claim this business". |
| `Not Found` | No profile matching the business name and city (and phone or address where known). |
| `Closed` | Marked "Permanently closed" or "Temporarily closed". |
| `Unverified` | Could not check (Google showed a captcha, browser not connected). Say why. |

### Other GBP columns

- **AC GBP Rating:** e.g. `4.6`. **AD GBP Review Count:** e.g. `128`.
- **AE GBP Latest Review:** the age shown on the newest review, e.g. `2 weeks ago`.
- **AF GBP Link:** the Google Maps link to the profile.
- **AG GBP Comment:** one or two sentences: category, photo count and recency,
  whether the owner replies to reviews, whether Google Posts / updates are used,
  missing info (hours, website, booking link, services), and anything in recent
  reviews that hints at a need (e.g. "customers say the website is hard to use").

## Scoring (columns AH–AN), done by the collector at the end

### Grades (AH–AJ): `Strong`, `Weak`, `Missing` or `Unknown`

| Grade | Website (from Q, R) | Social (from Y, Z, AA) | GBP (from AB) |
|---|---|---|---|
| `Strong` | `Active` with a modern, mobile-friendly design and a clear way to contact or book | `Active` with decent quality and engagement | `Strong` or `Good` |
| `Weak` | `Active` but poor (no CTA, thin, slow), `Active - Outdated`, `Under Construction` | `Low Activity`, `Inactive`, `Broken Links`, or `Active` with poor content or almost no engagement | `Weak`, `Unclaimed` |
| `Missing` | `No Website`, `Parked / For Sale`, `Down / Error`, `Redirects Elsewhere` | `No Socials` | `Not Found` |
| `Unknown` | `Unverified` | `Unverified` | `Unverified` |

### Is the business alive?

A business is **alive** if any of these hold: GBP has a review in the last 12
months; social posted in the last 180 days; the website is `Active`; or the
GBP shows current opening hours and is not closed. If GBP is `Closed`, or none
of these hold, it is not alive.

### Outreach Priority (AK)

| Priority | When |
|---|---|
| `Hot` | Alive, and 2 or more of the three grades are `Weak` or `Missing`. Also `Hot` whenever there is clear demand (GBP 20+ reviews or an `Active` social) but the website is `Missing`. |
| `Warm` | Alive, and exactly one grade is `Weak` or `Missing`. |
| `Cold` | Alive, and all three grades are `Strong`: little to sell. |
| `Skip` | Not alive, GBP `Closed`, the website redirects to a different business, or the company is clearly a large chain or franchise location. |
| `Review` | Two or more grades are `Unknown`: re-check before deciding. |

### Lead Type (AL): the pattern, in plain words

Pick the first that fits:

1. `Popular but no website`: GBP `Strong`/`Good` or social `Strong`, website `Missing`.
2. `Great reviews, weak online presence`: GBP `Strong`/`Good`, website and social both `Weak`/`Missing`.
3. `Strong social, weak Google & website`: social `Strong`, GBP and/or website `Weak`/`Missing`.
4. `Good website, weak Google & social`: website `Strong`, GBP and social `Weak`/`Missing`.
5. `Active business, poor social presence`: alive, social `Weak`/`Missing`, the others `Strong`.
6. `Invisible on Google Maps`: GBP `Weak`/`Missing`/`Unclaimed`, the others `Strong`.
7. `Outdated website only`: website `Weak`, the others `Strong`.
8. `Weak everywhere`: all three `Weak`/`Missing`, but alive.
9. `Fully covered`: all `Strong`.
10. `Not a fit`: anything `Skip`.

### Services to Pitch (AM)

Comma-separated, only what the grades call for: `New Website`,
`Website Redesign`, `Google Business Profile Setup` (Missing or Unclaimed),
`Google Maps Optimization` (Weak), `Review Generation` (under 30 reviews or no
recent ones), `Social Media Management` (social Weak/Missing).

### Pitch Angle (AN)

One specific sentence for the first message, built from the comments, e.g.
`You have 140 five-star reviews on Google but no website, so people who find you on Maps have nowhere to book; we can build one that turns those searches into jobs.`

## Honesty rules

- Write only what was observed. If a page could not be loaded or read, the
  status is `Unverified` and the comment says why.
- Never fill in contact details, follower counts, ratings or dates you did not see.
- If a platform hides posts behind a login wall, say so rather than guess.
