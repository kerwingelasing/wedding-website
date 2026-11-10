// Site looks the couple can switch between on the dashboard. Saved as config/site.theme.
// Keep the ids in step with firestore.rules; the styles live in styles.css (blush, the default)
// and looks.css (golden, garden).
export const LOOKS = [
  {
    id: 'blush',
    name: 'Champagne and blush',
    desc: 'Warm ivory with blush and champagne glows, drifting petals and gold sparkles.',
    swatches: ['#FBF6EF', '#F3D6D2', '#B08A4F', '#3A2A2C'],
  },
  {
    id: 'golden',
    name: 'Golden hour over Taal',
    desc: 'A Tagaytay sunset sky with Taal Lake and the volcano along the bottom. Starry dusk in dark mode.',
    swatches: ['#F7D8C3', '#FBF1E4', '#B4823F', '#3B2E2A'],
  },
  {
    id: 'garden',
    name: 'Garden arch',
    desc: 'Sage and ivory with a fine gold arch around the names and white blooms at its base.',
    swatches: ['#F5F3EC', '#E3EADF', '#9C7A43', '#1E3B30'],
  },
];

export const DEFAULT_LOOK = 'blush';
export const isLook = (id) => LOOKS.some((l) => l.id === id);

export function applyLook(id) {
  document.documentElement.dataset.look = isLook(id) ? id : DEFAULT_LOOK;
}
