// Decorations for the hero and the opening doors: drifting petals and twinkling sparkles
// (blush and golden looks) and bloom clusters (garden look).
// Colors and motion live in styles.css (.petal, .sparkle); this only scatters them.
const rand = (a, b) => a + Math.random() * (b - a);

// Places items at random, skipping spots where keepClear(x, y) is true (x and y in percent),
// so nothing drifts over the names or the bow.
export function scatter(container, { petals = 0, sparkles = 0, keepClear = () => false }) {
  const spot = () => {
    for (let i = 0; i < 40; i++) {
      const x = rand(2, 98), y = rand(2, 98);
      if (!keepClear(x, y)) return [x, y];
    }
    return [rand(2, 10), rand(2, 98)];
  };
  const add = (cls, vars) => {
    const el = document.createElement('span');
    el.className = cls;
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
    container.append(el);
  };
  for (let i = 0; i < petals; i++) {
    const [x, y] = spot();
    add('petal', {
      left: `${x}%`, top: `${y}%`, '--s': `${rand(10, 18).toFixed(1)}px`, '--r': `${rand(0, 180) | 0}deg`,
      '--dx': `${rand(-24, 24) | 0}px`, '--dy': `${rand(12, 40) | 0}px`,
      '--t': `${rand(9, 16).toFixed(1)}s`, '--d': `${-rand(0, 10).toFixed(1)}s`,
    });
  }
  for (let i = 0; i < sparkles; i++) {
    const [x, y] = spot();
    add('sparkle', {
      left: `${x}%`, top: `${y}%`, '--s': `${rand(1.5, 3.5).toFixed(1)}px`,
      '--t': `${rand(2.5, 5).toFixed(1)}s`, '--d': `${-rand(0, 5).toFixed(1)}s`,
    });
  }
}

// A cluster of white five-petal blooms and leaves for the garden look, drawn into each
// <svg class="blooms"> (viewBox 0 0 90 110). Mirror an svg in CSS for the right-hand side.
export function drawBlooms(selector) {
  const leaves = [[10, 96, -60], [28, 78, -30], [50, 96, 20], [6, 54, -80], [20, 20, -70], [62, 84, 45], [36, 52, -15]]
    .map(([x, y, a]) => `<ellipse class="leaf" cx="${x}" cy="${y}" rx="5" ry="13" transform="rotate(${a} ${x} ${y})"/>`)
    .join('');
  const flowers = [[22, 88, 11], [42, 104, 8], [12, 62, 7], [32, 40, 6], [56, 70, 7]]
    .map(([x, y, r]) => {
      let petals = '';
      for (let i = 0; i < 5; i++) {
        petals += `<ellipse cx="0" cy="${(-r * 0.55).toFixed(1)}" rx="${(r * 0.42).toFixed(1)}" ry="${(r * 0.6).toFixed(1)}" transform="rotate(${i * 72})"/>`;
      }
      return `<g class="bloom" transform="translate(${x} ${y})">${petals}<circle class="heart" r="${(r * 0.18).toFixed(1)}"/></g>`;
    })
    .join('');
  for (const svg of document.querySelectorAll(selector)) svg.innerHTML = leaves + flowers;
}

// The Tagaytay ridge, Taal Lake and the volcano island for the golden look, drawn into each
// <svg class="ridge"> (viewBox 0 0 300 150, stretched to fit). Colors come from CSS.
export function drawRidge(selector) {
  const markup = `
    <path class="r1" d="M0 70 C 40 60, 70 66, 110 58 S 190 50, 230 60 S 280 62, 300 56 L300 150 L0 150 Z"/>
    <path class="r2" d="M0 96 L300 96 L300 150 L0 150 Z"/>
    <path class="r3" d="M128 98 C 138 84, 146 78, 152 77 C 158 78, 166 85, 176 98 Z"/>
    <path class="r4" d="M0 112 C 60 104, 110 116, 170 108 S 260 104, 300 110 L300 150 L0 150 Z"/>
    <path class="glint" d="M40 100 L80 100 M190 102 L250 102 M110 104 L140 104"/>`;
  for (const svg of document.querySelectorAll(selector)) svg.innerHTML = markup;
}
