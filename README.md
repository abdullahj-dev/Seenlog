# Seenlog

A personal movie, series and anime tracker. Next.js (App Router) + Supabase + TMDB + AniList, hosted on Vercel.

## Run it
1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill it in (see below).
3. Run `supabase/schema.sql` once in Supabase > SQL Editor.
4. `npm run dev` and open http://localhost:3000

## Environment variables
| Name | What it is | Where it lives |
| --- | --- | --- |
| `TMDB_TOKEN` | TMDB "API Read Access Token" (long one). Server only, never exposed. | `.env.local` and Vercel |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `.env.local` and Vercel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public key (safe to expose) | `.env.local` and Vercel |
| `NEXT_PUBLIC_SITE_URL` | Your live address, no trailing slash | `.env.local` and Vercel |

Anything starting with `NEXT_PUBLIC_` is baked in at build time: change it, then redeploy.

## Deploy
`npm run build` (catches errors), then `vercel --prod`. Never put the service_role key in this project.

## Where things live
- `app/` pages and routes. Each page file is tiny; the interactive screens are drawn by `components/App.js` based on the address.
  - `app/page.js` list, `app/diary`, `app/year`, `app/import`, `app/title/[key]` (details page), `app/community`
  - `app/discover` server-rendered browse page with filters
  - `app/u/[username]` public profile, `app/u/[username]/c/[name]` shared collection
  - `app/api/*` search, title, discover, similar, match, airing (all go through `lib/guard.js`)
  - `app/layout.js` shared shell, `app/manifest.js` install-as-app, icons and link-preview images
- `components/App.js` owns ALL state and logic (list, ratings, sync, search, undo, picker). It shares everything through `components/AppContext.js`; any piece reads what it needs with `const { lib, patch, say } = useApp()`.
  - `components/shell/` the always-visible frame: `TopBar` (search and menu), `NavBar`, `Views` (picks the screen from the address), `Popup` (quick view), `Overlays` (rate bar, bulk bar, tonight picker, shortcuts, toast)
  - `components/screens/` one file per screen: `ListScreen`, `DiaryScreen`, `YearScreen`, `ImportScreen`, `TitleScreen` (full details page), `DiscoverRow` (your personal row), `LoginScreen` (sign in, create account, forgot password), `ResetScreen` (opened from the reset email), `SettingsScreen`
  - `components/styles/account.css` styles for the sign-in, reset and settings pages and the short top-bar menu
  - To change what a screen looks like, edit its file. To change how something works, edit `App.js`. Screens that keep their own state: Import, Year (chosen year) and Diary (how many entries are shown).
  - Also: `Shelf.js`, `PublicCard.js`, `DiscoverCard.js`, `TasteMatch.js`, `Rate.js`
- `lib/config.js` site name, tagline, email, default rating style. Edit this to rebrand.
- `lib/sources.js` every TMDB and AniList call. `lib/filters.js` Discover genres and regions.
- `lib/ui.js` shared constants. `lib/rating.js` rating display. `lib/importer.js` list cleaning (loaded only on Import). `lib/wall.js` poster-wall image.
- `supabase/schema.sql` the whole database. If you change tables, change this file too.

## Accounts, sign-in and password reset
Pages: `/login` (sign in, create account, forgot password), `/reset-password` (opened from the link in the email), `/settings`. The top-bar menu is only a short shortcut list; everything else lives in Settings.

Set this up once in the Supabase dashboard, under Authentication:
1. **URL Configuration**: set Site URL to your live address. Under Redirect URLs add `https://YOUR-SITE/**` and `http://localhost:3000/**`. Reset and confirmation links are refused if their address is not on this list.
2. **Sign In / Providers, Email**: "Confirm email" on is recommended for a live site.
3. **Emails**: the built-in sender is meant for testing and allows only a few emails per hour. If reset emails stop arriving, that limit is the likely cause. For real use add a custom SMTP provider (Authentication, Emails, SMTP Settings).

Password rules: 8 or more characters when creating or changing a password (the check is in the page, not in Supabase). Existing shorter passwords can still sign in.

## Rules of the road
- Ratings are stored 0 to 100. Each person only changes how they are displayed (`lib/rating.js`).
- Nobody can read anyone else's data except through the four `public_*` views. Never add a policy that opens `entries` directly.
- Notes, diary and who-you-watched-with are private unless a person turns reviews on, and a note can be locked.
- Titles are keyed `tmmovie123`, `tmtv123` (TMDB) or `al123` (AniList). Do not change this format.

## Asking for changes (how to get the best result)
- Say which page and what you saw. Paste the exact red error text or send a screenshot.
- Run `npm run build` before deploying and send me any errors.
- Keep a Git commit before each update so you can roll back: `git add . && git commit -m "before update"`.

## Titles the search cannot find

