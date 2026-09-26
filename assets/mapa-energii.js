// Mapa energii tygodnia – pomiary energii i napięcia (model Thayera).
// Dane zapisywane wyłącznie w localStorage tej przeglądarki.

const KLUCZ = 'fortum_mapa_energii_v1';
const PORY = [
  { id: 'rano', nazwa: 'Rano (do 10:00)', od: 0, do: 10, kolor: '#5FA8AF' },
  { id: 'przed', nazwa: 'Przedpołudnie (10–13)', od: 10, do: 13, kolor: '#177E89' },
  { id: 'popo', nazwa: 'Popołudnie (13–17)', od: 13, do: 17, kolor: '#9a6b43' },
  { id: 'wiecz', nazwa: 'Wieczór (od 17:00)', od: 17, do: 24, kolor: '#db3a34' },
];
const STANY = {
  q2: 'Spokojna energia', q3: 'Napięta energia', q1: 'Spokojne zmęczenie', q4: 'Napięte zmęczenie',
};

const $ = (id) => document.getElementById(id);
const pora = (d) => PORY.find((p) => d.getHours() >= p.od && d.getHours() < p.do);
// Środek skali 1–10 to 5,5: powyżej = wysoka energia / wysokie napięcie.
const stan = (m) => (m.en > 5.5 ? (m.na > 5.5 ? 'q3' : 'q2') : (m.na > 5.5 ? 'q4' : 'q1'));

