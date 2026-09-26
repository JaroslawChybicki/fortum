// Biblioteka filmów – treść w tresci/filmy.json (edycja w Pages CMS).

const KATEGORIE = {
  wypalenie: 'Wypalenie',
  energia: 'Energia',
  odpornosc: 'Odporność',
  przywodztwo: 'Przywództwo i zespół',
};

// Identyfikator filmu z dowolnej postaci linku YouTube.
function ytId(url) {
  const m = String(url || '').match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m ? m[1] : (/^[\w-]{11}$/.test(url) ? url : null);
}

async function biblioteka() {
  const el = document.getElementById('lib');
  let dane, u;
  try {
    [dane, u] = await Promise.all([wczytajJson('filmy.json'), ustawienia().catch(() => ({}))]);
  } catch (e) { bladWczytania(el, e); return; }
  if (u.kontakt) stopka(u);

  const filmy = (dane.filmy || []).filter((f) => !f.ukryj && ytId(f.youtube));
  const obecne = Object.keys(KATEGORIE).filter((k) => filmy.some((f) => f.kategoria === k));

  el.innerHTML = `
    ${dane.wstep ? `<p class="lib-lead">${esc(dane.wstep)}</p>` : ''}
    <div class="tabs lib-tabs" role="toolbar" aria-label="Filtruj według tematu">
      <button type="button" data-k="" aria-pressed="true">Wszystkie <span>${filmy.length}</span></button>
      ${obecne.map((k) => `<button type="button" data-k="${k}" aria-pressed="false">${KATEGORIE[k]} <span>${filmy.filter((f) => f.kategoria === k).length}</span></button>`).join('')}
    </div>
    <div class="vids">
      ${filmy.map((f, i) => {
        const id = ytId(f.youtube);
        return `<article class="vid" data-k="${esc(f.kategoria)}">
          <button type="button" class="thumb" data-i="${i}" aria-label="Odtwórz: ${esc(f.tytul)}">
            <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy" onerror="this.parentElement.classList.add('noimg')">
            <span class="play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg></span>
          </button>
          <div class="vid-body">
            <span class="tag">${esc(KATEGORIE[f.kategoria] || '')}</span>
            <h2>${esc(f.tytul)}</h2>
            <p class="who">${esc(f.autor)}${f.wydarzenie ? ` · ${esc(f.wydarzenie)}` : ''}</p>
            ${f.opis ? `<p class="desc">${esc(f.opis)}</p>` : ''}
          </div>
        </article>`;
      }).join('')}
    </div>`;

  // Filtr tematów (#energia w adresie otwiera od razu dany temat).
  const btns = [...el.querySelectorAll('.lib-tabs button')];
  const filtruj = (k) => {
    if (k && !obecne.includes(k)) k = '';
    btns.forEach((b) => b.setAttribute('aria-pressed', b.dataset.k === k));
    el.querySelectorAll('.vid').forEach((v) => { v.hidden = !!k && v.dataset.k !== k; });
  };
  btns.forEach((b) => b.addEventListener('click', () => {
    history.replaceState(null, '', b.dataset.k ? '#' + b.dataset.k : location.pathname);
    filtruj(b.dataset.k);
  }));
  filtruj(decodeURIComponent(location.hash.slice(1)));

  // Odtwarzacz w oknie (youtube-nocookie, polskie napisy gdy dostępne).
  const dlg = document.getElementById('player');
  const frame = document.getElementById('pl-frame');
  const otworz = (f) => {
    const id = ytId(f.youtube);
    document.getElementById('pl-title').textContent = f.tytul;
    document.getElementById('pl-meta').textContent = [f.autor, f.wydarzenie].filter(Boolean).join(' · ');
    document.getElementById('pl-yt').href = 'https://www.youtube.com/watch?v=' + id;
    frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&hl=pl&cc_lang_pref=pl&cc_load_policy=1"
      title="${esc(f.tytul)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else window.open('https://www.youtube.com/watch?v=' + id, '_blank');
  };
  el.querySelectorAll('.thumb').forEach((b) => b.addEventListener('click', () => otworz(filmy[b.dataset.i])));

  // Link z treści sekcji: filmy.html#film=ID otwiera od razu dany film.
  const m = location.hash.match(/^#film=([\w-]{11})/);
  const zLinku = m && filmy.find((f) => ytId(f.youtube) === m[1]);
  if (zLinku) {
    const karta = el.querySelectorAll('.vid')[filmy.indexOf(zLinku)];
    karta.scrollIntoView({ block: 'center' });
    karta.classList.add('hl');
    otworz(zLinku);
  }
  const zamknij = () => { frame.innerHTML = ''; if (dlg.open) dlg.close(); };
  document.getElementById('pl-close').addEventListener('click', zamknij);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) zamknij(); });
  dlg.addEventListener('close', () => { frame.innerHTML = ''; });
}

biblioteka();
