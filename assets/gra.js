// Silnik gier decyzyjnych. Scenariusz: plik JSON wskazany w atrybucie data-scenariusz
// elementu #gra (domyślnie gra-zespol.json). Nazwy wskaźników, zakończenia, macierz
// i materiały do pogłębienia są częścią scenariusza.

(async function () {
  const el = document.getElementById('gra');
  const mEl = document.getElementById('mierniki');
  let G;
  try { G = await wczytajJson(el.dataset.scenariusz || 'gra-zespol.json'); } catch (e) { bladWczytania(el, e); return; }

  const M = Object.assign({ zaufanie: 'Zaufanie w zespole', napiecie: 'Twoje napięcie' }, G.mierniki || {});
  let stan, sciezka;
  const clamp = (x) => Math.max(0, Math.min(100, x));

  function mierniki(dz, dn) {
    const d = (x, dobrzeGdyRosnie) => (x ? `<span class="dlt ${(x > 0) === dobrzeGdyRosnie ? 'up' : 'down'}">${x > 0 ? '▲' : '▼'} ${Math.abs(x)}</span>` : '');
    mEl.innerHTML = `
      <div class="meter zaufanie"><div class="lbl"><span>${esc(M.zaufanie)}${d(dz, true)}</span><span>${stan.zaufanie}</span></div>
        <div class="trk"><span class="fil" style="width:${stan.zaufanie}%"></span></div></div>
      <div class="meter napiecie"><div class="lbl"><span>${esc(M.napiecie)}${d(dn, false)}</span><span>${stan.napiecie}</span></div>
        <div class="trk"><span class="fil" style="width:${stan.napiecie}%"></span></div></div>`;
  }

  function start() {
    stan = { ...G.start }; sciezka = [];
    mEl.hidden = true;
    el.innerHTML = `<div class="scena md">${renderMd(G.wstep)}</div>
      <div class="me-actions"><button type="button" class="btn" id="g-start">Rozpocznij</button></div>`;
    document.getElementById('g-start').addEventListener('click', () => { mEl.hidden = false; mierniki(0, 0); scena('start'); });
  }

  function scena(id) {
    if (id === 'koniec') { koniec(); return; }
    const s = G.sceny[id];
    el.innerHTML = `<span class="krok">${esc(s.krok || '')}</span>
      <div class="scena md">${renderMd(s.tekst)}</div>
      <div class="opcje">${s.opcje.map((o, i) => `<button type="button" data-i="${i}">${esc(o.tekst)}</button>`).join('')}</div>`;
    el.querySelectorAll('.opcje button').forEach((b) => b.addEventListener('click', () => wybierz(s, s.opcje[b.dataset.i])));
    el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function wybierz(s, o) {
    stan.zaufanie = clamp(stan.zaufanie + (o.zaufanie || 0));
    stan.napiecie = clamp(stan.napiecie + (o.napiecie || 0));
    sciezka.push({ krok: s.krok, tekst: o.tekst });
    mierniki(o.zaufanie || 0, o.napiecie || 0);
    el.querySelector('.opcje').outerHTML = `<div class="komentarz"><p class="wybor">Twój wybór: ${esc(o.tekst)}</p>
      <div class="md">${renderMd(o.komentarz)}</div></div>
      <div class="me-actions"><button type="button" class="btn" id="g-dalej">${o.dalej === 'koniec' ? 'Zobacz podsumowanie' : 'Dalej →'}</button></div>`;
    const b = document.getElementById('g-dalej');
    b.addEventListener('click', () => scena(o.dalej));
    b.focus({ preventScroll: true });
  }

  // Pierwsze zakończenie, którego warunki spełnia stan wskaźników.
  function zakonczenie() {
    const z = stan.zaufanie, n = stan.napiecie;
    return (G.zakonczenia || []).find((k) =>
      (k.min_zaufanie == null || z >= k.min_zaufanie) && (k.max_zaufanie == null || z < k.max_zaufanie) &&
      (k.min_napiecie == null || n > k.min_napiecie) && (k.max_napiecie == null || n <= k.max_napiecie)
    ) || { tytul: 'Podsumowanie', opis: '' };
  }

  function macierz() {
    const m = G.macierz;
    if (!m) return '';
    const kol = stan.zaufanie >= (m.prog_zaufanie ?? 60) ? 1 : 0;
    const wiersz = m.wiersz_wg === 'napiecie' ? (stan.napiecie > (m.prog_napiecie ?? 55) ? 0 : 1) : (m.wiersz_staly ?? 0);
    return `${m.opis ? `<p class="muted">${esc(m.opis)}</p>` : ''}
      <div class="macierz" role="img" aria-label="${esc(m.kolumny_tytul)} i ${esc(m.wiersze_tytul || '')}">
        <div class="ax"></div><div class="ax span2">${esc(m.kolumny_tytul)}</div>
        <div class="ax"></div>${m.kolumny.map((k) => `<div class="ax">${esc(k)}</div>`).join('')}
        ${m.wiersze.map((w, i) => `<div class="ax">${esc(w.nazwa)}</div>${w.pola.map((p, j) => `<div class="${i === wiersz && j === kol ? 'on' : ''}">${esc(p)}</div>`).join('')}`).join('')}
      </div>`;
  }

  function koniec() {
    const k = zakonczenie();
    el.innerHTML = `<div class="final">
      <span class="krok">Podsumowanie</span>
      <h2>${esc(k.tytul)}</h2>
      <div class="md">${renderMd(k.opis)}</div>
      ${macierz()}
      <h3>Twoja ścieżka</h3>
      <ol class="sciezka">${sciezka.map((s) => `<li><strong>${esc(s.krok)}:</strong> ${esc(s.tekst)}</li>`).join('')}</ol>
      ${(G.pytania_do_refleksji || []).length ? `<h3>Do refleksji</h3><ul>${G.pytania_do_refleksji.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
      ${(G.poglebienie || []).length ? `<h3>Pogłębienie</h3><ul>${G.poglebienie.map((p) => `<li><a href="${esc(p.link)}">${esc(p.tekst)}</a></li>`).join('')}</ul>` : ''}
      <div class="me-actions"><button type="button" class="btn" id="g-znowu">Zagraj jeszcze raz</button><a class="btn ghost" href="cwiczenia.html">Inne ćwiczenia</a></div>
    </div>`;
    document.getElementById('g-znowu').addEventListener('click', start);
    el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  start();
})();
