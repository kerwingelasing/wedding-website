// Drifting petals and twinkling gold sparkles for the hero and the opening doors.
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
