// Wspólny kod strony głównej i podstron sekcji.
// Treści NIE są tutaj — edytuj pliki w katalogu /tresci (patrz README).

const IKONY = {
  badanie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M8.5 11l1.8 1.8L14 9"/><path d="M8.5 16.5h7"/></svg>',
  wypalenie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c-3.9 0-6.5-2.6-6.5-6.1 0-3.3 2.4-5.4 3.9-7.6.5 1.8 1.3 2.8 2.3 3.3C12 7.6 13 5 15 3c.2 3 3.5 5.7 3.5 11.1 0 4-2.8 6.9-6.5 6.9z"/><path d="M12 21c-1.6 0-2.8-1.2-2.8-2.9 0-1.8 1.6-3 2.8-4.6 1.2 1.6 2.8 2.8 2.8 4.6 0 1.7-1.2 2.9-2.8 2.9z"/></svg>',
  energia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="7" width="17" height="10" rx="2"/><path d="M21.5 10.5v3"/><path d="M11.5 8.8l-2.3 3.5h3.6l-2.3 3.5"/></svg>',
  odpornosc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20l6.5-10 3.5 5 3-4.5L22 20z"/><path d="M15 10.5l1.8 2.6"/><circle cx="17.5" cy="5" r="1.6"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/></svg>',
  telefon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3.5h3.2l1.6 4.3-2.1 1.4a11 11 0 005.1 5.1l1.4-2.1 4.3 1.6V17a2.5 2.5 0 01-2.7 2.5A15.5 15.5 0 012.5 6.2 2.5 2.5 0 015 3.5z"/></svg>',
  www: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>',
};
const ikona = (n) => IKONY[n] || IKONY.odpornosc;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function ustawienia() {
  const r = await fetch('tresci/ustawienia.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('Nie udało się wczytać tresci/ustawienia.json (' + r.status + ')');
  return r.json();
}

function adresKafelka(k) {
  return k.adres || 'sekcja.html?s=' + encodeURIComponent(k.id);
}

function bladWczytania(el, e) {
  const lokalnie = location.protocol === 'file:';
  el.innerHTML = '<div class="err"><strong>Nie udało się wczytać treści.</strong> ' +
    (lokalnie
      ? 'Plik otwarto bezpośrednio z dysku — przeglądarka blokuje wtedy wczytywanie treści. Uruchom podgląd poleceniem <code>python3 -m http.server</code> w katalogu strony i wejdź na <code>http://localhost:8000</code>.'
      : esc(e.message)) + '</div>';
}

function stopka(u) {
  const f = document.getElementById('stopka');
  if (!f) return;
  const k = u.kontakt || {};
  f.innerHTML = `<div class="wrap"><span>© ${new Date().getFullYear()} ${esc(k.imie)}</span>` +
    (k.lyra_url ? `<a href="${esc(k.lyra_url)}" target="_blank" rel="noopener">${esc(k.lyra_nazwa || k.lyra_url)}</a>` : '') + '</div>';
}

/* ---------- strona główna ---------- */
async function stronaGlowna() {
  const main = document.getElementById('tresc');
  let u;
  try { u = await ustawienia(); } catch (e) { bladWczytania(main, e); return; }
  document.title = u.tytul_strony || document.title;

  const k = u.kontakt || {};
  const kafelki = (u.kafelki || []).filter((x) => !x.ukryj);

  main.innerHTML = `
    <section class="hero"><div class="wrap">
      <h1>${esc(u.naglowek)}</h1>
      ${u.wstep ? `<p>${esc(u.wstep)}</p>` : ''}
    </div></section>
    <div class="wrap">
      <nav class="tiles" aria-label="Sekcje">
        ${kafelki.map((t) => `
          <a class="tile${t.wyroznij ? ' main' : ''}" href="${esc(adresKafelka(t))}">
            <span class="ic" aria-hidden="true">${ikona(t.ikona || t.id)}</span>
            <div>
              <h2>${esc(t.tytul)}</h2>
              ${t.opis ? `<p>${esc(t.opis)}</p>` : ''}
              <div class="go">${esc(t.przycisk || 'Przejdź')} →</div>
            </div>
          </a>`).join('')}
      </nav>

      <section class="contact" aria-labelledby="kontakt-h">
        <div>
          <h2 id="kontakt-h">${esc(k.imie)}</h2>
          ${k.rola ? `<p class="role">${esc(k.rola)}</p>` : ''}
          <ul>
            ${k.email ? `<li>${IKONY.mail}<a href="mailto:${esc(k.email)}">${esc(k.email)}</a></li>` : ''}
            ${k.telefon ? `<li>${IKONY.telefon}<a href="tel:${esc(k.telefon.replace(/\s+/g, ''))}">${esc(k.telefon)}</a></li>` : ''}
            ${k.strona_www ? `<li>${IKONY.www}<a href="${esc(k.strona_www)}" target="_blank" rel="noopener">${esc(k.strona_www.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a></li>` : ''}
          </ul>
        </div>
        ${k.lyra_url ? `<a class="btn" href="${esc(k.lyra_url)}" target="_blank" rel="noopener">${esc(k.lyra_przycisk || 'Lyra Polska')} ↗</a>` : ''}
      </section>
    </div>`;
  stopka(u);
}

/* ---------- podstrona sekcji ---------- */
function slug(t) {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function podstrona() {
  const main = document.getElementById('tresc');
  const id = new URLSearchParams(location.search).get('s') || '';
  let u;
  try { u = await ustawienia(); } catch (e) { bladWczytania(main, e); return; }
  stopka(u);

  const t = (u.kafelki || []).find((x) => x.id === id && !x.adres);
  if (!t) {
    main.innerHTML = `<div class="wrap"><a class="back" href="./">← Strona główna</a><div class="err">Nie ma takiej sekcji.</div></div>`;
    return;
  }
  document.title = t.tytul + ' | ' + (u.tytul_strony || '');

  let md = '';
  try {
    const r = await fetch('tresci/' + encodeURIComponent(t.plik || t.id + '.md'), { cache: 'no-cache' });
    if (r.ok) md = await r.text();
  } catch (e) { /* brak pliku = sekcja w przygotowaniu */ }
  md = md.replace(/<!--[\s\S]*?-->/g, '').trim();

  let body;
  if (!md) {
    body = `<div class="soon">${esc(u.komunikat_w_przygotowaniu || 'Treści tej sekcji są w przygotowaniu.')}</div>`;
  } else {
    const html = DOMPurify.sanitize(marked.parse(md), { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'target'] });
    body = `<nav class="toc" id="toc" aria-label="Spis treści"></nav><article class="md" id="md">${html}</article>`;
  }

  main.innerHTML = `<div class="wrap">
    <a class="back" href="./">← Strona główna</a>
    <div class="page-head"><span class="ic" aria-hidden="true">${ikona(t.ikona || t.id)}</span><h1>${esc(t.tytul)}</h1></div>
    ${body}
  </div>`;

  // Spis treści z nagłówków „## …” (pokazywany, gdy są co najmniej 2 sekcje).
  const art = document.getElementById('md');
  if (art) {
    const h2 = [...art.querySelectorAll('h2')];
    h2.forEach((h) => { h.id = slug(h.textContent); });
    const toc = document.getElementById('toc');
    if (h2.length >= 2) toc.innerHTML = h2.map((h) => `<a href="#${h.id}">${esc(h.textContent)}</a>`).join('');
    else toc.remove();
    art.querySelectorAll('a[href^="http"]').forEach((a) => { a.target = '_blank'; a.rel = 'noopener'; });
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }
}
