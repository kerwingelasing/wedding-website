import { scatter } from './sparkles.js';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

// Opening scene: untie the bow, swing the doors open, reveal the hero.
export function initIntro() {
  const intro = document.getElementById('intro');
  const outside = [...document.querySelectorAll('body > nav, body > main, body > footer')];

  if (!root.classList.contains('intro-on')) {
    intro.remove();
    return;
  }

  // Petals and sparkles on each door, clear of the bow and the hint (x is measured within the door).
  const [left, right] = intro.querySelectorAll('.door .confetti');
  const nearSeam = (x, y, seamSide) => (y > 34 && y < 68 && seamSide) || (y > 82 && seamSide);
  scatter(left, { petals: 8, sparkles: 18, keepClear: (x, y) => nearSeam(x, y, x > 45) });
  scatter(right, { petals: 8, sparkles: 18, keepClear: (x, y) => nearSeam(x, y, x < 55) });

  // Keep keyboard and screen readers inside the scene until it opens.
  outside.forEach((el) => (el.inert = true));

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
      root.classList.remove('intro-on'); // hero rises, petals start drifting
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
