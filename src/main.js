import { content, coupleNames, mapsUrl } from './content.js';
import { escapeHtml as esc } from './codes.js';
import { initRsvp } from './rsvp.js';

const $ = (id) => document.getElementById(id);
const c = content;

// Hero
$('monogram').textContent = c.couple.monogram;
$('hero-pre').textContent = c.invitationLine;
$('hero-names').innerHTML = `${esc(c.couple.first)}<span class="amp">&amp;</span>${esc(c.couple.second)}`;
$('hero-date').textContent = c.dateLabel;
$('hero-place').textContent = c.place;
$('hero-rsvp').textContent = c.rsvpButtonLabel;

// Capiz lattice
$('capiz').innerHTML = Array.from(
  { length: 180 },
  () => `<span style="animation-delay:${(Math.random() * 900) | 0}ms"></span>`,
).join('');

// Countdown
const target = new Date(c.ceremonyStart).getTime();
function tick() {
  const d = Math.max(0, target - Date.now());
  $('cd-d').textContent = Math.floor(d / 864e5);
  $('cd-h').textContent = Math.floor(d / 36e5) % 24;
  $('cd-m').textContent = Math.floor(d / 6e4) % 60;
}
tick();
setInterval(tick, 30000);

// Sections
$('story-body').innerHTML = c.story.map((p) => `<p>${esc(p)}</p>`).join('');

$('venues').innerHTML = c.venues
  .map(
    (v) => `<div class="venue">
      <h3>${esc(v.title)}</h3>
      <p class="time">${esc(v.time)}</p>
      <p>${esc(v.name)}<br>${esc(v.address)}</p>
      <a href="${mapsUrl(v)}" target="_blank" rel="noopener">Open in Google Maps</a>
    </div>`,
  )
  .join('');

$('program-list').innerHTML = c.program
  .map(([t, what]) => `<li><time>${esc(t)}</time><span>${esc(what)}</span></li>`)
  .join('');

$('principal').innerHTML = c.principalSponsors
  .map(([a, b]) => `<span>${esc(a)}</span><span>${esc(b)}</span>`)
  .join('');
const roles = (list) => list.map(([role, who]) => `<div><small>${esc(role)}</small>${esc(who)}</div>`).join('');
$('secondary').innerHTML = roles(c.secondarySponsors);
$('party').innerHTML = roles(c.weddingParty);

$('attire-text').textContent = c.attire;
$('attire-note').textContent = c.attireNote;
$('swatches').innerHTML = c.swatches
  .map(([name, hex]) => `<div class="sw"><i style="background:${esc(hex)}"></i>${esc(name)}</div>`)
  .join('');
$('gifts').textContent = c.gifts;

$('faq-list').innerHTML = c.faq
  .map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`)
  .join('');

$('sig').textContent = coupleNames;
$('signoff').textContent = c.signoff;

initRsvp();
