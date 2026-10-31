import '@fontsource-variable/cormorant';
import '@fontsource-variable/inter';
import './style.css';
import { T, LANGS, detectLang } from './i18n.js';
import { CONTACT } from './config.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let lang = detectLang();
let sel = { date: null, slot: null };

/* Sprache */
function applyLang() {
  const d = T[lang];
  document.documentElement.lang = lang;
  $$('[data-i18n]').forEach((e) => (e.textContent = d[e.dataset.i18n]));
  $$('[data-ph]').forEach((e) => (e.placeholder = d[e.dataset.ph]));
  $$('[data-alt]').forEach((e) => (e.alt = d[e.dataset.alt]));
  $$('.lang button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.lang === lang));
  buildDays();
  splitTitle();
  countUp();
}
$$('.lang button').forEach((b) => b.addEventListener('click', () => { lang = b.dataset.lang; localStorage.setItem('lang', lang); applyLang(); }));

/* Hero-Titel: Wort für Wort */
function splitTitle() {
  const h = $('.hero h1');
  h.innerHTML = h.textContent.split(' ').map((w, i) => `<span class="w"><span style="--i:${i}">${w}</span></span>`).join(' ');
}

/* Zahlen hochzählen */
const counted = new WeakSet();
function countUp() {
  $$('[data-count]').forEach((e) => {
    const to = Number(e.dataset.count), pre = e.dataset.pre || '';
    if (!counted.has(e)) { e.textContent = pre + (reduced ? to : 0); return; }
    e.textContent = pre + to;
  });
}
const cio = new IntersectionObserver((es) => es.forEach((x) => {
  if (!x.isIntersecting) return;
  const e = x.target, to = Number(e.dataset.count), pre = e.dataset.pre || '';
  cio.unobserve(e); counted.add(e);
  if (reduced) { e.textContent = pre + to; return; }
  const t0 = performance.now(), dur = 1400;
  const step = (t) => { const p = Math.min(1, (t - t0) / dur); e.textContent = pre + Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}), { threshold: 0.6 });
$$('[data-count]').forEach((e) => cio.observe(e));

/* Terminwunsch: nächste 14 Öffnungstage (Sonntag zu) */
function buildDays() {
  const box = $('#days'); box.innerHTML = '';
  const d = new Date(); d.setDate(d.getDate() + 1);
  let n = 0;
  while (n < 14) {
    if (d.getDay() !== 0) {
      const iso = d.toISOString().slice(0, 10);
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', sel.date === iso); b.dataset.iso = iso;
      b.innerHTML = `<span>${T[lang].days[d.getDay()]}</span><b>${d.getDate()}</b><span>${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}</span>`;
      box.append(b); n++;
    }
    d.setDate(d.getDate() + 1);
  }
}
$('#days').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  sel.date = sel.date === b.dataset.iso ? null : b.dataset.iso;
  $$('#days button').forEach((x) => x.setAttribute('aria-checked', x.dataset.iso === sel.date));
});
$('#slots').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  sel.slot = sel.slot === b.dataset.slot ? null : b.dataset.slot;
  $$('#slots button').forEach((x) => x.setAttribute('aria-checked', x.dataset.slot === sel.slot));
});
$$('#slots button').forEach((b) => b.setAttribute('role', 'radio'));
const syncAddr = () => { $('#addrbox').hidden = sel.slot !== 'site'; };
$('#slots').addEventListener('click', syncAddr);

const form = $('#form');
form.len.addEventListener('input', () => ($('#lenwarn').hidden = !(Number(form.len.value) > 40 && form.service.value !== 'mobile')));
form.service.addEventListener('change', () => form.len.dispatchEvent(new Event('input')));

