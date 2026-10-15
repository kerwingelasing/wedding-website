// Default wedding details. The couple edits the live copy from the dashboard (Wedding details),
// which is saved to Firestore at config/content. These defaults are used until that doc exists,
// and for the link-preview title baked into the HTML at build time (see vite.config.js).
// Lists are arrays of objects, not arrays of arrays: Firestore can't store nested arrays.
// Times are Philippine time (+08:00).

export const content = {
  couple: { first: 'Paolo', second: 'Bea', monogram: 'P & B' },
  invitationLine: 'Together with our families, we invite you to celebrate the wedding of',
  ceremonyStart: '2027-02-13T15:00:00+08:00',
  place: 'Tagaytay City, Cavite',
  signoff: 'See you in Tagaytay',

  // First RSVP deadline. After that the deadline lives in config/site and is edited on the dashboard.
  rsvpDeadline: '2027-01-10T23:59:59+08:00',

  // Shown when a guest's code doesn't work.
  contact: { name: 'Bea', phone: '0917 000 0000', email: 'paoloandbea@example.com' },

  story: [
    "We met in 2019 at a friend's despedida in Quezon City, both of us stuck by the door because the sala was too full. Paolo offered Bea the last piece of leche flan. She still says that's when she knew.",
    "Six years, two cities, and one very nervous proposal on a ferry to Batangas later, we're getting married. We'd love for you to be there.",
  ],

  venues: [
    {
      title: 'Holy Mass',
      time: '3:00 in the afternoon',
      name: 'San Isidro Labrador Parish',
      address: 'Aguinaldo Highway, Tagaytay City',
    },
    {
      title: 'Reception',
      time: '6:00 in the evening',
      name: 'Casa Verde Gardens',
      address: 'Tagaytay–Nasugbu Road, Tagaytay City',
    },
  ],

  program: [
    { time: '2:30 PM', what: 'Guests arrive at the church' },
    { time: '3:00 PM', what: 'Holy Mass and wedding ceremony' },
    { time: '4:30 PM', what: 'Photos with family and the entourage' },
    { time: '6:00 PM', what: 'Cocktails at Casa Verde Gardens' },
    { time: '7:00 PM', what: 'Dinner, toasts, and the money dance' },
    { time: '9:00 PM', what: 'Dancing until the coffee runs out' },
  ],

  principalSponsors: [
    { a: 'Mr. Ramon Villanueva', b: 'Mrs. Teresita Villanueva' },
    { a: 'Mr. Eduardo Santos', b: 'Mrs. Liza Santos' },
    { a: 'Atty. Jose Mercado', b: 'Dr. Carmela Reyes' },
    { a: 'Engr. Antonio Cruz', b: 'Mrs. Gloria Dizon' },
  ],
  secondarySponsors: [
    { role: 'Candle', who: 'Miguel Ramos & Trisha Lim' },
    { role: 'Veil', who: 'Carlo Bautista & Jenny Ocampo' },
    { role: 'Cord', who: 'Nico Valdez & Pia Fernandez' },
  ],
  weddingParty: [
    { role: 'Best man', who: 'Jerome Garcia' },
    { role: 'Maid of honor', who: 'Kristine Aquino' },
    { role: 'Ring bearer', who: 'Lucas Garcia' },
    { role: 'Coin bearer', who: 'Ethan Reyes' },
    { role: 'Bible bearer', who: 'Gabriel Cruz' },
    { role: 'Flower girls', who: 'Sofia Lim & Ella Ramos' },
  ],

  attire:
    'Formal garden attire in our motif colors. Ladies in long or midi dresses, gentlemen in barong or a long-sleeved polo. The reception is on grass, so block heels will thank you later.',
  attireNote: 'Please leave white for the bride.',
  swatches: [
    { name: 'Sage', hex: '#8FA88F' },
    { name: 'Fern', hex: '#4F6F5B' },
    { name: 'Champagne', hex: '#E6D8BD' },
    { name: 'Ivory', hex: '#F4F1E6' },
  ],
  gifts:
    "Your presence is the best gift. If you'd like to give something, a monetary gift will help us start our home together.",

  faq: [
    { q: 'Can I bring a plus-one?', a: "We've planned seats carefully, so we can only accommodate the guests named on your invitation." },
    { q: 'Are kids welcome?', a: 'We love your little ones, but the reception is adults-only, except for children in the entourage.' },
    { q: 'Is there parking?', a: 'Yes, both the church and Casa Verde Gardens have free parking. Shuttle service from the church to the reception is available.' },
    { q: 'Can we take photos during the Mass?', a: 'Please keep phones away during the ceremony. Our photographers will share the photos with everyone after the wedding.' },
  ],
};

// Fields the couple can edit (everything except the first RSVP deadline).
export const EDITABLE_KEYS = Object.keys(content).filter((k) => k !== 'rsvpDeadline');

// Saved content over the defaults, so a doc missing a newer field still renders.
export function mergeContent(saved) {
  const out = structuredClone(content);
  if (!saved || typeof saved !== 'object') return out;
  for (const k of EDITABLE_KEYS) {
    if (saved[k] === undefined) continue;
    out[k] = k === 'couple' || k === 'contact' ? { ...out[k], ...saved[k] } : saved[k];
  }
  return out;
}

export const namesOf = (c) => `${c.couple.first} & ${c.couple.second}`;
export const coupleNames = namesOf(content);

// Dates shown to guests are derived from the real dates, so they can't drift apart.
const MANILA = 'Asia/Manila';
export const longDate = (d) => new Date(d).toLocaleDateString('en-US', {
  timeZone: MANILA, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
});
export const fullDate = (d) => new Date(d).toLocaleDateString('en-US', {
  timeZone: MANILA, month: 'long', day: 'numeric', year: 'numeric',
});
export const monthDay = (d) => new Date(d).toLocaleDateString('en-US', {
  timeZone: MANILA, month: 'long', day: 'numeric',
});

export const isHex = (s) => /^#[0-9a-f]{6}$/i.test(String(s));

export function mapsUrl(venue) {
  const q = encodeURIComponent(`${venue.name}, ${venue.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
