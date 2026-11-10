import { escapeHtml as esc } from './codes.js';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

const NS = 'http://www.w3.org/2000/svg';
const f1 = (n) => n.toFixed(1);

// A fern frond: a gently curving stem with paired leaflets that taper toward the tip.
// Coordinates are in the SVG's viewBox; tone is f1 (front), f2 (middle), or f3 (back).
function fern(svg, { x, y, angle, length, bend = 0.5, leaf = 1, tone = 'f1' }) {
  const steps = 26;
  let px = x, py = y, a = angle, stem = `M${f1(x)} ${f1(y)}`, leaves = '';
  for (let i = 1; i <= steps; i++) {
    a += bend / steps;
    px += Math.cos(a) * length / steps;
    py += Math.sin(a) * length / steps;
    stem += ` L${f1(px)} ${f1(py)}`;
    const size = (7 + 27 * Math.sin(Math.PI * Math.min(1, 0.25 + 0.85 * (1 - i / (steps + 1))) / 2)) * leaf;
    for (const side of [-1, 1]) {
      const d = a + side * 0.95;
      const tip = [px + Math.cos(d) * size, py + Math.sin(d) * size];
      const c1 = [px + Math.cos(d - side * 0.5) * size * 0.66, py + Math.sin(d - side * 0.5) * size * 0.66];
      const c2 = [px + Math.cos(d + side * 0.42) * size * 0.66, py + Math.sin(d + side * 0.42) * size * 0.66];
      leaves += `M${f1(px)} ${f1(py)}Q${f1(c1[0])} ${f1(c1[1])} ${f1(tip[0])} ${f1(tip[1])}Q${f1(c2[0])} ${f1(c2[1])} ${f1(px)} ${f1(py)}Z`;
    }
  }
  for (const [d, cls] of [[stem, `${tone} stem`], [leaves, tone]]) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', cls);
    svg.append(path);
  }
}

// Same arrangement on both doors (the right one is mirrored in CSS), back fronds first.
function drawFerns() {
  for (const svg of document.querySelectorAll('.ferns.bottom')) {
    fern(svg, { x: -10, y: 530, angle: -1.05, length: 200, bend: -0.2, leaf: 0.8, tone: 'f3' });
    fern(svg, { x: 150, y: 530, angle: -1.95, length: 120, bend: -0.5, leaf: 0.6, tone: 'f3' });
    fern(svg, { x: 62, y: 530, angle: -1.2, length: 250, bend: 0.55, leaf: 0.85, tone: 'f2' });
    fern(svg, { x: 118, y: 530, angle: -1.75, length: 160, bend: -0.4, leaf: 0.7, tone: 'f2' });
    fern(svg, { x: 16, y: 530, angle: -1.45, length: 340, bend: 0.45, leaf: 1, tone: 'f1' });
  }
  for (const svg of document.querySelectorAll('.ferns.top')) {
    fern(svg, { x: -6, y: -6, angle: 0.55, length: 180, bend: 0.5, leaf: 0.7, tone: 'f3' });
    fern(svg, { x: 34, y: -8, angle: 1.15, length: 115, bend: -0.35, leaf: 0.55, tone: 'f2' });
  }
}

// Names come from the live content (the couple can edit them), so main.js sets them on render.
export function setIntroNames(c) {
  const el = document.getElementById('intro-names');
  if (el) el.innerHTML = `${esc(c.couple.first)}<span class="amp">&amp;</span>${esc(c.couple.second)}`;
}

// Opening scene: untie the bow, swing the doors open, reveal the hero.
export function initIntro() {
  const intro = document.getElementById('intro');
  const outside = [...document.querySelectorAll('body > nav, body > main, body > footer')];

  if (!root.classList.contains('intro-on')) {
    intro.remove();
    return;
  }

  drawFerns();

  // Keep keyboard and screen readers inside the scene until it opens.
  outside.forEach((el) => (el.inert = true));

  // Greet the guest by name when they arrive from their personal link.
  document.addEventListener('invite-found', (e) => {
    if (intro.isConnected && !intro.classList.contains('untie')) {
      document.getElementById('intro-pre').textContent = `${e.detail.name}, you're invited to the wedding of`;
    }
  });

  let opened = false;
  function open() {
    if (opened) return;
    opened = true;
    try { sessionStorage.setItem('intro-seen', '1'); } catch { /* ignore */ }

    const still = reduced.matches;
    intro.classList.add('untie');
    setTimeout(() => {
      intro.style.display = 'block'; // stays visible while the doors finish swinging
      intro.classList.add('open');
      root.classList.remove('intro-on'); // hero rises, capiz lattice starts glowing
      outside.forEach((el) => (el.inert = false));
      document.getElementById('top').focus({ preventScroll: true });
    }, still ? 0 : 520);
    setTimeout(() => intro.remove(), still ? 450 : 2100);
  }

  intro.addEventListener('click', open);
  // Swiping up also opens it on phones.
  let startY = null;
  intro.addEventListener('touchstart', (e) => (startY = e.touches[0].clientY), { passive: true });
  intro.addEventListener('touchmove', (e) => {
    if (startY !== null && startY - e.touches[0].clientY > 40) open();
  }, { passive: true });
  intro.addEventListener('wheel', open, { passive: true, once: true });
}

// Sections fade up as they scroll into view.
export function initReveals() {
  if (reduced.matches || !('IntersectionObserver' in window)) return;
  const targets = document.querySelectorAll(
    'section.s h2, section.s > p, .story p, .venue, .program li, .ent > div, .swatches, #attire h3, #rsvp > div, #faq details',
  );
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });

  targets.forEach((el) => {
    // Anything already on screen (e.g. after a refresh mid-page) shows immediately.
    if (el.getBoundingClientRect().top < innerHeight) return;
    el.classList.add('reveal');
    io.observe(el);
  });

  // Stagger siblings that enter together, like program rows.
  for (const group of ['.program li', '.venue', '#faq details', '.ent > div']) {
    document.querySelectorAll(group).forEach((el, i) => (el.style.transitionDelay = `${Math.min(i, 5) * 70}ms`));
  }
}
