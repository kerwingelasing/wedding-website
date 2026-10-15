# Wedding Website System

Freelance project for a client: a wedding website for one couple, with a guest-facing site and a private admin dashboard. Built by Kerwin (developer). Target: Filipino wedding (Catholic Mass + reception), guests mostly on phones.

## Starting point

`wedding-sample.html` is an approved visual and flow prototype (placeholder couple "Paolo & Bea", Tagaytay). Keep its look, sections, and copy style. It currently stores RSVPs in localStorage and has an unprotected demo admin view; both must be replaced with Firebase.

## Tech stack

- Vanilla HTML, CSS, and JavaScript, bundled with Vite (no framework needed)
- Firebase modular SDK (v10+), installed via npm
- Firebase Authentication (email/password) for the admin
- Cloud Firestore for invites and RSVPs
- Firebase Hosting for deployment (custom domain added later)
- SheetJS (`xlsx`) for Excel export in the browser
- Stay on the free Spark plan. Do not use Cloud Storage unless the photo gallery upgrade is approved (it requires the Blaze plan).

Keep secrets out of the repo. Firebase web config can live in `src/firebase.js`; anything else goes in `.env` (gitignored).

## Pages

1. `/` guest site: hero with countdown, our story, ceremony and reception details with Google Maps links, program, entourage (principal sponsors, secondary sponsors: candle/veil/cord, wedding party), attire with motif swatches, gifts note, RSVP, FAQ
2. `/admin` dashboard: login screen, then stats, guest table, search and filter, table assignment, Excel export, invite management

## Data model (Firestore)

- `invites/{code}`: `{ name, maxSeats, table, createdAt }`. One doc per invitation/household. `code` is a random 6 to 8 character string (avoid ambiguous characters like 0/O, 1/l).
- `rsvps/{code}`: `{ attending: bool, seats: number, phone, message, submittedAt }`. Doc ID matches the invite code.
- `admins/{uid}`: presence of doc marks an admin.
- `config/site`: `{ deadline }`, the RSVP deadline (rules enforce it).
- `config/content`: everything guests see (names, date, venues, story, program, entourage, attire, FAQ, contact). The couple edits it on the dashboard's Wedding details tab; `src/content.js` holds the defaults used until it's saved, and the link-preview title baked in at build time.

## RSVP flow

- Each guest receives a personal link `/?code=XXXXXX` (or enters the code manually).
- Site fetches `invites/{code}` and greets the guest by name; seat dropdown is limited to `maxSeats`.
- Guest submits or updates their RSVP until the deadline.
- Invalid code shows a friendly error with the couple's contact.

## Security rules (must have)

- `invites`: public `get` only (no `list`); write admin only.
- `rsvps`: create/update only if `invites/{code}` exists, `seats <= maxSeats`, fields are valid types and lengths; no public read or list; admins can read all.
- `admins`, `config`: write admin only; `config` public read.
- Write rules tests with the Firebase emulator before deploying.

## Admin features

- Login with email and password (accounts created manually in Firebase console)
- Stats: invites, responses, seats confirmed, declined, pending, attending without a table
- Guest table with search, filter (attending/declined/pending), table assignment
- Add, edit, and delete invites; bulk import from CSV (name, maxSeats)
- Generate and copy each guest's personal link
- Export to .xlsx (guest, reply, seats, table, mobile, message)

## Optional upgrades (only if the client buys them)

Prenup photo gallery, email/SMS notification on new RSVP, QR check-in at reception, visual seating chart, Tagalog/English toggle. (Couple-editable content is built.)

## Design rules

- Keep the prototype's style: capiz-window lattice hero, Bodoni Moda (display) + Figtree (body), palette ink green #1E3B30, fern #4F6F5B, gold #9C7A43, pearl #F3F4EF
- Mobile first; test at 360px wide
- Support light and dark mode via CSS variables
- Respect `prefers-reduced-motion`
- Plain, warm copy; sentence case; no all-caps labels

## Working conventions

- Explain Firebase steps that need the console (project creation, enabling Auth, adding the admin user) as a short checklist for Kerwin
- Use the Firebase emulator suite for local development
- Small, reviewable commits
- Before deploying, confirm security rules tests pass and the site works on a phone
- Live: project `wedding-site-2027`, guest site https://wedding-rsvp-site.web.app (Hosting site `wedding-rsvp-site`). Admins sign in with Google or email/password; add an admin by creating `admins/{uid}`.
