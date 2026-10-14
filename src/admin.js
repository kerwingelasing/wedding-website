import {
  getAuth, connectAuthEmulator, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from 'firebase/auth';
import {
  Timestamp, collection, connectFirestoreEmulator, doc, getDoc, getFirestore, onSnapshot, serverTimestamp, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore';
import { FIRESTORE_EMULATOR, app, useEmulators } from './firebase.js';
import { content, coupleNames } from './content.js';
import { escapeHtml as esc, generateCode, inviteLink } from './codes.js';
import { parseInviteCsv } from './csv.js';
import { exportXlsx, replyLabel } from './export.js';

const $ = (id) => document.getElementById(id);
const auth = getAuth(app);
const db = getFirestore(app);
if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, ...FIRESTORE_EMULATOR);
}

let invites = new Map(); // code -> invite data
let rsvps = new Map(); // code -> rsvp data
let unsubs = [];
let editing = null; // code being edited, or null when adding

// ---------- Helpers ----------
let toastTimer;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function friendlyError(ex) {
  if (ex?.code === 'permission-denied') return 'Not allowed. Your account may not have admin access.';
  if (ex?.code === 'unavailable') return "Can't reach the database. Check your connection.";
  return ex?.message || 'Something went wrong. Try again.';
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
    return ok;
  }
}

const seatsText = (n) => `${n} ${n === 1 ? 'seat' : 'seats'}`;

function show(view) {
  for (const id of ['boot', 'login', 'dash']) $(id).hidden = id !== view;
}

// ---------- Auth ----------
$('login-names').textContent = coupleNames;
$('emu-note').hidden = !useEmulators;

onAuthStateChanged(auth, async (user) => {
  stopListening();
  if (!user) return show('login');

  let isAdmin = false;
  try {
    isAdmin = (await getDoc(doc(db, 'admins', user.uid))).exists();
  } catch { /* treated as not admin */ }

  if (!isAdmin) {
    await signOut(auth);
    $('l-err').textContent = `${user.email} isn't set up as an admin yet. Ask Kerwin to add it.`;
    return show('login');
  }
  $('who').textContent = user.email;
  show('dash');
  startListening();
  ensureConfig();
});

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('l-email').value.trim();
  const pass = $('l-pass').value;
  const err = $('l-err');
  if (!email || !pass) return void (err.textContent = 'Enter your email and password.');
  err.textContent = '';
  $('l-submit').disabled = true;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    $('l-pass').value = '';
  } catch (ex) {
    err.textContent = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(ex.code)
      ? 'That email and password don’t match. Try again.'
      : ex.code === 'auth/too-many-requests'
        ? 'Too many attempts. Wait a few minutes, then try again.'
        : friendlyError(ex);
  } finally {
    $('l-submit').disabled = false;
  }
});

$('signOut').addEventListener('click', () => signOut(auth));

// ---------- Live data ----------
function startListening() {
  const onErr = (ex) => toast(friendlyError(ex));
  unsubs = [
    onSnapshot(collection(db, 'invites'), (snap) => {
      invites = new Map(snap.docs.map((d) => [d.id, d.data()]));
      render();
    }, onErr),
    onSnapshot(collection(db, 'rsvps'), (snap) => {
      rsvps = new Map(snap.docs.map((d) => [d.id, d.data()]));
      render();
    }, onErr),
    onSnapshot(doc(db, 'config', 'site'), (snap) => showDeadline(snap.data()?.deadline?.toDate()), onErr),
  ];
}

function stopListening() {
  unsubs.forEach((u) => u());
  unsubs = [];
  invites = new Map();
  rsvps = new Map();
}

