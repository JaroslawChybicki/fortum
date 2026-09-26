// Wspólny kod strony głównej i podstron sekcji.
// Treści NIE są tutaj — edytuj je w Pages CMS albo w plikach /tresci (patrz README).

const IKONY = {
  badanie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M8.5 11l1.8 1.8L14 9"/><path d="M8.5 16.5h7"/></svg>',
  wypalenie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c-3.9 0-6.5-2.6-6.5-6.1 0-3.3 2.4-5.4 3.9-7.6.5 1.8 1.3 2.8 2.3 3.3C12 7.6 13 5 15 3c.2 3 3.5 5.7 3.5 11.1 0 4-2.8 6.9-6.5 6.9z"/><path d="M12 21c-1.6 0-2.8-1.2-2.8-2.9 0-1.8 1.6-3 2.8-4.6 1.2 1.6 2.8 2.8 2.8 4.6 0 1.7-1.2 2.9-2.8 2.9z"/></svg>',
  energia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="7" width="17" height="10" rx="2"/><path d="M21.5 10.5v3"/><path d="M11.5 8.8l-2.3 3.5h3.6l-2.3 3.5"/></svg>',
  odpornosc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20l6.5-10 3.5 5 3-4.5L22 20z"/><path d="M15 10.5l1.8 2.6"/><circle cx="17.5" cy="5" r="1.6"/></svg>',
  kalkulator: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2.5" width="14" height="19" rx="2"/><rect x="8" y="5.5" width="8" height="4" rx="1"/><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01"/></svg>',
  filmy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="3"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/></svg>',
  telefon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3.5h3.2l1.6 4.3-2.1 1.4a11 11 0 005.1 5.1l1.4-2.1 4.3 1.6V17a2.5 2.5 0 01-2.7 2.5A15.5 15.5 0 012.5 6.2 2.5 2.5 0 015 3.5z"/></svg>',
  www: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>',
};
const ikona = (n) => IKONY[n] || IKONY.odpornosc;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function wczytajJson(plik) {
  const r = await fetch('tresci/' + plik, { cache: 'no-cache' });
  if (!r.ok) throw new Error('Nie udało się wczytać tresci/' + plik + ' (' + r.status + ')');
  return r.json();
}

// strona.json: nagłówek, wstęp, kontakt; sekcje.json: kafelki razem z treścią podstron.
async function ustawienia() {
  const [strona, sekcje] = await Promise.all([wczytajJson('strona.json'), wczytajJson('sekcje.json')]);
  return { ...strona, kafelki: sekcje.sekcje || [] };
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

  const t = (u.kafelki || []).find((x) => x.id === id && !x.adres && !x.ukryj);
  if (!t) {
    main.innerHTML = `<div class="wrap"><a class="back" href="./">← Strona główna</a><div class="err">Nie ma takiej sekcji.</div></div>`;
    return;
  }
  document.title = t.tytul + ' | ' + (u.tytul_strony || '');

  const podsekcje = (t.podsekcje || [])
    .filter((p) => p && (p.tytul || '').trim())
    .map((p) => ({ tytul: p.tytul.trim(), html: renderMd(p.tresc), id: slug(p.tytul) }))
    .filter((p) => p.html); // podsekcja bez treści nie pojawia się na stronie
  const wstep = renderMd(t.tresc);

  let body;
  if (!wstep && !podsekcje.length) {
    body = `<div class="soon">${esc(u.komunikat_w_przygotowaniu || 'Treści tej sekcji są w przygotowaniu.')}</div>`;
  } else {
    body = (wstep ? `<article class="md intro" id="md">${wstep}</article>` : '') +
      (podsekcje.length ? `
        <div class="tabs" role="tablist" aria-label="Podsekcje">
          ${podsekcje.map((p) => `<button type="button" role="tab" id="tab-${p.id}" aria-controls="pan-${p.id}" data-id="${p.id}">${esc(p.tytul)}</button>`).join('')}
        </div>
        ${podsekcje.map((p, i) => `
          <section class="panel" role="tabpanel" id="pan-${p.id}" aria-labelledby="tab-${p.id}" hidden>
            <h2 class="panel-h">${esc(p.tytul)}</h2>
            <div class="md">${p.html}</div>
            <div class="pager">
              ${i > 0 ? `<a href="#${podsekcje[i - 1].id}" class="prev">← ${esc(podsekcje[i - 1].tytul)}</a>` : '<span></span>'}
              ${i < podsekcje.length - 1 ? `<a href="#${podsekcje[i + 1].id}" class="next">${esc(podsekcje[i + 1].tytul)} →</a>` : ''}
            </div>
          </section>`).join('')}` : '');
  }

  main.innerHTML = `<div class="wrap">
    <a class="back" href="./">← Strona główna</a>
    <div class="page-head"><span class="ic" aria-hidden="true">${ikona(t.ikona || t.id)}</span><h1>${esc(t.tytul)}</h1></div>
    ${body}
  </div>`;

  main.querySelectorAll('.md a[href^="http"]').forEach((a) => { a.target = '_blank'; a.rel = 'noopener'; });

  if (podsekcje.length) {
    // Zakładki: aktywna podsekcja w adresie (#przyczyny), więc można wysłać link do konkretnej.
    const tabs = [...main.querySelectorAll('[role=tab]')];
    const pokaz = (id, przewin) => {
      if (!podsekcje.some((p) => p.id === id)) id = podsekcje[0].id;
      tabs.forEach((b) => {
        const on = b.dataset.id === id;
        b.setAttribute('aria-selected', on);
        b.tabIndex = on ? 0 : -1;
        document.getElementById('pan-' + b.dataset.id).hidden = !on;
      });
      // Na telefonie pasek zakładek przewija się poziomo – pokaż aktywną.
      const akt = tabs.find((b) => b.dataset.id === id);
      const pasek = akt.parentElement;
      pasek.scrollTo({ left: akt.offsetLeft - pasek.offsetLeft - 20, behavior: przewin ? 'smooth' : 'auto' });
      if (przewin) pasek.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    tabs.forEach((b, i) => {
      b.addEventListener('click', () => { history.replaceState(null, '', '#' + b.dataset.id); pokaz(b.dataset.id); });
      b.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        const n = tabs[(i + d + tabs.length) % tabs.length];
        n.focus(); n.click();
      });
    });
    window.addEventListener('hashchange', () => pokaz(decodeURIComponent(location.hash.slice(1)), true));
    pokaz(decodeURIComponent(location.hash.slice(1)), false);
  } else {
    // Bez podsekcji: spis treści z nagłówków „## …” w treści (gdy są co najmniej 2).
    const art = document.getElementById('md');
    const h2 = art ? [...art.querySelectorAll('h2')] : [];
    h2.forEach((h) => { h.id = slug(h.textContent); });
    if (h2.length >= 2) {
      art.insertAdjacentHTML('beforebegin', `<nav class="toc" aria-label="Spis treści">${h2.map((h) => `<a href="#${h.id}">${esc(h.textContent)}</a>`).join('')}</nav>`);
    }
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }
}

// Markdown z CMS → bezpieczny HTML (pusty tekst → '').
function renderMd(tekst) {
  const md = String(tekst || '').replace(/^---\r?\n(?:[\s\S]*?\r?\n)?---\r?\n?/, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  if (!md) return '';
  return DOMPurify.sanitize(marked.parse(md), { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'target'] });
}
