// Security rules tests. Run with: npm run test:rules (starts the Firestore emulator).
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, test } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  Timestamp, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc,
} from 'firebase/firestore';

const CODE = 'ABCD2345';
const ONE_SEAT = 'WXYZ6789';
const DAY = 864e5;

let env;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-wedding',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(() => env?.cleanup());

async function seed({ deadline = new Date(Date.now() + 30 * DAY) } = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'invites', CODE), { name: 'Maria Santos', maxSeats: 2, table: '', createdAt: Timestamp.now() });
    await setDoc(doc(db, 'invites', ONE_SEAT), { name: 'Jun Dela Cruz', maxSeats: 1, table: '3', createdAt: Timestamp.now() });
    await setDoc(doc(db, 'rsvps', ONE_SEAT), { attending: true, seats: 1, phone: '0918', message: '', submittedAt: Timestamp.now() });
    await setDoc(doc(db, 'admins', 'admin1'), { email: 'admin@example.com' });
    await setDoc(doc(db, 'config', 'site'), { deadline: Timestamp.fromDate(deadline) });
  });
}

beforeEach(async () => {
  await env.clearFirestore();
  await seed();
});

const guest = () => env.unauthenticatedContext().firestore();
const stranger = () => env.authenticatedContext('stranger').firestore();
const admin = () => env.authenticatedContext('admin1').firestore();

const rsvp = (over = {}) => ({
  attending: true, seats: 2, phone: '0917 555 0142', message: 'So happy for you!', submittedAt: serverTimestamp(), ...over,
});
const invite = (over = {}) => ({ name: 'Rico & Lea Tan', maxSeats: 2, table: '', createdAt: serverTimestamp(), ...over });

describe('invites', () => {
  test('guest can get an invite by code', () => assertSucceeds(getDoc(doc(guest(), 'invites', CODE))));
  test('guest gets "not found" for an unknown code (no error)', () => assertSucceeds(getDoc(doc(guest(), 'invites', 'ZZZZ2222'))));
  test('guest cannot list invites', () => assertFails(getDocs(collection(guest(), 'invites'))));
  test('signed-in non-admin cannot list invites', () => assertFails(getDocs(collection(stranger(), 'invites'))));
  test('guest cannot create an invite', () => assertFails(setDoc(doc(guest(), 'invites', 'NEWC2345'), invite())));
  test('guest cannot raise their own seat count', () => assertFails(updateDoc(doc(guest(), 'invites', CODE), { maxSeats: 10 })));
  test('guest cannot delete an invite', () => assertFails(deleteDoc(doc(guest(), 'invites', CODE))));
  test('non-admin cannot create an invite', () => assertFails(setDoc(doc(stranger(), 'invites', 'NEWC2345'), invite())));

  test('admin can list invites', () => assertSucceeds(getDocs(collection(admin(), 'invites'))));
  test('admin can create a valid invite', () => assertSucceeds(setDoc(doc(admin(), 'invites', 'NEWC2345'), invite())));
  test('admin can assign a table', () => assertSucceeds(updateDoc(doc(admin(), 'invites', CODE), { table: '5' })));
  test('admin can delete an invite', () => assertSucceeds(deleteDoc(doc(admin(), 'invites', CODE))));
  test('admin cannot use a code with ambiguous characters', () => assertFails(setDoc(doc(admin(), 'invites', 'ABCO1234'), invite())));
  test('admin cannot set maxSeats to 0', () => assertFails(setDoc(doc(admin(), 'invites', 'NEWC2345'), invite({ maxSeats: 0 }))));
  test('admin cannot set maxSeats as a string', () => assertFails(setDoc(doc(admin(), 'invites', 'NEWC2345'), invite({ maxSeats: '2' }))));
  test('admin cannot add unknown fields', () => assertFails(setDoc(doc(admin(), 'invites', 'NEWC2345'), invite({ vip: true }))));
  test('admin cannot leave the name empty', () => assertFails(setDoc(doc(admin(), 'invites', 'NEWC2345'), invite({ name: '' }))));
});

