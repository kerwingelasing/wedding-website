// Fills the local emulators with sample data. Never touches production:
// it always targets the emulator hosts and the demo-wedding project.
//
//   npm run emulators   (in one terminal)
//   npm run seed        (in another)
//
// Local admin login: admin@example.com / local-admin-pass (emulator only).
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { content } from '../src/content.js';

const ADMIN = { email: 'admin@example.com', password: 'local-admin-pass' };

initializeApp({ projectId: 'demo-wedding' });
const auth = getAuth();
const db = getFirestore();

// [code, name, maxSeats, table, reply]  reply: [attending, seats, phone, message] or null for pending
const guests = [
  ['7KQ4MXRP', 'Maria Santos', 2, '3', [true, 2, '0917 555 0142', 'So happy for you both!']],
  ['JDC2RUZ9', 'Jun Dela Cruz', 1, '', [true, 1, '0918 555 0199', '']],
  ['ANGR3YES', 'Angela Reyes', 1, '', [false, 0, '0927 555 0110', "Sorry I'll be abroad. Congrats!"]],
  ['TANFAM22', 'Rico & Lea Tan', 2, '5', [true, 2, '0995 555 0183', 'See you in Tagaytay!']],
  ['BABYV222', 'Tita Baby Villanueva', 2, '1', [true, 2, '0920 555 0127', 'God bless your marriage.']],
  ['MARK6GZS', 'Mark Gonzales', 1, '', [true, 1, '0906 555 0164', '']],
  ['PENDNG42', 'Carlos & Nina Pascual', 3, '', null],
  ['HUSAYFAM', 'Husay Family', 4, '', null],
];

let user;
try {
  user = await auth.getUserByEmail(ADMIN.email);
} catch {
  user = await auth.createUser(ADMIN);
}

const batch = db.batch();
batch.set(db.doc(`admins/${user.uid}`), { email: ADMIN.email });
batch.set(db.doc('config/site'), {
  deadline: Timestamp.fromDate(new Date(content.rsvpDeadline)),
  names: `${content.couple.first} & ${content.couple.second}`,
  date: Timestamp.fromDate(new Date(content.ceremonyStart)),
  venues: content.venues.map((v) => ({ title: v.title, name: v.name, address: v.address })),
});
for (const [code, name, maxSeats, table, reply] of guests) {
  batch.set(db.doc(`invites/${code}`), { name, maxSeats, table, createdAt: FieldValue.serverTimestamp() });
  if (reply) {
    const [attending, seats, phone, message] = reply;
    batch.set(db.doc(`rsvps/${code}`), { attending, seats, phone, message, submittedAt: FieldValue.serverTimestamp() });
  }
}
await batch.commit();

console.log(`Seeded ${guests.length} invites, admin ${ADMIN.email} (uid ${user.uid}).`);
console.log('Try a guest link: http://localhost:5173/?code=PENDNG42');
