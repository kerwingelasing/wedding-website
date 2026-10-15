// "Wedding details" tab: the couple edits everything guests see on the site.
// Saved to config/content (public read, admin write; shape checked in firestore.rules).
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { isHex, mergeContent } from './content.js';
import { escapeHtml as esc } from './codes.js';

const $ = (id) => document.getElementById(id);

// Keep in sync with validContent() in firestore.rules.
export const LIST_LIMITS = {
  story: 20, venues: 10, program: 40, principalSponsors: 40, secondarySponsors: 20, weddingParty: 40, swatches: 12, faq: 30,
};
const SHORT = 200;
const LONG = 2000;

// Repeating lists: each item is a row of fields.
const LISTS = {
  venues: {
    add: 'Add a venue',
    fields: [
      ['title', 'Title', 'e.g. Holy Mass'], ['time', 'Time', 'e.g. 3:00 in the afternoon'],
      ['name', 'Venue name', ''], ['address', 'Address', ''],
    ],
  },
  program: { add: 'Add to the program', fields: [['time', 'Time', 'e.g. 3:00 PM'], ['what', 'What happens', '']] },
  principalSponsors: { add: 'Add a pair', fields: [['a', 'Sponsor', 'e.g. Mr. Ramon Villanueva'], ['b', 'Sponsor', 'e.g. Mrs. Teresita Villanueva']] },
  secondarySponsors: { add: 'Add a sponsor', fields: [['role', 'Role', 'e.g. Candle'], ['who', 'Names', '']] },
  weddingParty: { add: 'Add someone', fields: [['role', 'Role', 'e.g. Best man'], ['who', 'Name', '']] },
  swatches: { add: 'Add a color', fields: [['name', 'Color name', 'e.g. Sage'], ['hex', 'Color', '', 'color']] },
  faq: { add: 'Add a question', fields: [['q', 'Question', ''], ['a', 'Answer', '', 'textarea']] },
};

const manila = (d) => new Date(d).toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).slice(0, 16).replace(' ', 'T');

let db;
let toast;
let friendlyError;
let onNames;
let dirty = false;
let unsub = null;

export function initDetails(opts) {
  ({ db, toast, friendlyError, onNames } = opts);

  for (const [key, def] of Object.entries(LISTS)) {
    const wrap = document.querySelector(`[data-list="${key}"]`);
    wrap.insertAdjacentHTML('afterend', `<button class="btn ghost small add-row" type="button" data-add="${key}">${def.add}</button>`);
  }

  const form = $('detailsForm');
  form.addEventListener('input', () => setDirty(true));
  form.addEventListener('click', onListClick);
  form.addEventListener('submit', save);
  $('d-reset').addEventListener('click', () => {
    if (confirm('Discard your changes and go back to the saved details?')) {
      fill(lastSaved);
      setDirty(false);
    }
  });
  addEventListener('beforeunload', (e) => {
    if (dirty) e.preventDefault();
  });
}

let lastSaved = mergeContent(null);

export function startDetails() {
  unsub = onSnapshot(doc(db, 'config', 'content'), (snap) => {
    const data = snap.exists() ? snap.data() : null;
    lastSaved = mergeContent(data);
    onNames?.(lastSaved);
    const at = data?.updatedAt?.toDate?.();
    $('d-saved').textContent = at
      ? `Last saved ${at.toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })}`
      : 'Not saved yet. Guests see the starting details until you save.';
    // Don't overwrite what the couple is typing.
    if (!dirty) fill(lastSaved);
  }, (ex) => toast(friendlyError(ex)));
}

export function stopDetails() {
  unsub?.();
  unsub = null;
  setDirty(false);
}

export const hasUnsavedDetails = () => dirty;

function setDirty(v) {
  dirty = v;
  $('d-status').textContent = v ? 'Unsaved changes' : '';
  $('d-reset').hidden = !v;
}

// ---------- Form <-> data ----------
function fill(c) {
  $('d-first').value = c.couple.first;
  $('d-second').value = c.couple.second;
  $('d-monogram').value = c.couple.monogram;
  $('d-date').value = manila(c.ceremonyStart);
  $('d-place').value = c.place;
  $('d-invitation').value = c.invitationLine;
  $('d-signoff').value = c.signoff;
  $('d-cname').value = c.contact.name;
  $('d-cphone').value = c.contact.phone;
  $('d-cemail').value = c.contact.email;
  $('d-story').value = c.story.join('\n\n');
  $('d-attire').value = c.attire;
  $('d-attire-note').value = c.attireNote;
  $('d-gifts').value = c.gifts;
  for (const key of Object.keys(LISTS)) {
    const wrap = document.querySelector(`[data-list="${key}"]`);
    wrap.innerHTML = '';
    for (const item of c[key]) wrap.append(row(key, item));
    syncAdd(key);
  }
}