describe('rsvps: guest writes', () => {
  test('guest can RSVP attending within maxSeats', () => assertSucceeds(setDoc(doc(guest(), 'rsvps', CODE), rsvp())));
  test('guest can RSVP declining with 0 seats', () => assertSucceeds(setDoc(doc(guest(), 'rsvps', CODE), rsvp({ attending: false, seats: 0, phone: '' }))));
  test('guest can update an existing RSVP', async () => {
    await assertSucceeds(setDoc(doc(guest(), 'rsvps', CODE), rsvp()));
    await assertSucceeds(setDoc(doc(guest(), 'rsvps', CODE), rsvp({ seats: 1, message: 'Changed plans' })));
  });

  test('more seats than maxSeats is denied', () => assertFails(setDoc(doc(guest(), 'rsvps', CODE), rsvp({ seats: 3 }))));
  test('attending with 0 seats is denied', () => assertFails(setDoc(doc(guest(), 'rsvps', CODE), rsvp({ seats: 0 }))));
  test('negative seats is denied', () => assertFails(setDoc(doc(guest(), 'rsvps', CODE), rsvp({ seats: -1 }))));
  test('declining with seats is denied', () => assertFails(setDoc(doc(guest(), 'rsvps', CODE), rsvp({ attending: false, seats: 2 }))));
  test('fractional seats are denied', () => assertFails(setDoc(doc(guest(), 'rsvps', CODE), rsvp({ seats: 1.5 }))));
  test('RSVP for a code with no invite is denied', () => assertFails(setDoc(doc(guest(), 'rsvps', 'ZZZZ2222'), rsvp())));
  test('extra fields are denied', () => assertFails(setDoc(doc(guest(), 'rsvps', CODE), rsvp({ table: '1' }))));
  test('missing fields are denied', () => {
    const { message, ...partial } = rsvp();
    return assertFails(setDoc(doc(guest(), 'rsvps', CODE), partial));
  });
  test('attending as a string is denied', () => assertFails(setDoc(doc(guest(), 'rsvps', CODE), rsvp({ attending: 'yes' }))));
  test('seats as a string is denied', () => assertFails(setDoc(doc(guest(), 'rsvps', CODE), rsvp({ seats: '2' }))));
  test('phone over 20 characters is denied', () => assertFails(setDoc(doc(guest(), 'rsvps', CODE), rsvp({ phone: '0'.repeat(21) }))));
  test('phone with letters is denied', () => assertFails(setDoc(doc(guest(), 'rsvps', CODE), rsvp({ phone: '<script>' }))));
  test('message of 500 characters is allowed', () => assertSucceeds(setDoc(doc(guest(), 'rsvps', CODE), rsvp({ message: 'a'.repeat(500) }))));
  test('message over 500 characters is denied', () => assertFails(setDoc(doc(guest(), 'rsvps', CODE), rsvp({ message: 'a'.repeat(501) }))));
  test('client-chosen submittedAt is denied', () => assertFails(setDoc(doc(guest(), 'rsvps', CODE), rsvp({ submittedAt: Timestamp.now() }))));

  test('RSVP after the deadline is denied', async () => {
    await seed({ deadline: new Date(Date.now() - DAY) });
    await assertFails(setDoc(doc(guest(), 'rsvps', CODE), rsvp()));
  });
  test('RSVP is denied when config/site is missing', async () => {
    await env.withSecurityRulesDisabled((ctx) => deleteDoc(doc(ctx.firestore(), 'config', 'site')));
    await assertFails(setDoc(doc(guest(), 'rsvps', CODE), rsvp()));
  });
});

describe('rsvps: privacy', () => {
  test('guest cannot read an RSVP, even their own', () => assertFails(getDoc(doc(guest(), 'rsvps', ONE_SEAT))));
  test('guest cannot list RSVPs', () => assertFails(getDocs(collection(guest(), 'rsvps'))));
  test('signed-in non-admin cannot list RSVPs', () => assertFails(getDocs(collection(stranger(), 'rsvps'))));
  test('guest cannot delete an RSVP', () => assertFails(deleteDoc(doc(guest(), 'rsvps', ONE_SEAT))));
  test('admin can list RSVPs', () => assertSucceeds(getDocs(collection(admin(), 'rsvps'))));
  test('admin can delete an RSVP', () => assertSucceeds(deleteDoc(doc(admin(), 'rsvps', ONE_SEAT))));
});

describe('rsvps: admin writes', () => {
  test('admin can record a reply after the deadline', async () => {
    await seed({ deadline: new Date(Date.now() - DAY) });
    await assertSucceeds(setDoc(doc(admin(), 'rsvps', CODE), rsvp()));
  });
  test('admin is still held to maxSeats', () => assertFails(setDoc(doc(admin(), 'rsvps', CODE), rsvp({ seats: 3 }))));
});

describe('admins', () => {
  test('signed-in user can check their own admin doc', () => assertSucceeds(getDoc(doc(stranger(), 'admins', 'stranger'))));
  test("signed-in user cannot read someone else's admin doc", () => assertFails(getDoc(doc(stranger(), 'admins', 'admin1'))));
  test('signed-in user cannot make themselves an admin', () => assertFails(setDoc(doc(stranger(), 'admins', 'stranger'), {})));
  test('guest cannot list admins', () => assertFails(getDocs(collection(guest(), 'admins'))));
  test('admin can add another admin', () => assertSucceeds(setDoc(doc(admin(), 'admins', 'admin2'), {})));
});

describe('config', () => {
  test('anyone can read config/site', () => assertSucceeds(getDoc(doc(guest(), 'config', 'site'))));
  test('guest cannot move the deadline', () => assertFails(setDoc(doc(guest(), 'config', 'site'), { deadline: Timestamp.now() })));
  test('non-admin cannot move the deadline', () => assertFails(setDoc(doc(stranger(), 'config', 'site'), { deadline: Timestamp.now() })));
  test('admin can move the deadline', () => assertSucceeds(updateDoc(doc(admin(), 'config', 'site'), { deadline: Timestamp.now() })));
  test('admin cannot set a non-date deadline', () => assertFails(setDoc(doc(admin(), 'config', 'site'), { deadline: 'Jan 10' })));
});
