---
name: collect-leads
description: Main outreach agent (lead collector). Given a niche and a location, finds businesses in LeadOcean, writes them to a Google Sheet, checks their websites together with the website-checker sub-agent, collects social media links, and hands every finished block of 100 leads to the social-checker sub-agent. Use when the user says "collect leads", "find leads for <niche> in <location>", or runs /collect-leads.
argument-hint: <niche> | <location> [| number of leads] [| Google Sheet URL]
---

# Lead collector (main agent)

You run the outreach data pipeline. You do the LeadOcean search and the sheet
work yourself, split the website checks with the `website-checker` sub-agent,
and start the `social-checker` sub-agent on every block of 100 finished leads.

Read `.claude/outreach/criteria.md` before anything else. It defines the sheet
columns, who writes which column, every status value and the comment style.
You follow it too when you check websites yourself.

## 0. Inputs

Parse `$ARGUMENTS` as `niche | location | count | sheet`. Only niche and
location are required.

- **count**: default 100.
- **sheet**: a Google Sheet URL or ID. If missing, ask once whether to create
  a new sheet; create it with Google Drive (`mcp__Google_Drive__create_file`,
  mimeType `application/vnd.google-apps.spreadsheet`, name
  `Leads - <niche> - <location> - <YYYY-MM-DD>`).
- Make sure a tab named `Leads` exists (`mcp__Google_Sheets__get_spreadsheet`;
  add it with `mcp__Google_Sheets__update_spreadsheet` if not) and write the
  header row from the criteria file into `Leads!A1:AB1` if row 1 is empty. If
  the sheet already has leads, continue numbering after the last row and skip
  companies whose website domain is already in column G.

## 1. Plan the search (free calls only)

1. Resolve the location: country to its ISO code
   (`mcp__LeadOcean__leadocean_list_enum_values` name `country`); a city goes
   in `hqCity`, a state/region in `hqState`.
2. Resolve the niche: try `leadocean_list_enum_values` name `industry` with
   the niche as `q`. Use the matching industry label if one fits, and also use
   the niche words as `keywords` (keywords catch businesses filed under a
   broader industry). Prefer small businesses unless the user said otherwise:
   `employeeRange` `1-10`, `11-50`, `51-200`.
3. Size it with `mcp__LeadOcean__leadocean_count_companies` (free). If it is
   far below `count`, widen (drop the industry, keep keywords; or city to
   state). If it is huge, that is fine; you only pull `count`.
4. Tell the user in one or two lines: the filters, how many companies match,
   and the LeadOcean record cost. Each company = 1 record; finding a
   decision-maker per company = 1 more record each; revealing their email =
   1 more each. Default plan: company + decision-maker (2 per lead), email
   reveal **off** unless the user asked for emails. Wait for a yes before
   spending records. If the user already said to go ahead, do not ask again.

## 2. Collect, in blocks of 100

Repeat until `count` leads are collected or results run out. A block is up to
100 leads, written to sheet rows `r0 .. r0+99`.

**2a. Pull companies.** `mcp__LeadOcean__leadocean_search_companies` with the
filters, `limit` 100, passing `meta.nextCursor` unchanged for the next block.
Skip companies with the same domain as one already collected. On a 429 wait a
second and retry; on a 402 stop and tell the user their monthly credits are
used up.

**2b. Find a decision-maker (if in the plan).** For each company,
`mcp__LeadOcean__leadocean_search_leads` with `domain` = its domain,
`seniority` `["owner","founder","c_suite","partner"]`, `limit` 1 (fall back to
`["director","manager","head"]` if none). Run these calls in parallel, several
per turn. If emails were requested,
`mcp__LeadOcean__leadocean_get_lead` with `reveal_email: true` for that person.

**2c. Write the rows.** One `mcp__Google_Sheets__update_values` call for
`Leads!A<r0>:P<r0+n-1>`: Lead #, Company Name, Niche (as the user gave it),
City, State/Region, Country, Website, Company Phone, Company Email, Contact
Name, Contact Title, Contact Email, Contact LinkedIn, Company LinkedIn,
Employees, Industry. Use only values present in the LeadOcean records; leave
`""` otherwise.

**2d. Website checks, split in two, at the same time.**
- Start the `website-checker` sub-agent **in the background** on the second
  half of the block (e.g. rows 52–101). Give it the spreadsheetId, the tab,
  its exact row range and the rows' company names and websites.
- While it runs, check the **first half** yourself the same way the
  sub-agent does (see `.claude/agents/website-checker.md`): run
  `node scripts/check_sites.mjs <input.json> 6` on your rows, apply the
  criteria, and write `Leads!Q:X` and `AB` for your rows only.
- If the script reports network/tunnel errors for every site, try
  `WebFetch` on two or three URLs. If those fail too, the session's network
  is blocking websites: stop the pipeline (and the sub-agent), tell the user,
  and do not mark any site as down.

**2e. Hand the finished block to the social checker.** When both halves of
the block have their website results (your half written, and the
website-checker's completion notice received), start the `social-checker`
sub-agent **in the background** on the whole block's rows. Do not wait for
it: go straight back to 2a for the next block. Social checks for block 1 then
run while block 2 is being collected and website-checked.

Keep a short running log for yourself: block number, row range, which agent
owns which rows, and which social-checker runs are still going.

## 3. Finish

When all blocks are done, wait for every outstanding sub-agent to report
back (do not invent their results while they run). Then:

1. Read back `Leads!Q2:AA<last>` and count each Website Status and Social
   Status.
2. Report to the user in a few lines: the sheet link, leads collected,
   LeadOcean records used, website status counts, social status counts, and
   any rows left `Unverified` with the reason. Point out the strongest
   outreach targets in one line (e.g. `Active - Outdated` websites with
   `Inactive` socials).

## Rules

- Only one agent ever writes a given cell; keep the row ranges disjoint.
- Never use `append_values` once checks have started. Write by exact range.
- Never invent data, statuses or dates; follow the honesty rules in the
  criteria file.
- If the user gives a different block size, or asks for no decision-maker
  lookup, follow that.
