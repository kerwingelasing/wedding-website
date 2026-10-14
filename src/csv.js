// Minimal RFC 4180 CSV parser: handles quotes, escaped quotes, commas and newlines inside quotes.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const s = String(text).replace(/^﻿/, ''); // Excel adds a BOM

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',' || ch === ';' || ch === '\t') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

const norm = (name) => name.toLowerCase().replace(/\s+/g, ' ').trim();

// Turns CSV text into invite rows with a status for the preview:
// ok, bad (with a reason), or skip (already on the list / repeated in the file).
export function parseInviteCsv(text, existingNames = []) {
  const rows = parseCsv(text);
  if (rows.length && /^\s*name\s*$/i.test(rows[0][0] || '')) rows.shift();

  const seen = new Set(existingNames.map(norm));
  return rows.map((r, i) => {
    const name = (r[0] || '').trim().replace(/\s+/g, ' ');
    const seatsRaw = (r[1] || '').trim();
    const maxSeats = Number(seatsRaw);
    const line = i + 1;
    if (!name) return { line, name, maxSeats: seatsRaw, status: 'bad', reason: 'Missing name' };
    if (name.length > 120) return { line, name, maxSeats: seatsRaw, status: 'bad', reason: 'Name is over 120 characters' };
    if (!Number.isInteger(maxSeats) || maxSeats < 1 || maxSeats > 20) {
      return { line, name, maxSeats: seatsRaw, status: 'bad', reason: 'Seats must be a whole number from 1 to 20' };
    }
    if (seen.has(norm(name))) return { line, name, maxSeats, status: 'skip', reason: 'Already on the list' };
    seen.add(norm(name));
    return { line, name, maxSeats, status: 'ok', reason: '' };
  });
}
