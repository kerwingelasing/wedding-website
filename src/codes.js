// Invite codes: 8 characters with no look-alikes (no 0/O, 1/I/L).
// Keep this alphabet in sync with the pattern in firestore.rules.
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_PATTERN = /^[A-HJKMNP-Z2-9]{6,8}$/;

export function generateCode(length = 8) {
  const out = [];
  const bytes = new Uint8Array(length * 2);
  while (out.length < length) {
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      // Reject values that would bias the modulo.
      if (b < 248 && out.length < length) out.push(CODE_ALPHABET[b % CODE_ALPHABET.length]);
    }
  }
  return out.join('');
}

// Guests may type lowercase, spaces, or dashes.
export function normalizeCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[\s-]/g, '');
}

export function inviteLink(code, origin = location.origin) {
  return `${origin}/?code=${code}`;
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
