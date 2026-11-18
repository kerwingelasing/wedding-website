// Renders the 1200 x 630 link-preview image (og:image) for Messenger, Viber and Facebook.
// They need a PNG, so this runs at build time: Satori lays out the card (fonts from @fontsource),
// resvg turns it into a PNG. Each site look gets its own background, matching the hero.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);
const font = (pkg, file) => readFileSync(require.resolve(`@fontsource/${pkg}/files/${file}`));

const FONTS = [
  { name: 'Bodoni Moda', data: font('bodoni-moda', 'bodoni-moda-latin-400-italic.woff'), weight: 400, style: 'italic' },
  { name: 'Bodoni Moda', data: font('bodoni-moda', 'bodoni-moda-latin-400-normal.woff'), weight: 400, style: 'normal' },
  { name: 'Figtree', data: font('figtree', 'figtree-latin-400-normal.woff'), weight: 400, style: 'normal' },
  { name: 'Figtree', data: font('figtree', 'figtree-latin-500-normal.woff'), weight: 500, style: 'normal' },
];

const W = 1200, H = 630;

// Same colors as styles.css (blush) and looks.css (golden, garden), light mode.
const LOOKS = {
  blush: { ink: '#3A2A2C', muted: '#7A6466', gold: '#B08A4F' },
  golden: { ink: '#3B2E2A', muted: '#7C6658', gold: '#B4823F' },
  garden: { ink: '#1E3B30', muted: '#5C6B62', gold: '#9C7A43' },
};

// A fixed scatter, so the image is the same on every build.
const PETALS = [[70, 90, 20, 30], [150, 520, 16, 110], [1080, 120, 18, 60], [1130, 470, 22, 150], [90, 330, 12, 80],
  [980, 560, 14, 20], [1020, 300, 12, 130], [110, 230, 10, 170]];
const SPARKLES = [[60, 380], [200, 120], [300, 560], [130, 600], [1000, 80], [1150, 300], [900, 590], [1110, 220], [260, 460], [950, 430]];

function background(look) {
  if (look === 'golden') {
    return `<defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#F7D8C3"/><stop offset=".45" stop-color="#F9E6D3"/><stop offset=".75" stop-color="#FBF1E4"/><stop offset="1" stop-color="#F2EAD8"/>
        </linearGradient>
        <radialGradient id="sun" cx=".5" cy=".42" r=".45">
          <stop offset="0" stop-color="#FFE2B4" stop-opacity=".95"/><stop offset=".4" stop-color="#FFD6AA" stop-opacity=".45"/><stop offset="1" stop-color="#FFD6AA" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#sky)"/>
      <rect width="${W}" height="${H}" fill="url(#sun)"/>
      <g transform="translate(0 ${H - 140}) scale(4 1)">
        <path d="M0 70 C 40 60, 70 66, 110 58 S 190 50, 230 60 S 280 62, 300 56 L300 150 L0 150 Z" fill="#E8C9AE" transform="translate(0 -10)"/>
        <path d="M0 96 L300 96 L300 150 L0 150 Z" fill="#D9C7B0" transform="translate(0 -10)"/>
        <path d="M128 98 C 138 84, 146 78, 152 77 C 158 78, 166 85, 176 98 Z" fill="#C9A98A" transform="translate(0 -10)"/>
        <path d="M0 112 C 60 104, 110 116, 170 108 S 260 104, 300 110 L300 150 L0 150 Z" fill="#9FAF97" transform="translate(0 -10)"/>
      </g>`;
  }
  if (look === 'garden') {
    const bloom = (x, y, r) => {
      let p = '';
      for (let i = 0; i < 5; i++) p += `<ellipse cx="0" cy="${-r * 0.55}" rx="${r * 0.42}" ry="${r * 0.6}" transform="rotate(${i * 72})" fill="#fff" stroke="#9C7A43" stroke-opacity=".5" stroke-width="1"/>`;
      return `<g transform="translate(${x} ${y})">${p}<circle r="${r * 0.18}" fill="#9C7A43"/></g>`;
    };
    const leaf = (x, y, a) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="24" transform="rotate(${a} ${x} ${y})" fill="#4F6F5B" fill-opacity=".6"/>`;
    const cluster = (dx, flip) => `<g transform="translate(${dx} 0) scale(${flip} 1)">
        ${leaf(20, 600, -60)}${leaf(55, 560, -25)}${leaf(95, 600, 20)}${leaf(14, 520, -80)}${leaf(110, 545, 45)}
        ${bloom(45, 585, 20)}${bloom(85, 618, 15)}${bloom(22, 540, 13)}${bloom(115, 575, 13)}</g>`;
    return `<defs>
        <radialGradient id="glow" cx=".5" cy=".45" r=".5"><stop offset="0" stop-color="#FFFDF8"/><stop offset="1" stop-color="#FFFDF8" stop-opacity="0"/></radialGradient>
        <radialGradient id="sage" cx=".5" cy="1.1" r=".7"><stop offset="0" stop-color="#E3EADF"/><stop offset="1" stop-color="#E3EADF" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="#F5F3EC"/>
      <rect width="${W}" height="${H}" fill="url(#sage)"/>
      <rect width="${W}" height="${H}" fill="url(#glow)"/>
      <path d="M260 ${H} L260 290 A340 340 0 0 1 940 290 L940 ${H}" fill="none" stroke="#9C7A43" stroke-width="2" opacity=".7"/>
      <path d="M276 ${H} L276 292 A324 324 0 0 1 924 292 L924 ${H}" fill="none" stroke="#9C7A43" stroke-width="1.2" opacity=".4"/>
      ${cluster(170, 1)}${cluster(1030, -1)}`;
  }
  // blush
  const petals = PETALS.map(([x, y, s, r]) => `<ellipse cx="${x}" cy="${y}" rx="${s}" ry="${s * 0.7}" transform="rotate(${r} ${x} ${y})" fill="#E7B7B1" fill-opacity=".6"/>`).join('');
  const sparkles = SPARKLES.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${2 + (i % 3)}" fill="#C9A15E" fill-opacity=".75"/>`).join('');
  return `<defs>
      <radialGradient id="b1" cx=".08" cy="0" r=".6"><stop offset="0" stop-color="#F3D6D2"/><stop offset="1" stop-color="#F3D6D2" stop-opacity="0"/></radialGradient>
      <radialGradient id="b2" cx="1" cy=".15" r=".6"><stop offset="0" stop-color="#EFDDBF"/><stop offset="1" stop-color="#EFDDBF" stop-opacity="0"/></radialGradient>
      <radialGradient id="b3" cx=".5" cy="1.1" r=".6"><stop offset="0" stop-color="#F2D9D5"/><stop offset="1" stop-color="#F2D9D5" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="#FBF6EF"/>
    <rect width="${W}" height="${H}" fill="url(#b1)"/><rect width="${W}" height="${H}" fill="url(#b2)"/><rect width="${W}" height="${H}" fill="url(#b3)"/>
    ${petals}${sparkles}`;
}