function wczytaj() {
  try { return JSON.parse(localStorage.getItem(KLUCZ)) || []; } catch (e) { return []; }
}
function zapisz(lista) {
  try { localStorage.setItem(KLUCZ, JSON.stringify(lista)); return true; } catch (e) { return false; }
}
function teraz() {
  const d = new Date(); d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function toast(t) {
  $('toast').textContent = t; clearTimeout(toast.t); toast.t = setTimeout(() => { $('toast').textContent = ''; }, 2500);
}
const fmt = (d) => d.toLocaleString('pl-PL', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
const sr = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const l1 = (x) => (x == null ? '–' : x.toLocaleString('pl-PL', { maximumFractionDigits: 1 }));

function rysujSiatke(lista) {
  const W = 320, P = 34, S = W - 2 * P;
  const x = (na) => P + (na - 0.5) / 10 * S;   // napięcie w poziomie
  const y = (en) => P + (10.5 - en) / 10 * S;  // energia w pionie (góra = wysoka)
  const c = P + S / 2;
  const q = (tx, ty, t) => `<text x="${tx}" y="${ty}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#5B6B74">${t}</text>`;
  // Lekkie rozrzucenie punktów o tych samych wartościach, żeby były widoczne.
  const kropki = lista.map((m, i) => {
    const j = ((i * 37) % 7 - 3) * 1.6, k = ((i * 53) % 7 - 3) * 1.6;
    return `<circle cx="${(x(m.na) + j).toFixed(1)}" cy="${(y(m.en) + k).toFixed(1)}" r="5.5" fill="${pora(new Date(m.t)).kolor}" fill-opacity=".8" stroke="#fff" stroke-width="1.2"><title>${fmt(new Date(m.t))} – energia ${m.en}, napięcie ${m.na}${m.nota ? ' – ' + esc(m.nota) : ''}</title></circle>`;
  }).join('');
  $('siatka').innerHTML = `
    <svg viewBox="0 0 ${W} ${W}" role="img" aria-label="Siatka czterech stanów energii z Twoimi pomiarami">
      <rect x="${P}" y="${P}" width="${S / 2}" height="${S / 2}" fill="#E6F0F1"/>
      <rect x="${c}" y="${P}" width="${S / 2}" height="${S / 2}" fill="#F7E2D7"/>
      <rect x="${P}" y="${c}" width="${S / 2}" height="${S / 2}" fill="#F1F5F5"/>
      <rect x="${c}" y="${c}" width="${S / 2}" height="${S / 2}" fill="#F9E7E6"/>
      ${q(P + S / 4, P + 16, 'Spokojna energia')}${q(c + S / 4, P + 16, 'Napięta energia')}
      ${q(P + S / 4, W - P - 8, 'Spokojne zmęczenie')}${q(c + S / 4, W - P - 8, 'Napięte zmęczenie')}
      <line x1="${c}" y1="${P - 6}" x2="${c}" y2="${W - P + 6}" stroke="#db3a34" stroke-width="2" stroke-dasharray="6 5"/>
      <text x="${c + 5}" y="${P - 10}" font-size="10" font-weight="700" fill="#db3a34">czerwona linia napięcia</text>
      <text x="${P + S / 2}" y="${W - 6}" text-anchor="middle" font-size="10.5" fill="#5B6B74">napięcie →</text>
      <text x="10" y="${P + S / 2}" text-anchor="middle" font-size="10.5" fill="#5B6B74" transform="rotate(-90 10 ${P + S / 2})">energia →</text>
      ${kropki}
    </svg>
    <div class="legenda">${PORY.map((p) => `<span><i style="background:${p.kolor}"></i>${p.nazwa}</span>`).join('')}</div>`;
}

function rysujRytm(lista) {
  const wiersze = PORY.map((p) => {
    const w = lista.filter((m) => pora(new Date(m.t)).id === p.id);
    return { p, n: w.length, en: sr(w.map((m) => m.en)), na: sr(w.map((m) => m.na)) };
  });
  $('rytm').innerHTML = `<table class="rytm-t"><thead><tr><th>Pora dnia</th><th>Energia</th><th>Napięcie</th><th>n</th></tr></thead><tbody>
    ${wiersze.map((r) => `<tr><td>${r.p.nazwa}</td>
      <td>${r.en == null ? '–' : `<span class="mini en" style="width:${r.en * 5}px"></span>${l1(r.en)}`}</td>
      <td>${r.na == null ? '–' : `<span class="mini na" style="width:${r.na * 5}px"></span>${l1(r.na)}`}</td>
      <td>${r.n}</td></tr>`).join('')}</tbody></table>`;
  return wiersze;
}

function rysujWnioski(lista, wiersze) {
  if (lista.length < 5) {
    $('wnioski').innerHTML = `<div class="wn"><p>Po co najmniej 5 pomiarach pojawią się tu pierwsze wnioski. Najwięcej powie Ci tydzień pomiarów o różnych porach dnia.</p></div>`;
    return;
  }
  const licz = { q1: 0, q2: 0, q3: 0, q4: 0 };
  lista.forEach((m) => { licz[stan(m)]++; });
  const pct = (k) => Math.round(licz[k] / lista.length * 100);
  const dominuje = Object.keys(licz).sort((a, b) => licz[b] - licz[a])[0];
  const zDanymi = wiersze.filter((r) => r.n > 0);
  const najlepsza = [...zDanymi].sort((a, b) => (b.en - b.na) - (a.en - a.na))[0];
  const najtrudniejsza = [...zDanymi].sort((a, b) => (b.na - b.en) - (a.na - a.en))[0];
  const ponadLinia = lista.filter((m) => m.na > 5.5).length;

  const rady = {
    q2: 'Najczęściej jesteś w stanie spokojnej energii – to dobry moment, by rozpoznać, co ten stan podtrzymuje, i chronić to w okresach większej presji.',
    q3: 'Dominuje napięta energia – napęd połączony z pośpiechem. Warto zaplanować krótkie „wysepki” regeneracji między blokami pracy (np. ćwiczenie oddechowe).',
    q1: 'Dominuje spokojne zmęczenie – warto sprawdzić podstawy: sen, ruch, posiłki i to, czy w tygodniu jest czas na zadania, które dają Ci poczucie sensu.',
    q4: 'Dominuje napięte zmęczenie – to sygnał, by priorytetem była regulacja i regeneracja, a nie wydajność. Porozmawiaj o tym na sesji coachingowej.',
  };
  $('wnioski').innerHTML = `<div class="wn">
    <p><strong>Najczęstszy stan: ${STANY[dominuje]} (${pct(dominuje)}% pomiarów).</strong> ${rady[dominuje]}</p>
    <p>Spokojna energia: ${pct('q2')}% · napięta energia: ${pct('q3')}% · spokojne zmęczenie: ${pct('q1')}% · napięte zmęczenie: ${pct('q4')}%.</p>
    <p>Powyżej czerwonej linii napięcia: <strong>${ponadLinia} z ${lista.length}</strong> pomiarów.</p>
    ${najlepsza ? `<p>Twój najlepszy czas dnia (najwięcej energii przy najmniejszym napięciu): <strong>${najlepsza.p.nazwa.toLowerCase()}</strong> – chroń go dla zadań wymagających skupienia.</p>` : ''}
    ${najtrudniejsza && najtrudniejsza !== najlepsza ? `<p>Najtrudniejsza pora: <strong>${najtrudniejsza.p.nazwa.toLowerCase()}</strong> – jeśli to możliwe, nie planuj wtedy trudnych rozmów i decyzji.</p>` : ''}
    <p class="muted">Pytania do refleksji: Co dzieje się tuż przed pomiarami powyżej czerwonej linii? Co towarzyszy chwilom spokojnej energii?</p>
  </div>`;
}

function rysujListe(lista) {
  const el = $('lista');
  if (!lista.length) { el.innerHTML = '<p class="muted">Brak pomiarów. Zapisz pierwszy powyżej.</p>'; return; }
  const posort = lista.map((m, i) => ({ ...m, i })).sort((a, b) => b.t.localeCompare(a.t));
  el.innerHTML = `<ul class="lista">${posort.map((m) => `
    <li><span class="q">${STANY[stan(m)]}</span>
      <span>${fmt(new Date(m.t))} · energia <strong>${m.en}</strong>, napięcie <strong>${m.na}</strong>${m.nota ? ` · <span class="muted">${esc(m.nota)}</span>` : ''}</span>
      <button type="button" class="del" data-i="${m.i}" aria-label="Usuń pomiar">✕</button></li>`).join('')}</ul>`;
  el.querySelectorAll('.del').forEach((b) => b.addEventListener('click', () => {
    const l = wczytaj(); l.splice(+b.dataset.i, 1); zapisz(l); odswiez();
  }));
}

function odswiez() {
  const lista = wczytaj();
  const dni = new Set(lista.map((m) => m.t.slice(0, 10))).size;
  $('podsumowanie').textContent = lista.length
    ? `${lista.length} ${lista.length === 1 ? 'pomiar' : (lista.length % 10 >= 2 && lista.length % 10 <= 4 && (lista.length % 100 < 10 || lista.length % 100 >= 20) ? 'pomiary' : 'pomiarów')} z ${dni} ${dni === 1 ? 'dnia' : 'dni'}. Najedź na punkt (lub dotknij go), by zobaczyć szczegóły.`
    : 'Tu pojawi się Twoja mapa po pierwszym pomiarze.';
  rysujSiatke(lista);
  rysujWnioski(lista, rysujRytm(lista));
  rysujListe(lista);
}

// --- zdarzenia
['en', 'na'].forEach((id) => $(id).addEventListener('input', () => { $('o-' + id).textContent = $(id).value; }));
$('kiedy').value = teraz();
$('zapisz').addEventListener('click', () => {
  const t = $('kiedy').value || teraz();
  const lista = wczytaj();
  lista.push({ t, en: +$('en').value, na: +$('na').value, nota: $('nota').value.trim().slice(0, 120) });
  if (!zapisz(lista)) { toast('Nie udało się zapisać – przeglądarka blokuje zapis danych (np. tryb prywatny).'); return; }
  $('nota').value = ''; $('kiedy').value = teraz();
  toast('Zapisano ✓'); odswiez();
});
$('druk').addEventListener('click', () => window.print());
$('csv').addEventListener('click', () => {
  const lista = wczytaj().sort((a, b) => a.t.localeCompare(b.t));
  const csv = ['data;godzina;energia;napiecie;stan;notatka',
    ...lista.map((m) => [m.t.slice(0, 10), m.t.slice(11, 16), m.en, m.na, STANY[stan(m)], `"${(m.nota || '').replace(/"/g, '""')}"`].join(';'))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'mapa-energii.csv'; a.click(); URL.revokeObjectURL(a.href);
});
$('wyczysc').addEventListener('click', () => {
  if (confirm('Usunąć wszystkie pomiary z tego urządzenia? Tej operacji nie można cofnąć.')) { zapisz([]); odswiez(); }
});
odswiez();