function row(key, item = {}) {
  const def = LISTS[key];
  const el = document.createElement('div');
  el.className = 'list-row';
  el.innerHTML = `<div class="list-fields">${def.fields.map(([f, label, ph, type]) => {
    const v = item[f] ?? (type === 'color' ? '#8FA88F' : '');
    const input = type === 'textarea'
      ? `<textarea data-f="${f}" maxlength="${LONG}">${esc(v)}</textarea>`
      : type === 'color'
        ? `<input type="color" data-f="${f}" value="${isHex(v) ? esc(v) : '#8FA88F'}">`
        : `<input data-f="${f}" maxlength="${SHORT}" value="${esc(v)}" placeholder="${esc(ph)}">`;
    return `<label class="${type === 'textarea' ? 'wide' : ''}">${label}${input}</label>`;
  }).join('')}</div>
  <div class="list-acts">
    <button class="linkbtn small" type="button" data-move="-1" aria-label="Move up">Up</button>
    <button class="linkbtn small" type="button" data-move="1" aria-label="Move down">Down</button>
    <button class="linkbtn small danger" type="button" data-remove>Remove</button>
  </div>`;
  return el;
}

function onListClick(e) {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.add) {
    const key = b.dataset.add;
    const wrap = document.querySelector(`[data-list="${key}"]`);
    const r = row(key);
    wrap.append(r);
    r.querySelector('input,textarea')?.focus();
    syncAdd(key);
    return setDirty(true);
  }
  const r = b.closest('.list-row');
  if (!r) return;
  const key = r.parentElement.dataset.list;
  if (b.dataset.remove !== undefined) {
    r.remove();
    syncAdd(key);
  } else if (b.dataset.move === '-1' && r.previousElementSibling) r.after(r.previousElementSibling);
  else if (b.dataset.move === '1' && r.nextElementSibling) r.before(r.nextElementSibling);
  else return;
  setDirty(true);
}

function syncAdd(key) {
  const n = document.querySelector(`[data-list="${key}"]`).children.length;
  document.querySelector(`[data-add="${key}"]`).disabled = n >= LIST_LIMITS[key];
}

const val = (id) => $(id).value.trim();

function read() {
  const lists = {};
  for (const [key, def] of Object.entries(LISTS)) {
    lists[key] = [...document.querySelector(`[data-list="${key}"]`).children]
      .map((r) => Object.fromEntries(def.fields.map(([f]) => [f, r.querySelector(`[data-f="${f}"]`).value.trim()])))
      .filter((item) => def.fields.some(([f, , , type]) => type !== 'color' && item[f]));
  }
  const date = val('d-date');
  return {
    couple: { first: val('d-first'), second: val('d-second'), monogram: val('d-monogram') },
    invitationLine: val('d-invitation'),
    ceremonyStart: date ? `${date}:00+08:00` : '',
    place: val('d-place'),
    signoff: val('d-signoff'),
    contact: { name: val('d-cname'), phone: val('d-cphone'), email: val('d-cemail') },
    story: $('d-story').value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
    ...lists,
    attire: val('d-attire'),
    attireNote: val('d-attire-note'),
    gifts: val('d-gifts'),
  };
}

function problem(c) {
  if (!c.couple.first || !c.couple.second) return 'Enter both names.';
  if (!c.couple.monogram) return 'Enter a monogram, like P & B.';
  if (!c.ceremonyStart || Number.isNaN(new Date(c.ceremonyStart).getTime())) return 'Choose the wedding date and time.';
  if (!c.contact.name || !(c.contact.phone || c.contact.email)) return 'Add a contact name with a phone number or email, for guests whose code doesn’t work.';
  if (c.story.length > LIST_LIMITS.story) return `Keep the story to ${LIST_LIMITS.story} paragraphs or fewer.`;
  if (c.story.some((p) => p.length > LONG)) return `Each story paragraph can be up to ${LONG} characters.`;
  if (!c.venues.length) return 'Add at least one venue.';
  if (c.swatches.some((s) => !isHex(s.hex))) return 'One of the motif colors isn’t valid. Pick it again.';
  return '';
}

async function save(e) {
  e.preventDefault();
  const c = read();
  const err = problem(c);
  $('d-err').textContent = err;
  if (err) return;
  $('d-save').disabled = true;
  try {
    await setDoc(doc(db, 'config', 'content'), { ...c, updatedAt: serverTimestamp() });
    setDirty(false);
    toast('Wedding details saved. Guests see them now.');
  } catch (ex) {
    $('d-err').textContent = friendlyError(ex);
  } finally {
    $('d-save').disabled = false;
  }
}

