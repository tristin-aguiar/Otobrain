# Otobrain

An otolaryngology residency site: a shared learning library (curriculum, pathology, consult guides, radiology, basic science), a weekly post feed (This week in Otolaryngology) and, from version 2, private trackers for consults, procedures and research.

- **Setup:** see [SETUP.md](SETUP.md)
- **Stack:** Next.js (App Router) on Vercel, Supabase for the database, logins and file storage
- **Database:** `supabase/migrations/`, run in order in the Supabase SQL editor
- **Security:** row-level security in the database keeps each user's notes, progress and files private; only admins can edit shared content

## Version 1
- Login, night mode, account page (name, program, PGY)
- Curriculum: three textbooks, chapter import, per-chapter status, scheduled date, pre-reading checklist, private PDF upload, reading notes, progress per book
- Pathology, consult guides, radiology, basic science: grouped by anatomical subsite (consult guides by urgency), filters, admin editor with templates, drafts, private notes
- This week in Otolaryngology: categories, pinned post, program-only posts, scheduled publishing, private notes

## Version 2 (planned)
Dashboard, consult log, procedure tracker, research tracker, calendar with rotation blocks, radiology image uploads.

Rule for all content: no patient identifiers.