function guests() {
  return [...invites].map(([code, inv]) => ({ code, ...inv, rsvp: rsvps.get(code) || null }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const status = (g) => (!g.rsvp ? 'pending' : g.rsvp.attending ? 'yes' : 'no');

// ---------- Render ----------
function render() {
  const all = guests();
  const yes = all.filter((g) => status(g) === 'yes');
  $('st-invites').textContent = all.length;
  $('st-resp').textContent = all.filter((g) => g.rsvp).length;
  $('st-seats').textContent = yes.reduce((n, g) => n + (g.rsvp.seats || 0), 0);
  $('st-seats-of').textContent = `seats confirmed of ${all.reduce((n, g) => n + g.maxSeats, 0)} reserved`;
  $('st-no').textContent = all.filter((g) => status(g) === 'no').length;
  $('st-pending').textContent = all.filter((g) => status(g) === 'pending').length;
  $('st-unseated').textContent = yes.filter((g) => !g.table).length;

  const q = $('q').value.trim().toLowerCase();
  const f = $('filt').value;
  const rows = all.filter((g) => {
    const s = status(g);
    if (f === 'unseated' ? !(s === 'yes' && !g.table) : f !== 'all' && s !== f) return false;
    if (!q) return true;
    return [g.name, g.code, g.rsvp?.phone, g.table].some((v) => String(v || '').toLowerCase().includes(q));
  });

  $('count-line').textContent = rows.length === all.length
    ? `${all.length} invitations`
    : `Showing ${rows.length} of ${all.length} invitations`;

  const tb = $('rows');
  if (!all.length) {
    tb.innerHTML = '<tr><td colspan="7" class="muted empty-cell">No invitations yet. Add one, or import a CSV of your guest list.</td></tr>';
    return;
  }
  if (!rows.length) {
    tb.innerHTML = '<tr><td colspan="7" class="muted empty-cell">No guests match. Clear the search or change the filter.</td></tr>';
    return;
  }

  // Keep focus on a table input while live updates re-render.
  const active = document.activeElement?.dataset?.table;

  tb.innerHTML = rows.map((g) => {
    const s = status(g);
    const seats = s === 'yes' ? `${g.rsvp.seats} of ${g.maxSeats}` : s === 'no' ? '–' : `${g.maxSeats} reserved`;
    const tableCell = s === 'no'
      ? '–'
      : `<input class="table-in" data-table="${g.code}" value="${esc(g.table)}" maxlength="20" placeholder="None" aria-label="Table for ${esc(g.name)}">`;
    return `<tr>
      <td class="first">${esc(g.name)}<span class="code">${g.code}</span></td>
      <td data-label="Reply"><span class="tag ${s}">${replyLabel(g)}</span></td>
      <td data-label="Seats">${seats}</td>
      <td data-label="Table">${tableCell}</td>
      <td data-label="Mobile">${esc(g.rsvp?.phone || '–')}</td>
      <td data-label="Message" class="msg">${esc(g.rsvp?.message || '')}</td>
      <td class="acts-cell"><div class="acts">
        <button class="linkbtn small" data-copy="${g.code}">Copy link</button>
        <button class="linkbtn small" data-edit="${g.code}">Edit</button>
        <button class="linkbtn small danger" data-del="${g.code}">Delete</button>
      </div></td>
    </tr>`;
  }).join('');

  if (active) tb.querySelector(`[data-table="${active}"]`)?.focus();
}

$('q').addEventListener('input', render);
$('filt').addEventListener('change', render);

// Row actions
$('rows').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.copy) {
    const ok = await copyText(inviteLink(b.dataset.copy));
    toast(ok ? 'Link copied. Paste it into Messenger or Viber.' : 'Copy failed. The link is ' + inviteLink(b.dataset.copy));
  } else if (b.dataset.edit) openInvite(b.dataset.edit);
  else if (b.dataset.del) deleteInvite(b.dataset.del);
});

// Table assignment saves when the field loses focus or Enter is pressed.
$('rows').addEventListener('change', async (e) => {
  const code = e.target.dataset.table;
  if (!code) return;
  const table = e.target.value.trim().slice(0, 20);
  if (table === (invites.get(code)?.table || '')) return;
  try {
    await updateDoc(doc(db, 'invites', code), { table });
    toast(table ? `Table ${table} assigned` : 'Table removed');
  } catch (ex) {
    toast(friendlyError(ex));
  }
});
$('rows').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.dataset.table) e.target.blur();
});

async function deleteInvite(code) {
  const g = invites.get(code);
  if (!g) return;
  const extra = rsvps.has(code) ? ' Their reply will be deleted too.' : '';
  if (!confirm(`Delete the invitation for ${g.name}?${extra} Their link will stop working.`)) return;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'invites', code));
    batch.delete(doc(db, 'rsvps', code));
    await batch.commit();
    toast(`Deleted ${g.name}`);
  } catch (ex) {
    toast(friendlyError(ex));
  }
}

// ---------- Add / edit dialog ----------
const inviteDlg = $('inviteDlg');
for (const btn of document.querySelectorAll('[data-close]')) {
  btn.addEventListener('click', () => btn.closest('dialog').close());
}

$('addBtn').addEventListener('click', () => openInvite(null));

