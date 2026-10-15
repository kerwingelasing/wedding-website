import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { CODE_PATTERN, normalizeCode } from './codes.js';

const $ = (id) => document.getElementById(id);
const STATES = ['rsvp-loading', 'rsvp-code', 'rsvp-invite', 'rsvp-thanks', 'rsvp-closed'];
const CODE_KEY = 'rsvp-code';
const replyKey = (code) => `rsvp-reply-${code}`;

let invite = null; // { code, name, maxSeats }
let db, content, deadline, deadlineLabel, thanksLine;

// Storage can throw in private browsing; the site must work without it.
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  remove(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

function show(id) {
  for (const s of STATES) $(s).hidden = s !== id;
}

function contactLine() {
  const { name, phone, email } = content.contact;
  return `message ${name} at ${phone} or ${email}`;
}

const seatsText = (n) => `${n} ${n === 1 ? 'seat' : 'seats'}`;

function withTimeout(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'timeout' })), ms)),
  ]);
}

// main.js loads the wedding details and the deadline (config/site, also enforced by the rules) first.
export async function initRsvp(opts) {
  ({ db, content, deadline, deadlineLabel, thanksLine } = opts);
  $('rsvp-intro').textContent =
    `Please reply by ${deadlineLabel}. Enter the code from your invitation, or open the personal link we sent you.`;
  $('codeForm').addEventListener('submit', onCodeSubmit);
  $('rsvpForm').addEventListener('submit', onRsvpSubmit);
  $('rsvpForm').addEventListener('change', syncSeats);
  $('notMe').addEventListener('click', forgetInvite);
  $('changeReply').addEventListener('click', () => openForm(store.get(replyKey(invite.code))));

  const fromUrl = new URLSearchParams(location.search).get('code');
  const code = normalizeCode(fromUrl || store.get(CODE_KEY));
  if (code) await lookup(code, { fromLink: Boolean(fromUrl) });
  else show('rsvp-code');
}

async function lookup(code, { fromLink = false } = {}) {
  show('rsvp-loading');
  $('code-err').textContent = '';

  if (!CODE_PATTERN.test(code)) return notFound(code, fromLink);

  let snap;
  try {
    snap = await withTimeout(getDoc(doc(db, 'invites', code)));
  } catch {
    show('rsvp-code');
    $('f-code').value = code;
    $('code-err').textContent = "We couldn't reach the guest list. Check your connection and try again.";
    return;
  }
  if (!snap.exists()) return notFound(code, fromLink);

  const data = snap.data();
  invite = { code, name: data.name, maxSeats: data.maxSeats };
  store.set(CODE_KEY, code);
  const url = new URL(location.href);
  if (url.searchParams.get('code') !== code) {
    url.searchParams.set('code', code);
    history.replaceState(null, '', url);
  }

  $('greet').textContent = `Hi, ${invite.name}!`;
  $('greet-sub').textContent =
    `We've saved ${seatsText(invite.maxSeats)} for you. Please reply by ${deadlineLabel}.`;

  if (Date.now() > deadline.getTime()) {
    $('closedText').textContent =
      `The RSVP deadline was ${deadlineLabel}. If your plans have changed, please ${contactLine()}.`;
    return show('rsvp-closed');
  }

  const prev = store.get(replyKey(code));
  if (prev) showThanks(prev);
  else openForm(null);
}

function notFound(code, fromLink) {
  store.remove(CODE_KEY);
  show('rsvp-code');
  $('f-code').value = code;
  $('code-err').textContent =
    `We couldn't find an invitation with code ${code}. ` +
    (fromLink ? 'The link may be incomplete. ' : 'Check the code on your invitation. ') +
    `If it still doesn't work, please ${contactLine()}.`;
}

function onCodeSubmit(e) {
  e.preventDefault();
  const code = normalizeCode($('f-code').value);
  if (!code) {
    $('code-err').textContent = 'Enter the code printed on your invitation.';
    return;
  }
  lookup(code);
}

function forgetInvite() {
  if (invite) store.remove(replyKey(invite.code));
  store.remove(CODE_KEY);
  invite = null;
  const url = new URL(location.href);
  url.searchParams.delete('code');
  history.replaceState(null, '', url);
  $('f-code').value = '';
  $('code-err').textContent = '';
  show('rsvp-code');
  $('f-code').focus();
}

function openForm(prev) {
  const sel = $('f-seats');
  sel.innerHTML = '';
  for (let i = 1; i <= invite.maxSeats; i++) sel.add(new Option(seatsText(i), String(i)));
  sel.value = String(prev?.attending ? Math.min(prev.seats, invite.maxSeats) : invite.maxSeats);

  for (const r of document.querySelectorAll('input[name=att]')) {
    r.checked = prev ? r.value === (prev.attending ? 'yes' : 'no') : false;
  }
  $('f-phone').value = prev?.phone || '';
  $('f-msg').value = prev?.message || '';
  $('f-err').textContent = '';
  $('prev-reply').hidden = !prev;
  if (prev) $('prev-reply').textContent = 'Update your reply below. Your new answer replaces the old one.';
  syncSeats();
  show('rsvp-invite');
}

function syncSeats() {
  const att = document.querySelector('input[name=att]:checked')?.value;
  $('seats-wrap').hidden = att === 'no' || invite.maxSeats === 1;
}

async function onRsvpSubmit(e) {
  e.preventDefault();
  const err = $('f-err');
  const att = document.querySelector('input[name=att]:checked')?.value;
  const phone = $('f-phone').value.trim();
  const message = $('f-msg').value.trim();

  if (!att) return void (err.textContent = 'Choose whether you will attend.');
  if (att === 'yes' && !phone) return void (err.textContent = 'Add a mobile number so we can reach you about the day.');
  if (phone && !/^[0-9+() -]{7,20}$/.test(phone)) {
    return void (err.textContent = 'Enter a mobile number using digits only, like 0917 123 4567.');
  }
  if (message.length > 500) return void (err.textContent = 'Please keep your message under 500 characters.');
  err.textContent = '';

  const reply = {
    attending: att === 'yes',
    seats: att === 'yes' ? Number($('f-seats').value) : 0,
    phone,
    message,
  };

  const btn = $('f-submit');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  try {
    await withTimeout(setDoc(doc(db, 'rsvps', invite.code), { ...reply, submittedAt: serverTimestamp() }), 20000);
    store.set(replyKey(invite.code), reply);
    showThanks(reply);
  } catch (ex) {
    err.textContent =
      ex.code === 'permission-denied'
        ? `We couldn't save your reply. RSVPs may already be closed. Please ${contactLine()}.`
        : "We couldn't send your reply. Check your connection and try again.";
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send RSVP';
  }
}

function showThanks(reply) {
  $('thanksText').textContent = reply.attending
    ? `We received your RSVP for ${seatsText(reply.seats)}. ${thanksLine}`
    : "We received your reply. We'll miss you, and thank you for letting us know.";
  show('rsvp-thanks');
}