- Search retries on its own when TMDB returns fewer than 3 results: without the year, with loosened spelling, and in Hindi, Urdu and Punjabi matching.
- "Cannot find it? Add it yourself" sits at the bottom of the search dropdown and in the account menu. Titles added by hand get a key starting with `cu` and live in the same `entries` table as everything else.
- Poster uploads go to the `posters` storage bucket. Run `supabase/custom-posters.sql` once in the Supabase SQL editor. Without it, uploads fall back to a small image stored inside the entry.
- Titles added by hand can be edited from their title page (Edit details). On public profiles they show as normal cards without the Add-to-my-list button.

## Admin

- Run `supabase/admin.sql` once, after changing `you@example.com` in it to the email you signed up with. That email is the admin email, and it lives only in that file.
- Admin rights are rows in the `admins` table. The website cannot add or remove them, so nobody can promote themselves. To add another admin, insert their user id in the SQL editor.
- Signed in as an admin, the account menu shows Admin, which opens `/admin`: overview numbers and a People list where you can feature a public profile or hide it.
- Everything the page reads goes through checked database functions (`admin_stats`, `admin_users`, `admin_set_profile`) that refuse anyone who is not an admin.

## Feedback

- Run `supabase/feedback.sql` once, after `supabase/admin.sql`.
- Signed-in users open Send feedback from the account menu (`/feedback`): bug, idea, complaint, missing title or other. Missing titles carry title, year, type and language. Each person sees their own messages with the status and any reply.
- The server fills in who sent it, the status and the dates, and allows 5 messages per person per hour.
- Admin > Inbox lists everything, filtered by status. Per message: set the status, write a reply (saved when you click away), or delete it. A red number on the Inbox tab counts new messages.

## Safety and the shared catalog

- Run `supabase/safety.sql`, then `supabase/catalog.sql` (after admin.sql and feedback.sql).
- Settings > Your data: download everything as one JSON file, or delete the account. Deleting removes the list, public page, messages and uploaded posters. Admin accounts must first be removed from the `admins` table.
- On any public profile (`/u/name`) a Report this profile button sends a report to the Admin inbox. In the inbox, Find in People jumps to that person.
- Admin > People: Suspend stops a person signing in and switches their public page off. Restore undoes it. A person already signed in may stay in until their session expires, about an hour.
- Admin > Catalog: titles here show up in everyone's search (shown first, with a small set of matches). A missing-title request has Add to catalog, which pre-fills the form and marks the request done with a reply.
- Catalog search lives in `lib/retry.js` (`withRetry`), so the search route needs no further change.

## Replies, suggestions and posters

- Run `supabase/inbox.sql` once (after feedback.sql and custom-posters.sql). It adds reply tracking, more room for suggestions, and limits poster uploads to images of 300 KB or less.
- When the admin answers or changes the status of a message, a red dot shows on the account menu and "N new" shows next to Send feedback. Opening Send feedback marks the answers as read, and new ones carry a New label.
- Admin > Inbox: Email them opens your mail app with the person's address, a subject and their message quoted.
- On the manual add form (signed in), "Suggest this title for everyone's search" sends the title, cast, genres, summary and poster to the inbox. Add to catalog opens the Catalog form with everything filled in. A poster someone else uploaded is copied into the admin's own folder, so it survives if that person deletes their account.
- Public pages show only posters from TMDB, AniList and your own Supabase poster storage. Pasted poster links stay private to the person who pasted them. See the one-line find and replace below for the Supabase storage part.

## Following, hearts and people cards

1. In Supabase SQL Editor run `supabase/social.sql` (after `admin.sql` and `safety.sql`). It is safe to run twice.
2. New pages: `/following` (Latest, Following, Followers tabs). Profiles at `/u/name` now show Follow, follower and following counts, a heart and a broken heart. Community uses the new people cards with search and sorting.
3. Only public profiles can be followed or voted on. You cannot follow or vote on yourself. Limits: 500 follows per person, 60 follows and 60 votes per hour.
4. Counts on server pages refresh within about 5 minutes. The buttons update instantly for the person pressing them.
5. To hide broken hearts everywhere, set `SHOW_DISLIKES = false` in `lib/social.js`.

## Privacy, terms, offline and announcements

1. Run `supabase/announcements.sql` in the Supabase SQL Editor (after `admin.sql`).
2. `/privacy` and `/terms` are plain pages. Edit the text in `app/privacy/page.js` and `app/terms/page.js`. Set `email` in `lib/config.js` if you want a public contact address on them. The footer links to both, to Contact (the feedback page), and carries the TMDB, AniList and JustWatch credits.
3. Offline: `public/sw.js` caches the app shell, visited pages and posters, and only runs on the live site (not `npm run dev`). Edits made offline are kept on the device and sent to the account when the connection returns (`lib/offline.js`). If you change `sw.js`, bump `V` at the top so phones pick up the new one.
4. Announcements: Admin, Notices tab. Pick a style and how long it shows. People can close a notice, which hides it on that device only.
