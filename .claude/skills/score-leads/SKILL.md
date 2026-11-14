---
name: score-leads
description: Scans a whole outreach leads Google Sheet and marks which businesses are good to contact, using the website, social media and Google Business Profile results. Writes grades, Outreach Priority (Hot/Warm/Cold/Skip/Review), Lead Type, Services to Pitch and a Pitch Angle per lead, and builds a sorted "Outreach Shortlist" tab. Run by the lead collector at the end, or on its own with /score-leads <sheet URL> after re-checking rows.
argument-hint: <Google Sheet URL or ID>
---

# Score leads for outreach

Read `.claude/outreach/criteria.md` first; the **Scoring** section is the
rule book. The owner builds websites, improves Google Maps visibility and
grows social media for local businesses, so a good lead is a real, operating
business with gaps in those areas.

## Steps

1. Read the sheet: `mcp__Google_Sheets__get_values` on `Leads!A1:AN<last>`
   (in chunks of 500 rows if large).
2. For every lead row:
   1. Grade **Website** (AH), **Social** (AI) and **GBP** (AJ) as `Strong`,
      `Weak`, `Missing` or `Unknown` using the grade table. Read the comments,
      not just the status: e.g. an `Active` website whose comment says "no
      booking or contact form, dated design" is `Weak`; an `Active` social
      with "stock images, almost no engagement" is `Weak`.
   2. Decide whether the business is **alive**.
   3. Set **Outreach Priority** (AK), **Lead Type** (AL), **Services to
      Pitch** (AM) by the rules.
   4. Write a **Pitch Angle** (AN): one specific sentence using real details
      from that row (review count, rating, the actual weakness seen). No
      generic lines, no made-up numbers.
3. Write AH:AN back with `mcp__Google_Sheets__update_values`, in chunks of
   100 rows. Do not touch any other column.
4. Build the shortlist: create or clear a tab named `Outreach Shortlist`
   (`mcp__Google_Sheets__update_spreadsheet` / `batch_clear_values`). Write a
   header and every `Hot` lead, then every `Warm` lead. Within each, put the
   strongest demand first (GBP review count, high to low). Columns: Priority,
   Lead Type, Company Name, City, Website, Company Phone, Contact Name,
   Contact Email, GBP Rating, GBP Review Count, Website Grade, Social Grade,
   GBP Grade, Services to Pitch, Pitch Angle, and the sheet row number
   (`Leads` row) so the full record is easy to find.
5. Report: counts per Outreach Priority and per Lead Type, and the 5 best
   leads (company, Lead Type, one-line reason).
