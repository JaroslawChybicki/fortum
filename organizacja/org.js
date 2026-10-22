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
    if (/stanowisk|job title/i.test(k)) return { pole: 'stanowisko', typ: 'tekst' };
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
      ctrl = `<input type="${input}" ${atr} value="${esc(wart)}" aria-label="${esc(k.nazwa)}"${k.pole === 'imie' ? ' placeholder="Imię i nazwisko"' : k.pole === 'stanowisko' ? ' placeholder="Stanowisko"' : ''}>`;
    }
    const link = k.pole === 'email' && c.wart ? `<a class="org-ikon" href="mailto:${esc(c.wart)}" title="Napisz e-mail">✉</a>`
      : k.pole === 'telefon' && c.wart ? `<a class="org-ikon" href="tel:${esc(c.wart.replace(/[^\d+]/g, ''))}" title="Zadzwoń">☎</a>` : '';
    return `<label class="org-pole ${extraKlasa || ''}">${etykieta ? `<span class="org-et">${esc(etykieta)}</span>` : ''}
      <span class="org-ctrl">${ctrl}${link}</span><span class="org-stan" aria-live="polite"></span></label>`;
  }

  // Link do spotkania Teams (z zaproszenia w Gmailu), jeśli skrypt go zna.
  function teamsLink(lp, s) {
    const url = dane && dane.teams && dane.teams[lp + '|' + s];
    return url && /^https:\/\/teams\.microsoft\.com\//.test(url)
      ? ` <a class="org-teams" href="${esc(url)}" target="_blank" rel="noopener" title="Dołącz do spotkania w Microsoft Teams">Teams ↗</a>` : '';
  }

  function klasaStatusu(s) {
    s = (s || '').toLowerCase();
    return s.startsWith('odbyt') ? 'ok' : s.includes('przełoż') || s.includes('przeloz') ? 'uwaga' : s ? 'plan' : '';
  }

  function karta(o) {
    const sesje = Object.keys(o.sesje).sort((a, b) => a - b).map((s) => {
      const x = o.sesje[s], st = x.status ? x.status.wart : '';
      return `<div class="org-sesja ${klasaStatusu(st)}"><span class="org-sn">Sesja ${esc(s)}${teamsLink(o.lp, s)}</span>
        ${pole(o.lp, x.termin, 'Termin')}${pole(o.lp, x.status, 'Status')}</div>`;
    }).join('');
    return `<article class="org-karta${o.imie ? '' : ' nowa'}" data-lp="${esc(o.lp)}">
      <div class="org-kh"><span class="org-lp">${esc(o.lp)}</span>${pole(o.lp, o.komorki.imie, '', 'org-imie')}</div>
      ${pole(o.lp, o.komorki.stanowisko, '', 'org-stanowisko')}
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
        if (d && d.getTime() >= teraz - 2 * 3600e3 && !/^odbyt/i.test(st)) najbl.push({ d, t: `${esc(o.imie)} · sesja ${s}${teamsLink(o.lp, s)}`, st });
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
    ((dane.kalendarz && dane.kalendarz.uwagi) || []).slice().reverse().forEach((u) =>
      zaleg.push(`<span class="org-tag">automat ${esc(new Date(u.czas).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }))}</span> ${esc(u.tekst)}`));
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
    // Stan synchronizacji z Kalendarzem Google: nowa wersja skryptu zawsze zwraca pole „kalendarz” (null = wyłączona).
    const ks = $('.org-kalstan');
    if (!('kalendarz' in dane)) { ks.className = 'org-kalstan uwaga'; ks.textContent = 'Kalendarz Google: wdrożona jest starsza wersja skryptu (Apps Script → Wdróż → Zarządzaj wdrożeniami → Nowa wersja).'; }
    else if (!dane.kalendarz) { ks.className = 'org-kalstan uwaga'; ks.textContent = 'Kalendarz Google: synchronizacja wyłączona (arkusz → menu „Strona organizacyjna” → „Włącz synchronizację z kalendarzem”).'; }
    else { ks.className = 'org-kalstan ok'; ks.textContent = 'Kalendarz Google: synchronizacja włączona'; }
    $('.org-czas').textContent = 'Dane z arkusza: ' + new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    pochodne(lista);
  }

  function pochodne(lista) { podsumowanie(lista); kalendarz(lista); }

  /* ---------- kalendarz sesji (tydzień / miesiąc) ---------- */
  const DNI = ['pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.', 'niedz.'];
  const GODZ_OD = 8, GODZ_DO = 19, H = 44;      // siatka tygodnia: godziny i wysokość godziny w px
  const kal = { widok: 'miesiac', kursor: new Date(), wybrany: null };
  try { kal.widok = localStorage.getItem('fortum_org_widok') || kal.widok; } catch (e) {}
  const dzien = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const klucz = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dodajDni = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const poniedzialek = (d) => dodajDni(dzien(d), -((d.getDay() + 6) % 7));
  const hhmm = (d) => d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

  function wydarzenia(lista) {
    const ev = [];
    lista.filter((o) => o.imie).forEach((o) => Object.keys(o.sesje).forEach((s) => {
      const x = o.sesje[s], d = x.termin && x.termin.iso ? doDaty(x.termin.iso) : null;
      if (!d) return;
      const st = (x.status && x.status.wart || '').trim();
      const minela = d.getTime() < Date.now();
      ev.push({ d, koniec: new Date(d.getTime() + 3600e3), lp: o.lp, sesja: s, imie: o.imie, status: st,
        klasa: klasaStatusu(st) || (minela ? 'bez' : 'plan') });
    }));
    ((window.ORG && window.ORG.etapy) || []).forEach((e) => {
      const m = String(e.data || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
      if (m) ev.push({ d: new Date(+m[1], m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)), etap: true, caly: !m[4], tytul: e.tytul || 'Etap programu', klasa: 'etap' });
    });
    return ev.sort((a, b) => a.d - b.d);
  }

  function chip(e, krotko) {
    if (e.etap) return `<span class="kal-ev etap" title="${esc(e.tytul)}">${e.caly ? '' : `<b>${hhmm(e.d)}</b> `}${esc(e.tytul)}</span>`;
    const opis = `${hhmm(e.d)} ${e.imie} · sesja ${e.sesja}${e.status ? ' · ' + e.status : ''}`;
    return `<button type="button" class="kal-ev ${e.klasa}" data-lp="${esc(e.lp)}" data-sesja="${esc(e.sesja)}" title="${esc(opis)}">` +
      `<b>${hhmm(e.d)}</b> ${esc(krotko ? e.imie.split(' ')[0] : e.imie)} <small>S${esc(e.sesja)}</small></button>`;
  }

  function agenda(d, ev) {
    const dnia = ev.filter((e) => klucz(e.d) === klucz(d));
    const tytul = d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
    return `<div class="kal-agenda"><h3>${esc(tytul)}</h3>${dnia.length ? `<ul>${dnia.map((e) => `<li>${chip(e)}</li>`).join('')}</ul>`
      : '<p class="org-pusto">Brak sesji tego dnia.</p>'}</div>`;
  }

  function kalendarz(lista) {
    const host = $('#kalendarz');
    if (!host || !dane) return;
    const ev = wydarzenia(lista || model());
    const dzis = klucz(new Date());
    document.querySelectorAll('.kal-widok button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.widok === kal.widok));
    let html = '', tytul = '';
    if (kal.widok === 'miesiac') {
      const k = kal.kursor, pierwszy = new Date(k.getFullYear(), k.getMonth(), 1);
      const start = poniedzialek(pierwszy);
      const tyg = Math.ceil(((pierwszy.getDay() + 6) % 7 + new Date(k.getFullYear(), k.getMonth() + 1, 0).getDate()) / 7);
      tytul = pierwszy.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
      if (!kal.wybrany || kal.wybrany.getMonth() !== k.getMonth()) {
        kal.wybrany = new Date().getMonth() === k.getMonth() && new Date().getFullYear() === k.getFullYear()
          ? dzien(new Date()) : ((ev.find((e) => e.d.getMonth() === k.getMonth() && e.d.getFullYear() === k.getFullYear()) || {}).d || pierwszy);
        kal.wybrany = dzien(kal.wybrany);
      }
      html = `<div class="kal-mies" role="grid">${DNI.map((n) => `<div class="kal-dn" role="columnheader">${n}</div>`).join('')}` +
        Array.from({ length: tyg * 7 }, (_, i) => {
          const d = dodajDni(start, i), kk = klucz(d), dnia = ev.filter((e) => klucz(e.d) === kk);
          const kl = ['kal-dzien', d.getMonth() !== k.getMonth() ? 'inny' : '', kk === dzis ? 'dzis' : '', kk === klucz(kal.wybrany) ? 'wybrany' : ''].join(' ');
          return `<div class="${kl}" role="gridcell" data-d="${kk}" tabindex="0" aria-label="${esc(d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' }))}: ${dnia.length} wydarzeń">` +
            `<span class="kal-nr">${d.getDate()}</span><div class="kal-lista">${dnia.map((e) => chip(e, true)).join('')}</div>` +
            `<div class="kal-kropki">${dnia.map((e) => `<i class="${e.klasa}"></i>`).join('')}</div></div>`;
        }).join('') + '</div>' + agenda(kal.wybrany, ev);
    } else {
      const start = poniedzialek(kal.kursor), dni = Array.from({ length: 7 }, (_, i) => dodajDni(start, i));
      const koniec = dni[6];
      tytul = start.getMonth() === koniec.getMonth()
        ? `${start.getDate()}–${koniec.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}`
        : `${start.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })} – ${koniec.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      const wTyg = ev.filter((e) => e.d >= start && e.d < dodajDni(start, 7));
      let od = GODZ_OD, doG = GODZ_DO;
      wTyg.filter((e) => !e.caly).forEach((e) => { od = Math.min(od, e.d.getHours()); doG = Math.max(doG, Math.min(24, e.d.getHours() + 2)); });
      const godziny = Array.from({ length: doG - od }, (_, i) => od + i);
      const kolumna = (d) => {
        const dnia = wTyg.filter((e) => klucz(e.d) === klucz(d) && !e.caly);
        const pasy = [];   // nakładające się sesje obok siebie
        dnia.forEach((e) => { let p = pasy.findIndex((k) => k <= e.d.getTime()); if (p < 0) { p = pasy.length; pasy.push(0); } pasy[p] = e.koniec ? e.koniec.getTime() : e.d.getTime() + 3600e3; e.pas = p; });
        return dnia.map((e) => {
          const top = ((e.d.getHours() - od) * 60 + e.d.getMinutes()) / 60 * H;
          const w = 100 / Math.max(1, pasy.length);
          return `<div class="kal-blok" style="top:${top}px;height:${H - 2}px;left:${e.pas * w}%;width:${w}%">${chip(e, pasy.length > 1)}</div>`;
        }).join('');
      };
      html = `<div class="kal-tyg" style="--h:${H}px">
        <div class="kal-tg-glowa"><div></div>${dni.map((d) => `<div class="kal-dn${klucz(d) === dzis ? ' dzis' : ''}">${DNI[(d.getDay() + 6) % 7]} <b>${d.getDate()}</b></div>`).join('')}</div>
        <div class="kal-tg-caly"><div class="kal-h">cały dzień</div>${dni.map((d) => `<div>${wTyg.filter((e) => e.caly && klucz(e.d) === klucz(d)).map((e) => chip(e)).join('')}</div>`).join('')}</div>
        <div class="kal-tg-siatka" style="height:${godziny.length * H}px"><div class="kal-h">${godziny.map((g) => `<span style="height:${H}px">${g}:00</span>`).join('')}</div>
          ${dni.map((d) => `<div class="kal-kol${klucz(d) === dzis ? ' dzis' : ''}">${kolumna(d)}</div>`).join('')}</div>
      </div>
      <div class="kal-tyg-lista">${dni.map((d) => agenda(d, ev)).join('')}</div>`;
    }
    $('.kal-tytul').textContent = tytul;
    host.innerHTML = html;
  }

  // Kliknięcie sesji w kalendarzu: przejście do jej terminu w karcie uczestnika.
  function pokazSesje(lp, sesja) {
    const karta = document.querySelector(`.org-karta[data-lp="${CSS.escape(lp)}"]`);
    if (!karta) return;
    const nr = [...karta.querySelectorAll('.org-sn')].findIndex((s) => s.textContent.trim() === 'Sesja ' + sesja);
    const el = nr >= 0 ? karta.querySelectorAll('.org-sesja')[nr] : karta;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('podswietl'); setTimeout(() => el.classList.remove('podswietl'), 1800);
    const inp = el.querySelector('input'); if (inp) inp.focus({ preventScroll: true });
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
          setTimeout(() => { if (!doZapisu && !document.activeElement.closest('.org-pole')) rysuj(); else pochodne(model()); }, 50);
        } else pochodne(model());
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
  document.querySelectorAll('.kal-widok button').forEach((b) => b.addEventListener('click', () => {
    kal.widok = b.dataset.widok;
    try { localStorage.setItem('fortum_org_widok', kal.widok); } catch (e) {}
    if (kal.widok === 'miesiac' && kal.wybrany) kal.kursor = kal.wybrany;
    kalendarz();
  }));
  document.querySelectorAll('.kal-nav button').forEach((b) => b.addEventListener('click', () => {
    const n = +b.dataset.krok, k = kal.kursor;
    if (!n) { kal.kursor = new Date(); kal.wybrany = dzien(new Date()); }
    else if (kal.widok === 'miesiac') { kal.kursor = new Date(k.getFullYear(), k.getMonth() + n, 1); kal.wybrany = null; }
    else kal.kursor = dodajDni(k, 7 * n);
    kalendarz();
  }));
  $('#kalendarz').addEventListener('click', (e) => {
    const s = e.target.closest('button.kal-ev[data-lp]');
    if (s) { pokazSesje(s.dataset.lp, s.dataset.sesja); return; }
    const d = e.target.closest('.kal-dzien');
    if (d) { const [y, m, dd] = d.dataset.d.split('-').map(Number); kal.wybrany = new Date(y, m - 1, dd); kal.kursor = kal.wybrany; kalendarz(); }
  });
  $('#kalendarz').addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('kal-dzien')) { e.preventDefault(); e.target.click(); }
  });
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