/* Anfrage: ohne Backend – WhatsApp/Mail, sobald Kontakt hinterlegt, sonst Text zum Kopieren */
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(form), d = T[lang];
  if (!f.get('name').trim() || !f.get('contact').trim()) { $('#err').textContent = d['f.err']; $('#err').hidden = false; return; }
  const needAddr = sel.slot === 'site';
  if (needAddr && !f.get('addr').trim()) { $('#err').textContent = T[lang]['f.err.addr']; $('#err').hidden = false; form.addr.focus(); return; }
  $('#err').textContent = T[lang]['f.err'];
  $('#err').hidden = true;
  const svc = form.service.selectedOptions[0].textContent;
  const slotTxt = sel.slot ? d[`f.slot.${sel.slot}`] : '';
  const when = sel.date ? `${sel.date} ${slotTxt}`.trim() : '';
  const lines = [`${d['m.sub']}`, `${d['m.name']}: ${f.get('name')}`, `${d['m.contact']}: ${f.get('contact')}`, `${d['m.service']}: ${svc}`];
  const boat = [f.get('type'), f.get('len') && `${f.get('len')} ${d.ft}`].filter(Boolean).join(', ');
  if (boat) lines.push(`${d['m.boat']}: ${boat}`);
  if (when) lines.push(`${d['m.date']}: ${when}`);
  if (needAddr) lines.push(`${d['m.addr']}: ${f.get('addr')}`);
  if (f.get('msg')) lines.push(`${d['m.msg']}: ${f.get('msg')}`);
  const text = lines.join('\n');
  if (CONTACT.whatsapp) { open(`https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text)}`, '_blank'); return; }
  if (CONTACT.email) { location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(d['m.sub'])}&body=${encodeURIComponent(text)}`; return; }
  $('#msgtext').textContent = text; form.hidden = true; $('#result').hidden = false;
});
$('#copy').addEventListener('click', async (e) => { try { await navigator.clipboard.writeText($('#msgtext').textContent); e.target.textContent = T[lang]['r.copied']; setTimeout(() => (e.target.textContent = T[lang]['r.copy']), 1800); } catch {} });
$('#again').addEventListener('click', () => { form.hidden = false; $('#result').hidden = true; });

/* Einblenden */
const io = new IntersectionObserver((es) => es.forEach((x) => x.isIntersecting && (x.target.classList.add('in'), io.unobserve(x.target))), { threshold: 0.12 });
$$('.card,.offer,.steps li,.big,.eyebrow,.form-head .lead,.trust div,.faq,.form-card,.ph,.cap').forEach((e, i) => { e.classList.add('rv'); e.style.transitionDelay = `${(i % 4) * 70}ms`; io.observe(e); });

/* Fotos: leichter Parallax */
const par = $$('[data-par]');
if (!reduced && par.length) {
  let tick = false;
  const run = () => {
    tick = false;
    for (const img of par) {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const k = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      img.style.transform = `translateY(${(-k * Number(img.dataset.par) * 100).toFixed(1)}px)`;
    }
  };
  addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(run); } }, { passive: true });
  addEventListener('resize', run);
  run();
}
/* Kopfzeile, Fortschritt, Karten-Glanz, Anfrage-Knopf */
const topEl = $('#top'), prog = $('#prog'), fab = $('#fab');
const onScroll = () => {
  const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
  topEl.classList.toggle('solid', y > 60);
  prog.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
  fab.classList.toggle('on', y > innerHeight * 0.8 && !(innerHeight + y > $('#anfrage').offsetTop + 200 && y < $('#anfrage').offsetTop + $('#anfrage').offsetHeight));
};
addEventListener('scroll', onScroll, { passive: true }); onScroll();
$$('.card').forEach((c) => c.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', `${e.clientX - r.left}px`); c.style.setProperty('--my', `${e.clientY - r.top}px`); }));
applyLang();

{
  const dlg = $('#imp');
  const open = () => { if (!dlg.open) dlg.showModal(); };
  $('#impl').addEventListener('click', (e) => { e.preventDefault(); open(); history.replaceState(null, '', '#impressum'); });
  dlg.addEventListener('close', () => { if (location.hash === '#impressum') history.replaceState(null, '', location.pathname); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  if (location.hash === '#impressum') open();
}
