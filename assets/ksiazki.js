// Polecane książki – treść w tresci/ksiazki.json (edycja w Pages CMS).

const KAT_KSIAZKI = {
  wypalenie: 'Wypalenie',
  energia: 'Energia i stres',
  odpornosc: 'Odporność',
  uwaznosc: 'Uważność i zen',
  przywodztwo: 'Przywództwo i zespół',
};

async function ksiazki() {
  const el = document.getElementById('lib');
  let dane, u;
  try {
    [dane, u] = await Promise.all([wczytajJson('ksiazki.json'), ustawienia().catch(() => ({}))]);
  } catch (e) { bladWczytania(el, e); return; }
  if (u.kontakt) stopka(u);

  const lista = (dane.ksiazki || []).filter((b) => !b.ukryj && (b.tytul || '').trim());
  const obecne = Object.keys(KAT_KSIAZKI).filter((k) => lista.some((b) => b.kategoria === k));
  // Na okładce – tytuł główny (do pierwszej kropki).
  const krotki = (t) => String(t).split(/\.\s/)[0];

  el.innerHTML = `
    ${dane.wstep ? `<p class="lib-lead">${esc(dane.wstep)}</p>` : ''}
    <div class="tabs lib-tabs" role="toolbar" aria-label="Filtruj według tematu">
      <button type="button" data-k="" aria-pressed="true">Wszystkie <span>${lista.length}</span></button>
      ${obecne.map((k) => `<button type="button" data-k="${k}" aria-pressed="false">${KAT_KSIAZKI[k]} <span>${lista.filter((b) => b.kategoria === k).length}</span></button>`).join('')}
    </div>
    <div class="books">
      ${lista.map((b) => `
        <article class="book" data-k="${esc(b.kategoria)}"${b.id ? ` id="k-${esc(b.id)}"` : ''}>
          <div class="cover k-${esc(b.kategoria)}" aria-hidden="true">
            <span class="c-title">${esc(krotki(b.tytul))}</span>
            <span class="c-author">${esc(b.autor)}</span>
          </div>
          <div class="book-body">
            <span class="tag">${esc(KAT_KSIAZKI[b.kategoria] || '')}</span>
            <h2>${esc(b.tytul)}</h2>
            <p class="who">${esc(b.autor)}</p>
            <p class="meta">${[b.tytul_oryginalny ? `oryg. <em>${esc(b.tytul_oryginalny)}</em>` : '', esc(b.wydanie || '')].filter(Boolean).join(' · ')}</p>
            ${b.zajawka ? `<p class="lead">${esc(b.zajawka)}</p>` : ''}
            ${renderMd(b.tresc) ? `<details><summary>Najważniejsze tezy i dlaczego warto</summary><div class="md">${renderMd(b.tresc)}</div></details>` : ''}
            ${b.link ? `<a class="btn shop" href="${esc(b.link)}" target="_blank" rel="noopener">Zobacz w księgarni ↗</a>` : ''}
          </div>
        </article>`).join('')}
    </div>`;

  el.querySelectorAll('.md a[href^="http"]').forEach((a) => { a.target = '_blank'; a.rel = 'noopener'; });
  podepnijFilmy(el);

  const btns = [...el.querySelectorAll('.lib-tabs button')];
  const filtruj = (k) => {
    if (k && !obecne.includes(k)) k = '';
    btns.forEach((b) => b.setAttribute('aria-pressed', b.dataset.k === k));
    el.querySelectorAll('.book').forEach((v) => { v.hidden = !!k && v.dataset.k !== k; });
  };
  btns.forEach((b) => b.addEventListener('click', () => {
    history.replaceState(null, '', b.dataset.k ? '#' + b.dataset.k : location.pathname);
    filtruj(b.dataset.k);
  }));
  filtruj(decodeURIComponent(location.hash.slice(1)));

  // Link z treści sekcji: ksiazki.html#ksiazka=ID rozwija i pokazuje daną książkę.
  const m = location.hash.match(/^#ksiazka=([\w-]+)/);
  const karta = m && document.getElementById('k-' + m[1]);
  if (karta) {
    karta.querySelector('details')?.setAttribute('open', '');
    karta.classList.add('hl');
    karta.scrollIntoView({ block: 'start' });
  }
}

ksiazki();
