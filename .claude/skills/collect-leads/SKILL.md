---
name: collect-leads
description: Main outreach agent (lead collector). Given a niche and a location, finds businesses in LeadOcean, writes them to a Google Sheet, checks their websites together with the website-checker sub-agent, hands each block to the gbp-checker (Google Business Profile) and social-checker sub-agents, then scores every lead for outreach. Use when the user says "collect leads", "find leads for <niche> in <location>", or runs /collect-leads.
argument-hint: <niche> | <location> [| number of leads] [| Google Sheet URL]
---

# Lead collector (main agent)

You run the outreach data pipeline. You do the LeadOcean search and the sheet
work yourself, split the website checks with `website-checker`, hand each
block to `gbp-checker` and `social-checker`, and at the end score every lead
for outreach.

**Why:** the owner sells websites, Google Maps visibility and social media
growth to local businesses. The pipeline must find real, operating
businesses with gaps in those three areas.

Before anything else, read:
- `.claude/outreach/criteria.md`: sheet columns A–AN, who writes which
  column, every status value, the comment style and the scoring rules;
- `.claude/outreach/browser-safety.md`: the two browser sub-agents follow
  it; you need it to understand their limits and warnings.

## 0. Inputs and checks

Parse `$ARGUMENTS` as `niche | location | count | sheet`. Only niche and
location are required.

- **count**: default 100.
- **sheet**: a Google Sheet URL or ID. If missing, ask once whether to create
  one; create it with `mcp__Google_Drive__create_file` (mimeType
  `application/vnd.google-apps.spreadsheet`, name
  `Leads - <niche> - <location> - <YYYY-MM-DD>`).
- Make sure a `Leads` tab exists (`mcp__Google_Sheets__get_spreadsheet`; add
  it with `mcp__Google_Sheets__update_spreadsheet` if not) and write the
  header row from the criteria file into `Leads!A1:AN1` if row 1 is empty. If
  the sheet already has leads, continue after the last row and skip companies
  whose website domain is already in column G.
- **Browser check:** load `mcp__claude-in-chrome__tabs_context_mcp` with
  ToolSearch and call it once. If Claude in Chrome is not available, tell the
  user that the Google Business Profile and Facebook/Instagram/TikTok checks
  need it (Chrome open, extension connected, logged in to those platforms)
  and ask whether to continue without them (those columns would be
  `Unverified`). Do not start the browser sub-agents without it.

## 1. Plan the search (free calls only)

1. Resolve the location: country to its ISO code
   (`mcp__LeadOcean__leadocean_list_enum_values` name `country`); a city goes
   in `hqCity`, a state/region in `hqState`.
2. Resolve the niche: `leadocean_list_enum_values` name `industry` with the
   niche as `q`. Use a matching industry label if one fits, and also use the
   niche words as `keywords`. Prefer small local businesses unless told
   otherwise: `employeeRange` `1-10`, `11-50`, `51-200`.
3. Size it with `mcp__LeadOcean__leadocean_count_companies` (free). Widen if
   far below `count` (drop the industry, keep keywords; or city to state).
4. Tell the user in one or two lines: filters, matches, and the LeadOcean
   record cost (company = 1 record; decision-maker lookup = 1 more; email
   reveal = 1 more). Default: company + decision-maker, email reveal **off**
   unless the user asked for emails. Also say that the browser checks are
   deliberately slow (roughly 100 profiles an hour on Google Maps and fewer
   on Instagram; see the daily limits in `scripts/pace.mjs`), so large
   lists can take more than a day. Wait for a yes before spending records,
   unless the user already said to go ahead.

## 2. Collect, in blocks of 100

Repeat until `count` leads are collected or results run out. A block is up to
100 leads in sheet rows `r0 .. r0+n-1`.

**2a. Pull companies.** `mcp__LeadOcean__leadocean_search_companies` with the
filters, `limit` 100, passing `meta.nextCursor` unchanged for the next block.
Skip duplicate domains. On 429 wait a second and retry; on 402 stop and tell
the user their monthly credits are used up.

**2b. Find a decision-maker (if in the plan).**
`mcp__LeadOcean__leadocean_search_leads` with `domain`, `seniority`
`["owner","founder","c_suite","partner"]`, `limit` 1 (fall back to
`["director","manager","head"]`). Several calls per turn in parallel. If
emails were requested, `mcp__LeadOcean__leadocean_get_lead` with
`reveal_email: true`.

**2c. Write the rows.** One `mcp__Google_Sheets__update_values` for
`Leads!A<r0>:P<r0+n-1>` with the 16 collector columns. Only values present in
the LeadOcean records; `""` otherwise.

**2d. Start the GBP check.** Start `gbp-checker` **in the background** on the
block's rows (spreadsheetId, tab, exact row range). It needs only name, city
and phone, so it can start now.

**2e. Website checks, split in two, at the same time.**
- Start `website-checker` **in the background** on the second half of the
  block (e.g. rows 52–101) with the spreadsheetId, tab, row range, and the
  rows' names and websites.
- Meanwhile check the **first half** yourself the same way (see
  `.claude/agents/website-checker.md`): `node scripts/check_sites.mjs
  <input.json> 6`, apply the criteria, write `Leads!Q:X` for your rows only.
- If the script reports network/tunnel errors for every site, try `WebFetch`
  on two or three URLs. If those fail too, the network is blocking websites:
  stop, tell the user, and mark nothing as down.

**2f. Start the social check.** When both halves of the block have website
results, start `social-checker` **in the background** on the block's rows.
Then go straight back to 2a for the next block.

**One browser agent of each kind at a time.** Never run two `gbp-checker`s or
two `social-checker`s at once: they would share the same account and the
same rate limits. Keep a queue: if the previous block's checker is still
running, queue the new block and start it when that one reports back.

If a browser sub-agent reports a **platform warning** (captcha, checkpoint,
"temporarily blocked"), tell the user right away with the exact message, do
not start more work on that platform, and continue everything else.

If a sub-agent reports a **daily limit reached**, keep collecting and
checking websites; the remaining rows for that platform can be re-run
tomorrow by starting the same sub-agent on the rows marked
`unverified (daily limit reached)`.

## 3. Score every lead

When all blocks are collected and every sub-agent has reported back (never
write their results yourself while they run), run the scoring pass in
`.claude/skills/score-leads/SKILL.md` on the whole sheet.

## 4. Report

In a few lines: the sheet link, leads collected, LeadOcean records used,
counts per Website Status, Social Status, GBP Status and Outreach Priority,
the top 3 to 5 Lead Types by count, any platform warnings, and rows left
`Unverified` or `Review` with the reason.

## Rules

- Only one agent writes a given cell; keep row ranges and columns disjoint.
- Never use `append_values` once checks have started. Write by exact range.
- Never invent data, statuses or dates; follow the honesty rules.
- If the user gives a different block size or skips the decision-maker
  lookup, follow that.
