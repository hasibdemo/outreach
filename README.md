# Outreach lead pipeline

A Claude Code setup that collects outreach leads from LeadOcean into a Google
Sheet, checks every website and social media profile, and writes a status and
a comment for each.

## How to run

In Claude Code, from this folder:

```
/collect-leads plumbers | Austin, TX | 300 | https://docs.google.com/spreadsheets/d/<id>
```

Only niche and location are required. Count defaults to 100; without a sheet
link it offers to create one.

## Who does what

| Agent | File | Job |
|---|---|---|
| Lead collector (main) | `.claude/skills/collect-leads/SKILL.md` | Searches LeadOcean, writes lead rows, checks the first half of each block's websites, launches the two sub-agents, reports back. |
| `website-checker` (sub-agent 1) | `.claude/agents/website-checker.md` | Checks the second half of each block's websites **at the same time** as the collector: active or not, condition comment, social links. |
| `social-checker` (sub-agent 2) | `.claude/agents/social-checker.md` | Starts as soon as a block of 100 leads has its website checks done; visits every social profile, decides active or not, writes a quality comment. Runs while the next block is being collected. |

```
block 1 (rows 2-101):   collect ─► websites: collector 2-51 ║ website-checker 52-101 ─► social-checker 2-101 ...
block 2 (rows 102-201):                                     collect ─► websites ... ─► social-checker 102-201
```

Shared rules (sheet columns, status values, comment style, honesty rules)
live in `.claude/outreach/criteria.md`. Edit that file to change the
criteria for all three agents.

`scripts/check_sites.mjs` loads sites in headless Chromium (6 at a time) and
returns the raw signals (HTTP status, parked / under-construction detection,
copyright year, mobile viewport, forms, CTAs, CMS, social links). It needs
Node 18+ and Playwright (`npm i -g playwright && npx playwright install chromium`
on your own machine).

## Requirements

- Connectors: **LeadOcean**, **Google Sheets**, **Google Drive** (only to create new sheets).
- Network access to arbitrary websites. In a Claude Code cloud environment
  with limited network access, business websites and social sites are
  blocked; use a local Claude Code session or an environment with full
  network access.
- LeadOcean records: about 1 per company, +1 per decision-maker lookup,
  +1 per email reveal. The collector shows the estimate and asks before
  spending.
