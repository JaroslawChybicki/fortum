// Gra decyzyjna „Pomyłka w zespole” – scenariusz w tresci/gra-zespol.json.

(async function () {
  const el = document.getElementById('gra');
  const mEl = document.getElementById('mierniki');
  let G;
  try { G = await wczytajJson('gra-zespol.json'); } catch (e) { bladWczytania(el, e); return; }

  let stan, sciezka;
  const clamp = (x) => Math.max(0, Math.min(100, x));

  function mierniki(dz, dn) {
    const d = (x, dobrzeGdyRosnie) => (x ? `<span class="dlt ${(x > 0) === dobrzeGdyRosnie ? 'up' : 'down'}">${x > 0 ? '▲' : '▼'} ${Math.abs(x)}</span>` : '');
    mEl.innerHTML = `
      <div class="meter zaufanie"><div class="lbl"><span>Zaufanie w zespole${d(dz, true)}</span><span>${stan.zaufanie}</span></div>
        <div class="trk"><span class="fil" style="width:${stan.zaufanie}%"></span></div></div>
      <div class="meter napiecie"><div class="lbl"><span>Twoje napięcie${d(dn, false)}</span><span>${stan.napiecie}</span></div>
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

  function koniec() {
    const z = stan.zaufanie, n = stan.napiecie;
    let tytul, opis;
    if (z >= 70 && n <= 55) {
      tytul = 'Strefa uczenia się';
      opis = 'Zespół wie, że o błędach można mówić, a Ty zachowałeś równowagę. To połączenie wysokiego bezpieczeństwa psychologicznego z wysokimi standardami – warunek, w którym zespoły uczą się najszybciej.';
    } else if (z >= 70) {
      tytul = 'Zaufanie zbudowane – kosztem Twojej energii';
      opis = 'Zespół wyszedł z tej sytuacji z większym zaufaniem, ale Ty zapłaciłeś za to wysokim napięciem. Warto zapytać: co mogę oddać, a gdzie potrzebuję regeneracji, żeby taki styl był możliwy na dłuższą metę?';
    } else if (z < 45) {
      tytul = 'Strefa lęku';
      opis = 'Wymagania są wysokie, ale bezpieczeństwo psychologiczne spadło. W takiej atmosferze ludzie częściej ukrywają błędy i rzadziej zgłaszają problemy – a to zwiększa ryzyko dla całej organizacji.';
    } else {
      tytul = 'Sytuacja opanowana – potencjał do wykorzystania';
      opis = 'Problem został rozwiązany, ale zespół nie wzmocnił przekonania, że o błędach można mówić bezpiecznie. Przejrzyj swoje wybory – który jeden krok mógłby to zmienić?';
    }
    const wysokieBezp = z >= 60;
    el.innerHTML = `<div class="final">
      <span class="krok">Podsumowanie</span>
      <h2>${tytul}</h2>
      <p>${opis}</p>
      <p class="muted">Macierz Amy Edmondson: przy wysokich wymaganiach (termin, zarząd) o efekcie decyduje poziom bezpieczeństwa psychologicznego.</p>
      <div class="macierz" role="img" aria-label="Macierz bezpieczeństwa psychologicznego i wymagań">
        <div class="ax"></div><div class="ax span2">Bezpieczeństwo psychologiczne</div>
        <div class="ax"></div><div class="ax">niskie</div><div class="ax">wysokie</div>
        <div class="ax">Wymagania wysokie</div><div class="${wysokieBezp ? '' : 'on'}">Strefa lęku</div><div class="${wysokieBezp ? 'on' : ''}">Strefa uczenia się</div>
        <div class="ax">Wymagania niskie</div><div>Strefa apatii</div><div>Strefa komfortu</div>
      </div>
      <h3>Twoja ścieżka</h3>
      <ol class="sciezka">${sciezka.map((k) => `<li><strong>${esc(k.krok)}:</strong> ${esc(k.tekst)}</li>`).join('')}</ol>
      ${(G.pytania_do_refleksji || []).length ? `<h3>Do refleksji</h3><ul>${G.pytania_do_refleksji.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
      <h3>Pogłębienie</h3>
      <ul>
        <li><a href="filmy.html#film=LhoLuui9gX8">Film: Amy Edmondson – bezpieczeństwo psychologiczne</a></li>
        <li><a href="ksiazki.html#ksiazka=edmondson-firma">Książka: Firma bez strachu</a></li>
        <li><a href="ksiazki.html#ksiazka=brown-odwaga">Książka: Odwaga w przywództwie</a></li>
        <li><a href="oddech.html">Ćwiczenie: oddech z wydłużonym wydechem – na moment przed trudną rozmową</a></li>
      </ul>
      <div class="me-actions"><button type="button" class="btn" id="g-znowu">Zagraj jeszcze raz</button><a class="btn ghost" href="cwiczenia.html">Inne ćwiczenia</a></div>
    </div>`;
    document.getElementById('g-znowu').addEventListener('click', start);
    el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  start();
})();