function openInvite(code) {
  editing = code;
  const inv = code ? invites.get(code) : null;
  const r = code ? rsvps.get(code) : null;
  $('inviteDlgTitle').textContent = code ? 'Edit invitation' : 'Add invitation';
  $('inv-code-line').hidden = !code;
  $('inv-code-line').textContent = code ? `Code ${code}` : '';
  $('inv-name').value = inv?.name || '';
  $('inv-seats').value = inv?.maxSeats || 1;
  $('inv-table').value = inv?.table || '';
  $('inv-reply-set').hidden = !code;
  $('inv-reply').value = !r ? 'pending' : r.attending ? 'yes' : 'no';
  $('inv-rseats').value = r?.attending ? r.seats : inv?.maxSeats || 1;
  $('inv-phone').value = r?.phone || '';
  $('inv-msg').value = r?.message || '';
  $('inv-err').textContent = '';
  syncReplyFields();
  inviteDlg.showModal();
  $('inv-name').focus();
}

function syncReplyFields() {
  const v = $('inv-reply').value;
  $('inv-reply-fields').hidden = v === 'pending';
  $('inv-msg').closest('label').hidden = v === 'pending';
  $('inv-rseats').closest('label').hidden = v !== 'yes';
}
$('inv-reply').addEventListener('change', syncReplyFields);

async function uniqueCode() {
  for (let i = 0; i < 5; i++) {
    const code = generateCode();
    if (!invites.has(code) && !(await getDoc(doc(db, 'invites', code))).exists()) return code;
  }
  throw new Error('Could not create a unique code. Try again.');
}

$('inviteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('inv-err');
  const name = $('inv-name').value.trim().replace(/\s+/g, ' ');
  const maxSeats = Number($('inv-seats').value);
  const table = $('inv-table').value.trim();
  if (!name) return void (err.textContent = 'Enter the name on the invitation.');
  if (!Number.isInteger(maxSeats) || maxSeats < 1 || maxSeats > 20) {
    return void (err.textContent = 'Seats reserved must be a whole number from 1 to 20.');
  }

  // Reply recorded by the couple (edit only)
  let reply;
  if (editing) {
    const v = $('inv-reply').value;
    const phone = $('inv-phone').value.trim();
    if (phone && !/^[0-9+() -]{1,20}$/.test(phone)) return void (err.textContent = 'Mobile can only have digits, spaces, +, and brackets.');
    if (v === 'yes') {
      const seats = Number($('inv-rseats').value);
      if (!Number.isInteger(seats) || seats < 1 || seats > maxSeats) {
        return void (err.textContent = `Seats attending must be from 1 to ${maxSeats}.`);
      }
      reply = { attending: true, seats, phone, message: $('inv-msg').value.trim() };
    } else if (v === 'no') {
      reply = { attending: false, seats: 0, phone, message: $('inv-msg').value.trim() };
    } else reply = null;
  }

  err.textContent = '';
  $('inv-save').disabled = true;
  try {
    if (!editing) {
      const code = await uniqueCode();
      await setDoc(doc(db, 'invites', code), { name, maxSeats, table, createdAt: serverTimestamp() });
      inviteDlg.close();
      const ok = await copyText(inviteLink(code));
      toast(ok ? `Added ${name}. Their link is copied.` : `Added ${name}.`);
    } else {
      const code = editing;
      const prev = rsvps.get(code);
      const writeReply = reply && replyChanged(prev, reply);
      // Don't leave a reply with more seats than the invitation allows.
      if (prev?.attending && prev.seats > maxSeats && reply?.attending && !writeReply) {
        throw new Error(`Their reply has ${seatsText(prev.seats)}. Lower the seats attending too, or keep at least ${prev.seats} seats reserved.`);
      }
      const batch = writeBatch(db);
      batch.update(doc(db, 'invites', code), { name, maxSeats, table });
      if (writeReply) batch.set(doc(db, 'rsvps', code), { ...reply, submittedAt: serverTimestamp() });
      if (!reply && prev) batch.delete(doc(db, 'rsvps', code));
      await batch.commit();
      inviteDlg.close();
      toast(`Saved ${name}`);
    }
  } catch (ex) {
    err.textContent = friendlyError(ex);
  } finally {
    $('inv-save').disabled = false;
  }
});

function replyChanged(prev, r) {
  return !prev || prev.attending !== r.attending || prev.seats !== r.seats || prev.phone !== r.phone || prev.message !== r.message;
}

// ---------- CSV import ----------
const importDlg = $('importDlg');
let parsed = [];

$('importBtn').addEventListener('click', () => {
  $('csv-file').value = '';
  $('csv-text').value = '';
  $('csv-err').textContent = '';
  parsed = [];
  previewCsv();
  importDlg.showModal();
});

