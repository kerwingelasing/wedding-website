// Fern fronds drawn as SVG, shared by the opening scene and the hero.
// Colors come from CSS: paths get class f1 (front), f2 (middle), or f3 (back), plus "stem".
const NS = 'http://www.w3.org/2000/svg';
const r1 = (n) => n.toFixed(1);

// A gently curving stem with paired leaflets that taper toward the tip. Coordinates are in the
// SVG's viewBox units.
function fern(parent, { x, y, angle, length, bend = 0.5, leaf = 1, tone = 'f1' }) {
  const steps = 26;
  let px = x, py = y, a = angle, stem = `M${r1(x)} ${r1(y)}`, leaves = '';
  for (let i = 1; i <= steps; i++) {
    a += bend / steps;
    px += Math.cos(a) * length / steps;
    py += Math.sin(a) * length / steps;
    stem += ` L${r1(px)} ${r1(py)}`;
    const size = (7 + 27 * Math.sin(Math.PI * Math.min(1, 0.25 + 0.85 * (1 - i / (steps + 1))) / 2)) * leaf;
    for (const side of [-1, 1]) {
      const d = a + side * 0.95;
      const tip = [px + Math.cos(d) * size, py + Math.sin(d) * size];
      const c1 = [px + Math.cos(d - side * 0.5) * size * 0.66, py + Math.sin(d - side * 0.5) * size * 0.66];
      const c2 = [px + Math.cos(d + side * 0.42) * size * 0.66, py + Math.sin(d + side * 0.42) * size * 0.66];
      leaves += `M${r1(px)} ${r1(py)}Q${r1(c1[0])} ${r1(c1[1])} ${r1(tip[0])} ${r1(tip[1])}Q${r1(c2[0])} ${r1(c2[1])} ${r1(px)} ${r1(py)}Z`;
    }
  }
  for (const [d, cls] of [[stem, `${tone} stem`], [leaves, tone]]) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', cls);
    parent.append(path);
  }
}

// A cluster rising from the bottom-left of a 200 x 520 viewBox.
const BOTTOM = [
  { x: -10, y: 530, angle: -1.05, length: 200, bend: -0.2, leaf: 0.8, tone: 'f3' },
  { x: 150, y: 530, angle: -1.95, length: 120, bend: -0.5, leaf: 0.6, tone: 'f3' },
  { x: 62, y: 530, angle: -1.2, length: 250, bend: 0.55, leaf: 0.85, tone: 'f2' },
  { x: 118, y: 530, angle: -1.75, length: 160, bend: -0.4, leaf: 0.7, tone: 'f2' },
  { x: 16, y: 530, angle: -1.45, length: 340, bend: 0.45, leaf: 1, tone: 'f1' },
];
// Sprigs drooping from the top-left of a 200 x 260 viewBox.
const TOP = [
  { x: -6, y: -6, angle: 0.55, length: 180, bend: 0.5, leaf: 0.7, tone: 'f3' },
  { x: 34, y: -8, angle: 1.15, length: 115, bend: -0.35, leaf: 0.55, tone: 'f2' },
];

// Fills every matching <svg> with a cluster inside a <g> (the <g> is what sways in the hero).
// Mirror an svg in CSS for the right-hand side.
export function drawFerns(selector, kind) {
  for (const svg of document.querySelectorAll(selector)) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'frond-group');
    for (const f of kind === 'top' ? TOP : BOTTOM) fern(g, f);
    svg.append(g);
  }
}
