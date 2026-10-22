// Strona organizacyjna: dane z arkusza Google przez zaplecze Apps Script (dokumentacja/organizacja-apps-script.gs).
// Każde pole zapisuje się osobno; zapis przekazuje poprzednią wartość, więc zmiana zrobiona w międzyczasie
// w arkuszu nie zostanie po cichu nadpisana.
(function () {
  const API = (window.ORG && window.ORG.api || '').trim();
  const KLUCZ = 'fortum_org_haslo';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let haslo = '';
  let dane = null;         // ostatnia odpowiedź „pobierz”
  let doZapisu = 0;        // zapisy w toku – w tym czasie nie odświeżamy
  let pokazPuste = 0;      // ile pustych wierszy pokazać po „Dodaj uczestnika”

  const pamiec = {
    czytaj() { try { return sessionStorage.getItem(KLUCZ) || localStorage.getItem(KLUCZ) || ''; } catch (e) { return ''; } },
    zapisz(h, trwale) { try { (trwale ? localStorage : sessionStorage).setItem(KLUCZ, h); } catch (e) {} },
    usun() { try { sessionStorage.removeItem(KLUCZ); localStorage.removeItem(KLUCZ); } catch (e) {} },
  };

  async function api(tresc) {
    // Treść jako text/plain – bez zapytania wstępnego CORS, które Apps Script odrzuca.
    const r = await fetch(API, { method: 'POST', body: JSON.stringify({ ...tresc, haslo }) });
    if (!r.ok) throw new Error('Serwer odpowiedział błędem ' + r.status);
    return r.json();
  }

  /* ---------- znaczenie kolumn (po nazwach nagłówków w arkuszu) ---------- */
  function rola(k) {
    if (/^lp\.?$/i.test(k)) return { pole: 'lp' };
    if (/imi/i.test(k)) return { pole: 'imie', typ: 'tekst' };
    if (/mail/i.test(k)) return { pole: 'email', typ: 'tekst', input: 'email' };
    if (/telefon/i.test(k)) return { pole: 'telefon', typ: 'tekst', input: 'tel' };
    if (/deep\s*dive|raport/i.test(k)) return { pole: 'raport', typ: 'data' };
    let m = k.match(/sesja\s*(\d+).*termin/i);
    if (m) return { pole: 'termin', sesja: +m[1], typ: 'datagodz' };
    m = k.match(/sesja\s*(\d+).*status/i);
    if (m) return { pole: 'status', sesja: +m[1], typ: 'tekst' };
    return { pole: 'inne', typ: 'tekst' };
  }

  function model() {
    const kol = dane.kolumny.map((k, j) => ({ nazwa: k, j, ...rola(k) }));
    return dane.wiersze.map((w, i) => {
      const o = { lp: w[0], komorki: {}, sesje: {}, inne: [] };
      kol.forEach((k) => {
        if (k.pole === 'lp') return;
        const c = { kol: k, wart: w[k.j], iso: (dane.daty[i] || [])[k.j] || '' };
        if (k.pole === 'termin' || k.pole === 'status') (o.sesje[k.sesja] = o.sesje[k.sesja] || {})[k.pole] = c;
        else if (k.pole === 'inne') o.inne.push(c);
        else o.komorki[k.pole] = c;
      });
      o.imie = (o.komorki.imie && o.komorki.imie.wart || '').trim();
      return o;
    });
  }

  /* ---------- pola formularza ---------- */
  function pole(lp, c, etykieta, extraKlasa) {
    if (!c) return '';
    const k = c.kol;
    let typ = k.typ, input = k.input || 'text', wart = c.wart;
    if (typ === 'data' || typ === 'datagodz') {
      if (c.iso || !c.wart) { input = typ === 'data' ? 'date' : 'datetime-local'; wart = typ === 'data' ? c.iso.slice(0, 10) : c.iso; }
      else typ = 'tekst'; // w arkuszu jest tekst, nie data – edytujemy jako tekst
    }
    const atr = `data-lp="${esc(lp)}" data-kol="${esc(k.nazwa)}" data-typ="${typ}" data-stara="${esc(c.wart)}"`;
    let ctrl;
    if (k.pole === 'status') {
      const opcje = [''].concat(dane.statusy || []);
      if (c.wart && !opcje.includes(c.wart)) opcje.push(c.wart);
      ctrl = `<select ${atr} aria-label="${esc(k.nazwa)}">${opcje.map((o) => `<option value="${esc(o)}"${o === c.wart ? ' selected' : ''}>${esc(o || '—')}</option>`).join('')}</select>`;
    } else {
      ctrl = `<input type="${input}" ${atr} value="${esc(wart)}" aria-label="${esc(k.nazwa)}"${k.pole === 'imie' ? ' placeholder="Imię i nazwisko"' : ''}>`;
    }
    const link = k.pole === 'email' && c.wart ? `<a class="org-ikon" href="mailto:${esc(c.wart)}" title="Napisz e-mail">✉</a>`
      : k.pole === 'telefon' && c.wart ? `<a class="org-ikon" href="tel:${esc(c.wart.replace(/[^\d+]/g, ''))}" title="Zadzwoń">☎</a>` : '';
    return `<label class="org-pole ${extraKlasa || ''}">${etykieta ? `<span class="org-et">${esc(etykieta)}</span>` : ''}
      <span class="org-ctrl">${ctrl}${link}</span><span class="org-stan" aria-live="polite"></span></label>`;
  }

  function klasaStatusu(s) {
    s = (s || '').toLowerCase();
    return s.startsWith('odbyt') ? 'ok' : s.includes('przełoż') || s.includes('przeloz') ? 'uwaga' : s ? 'plan' : '';
  }

  function karta(o) {
    const sesje = Object.keys(o.sesje).sort((a, b) => a - b).map((s) => {
      const x = o.sesje[s], st = x.status ? x.status.wart : '';
      return `<div class="org-sesja ${klasaStatusu(st)}"><span class="org-sn">Sesja ${esc(s)}</span>
        ${pole(o.lp, x.termin, 'Termin')}${pole(o.lp, x.status, 'Status')}</div>`;
    }).join('');
    return `<article class="org-karta${o.imie ? '' : ' nowa'}" data-lp="${esc(o.lp)}">
      <div class="org-kh"><span class="org-lp">${esc(o.lp)}</span>${pole(o.lp, o.komorki.imie, '', 'org-imie')}</div>
      <div class="org-kontakt">${pole(o.lp, o.komorki.email, 'E-mail')}${pole(o.lp, o.komorki.telefon, 'Telefon')}</div>
      ${pole(o.lp, o.komorki.raport, 'Raport Deep Dive')}
      <div class="org-sesje">${sesje}</div>
      ${o.inne.map((c) => pole(o.lp, c, c.kol.nazwa)).join('')}
    </article>`;
  }

  /* ---------- podsumowanie i listy ---------- */
  const fmt = new Intl.DateTimeFormat('pl-PL', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const doDaty = (iso) => { const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/); return m ? new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) : null; };

  function podsumowanie(lista) {
    const ucz = lista.filter((o) => o.imie), n = ucz.length;
    let raporty = 0, terminy = 0, odbyte = 0, przel = 0, wszystkie = 0;
    const najbl = [], zaleg = [], teraz = Date.now();
    ucz.forEach((o) => {
      if (o.komorki.raport && o.komorki.raport.wart) raporty++;
      else zaleg.push(`${esc(o.imie)} – brak raportu Deep Dive`);
      Object.keys(o.sesje).forEach((s) => {
        const x = o.sesje[s], st = (x.status && x.status.wart || '').trim();
        wszystkie++;
        if (x.termin && x.termin.wart) terminy++;
        if (/^odbyt/i.test(st)) odbyte++;
        if (/prze[łl]o[żz]/i.test(st)) { przel++; zaleg.push(`${esc(o.imie)} – sesja ${s} do przełożenia`); }
        const d = x.termin && x.termin.iso ? doDaty(x.termin.iso) : null;
        if (d && d.getTime() >= teraz - 2 * 3600e3 && !/^odbyt/i.test(st)) najbl.push({ d, t: `${esc(o.imie)} · sesja ${s}`, st });
        if (d && d.getTime() < teraz - 2 * 3600e3 && !/^odbyt|prze[łl]o[żz]/i.test(st)) zaleg.push(`${esc(o.imie)} – sesja ${s} (${esc(x.termin.wart)}): uzupełnij status`);
      });
    });
    $('#podsumowanie').innerHTML = [
      ['Uczestnicy', n, ''], ['Raporty Deep Dive', raporty, n], ['Sesje z terminem', terminy, wszystkie],
      ['Sesje odbyte', odbyte, wszystkie], ...(przel ? [['Do przełożenia', przel, '']] : []),
    ].map(([t, a, b]) => `<div class="org-kafel"><b>${a}${b !== '' ? `<small> z ${b}</small>` : ''}</b><span>${t}</span></div>`).join('');
    najbl.sort((a, b) => a.d - b.d);
    $('#najblizsze').innerHTML = najbl.length
      ? najbl.slice(0, 10).map((x) => `<li><time>${fmt.format(x.d)}</time> ${x.t}${x.st ? ` <span class="org-tag ${klasaStatusu(x.st)}">${esc(x.st)}</span>` : ''}</li>`).join('')
      : '<li class="org-pusto">Brak zaplanowanych sesji.</li>';
    $('#zalegle').innerHTML = zaleg.length ? zaleg.map((t) => `<li>${t}</li>`).join('') : '<li class="org-pusto">Wszystko aktualne.</li>';
  }

  function rysuj() {
    const lista = model();
    const pelne = lista.filter((o) => o.imie), puste = lista.filter((o) => !o.imie);
    $('#uczestnicy').innerHTML = pelne.concat(puste.slice(0, pokazPuste)).map(karta).join('')
      || '<p class="org-pusto">Brak uczestników – dodaj pierwszą osobę.</p>';
    $('#b-dodaj').hidden = puste.length <= pokazPuste;
    $('#b-arkusz').href = dane.arkusz || '#';
    $('#b-arkusz').hidden = !dane.arkusz;
    $('.org-czas').textContent = 'Dane z arkusza: ' + new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    podsumowanie(lista);
  }

  function komunikat(el, tekst, blad) {
    el.textContent = tekst || '';
    el.classList.toggle('err', !!blad);
  }

  /* ---------- pobieranie ---------- */
  async function pobierz(cicho) {
    const msg = $('.org-msg-glob');
    if (!cicho) komunikat(msg, 'Wczytuję dane z arkusza…');
    let r;
    try { r = await api({ akcja: 'pobierz' }); }
    catch (e) { komunikat(msg, 'Brak połączenia z arkuszem. Sprawdź internet i spróbuj „Odśwież”.', true); return false; }
    if (!r.ok) {
      if (r.kod === 'haslo' || r.kod === 'blokada' || r.kod === 'brak_hasla') { wyloguj(r.blad); return false; }
      komunikat(msg, r.blad || 'Nie udało się wczytać danych.', true); return false;
    }
    dane = r;
    komunikat(msg, '');
    rysuj();
    return true;
  }

  /* ---------- zapis pojedynczego pola ---------- */
  async function zapisz(el) {
    const typ = el.dataset.typ;
    let nowa = el.value;
    if (typ === 'datagodz' && nowa && nowa.length === 10) nowa += 'T00:00';
    const stan = el.closest('.org-pole').querySelector('.org-stan');
    stan.className = 'org-stan trwa'; stan.textContent = 'Zapisuję…';
    doZapisu++;
    try {
      const r = await api({ akcja: 'zapisz', lp: el.dataset.lp, kolumna: el.dataset.kol, stara: el.dataset.stara, nowa, typ });
      if (r.ok) {
        el.dataset.stara = r.wartosc;
        aktualizujModel(el.dataset.lp, el.dataset.kol, r.wartosc, r.iso);
        stan.className = 'org-stan ok'; stan.textContent = '✓ Zapisano';
        if (r.kalendarz && r.kalendarz !== 'ok') komunikat($('.org-msg-glob'), 'Zapisano w arkuszu, ale kalendarz Google się nie zaktualizował (' + r.kalendarz + '). Kalendarz nadrobi zmiany przy następnej synchronizacji (co 15 minut).', true);
        setTimeout(() => { if (stan.textContent === '✓ Zapisano') { stan.textContent = ''; stan.className = 'org-stan'; } }, 2500);
        if (/imi/i.test(el.dataset.kol) || /status/i.test(el.dataset.kol)) {
          // imię i status zmieniają wygląd karty i listy – przerysuj, gdy nic nie jest edytowane
          setTimeout(() => { if (!doZapisu && !document.activeElement.closest('.org-pole')) rysuj(); else podsumowanie(model()); }, 50);
        } else podsumowanie(model());
      } else if (r.kod === 'konflikt') {
        doZapisu--; await pobierz(true); doZapisu++;
        komunikat($('.org-msg-glob'), `Pole „${el.dataset.kol}” zmieniło się w międzyczasie w arkuszu (teraz: „${r.teraz || 'puste'}”). Wczytałem aktualne dane – wprowadź zmianę ponownie, jeśli nadal jest potrzebna.`, true);
      } else if (r.kod === 'haslo' || r.kod === 'blokada') {
        wyloguj(r.blad);
      } else {
        stan.className = 'org-stan err'; stan.textContent = r.blad || 'Nie zapisano';
      }
    } catch (e) {
      stan.className = 'org-stan err'; stan.textContent = 'Brak połączenia – nie zapisano';
    } finally { doZapisu--; }
  }

  function aktualizujModel(lp, kol, wart, iso) {
    const i = dane.wiersze.findIndex((w) => String(w[0]) === String(lp));
    const j = dane.kolumny.indexOf(kol);
    if (i < 0 || j < 0) return;
    dane.wiersze[i][j] = wart;
    (dane.daty[i] = dane.daty[i] || [])[j] = iso || '';
  }

  /* ---------- logowanie ---------- */
  function wyloguj(powod) {
    haslo = ''; dane = null; pamiec.usun();
    $('#panel').hidden = true; $('#logowanie').hidden = false;
    komunikat($('#f-login .org-msg'), powod || '', !!powod);
    $('#haslo').value = ''; $('#haslo').focus();
  }

  async function zaloguj(h, trwale) {
    haslo = h;
    $('#logowanie').hidden = true; $('#panel').hidden = false;
    if (await pobierz()) pamiec.zapisz(h, trwale);
  }

  if (!API) { $('#brak-konfiguracji').hidden = false; return; }

  $('#f-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const b = e.target.querySelector('button'); b.disabled = true;
    komunikat($('#f-login .org-msg'), 'Sprawdzam…');
    await zaloguj($('#haslo').value, $('#pamietaj').checked);
    b.disabled = false;
  });
  $('#b-wyloguj').addEventListener('click', () => wyloguj());
  $('#b-odswiez').addEventListener('click', () => pobierz());
  $('#b-dodaj').addEventListener('click', () => {
    pokazPuste++; rysuj();
    const ost = [...document.querySelectorAll('.org-karta.nowa')].pop();
    if (ost) { ost.scrollIntoView({ behavior: 'smooth', block: 'center' }); ost.querySelector('input').focus(); }
  });
  // Zapis po zmianie pola (dla pól tekstowych – po opuszczeniu pola).
  $('#uczestnicy').addEventListener('change', (e) => {
    if (e.target.dataset && e.target.dataset.kol) zapisz(e.target);
  });

  // Zmiany zrobione w arkuszu: odświeżanie co minutę i po powrocie do karty – gdy nic nie jest edytowane.
  const mozna = () => dane && !document.hidden && !doZapisu && !(document.activeElement && document.activeElement.closest('.org-pole'));
  setInterval(() => { if (mozna()) pobierz(true); }, 60000);
  document.addEventListener('visibilitychange', () => { if (mozna()) pobierz(true); });

  const zapisane = pamiec.czytaj();
  if (zapisane) zaloguj(zapisane, !!(function () { try { return localStorage.getItem(KLUCZ); } catch (e) { return null; } })());
  else wyloguj();
})();