$('csv-file').addEventListener('change', async () => {
  const file = $('csv-file').files[0];
  if (!file) return;
  if (file.size > 1_000_000) return void ($('csv-err').textContent = 'That file is too large. Use a CSV under 1 MB.');
  $('csv-text').value = await file.text();
  previewCsv();
});
$('csv-text').addEventListener('input', previewCsv);

function previewCsv() {
  const text = $('csv-text').value;
  parsed = text.trim() ? parseInviteCsv(text, [...invites.values()].map((i) => i.name)) : [];
  const ok = parsed.filter((r) => r.status === 'ok').length;
  const bad = parsed.filter((r) => r.status === 'bad').length;
  const skip = parsed.filter((r) => r.status === 'skip').length;
  $('csv-go').disabled = ok === 0;
  $('csv-go').textContent = ok ? `Import ${ok} ${ok === 1 ? 'invitation' : 'invitations'}` : 'Import';
  if (!parsed.length) return void ($('csv-preview').innerHTML = '');

  const summary = [`${ok} ready`, bad && `${bad} with problems (won't be imported)`, skip && `${skip} skipped`]
    .filter(Boolean).join(', ');
  $('csv-preview').innerHTML = `<p class="small" style="margin:0 0 8px">${summary}</p>
    <table><thead><tr><th>Row</th><th>Name</th><th>Seats</th><th></th></tr></thead><tbody>
    ${parsed.map((r) => `<tr class="${r.status}"><td>${r.line}</td><td>${esc(r.name)}</td><td>${esc(r.maxSeats)}</td><td>${esc(r.reason)}</td></tr>`).join('')}
    </tbody></table>`;
}

$('csv-go').addEventListener('click', async () => {
  const rows = parsed.filter((r) => r.status === 'ok');
  if (!rows.length) return;
  $('csv-go').disabled = true;
  $('csv-err').textContent = '';
  try {
    const used = new Set(invites.keys());
    // Firestore batches hold up to 500 writes.
    for (let i = 0; i < rows.length; i += 400) {
      const batch = writeBatch(db);
      for (const r of rows.slice(i, i + 400)) {
        let code;
        do code = generateCode(); while (used.has(code));
        used.add(code);
        batch.set(doc(db, 'invites', code), { name: r.name, maxSeats: r.maxSeats, table: '', createdAt: serverTimestamp() });
      }
      await batch.commit();
    }
    importDlg.close();
    toast(`Imported ${rows.length} ${rows.length === 1 ? 'invitation' : 'invitations'}`);
  } catch (ex) {
    $('csv-err').textContent = friendlyError(ex);
    $('csv-go').disabled = false;
  }
});

// ---------- Excel export ----------
$('exportBtn').addEventListener('click', async () => {
  const all = guests();
  if (!all.length) return toast('No guests to export yet.');
  $('exportBtn').disabled = true;
  try {
    const prefix = `${content.couple.first}-${content.couple.second}-guests`.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    await exportXlsx(all, prefix);
    toast('Excel file downloaded');
  } catch (ex) {
    toast(friendlyError(ex));
  } finally {
    $('exportBtn').disabled = false;
  }
});

// ---------- RSVP deadline ----------
const manila = (d) => d.toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).slice(0, 16).replace(' ', 'T');

function showDeadline(d) {
  if (!d) return void ($('deadline-label').textContent = 'not set');
  $('deadline-label').textContent = d.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short',
  }) + (d < new Date() ? ' (closed)' : '');
  if (document.activeElement !== $('deadline-input')) $('deadline-input').value = manila(d);
}

// The rules need config/site to accept RSVPs. Create it from content.js the first time.
async function ensureConfig() {
  try {
    const ref = doc(db, 'config', 'site');
    if ((await getDoc(ref)).exists()) return;
    await setDoc(ref, {
      deadline: Timestamp.fromDate(new Date(content.rsvpDeadline)),
      names: coupleNames,
      date: Timestamp.fromDate(new Date(content.ceremonyStart)),
      venues: content.venues.map((v) => ({ title: v.title, name: v.name, address: v.address })),
    });
  } catch (ex) {
    toast(friendlyError(ex));
  }
}

$('deadlineForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const v = $('deadline-input').value;
  if (!v) return toast('Choose a date and time.');
  const d = new Date(`${v}:00+08:00`);
  try {
    await updateDoc(doc(db, 'config', 'site'), { deadline: Timestamp.fromDate(d) });
    toast('Deadline saved');
  } catch (ex) {
    toast(friendlyError(ex));
  }
});
