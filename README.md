# Outreach lead pipeline

A Claude Code setup that collects local-business leads from LeadOcean into a
Google Sheet, checks each one's website, Google Business Profile and social
media, then marks which businesses are worth contacting and what to pitch them
(a new or redesigned website, Google Maps visibility, social media growth).

## Set up on Windows (one time)

1. Install **Node.js LTS** from nodejs.org and **Git for Windows** from git-scm.com.
2. Get the project (PowerShell):
   ```powershell
   cd $HOME\Documents
   git clone -b claude/modest-babbage-rytnw5 https://github.com/hasibdemo/outreach.git
   cd outreach
   ```
   Already have an `outreach` folder from before? Run `git pull` inside it instead.
3. Install the headless browser the website checks use:
   ```powershell
   npm install -g playwright
   npx playwright install chromium
   ```
   If `node scripts/check_sites.mjs` then says it cannot find `playwright`, run
   `npm install playwright` inside the `outreach` folder once.
4. In Chrome: install **Claude in Chrome**, sign in, and stay logged in to
   Google, Facebook, Instagram and TikTok.
5. Open the `outreach` folder in the **Claude desktop app** (Claude Code) or
   run `claude` in a terminal there. Make sure the **LeadOcean**, **Google
   Sheets** and **Google Drive** connectors are on for that session.

## How to run

Run Claude Code **on your Windows PC** (desktop app or CLI) from this folder,
with Chrome open, the **Claude in Chrome** extension connected, and Chrome
logged in to Facebook, Instagram and TikTok. Then:

```
/collect-leads plumbers | Austin, TX | 300 | https://docs.google.com/spreadsheets/d/<id>
```

Only niche and location are required. Count defaults to 100; without a sheet
link it offers to create one. To re-score a sheet after re-checking rows:
`/score-leads <sheet link>`.

## Who does what

| Agent | File | Job |
|---|---|---|
| Lead collector (main) | `.claude/skills/collect-leads/SKILL.md` | Searches LeadOcean, writes lead rows, checks the first half of each block's websites, runs the sub-agents, scores every lead at the end. |
| `website-checker` (sub-agent 1) | `.claude/agents/website-checker.md` | Checks the second half of each block's websites at the same time: active or not, condition comment, social links. |
| `social-checker` (sub-agent 2) | `.claude/agents/social-checker.md` | After a block's websites are done: checks Facebook, Instagram, TikTok and X slowly in your Chrome (YouTube by plain fetch). **LinkedIn is skipped.** Active or not, plus a quality comment. |
| `gbp-checker` (sub-agent 3) | `.claude/agents/gbp-checker.md` | Finds each business on Google Maps in your Chrome: claimed or not, rating, review count, newest review, owner replies, photos, hours, plus a comment. |
| Scoring (main) | `.claude/skills/score-leads/SKILL.md` | Grades website / social / GBP as Strong, Weak, Missing; sets Outreach Priority (Hot, Warm, Cold, Skip), Lead Type (e.g. "Popular but no website", "Strong social, weak Google & website"), Services to Pitch and a one-line Pitch Angle; builds an **Outreach Shortlist** tab. |

```
block 1 (rows 2-101): collect ─┬─► gbp-checker (Google Maps) ...................►
                               └─► websites: collector 2-51 ║ website-checker 52-101 ─► social-checker 2-101 ...►
block 2 (rows 102-201):                 collect ─► websites ... (browser agents queue behind block 1)
all done ─► scoring ─► Outreach Shortlist tab
```

Rules for every column, status and score are in `.claude/outreach/criteria.md`.
Edit that file to change the criteria for all agents.

## Account safety on Facebook, Instagram, TikTok and Google

Browser rules are in `.claude/outreach/browser-safety.md`. In short:

- **Read-only.** No likes, follows, messages, comments or searches; profiles
  are opened by direct link only.
- **Paced by a script, not by the agent's judgment.** `scripts/pace.mjs` must
  be run before every page visit. It enforces random gaps, regular longer
  breaks, hourly and daily caps per platform. Edit `LIMITS` at the top of the
  file to change them:

  | Platform | Gap between pages | Per hour | Per day | Break |
  |---|---|---|---|---|
  | Instagram | 30–60 s | 35 | 120 | 5–12 min every 12–18 pages |
  | Facebook | 25–55 s | 45 | 160 | 5–10 min every 15–22 pages |
  | TikTok | 20–45 s | 50 | 200 | 4–9 min every 18–25 pages |
  | X | 20–40 s | 50 | 200 | 4–8 min every 18–25 pages |
  | Google Maps | 10–25 s | 100 | 400 | 2–5 min every 30–45 pages |

- **Stops on any warning.** A captcha, checkpoint or "try again later" stops
  that platform for 24 hours (`pace.mjs --block`) and you are told the exact
  message.
- Only one social-checker and one gbp-checker run at a time, so pacing is
  never doubled.

Because of this, the browser checks are slow by design: about 100 businesses
a day on Instagram. Larger lists continue the next day; rows that hit a limit
are marked `unverified (daily limit reached)` so they can be re-run.

## Requirements

- Connectors: **LeadOcean**, **Google Sheets**, **Google Drive** (only to create new sheets).
- **Claude in Chrome** extension in your Chrome, connected to Claude Code.
- Node 18+ and Playwright for the website checks:
  `npm i -g playwright` then `npx playwright install chromium`.
- LeadOcean records: about 1 per company, +1 per decision-maker lookup,
  +1 per email reveal. The collector shows the estimate and asks first.
