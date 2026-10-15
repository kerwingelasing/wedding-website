import { connectFirestoreEmulator, doc, getDoc, getFirestore } from 'firebase/firestore/lite';
import { FIRESTORE_EMULATOR, app, useEmulators } from './firebase.js';
import {
  content as defaults, fullDate, isHex, longDate, mapsUrl, mergeContent, monthDay, namesOf,
} from './content.js';
import { escapeHtml as esc } from './codes.js';
import { initRsvp } from './rsvp.js';

const $ = (id) => document.getElementById(id);
const CACHE_KEY = 'site-content';

const db = getFirestore(app);
if (useEmulators) connectFirestoreEmulator(db, ...FIRESTORE_EMULATOR);

const cache = {
  get() { try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; } },
  set(v) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch { /* ignore */ } },
};

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

// Capiz lattice
$('capiz').innerHTML = Array.from(
  { length: 180 },
  () => `<span style="animation-delay:${(Math.random() * 900) | 0}ms"></span>`,
).join('');

// Countdown
let target = new Date(defaults.ceremonyStart).getTime();
function tick() {
  const d = Math.max(0, target - Date.now());
  $('cd-d').textContent = Math.floor(d / 864e5);
  $('cd-h').textContent = Math.floor(d / 36e5) % 24;
  $('cd-m').textContent = Math.floor(d / 6e4) % 60;
}
setInterval(tick, 30000);

function render(c, deadline) {
  const names = namesOf(c);
  document.title = `${c.couple.first} and ${c.couple.second}'s Wedding`;

  // Hero
  $('monogram').textContent = c.couple.monogram;
  $('hero-pre').textContent = c.invitationLine;
  $('hero-names').innerHTML = `${esc(c.couple.first)}<span class="amp">&amp;</span>${esc(c.couple.second)}`;
  $('hero-date').textContent = longDate(c.ceremonyStart);
  $('hero-place').textContent = c.place;
  $('hero-rsvp').textContent = `RSVP by ${monthDay(deadline)}`;
  target = new Date(c.ceremonyStart).getTime();
  tick();

  // Sections
  $('story-body').innerHTML = c.story.map((p) => `<p>${esc(p)}</p>`).join('');

  $('venues').innerHTML = c.venues
    .map(
      (v) => `<div class="venue">
        <h3>${esc(v.title)}</h3>
        <p class="time">${esc(v.time)}</p>
        <p>${esc(v.name)}<br>${esc(v.address)}</p>
        <a href="${esc(mapsUrl(v))}" target="_blank" rel="noopener">Open in Google Maps</a>
      </div>`,
    )
    .join('');

  $('program-list').innerHTML = c.program
    .map((p) => `<li><time>${esc(p.time)}</time><span>${esc(p.what)}</span></li>`)
    .join('');

  $('principal').innerHTML = c.principalSponsors
    .map((p) => `<span>${esc(p.a)}</span><span>${esc(p.b)}</span>`)
    .join('');
  const roles = (list) => list.map((r) => `<div><small>${esc(r.role)}</small>${esc(r.who)}</div>`).join('');
  $('secondary').innerHTML = roles(c.secondarySponsors);
  $('party').innerHTML = roles(c.weddingParty);

  $('attire-text').textContent = c.attire;
  $('attire-note').textContent = c.attireNote;
  $('swatches').innerHTML = c.swatches
    .filter((s) => isHex(s.hex))
    .map((s) => `<div class="sw"><i style="background:${s.hex}"></i>${esc(s.name)}</div>`)
    .join('');
  $('gifts').textContent = c.gifts;

  $('faq-list').innerHTML = c.faq
    .map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
    .join('');

  $('sig').textContent = names;
  $('signoff').textContent = c.signoff;
  document.body.classList.remove('loading-content');
}

// The couple edits the details from the dashboard (config/content). Show the last copy this
// browser saw right away, then the live one. First visits wait briefly so the defaults don't flash.
async function load() {
  const cached = cache.get();
  let deadline = new Date(cached?.deadline || defaults.rsvpDeadline);
  if (cached?.content) render(mergeContent(cached.content), deadline);

  let saved = cached?.content ?? null;
  try {
    const [contentSnap, siteSnap] = await withTimeout(
      Promise.all([getDoc(doc(db, 'config', 'content')), getDoc(doc(db, 'config', 'site'))]),
      8000,
    );
    saved = contentSnap.exists() ? contentSnap.data() : null;
    const d = siteSnap.exists() && siteSnap.data().deadline;
    if (d?.toDate) deadline = d.toDate();
    cache.set({ content: saved, deadline: deadline.toISOString() });
  } catch { /* offline or slow: keep the cached copy or the defaults */ }

  const c = mergeContent(saved);
  render(c, deadline);
  initRsvp({ db, content: c, deadline, deadlineLabel: fullDate(deadline), thanksLine: `See you on ${monthDay(c.ceremonyStart)}!` });
}

load();