const el = (type, style, children) => ({ type, props: { style, children } });

export async function renderOgImage({ first, second, dateText, place, look = 'blush' }) {
  const c = LOOKS[look] || LOOKS.blush;
  const bg = `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${background(look)}</svg>`,
  ).toString('base64')}`;

  // Long names shrink so "First & Second" always fits on one line.
  const nameSize = Math.round(Math.min(124, 1900 / Math.max(8, (first + second).length + 2)));
  const line = el('div', { width: 90, height: 2, background: c.gold, opacity: 0.6 });

  const card = el('div', {
    width: W, height: H, display: 'flex', position: 'relative', alignItems: 'center', justifyContent: 'center',
  }, [
    { type: 'img', props: { src: bg, width: W, height: H, style: { position: 'absolute', top: 0, left: 0 } } },
    el('div', { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: look === 'garden' ? 70 : 0 }, [
      el('div', { fontFamily: 'Figtree', fontSize: 30, color: c.muted, marginBottom: 6 }, "You're invited to the wedding of"),
      el('div', { display: 'flex', alignItems: 'baseline', fontFamily: 'Bodoni Moda', fontStyle: 'italic', fontSize: nameSize, color: c.ink }, [
        el('span', {}, first),
        el('span', { color: c.gold, fontSize: nameSize * 0.6, margin: `0 ${Math.round(nameSize * 0.22)}px` }, '&'),
        el('span', {}, second),
      ]),
      el('div', { display: 'flex', alignItems: 'center', margin: '18px 0 22px' }, [
        line,
        el('div', { width: 10, height: 10, background: c.gold, transform: 'rotate(45deg)', margin: '0 16px' }),
        line,
      ]),
      el('div', { fontFamily: 'Bodoni Moda', fontSize: 42, color: c.ink }, dateText),
      el('div', { fontFamily: 'Figtree', fontSize: 30, color: c.muted, marginTop: 8 }, place),
    ]),
  ]);

  const svg = await satori(card, { width: W, height: H, fonts: FONTS });
  return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
}
