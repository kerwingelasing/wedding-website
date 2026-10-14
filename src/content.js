// All wedding details live here. Swap the placeholders for the real couple's details.
// Times are Philippine time (+08:00).

export const content = {
  couple: { first: 'Paolo', second: 'Bea', monogram: 'P & B' },
  invitationLine: 'Together with our families, we invite you to celebrate the wedding of',
  dateLabel: 'Saturday, February 13, 2027',
  ceremonyStart: '2027-02-13T15:00:00+08:00',
  place: 'Tagaytay City, Cavite',
  signoff: 'See you in Tagaytay',

  // Last moment guests can submit or change their RSVP.
  rsvpDeadline: '2027-01-10T23:59:59+08:00',
  rsvpDeadlineLabel: 'January 10, 2027',
  rsvpButtonLabel: 'RSVP by January 10',
  thanksLine: 'See you on February 13!',

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
    ['2:30 PM', 'Guests arrive at the church'],
    ['3:00 PM', 'Holy Mass and wedding ceremony'],
    ['4:30 PM', 'Photos with family and the entourage'],
    ['6:00 PM', 'Cocktails at Casa Verde Gardens'],
    ['7:00 PM', 'Dinner, toasts, and the money dance'],
    ['9:00 PM', 'Dancing until the coffee runs out'],
  ],

  principalSponsors: [
    ['Mr. Ramon Villanueva', 'Mrs. Teresita Villanueva'],
    ['Mr. Eduardo Santos', 'Mrs. Liza Santos'],
    ['Atty. Jose Mercado', 'Dr. Carmela Reyes'],
    ['Engr. Antonio Cruz', 'Mrs. Gloria Dizon'],
  ],
  secondarySponsors: [
    ['Candle', 'Miguel Ramos & Trisha Lim'],
    ['Veil', 'Carlo Bautista & Jenny Ocampo'],
    ['Cord', 'Nico Valdez & Pia Fernandez'],
  ],
  weddingParty: [
    ['Best man', 'Jerome Garcia'],
    ['Maid of honor', 'Kristine Aquino'],
    ['Ring bearer', 'Lucas Garcia'],
    ['Coin bearer', 'Ethan Reyes'],
    ['Bible bearer', 'Gabriel Cruz'],
    ['Flower girls', 'Sofia Lim & Ella Ramos'],
  ],

  attire:
    'Formal garden attire in our motif colors. Ladies in long or midi dresses, gentlemen in barong or a long-sleeved polo. The reception is on grass, so block heels will thank you later.',
  attireNote: 'Please leave white for the bride.',
  swatches: [
    ['Sage', '#8FA88F'],
    ['Fern', '#4F6F5B'],
    ['Champagne', '#E6D8BD'],
    ['Ivory', '#F4F1E6'],
  ],
  gifts:
    "Your presence is the best gift. If you'd like to give something, a monetary gift will help us start our home together.",

  faq: [
    ['Can I bring a plus-one?', "We've planned seats carefully, so we can only accommodate the guests named on your invitation."],
    ['Are kids welcome?', 'We love your little ones, but the reception is adults-only, except for children in the entourage.'],
    ['Is there parking?', 'Yes, both the church and Casa Verde Gardens have free parking. Shuttle service from the church to the reception is available.'],
    ['Can we take photos during the Mass?', 'Please keep phones away during the ceremony. Our photographers will share the photos with everyone after the wedding.'],
  ],
};

export const coupleNames = `${content.couple.first} & ${content.couple.second}`;

export function mapsUrl(venue) {
  const q = encodeURIComponent(`${venue.name}, ${venue.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
