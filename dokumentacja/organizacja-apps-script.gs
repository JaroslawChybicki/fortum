/**
 * Strona organizacyjna „Odporni i gotowi – Fortum” – zaplecze w arkuszu Google.
 *
 * Arkusz jest jedynym źródłem danych: strona (…/organizacja/) czyta i zapisuje te same komórki,
 * które można edytować bezpośrednio w arkuszu. Hasło jest sprawdzane tutaj, po stronie Google –
 * bez hasła skrypt nie zwraca żadnych danych.
 *
 * Instalacja (raz, na komputerze):
 *   1. W arkuszu: Rozszerzenia → Apps Script → wklej cały ten plik w miejsce zawartości Kod.gs → Zapisz.
 *   2. Wróć do arkusza, odśwież kartę → menu „Strona organizacyjna” → „Ustaw lub zmień hasło”
 *      (przy pierwszym użyciu Google poprosi o autoryzację skryptu).
 *   3. W Apps Script: Wdróż → Nowe wdrożenie → typ „Aplikacja internetowa”;
 *      Wykonaj jako: Ja; Kto ma dostęp: Każdy → Wdróż → skopiuj adres URL kończący się na /exec.
 *   4. Adres wpisz w pliku organizacja/konfiguracja.js na stronie.
 * Zmiana kodu wymaga nowej wersji wdrożenia: Wdróż → Zarządzaj wdrożeniami → ołówek → Wersja: nowa.
 *
 * Kalendarz Google (w obie strony): menu „Strona organizacyjna” → „Włącz synchronizację z kalendarzem”.
 * Terminy sesji trafiają do Twojego głównego kalendarza jako prywatne wydarzenia, bez zaproszeń. Przesunięcie
 * lub usunięcie wydarzenia w kalendarzu zmienia arkusz; nową sesję dodasz w kalendarzu tytułem „Fortum S2 Nazwisko”.
 * Skrypt zmienia wyłącznie wydarzenia sesji (utworzone przez siebie albo z tytułem zaczynającym się od „Fortum”).
 *
 * Raporty Deep Dive: co godzinę skrypt sprawdza folder FOLDER_RAPORTOW i wpisuje do pustej kolumny
 * „Raport Deep Dive (data)” datę z nazwy pliku „RRRR-MM-DD_Nazwisko_Imię_DeepDive.pdf”. Treści raportów nie otwiera.
 */

const KARTA = 'Uczestnicy';  // nazwa karty z danymi; gdy jej brak – pierwsza karta arkusza
// Kolumny, które NIGDY nie trafiają na stronę i nie mogą być z niej zmienione (np. hasła do stref uczestników).
const UKRYTE = /has[łl]o|adres strony/i;
const CZAS_SESJI_MIN = 60;   // długość wydarzenia w kalendarzu
const TYTUL_SESJI = 'Fortum · Sesja';
// Folder z raportami Deep Dive; nazwy plików: RRRR-MM-DD_Nazwisko_Imię_DeepDive.pdf. Skrypt czyta WYŁĄCZNIE nazwy plików.
const FOLDER_RAPORTOW = '1TE8K1Xk2RiBsfOkcElO_jwVo0tjxNvK-';
const STREFA = 'Europe/Warsaw';   // strefa czasowa terminów (arkusz po konwersji z .xlsx bywa ustawiony na inną)
const MAKS_BLEDOW = 8;       // tyle błędnych haseł…
const BLOKADA_S = 15 * 60;   // …blokuje logowanie na 15 minut

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Strona organizacyjna')
    .addItem('Ustaw lub zmień hasło', 'ustawHaslo')
    .addItem('Odblokuj logowanie', 'odblokuj')
    .addSeparator()
    .addItem('Włącz synchronizację z kalendarzem', 'wlaczKalendarz')
    .addItem('Synchronizuj kalendarz teraz', 'synchronizujZMenu')
    .addItem('Wyłącz synchronizację z kalendarzem', 'wylaczKalendarz')
    .addSeparator()
    .addItem('Sprawdź raporty Deep Dive teraz', 'sprawdzRaportyZMenu')
    .addToUi();
}

function ustawHaslo() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Hasło do strony organizacyjnej',
    'Wpisz nowe hasło (co najmniej 10 znaków). Poprzednie hasło przestanie działać.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const haslo = r.getResponseText().trim();
  if (haslo.length < 10) { ui.alert('Hasło musi mieć co najmniej 10 znaków. Nic nie zmieniono.'); return; }
  PropertiesService.getScriptProperties().setProperty('HASLO', skrot(haslo));
  CacheService.getScriptCache().remove('bledy');
  ui.alert('Hasło zapisane. Osoby zalogowane starym hasłem zostaną poproszone o nowe.');
}

function odblokuj() {
  CacheService.getScriptCache().remove('bledy');
  SpreadsheetApp.getUi().alert('Logowanie odblokowane.');
}

// Przechowujemy tylko skrót hasła (SHA-256), nie samo hasło.
function skrot(tekst) {
  return Utilities.base64Encode(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, 'odporni-i-gotowi|' + tekst, Utilities.Charset.UTF_8));
}

function doGet() {
  return json({ ok: true, info: 'Zaplecze strony organizacyjnej działa. Dane są dostępne tylko przez stronę, po podaniu hasła.' });
}

function doPost(e) {
  let z;
  try { z = JSON.parse(e.postData.contents); } catch (x) { return json({ ok: false, blad: 'Nieprawidłowe żądanie.' }); }

  const cache = CacheService.getScriptCache();
  const bledy = Number(cache.get('bledy') || 0);
  if (bledy >= MAKS_BLEDOW) {
    return json({ ok: false, kod: 'blokada', blad: 'Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za 15 minut.' });
  }
  const wzor = PropertiesService.getScriptProperties().getProperty('HASLO');
  if (!wzor) {
    return json({ ok: false, kod: 'brak_hasla', blad: 'Hasło nie zostało jeszcze ustawione (arkusz → menu „Strona organizacyjna”).' });
  }
  if (!z.haslo || skrot(String(z.haslo)) !== wzor) {
    cache.put('bledy', String(bledy + 1), BLOKADA_S);
    Utilities.sleep(1500);
    return json({ ok: false, kod: 'haslo', blad: 'Nieprawidłowe hasło.' });
  }

  try {
    if (z.akcja === 'pobierz') return json(pobierz());
    if (z.akcja === 'zapisz') {
      const w = zapisz(z);
      if (w.ok && kalendarzWlaczony()) {
        try { synchronizujKalendarz(); w.kalendarz = 'ok'; } catch (x) { w.kalendarz = x.message; }
      }
      return json(w);
    }
    return json({ ok: false, blad: 'Nieznana akcja.' });
  } catch (x) {
    return json({ ok: false, blad: 'Błąd arkusza: ' + x.message });
  }
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function karta() {
  const ss = SpreadsheetApp.getActive();
  return (KARTA && ss.getSheetByName(KARTA)) || ss.getSheets()[0];
}

// Układ tabeli: wiersz nagłówka to ten z „Lp.” w kolumnie A; dane to kolejne wiersze z numerem w kolumnie A.
// Dzięki temu można dopisywać kolumny, wiersze nad tabelą i podsumowanie pod nią.
function uklad(sh) {
  const ost = sh.getLastRow();
  const a = sh.getRange(1, 1, Math.max(ost, 1), 1).getDisplayValues();
  const naglowek = a.findIndex((r) => r[0].trim() === 'Lp.') + 1;
  if (!naglowek) throw new Error('Nie znaleziono wiersza nagłówka (komórka „Lp.” w kolumnie A).');
  let koniec = naglowek;
  while (koniec < ost && /^\d+$/.test(a[koniec][0].trim())) koniec++;
  const kolumny = sh.getRange(naglowek, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map((s) => s.trim());
  while (kolumny.length && !kolumny[kolumny.length - 1]) kolumny.pop();
  // Indeksy kolumn widocznych na stronie (bez ukrytych i bez kolumn bez nagłówka).
  const widoczne = kolumny.map((k, i) => i).filter((i) => i === 0 || (kolumny[i] && !UKRYTE.test(kolumny[i])));
  return { pierwszy: naglowek + 1, liczba: koniec - naglowek, kolumny, widoczne };
}

function iso(v, tz) {
  return v instanceof Date ? Utilities.formatDate(v, tz, "yyyy-MM-dd'T'HH:mm") : '';
}

function pobierz() {
  const sh = karta(), u = uklad(sh), tz = sh.getParent().getSpreadsheetTimeZone();
  const tylko = (r) => u.widoczne.map((i) => r[i]);
  let wiersze = [], daty = [];
  if (u.liczba) {
    const zakres = sh.getRange(u.pierwszy, 1, u.liczba, u.kolumny.length);
    wiersze = zakres.getDisplayValues().map(tylko);
    daty = zakres.getValues().map((r) => tylko(r).map((v) => iso(v, tz)));
  }
  return {
    ok: true, kolumny: tylko(u.kolumny), wiersze, daty,
    statusy: statusy(sh, u), arkusz: sh.getParent().getUrl(), czas: new Date().toISOString(),
    kalendarz: kalendarzWlaczony() ? { uwagi: uwagiKalendarza() } : null,
  };
}

// Lista statusów pochodzi z reguły sprawdzania poprawności danych w kolumnie statusu.
function statusy(sh, u) {
  const i = u.kolumny.findIndex((k) => /status/i.test(k));
  if (i < 0 || !u.liczba) return [];
  const r = sh.getRange(u.pierwszy, i + 1).getDataValidation();
  if (!r || r.getCriteriaType() !== SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) return [];
  return r.getCriteriaValues()[0].map(String);
}

function zapisz(z) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = karta(), u = uklad(sh), tz = sh.getParent().getSpreadsheetTimeZone();
    const k = u.kolumny.indexOf(String(z.kolumna));
    if (k < 1 || u.widoczne.indexOf(k) < 0) throw new Error('Tej kolumny nie można edytować ze strony: „' + z.kolumna + '”.');
    const lpy = u.liczba ? sh.getRange(u.pierwszy, 1, u.liczba, 1).getDisplayValues().map((r) => r[0].trim()) : [];
    const i = lpy.indexOf(String(z.lp));
    if (i < 0) throw new Error('Nie ma wiersza nr ' + z.lp + '.');

    const kom = sh.getRange(u.pierwszy + i, k + 1);
    const teraz = kom.getDisplayValue();
    // Ochrona przed nadpisaniem zmiany zrobionej w międzyczasie (np. w arkuszu).
    if (teraz !== String(z.stara == null ? '' : z.stara)) {
      return { ok: false, kod: 'konflikt', blad: 'To pole zmieniło się w międzyczasie (np. w arkuszu).', teraz };
    }

    const nowa = String(z.nowa == null ? '' : z.nowa).trim().slice(0, 300);
    if (!nowa) {
      kom.clearContent();
    } else if (z.typ === 'data' || z.typ === 'datagodz') {
      const m = nowa.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
      if (!m) throw new Error('Nieprawidłowa data: ' + nowa);
      const d = Utilities.parseDate(`${m[1]}-${m[2]}-${m[3]} ${m[4] || '00'}:${m[5] || '00'}`, tz, 'yyyy-MM-dd HH:mm');
      kom.setValue(d).setNumberFormat(z.typ === 'data' ? 'dd.mm.yyyy' : 'dd.mm.yyyy hh:mm');
    } else {
      // Format tekstowy: „+48 …” albo „=…” zostają tekstem, a nie formułą.
      kom.setNumberFormat('@').setValue(nowa);
    }
    SpreadsheetApp.flush();
    return { ok: true, wartosc: kom.getDisplayValue(), iso: iso(kom.getValue(), tz) };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- Kalendarz Google (synchronizacja w obie strony) ---------------- */
// Zasady (decyzja właściciela 22.10.2026):
// • nowy lub zmieniony termin w arkuszu/na stronie → wydarzenie w głównym kalendarzu (prywatne, bez zaproszeń);
// • przesunięcie wydarzenia sesji w kalendarzu → nowy termin w arkuszu;
// • nowe wydarzenie z tytułem „Fortum … S2 … Nazwisko” → termin w arkuszu (skrypt rozpoznaje sesję i osobę);
// • usunięcie wydarzenia w kalendarzu → termin znika z arkusza; usunięcie terminu w arkuszu → wydarzenie znika;
// • zmiana po obu stronach naraz → wygrywa arkusz (z uwagą na stronie).
// Skrypt zmienia tylko wydarzenia sesji: utworzone przez siebie albo przejęte z tytułem „Fortum…”.

const OKNO_WSTECZ_DNI = 90, OKNO_NAPRZOD_DNI = 240;   // zakres kalendarza sprawdzany przy synchronizacji

const kalendarzWlaczony = () => PropertiesService.getScriptProperties().getProperty('KAL_WLACZONA') === '1';
const minuty = (d) => (d ? Math.round(d.getTime() / 60000) : null);
const bezOgonkow = (t) => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');

function usunWyzwalacze() {
  ScriptApp.getProjectTriggers()
    .filter((t) => ['poEdycji', 'synchronizujKalendarz', 'sprawdzRaporty'].includes(t.getHandlerFunction()))
    .forEach((t) => ScriptApp.deleteTrigger(t));
}

function wlaczKalendarz() {
  const ui = SpreadsheetApp.getUi();
  usunWyzwalacze();
  ScriptApp.newTrigger('poEdycji').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  ScriptApp.newTrigger('synchronizujKalendarz').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('synchronizujKalendarz').forUserCalendar(Session.getEffectiveUser().getEmail()).onEventUpdated().create();
  ScriptApp.newTrigger('sprawdzRaporty').timeBased().everyHours(1).create();
  PropertiesService.getScriptProperties().setProperty('KAL_WLACZONA', '1');
  const rr = sprawdzRaporty();
  const r = synchronizujKalendarz();
  ui.alert('Synchronizacja z kalendarzem włączona (w obie strony).', podsumujWynik(r) + '\n\n' + podsumujRaporty(rr) + '\n\n' +
    'Kalendarz aktualizuje się po każdej zmianie w arkuszu i na stronie, arkusz – po każdej zmianie w kalendarzu; dodatkowo co 15 minut.\n' +
    'Nową sesję w kalendarzu dodasz tytułem w rodzaju „Fortum S2 Domańska”.\n' +
    'Pamiętaj o nowej wersji wdrożenia (Wdróż → Zarządzaj wdrożeniami → ołówek → Wersja: nowa).', ui.ButtonSet.OK);
}

function wylaczKalendarz() {
  usunWyzwalacze();
  PropertiesService.getScriptProperties().deleteProperty('KAL_WLACZONA');
  SpreadsheetApp.getUi().alert('Synchronizacja wyłączona. Istniejące wydarzenia zostają w kalendarzu.');
}

function synchronizujZMenu() {
  SpreadsheetApp.getUi().alert('Kalendarz zsynchronizowany.\n\n' + podsumujWynik(synchronizujKalendarz()));
}

function podsumujWynik(r) {
  return `Sesji w kalendarzu: ${r.razem}. Kalendarz: nowe ${r.nowe}, zmienione ${r.zmienione}, usunięte ${r.usuniete}. ` +
    `Arkusz: terminy z kalendarza ${r.zKalendarza}, usunięte ${r.wyczyszczone}.` + (r.uwagi.length ? '\n\nUwagi:\n• ' + r.uwagi.join('\n• ') : '');
}

// Wyzwalacz instalowany przy edycji arkusza (prosty onEdit nie ma dostępu do kalendarza).
function poEdycji(e) {
  if (!kalendarzWlaczony()) return;
  if (e && e.range && e.range.getSheet().getName() !== karta().getName()) return;
  synchronizujKalendarz();
}

// Uwagi z synchronizacji (np. konflikt, nierozpoznane wydarzenie) – strona pokazuje te z ostatnich 7 dni.
function zapiszUwagi(nowe) {
  const props = PropertiesService.getScriptProperties();
  const tydzien = Date.now() - 7 * 864e5;
  const stare = JSON.parse(props.getProperty('KAL_UWAGI') || '[]').filter((u) => u.czas > tydzien && !nowe.some((n) => n.tekst === u.tekst));
  props.setProperty('KAL_UWAGI', JSON.stringify(stare.concat(nowe.map((t) => ({ czas: Date.now(), tekst: t.tekst || t }))).slice(-20)));
}
function uwagiKalendarza() {
  const tydzien = Date.now() - 7 * 864e5;
  return JSON.parse(PropertiesService.getScriptProperties().getProperty('KAL_UWAGI') || '[]').filter((u) => u.czas > tydzien);
}

function synchronizujKalendarz() {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const ss = SpreadsheetApp.getActive();
    const wynik = { nowe: 0, zmienione: 0, usuniete: 0, zKalendarza: 0, wyczyszczone: 0, razem: 0, uwagi: [] };
    // Godziny w arkuszu to godziny polskie: inna strefa arkusza przesunęłaby wydarzenia w kalendarzu.
    if (ss.getSpreadsheetTimeZone() !== STREFA) {
      wynik.uwagi.push(`Strefa czasowa arkusza zmieniona z ${ss.getSpreadsheetTimeZone()} na ${STREFA} – godziny sesji są teraz liczone jako polskie.`);
      ss.setSpreadsheetTimeZone(STREFA);
      SpreadsheetApp.flush();
    }
    const sh = karta(), u = uklad(sh), url = ss.getUrl(), tz = ss.getSpreadsheetTimeZone();
    const props = PropertiesService.getScriptProperties();
    const mapa = {};   // „lp|sesja” → { id, t } (t = termin w minutach przy ostatniej synchronizacji)
    Object.entries(JSON.parse(props.getProperty('KAL_MAPA') || '{}')).forEach(([k, v]) => { mapa[k] = typeof v === 'string' ? { id: v, t: null } : v; });
    const kal = CalendarApp.getDefaultCalendar();

    // --- arkusz ---
    const kol = (re) => u.kolumny.findIndex((k) => re.test(k));
    const kImie = kol(/imi/i), kMail = kol(/mail/i), kTel = kol(/telefon/i);
    const sesje = [];
    u.kolumny.forEach((k, i) => {
      const m = k.match(/sesja\s*(\d+).*termin/i);
      if (m) sesje.push({ nr: m[1], termin: i, status: u.kolumny.findIndex((x) => new RegExp('sesja\\s*' + m[1] + '\\b.*status', 'i').test(x)) });
    });
    const zakres = u.liczba ? sh.getRange(u.pierwszy, 1, u.liczba, u.kolumny.length) : null;
    const wart = zakres ? zakres.getValues() : [], wysw = zakres ? zakres.getDisplayValues() : [];
    const osoby = [], arkusz = {};
    wart.forEach((w, r) => {
      const imie = kImie >= 0 ? String(wysw[r][kImie]).trim() : '';
      const lp = String(wysw[r][0]).trim();
      if (!imie) return;
      osoby.push({ lp, imie, r });
      sesje.forEach((s) => {
        arkusz[lp + '|' + s.nr] = { lp, r, s, imie, start: w[s.termin] instanceof Date ? w[s.termin] : null,
          status: s.status >= 0 ? String(wysw[r][s.status]).trim() : '',
          mail: kMail >= 0 ? wysw[r][kMail] : '', tel: kTel >= 0 ? wysw[r][kTel] : '' };
      });
    });
    const wpiszTermin = (a, data) => {
      const kom = sh.getRange(u.pierwszy + a.r, a.s.termin + 1);
      if (data) kom.setValue(data).setNumberFormat('dd.mm.yyyy hh:mm'); else kom.clearContent();
      a.start = data;
    };

    // --- kalendarz: wydarzenia w oknie czasowym (usunięte nie są zwracane) ---
    const od = new Date(Date.now() - OKNO_WSTECZ_DNI * 864e5), doD = new Date(Date.now() + OKNO_NAPRZOD_DNI * 864e5);
    const obecne = {};
    kal.getEvents(od, doD).forEach((ev) => { obecne[ev.getId()] = ev; });
    const wOknie = (min) => min != null && min * 60000 >= od.getTime() && min * 60000 <= doD.getTime();
    const przypisane = new Set(Object.values(mapa).map((m) => m.id));

    // 1) Przejęcie wydarzeń z kalendarza: z naszym znacznikiem (np. po utracie mapy) albo z tytułem „Fortum … S2 … Nazwisko”.
    Object.values(obecne).forEach((ev) => {
      if (przypisane.has(ev.getId())) return;
      const tag = ev.getTag('odporni-i-gotowi');
      if (tag && arkusz[tag] && !mapa[tag]) { mapa[tag] = { id: ev.getId(), t: null }; przypisane.add(ev.getId()); return; }
      const tytul = ev.getTitle() || '';
      if (!/^\s*fortum\b/i.test(tytul)) return;
      const nr = (tytul.match(/\b(?:s|sesja)\s*\.?\s*(\d+)\b/i) || [])[1];
      if (!nr) return;   // np. „Fortum – warsztat”: to nie sesja
      const kiedy = Utilities.formatDate(ev.getStartTime(), tz, 'dd.MM.yyyy HH:mm');
      const slowa = bezOgonkow(tytul.replace(/^\s*fortum\b/i, '').replace(/\b(?:s|sesja)\s*\.?\s*\d+\b/i, '')).split(/[^a-z0-9-]+/).filter((x) => x.length >= 3);
      const pasuje = osoby.filter((o) => bezOgonkow(o.imie).split(/[^a-z0-9-]+/).some((cz) => cz.length >= 3 && slowa.includes(cz)));
      if (pasuje.length !== 1) {
        wynik.uwagi.push(`Wydarzenie „${tytul}” (${kiedy}): ${pasuje.length ? 'pasuje do kilku osób' : 'nie rozpoznano uczestnika'} – dopisz w tytule nazwisko.`);
        return;
      }
      const klucz = pasuje[0].lp + '|' + nr, a = arkusz[klucz];
      if (!a) { wynik.uwagi.push(`Wydarzenie „${tytul}” (${kiedy}): w arkuszu nie ma sesji ${nr}.`); return; }
      if (mapa[klucz] || a.start) {
        wynik.uwagi.push(`Wydarzenie „${tytul}” (${kiedy}): sesja ${nr} – ${a.imie} ma już termin. Usuń zbędne wydarzenie albo termin w arkuszu.`);
        return;
      }
      wpiszTermin(a, ev.getStartTime());
      ev.setVisibility(CalendarApp.Visibility.PRIVATE); ev.setTag('odporni-i-gotowi', klucz);
      mapa[klucz] = { id: ev.getId(), t: minuty(ev.getStartTime()) };
      przypisane.add(ev.getId());
      wynik.zKalendarza++;
    });

    // 2) Zabezpieczenie: jeśli naraz „zniknęła” ponad połowa sesji, nie czyścimy arkusza (to raczej błąd niż decyzja).
    const zniknely = Object.keys(mapa).filter((k) => !obecne[mapa[k].id] && wOknie(mapa[k].t));
    const masowe = zniknely.length > 2 && zniknely.length > Object.keys(mapa).length / 2;
    if (masowe) wynik.uwagi.push(`Z kalendarza zniknęło naraz ${zniknely.length} sesji – arkusza nie zmieniono. Sprawdź kalendarz; jeśli to celowe, usuń terminy w arkuszu.`);

    // 3) Uzgodnienie przypisanych wydarzeń.
    Object.keys(mapa).forEach((klucz) => {
      const m = mapa[klucz], a = arkusz[klucz], ev = obecne[m.id];
      const wArk = a ? minuty(a.start) : null;
      if (!ev) {
        if (!wOknie(m.t) || masowe) return;                     // poza oknem albo podejrzane – nie ruszamy
        if (a && wArk != null && (m.t == null || wArk === m.t)) { // usunięte w kalendarzu → usuwamy termin w arkuszu
          wpiszTermin(a, null); wynik.wyczyszczone++;
          wynik.uwagi.push(`${a.imie}, sesja ${a.s.nr}: wydarzenie usunięte w kalendarzu – termin usunięto z arkusza.`);
        }
        delete mapa[klucz];                                     // gdy arkusz też się zmienił, krok 4 utworzy nowe wydarzenie
        return;
      }
      const wKal = minuty(ev.getStartTime());
      if (wArk == null) { ev.deleteEvent(); delete mapa[klucz]; wynik.usuniete++; return; }   // termin usunięty w arkuszu
      if (wArk === wKal) { m.t = wArk; return; }
      if (m.t != null && wArk === m.t && wKal !== m.t) {      // przesunięte w kalendarzu → arkusz
        wpiszTermin(a, ev.getStartTime()); m.t = wKal; wynik.zKalendarza++;
        return;
      }
      if (m.t != null && wArk !== m.t && wKal !== m.t) {
        wynik.uwagi.push(`${a.imie}, sesja ${a.s.nr}: termin zmieniono i w arkuszu, i w kalendarzu – zostawiono termin z arkusza.`);
      }
      ev.setTime(a.start, new Date(a.start.getTime() + CZAS_SESJI_MIN * 60000)); m.t = wArk; wynik.zmienione++;   // arkusz → kalendarz
    });

    // 4) Terminy z arkusza bez wydarzenia → nowe wydarzenia; tytuły i opisy według arkusza.
    Object.keys(arkusz).forEach((klucz) => {
      const a = arkusz[klucz];
      if (!a.start) return;
      const tytul = `${TYTUL_SESJI} ${a.s.nr} · ${a.imie}` + (/prze[łl]o[żz]/i.test(a.status) ? ' (do przełożenia)' : '');
      const opis = [`Odporni i gotowi – sesja coachingowa ${a.s.nr}.`, a.mail ? 'E-mail: ' + a.mail : '', a.tel ? 'Telefon: ' + a.tel : '',
        a.status ? 'Status: ' + a.status : '', '', 'Termin możesz zmieniać tutaj, w arkuszu albo na stronie organizacyjnej:', url]
        .filter((x, i, t) => x !== '' || (i > 0 && t[i - 1] !== '')).join('\n');
      let ev = mapa[klucz] ? obecne[mapa[klucz].id] || kal.getEventById(mapa[klucz].id) : null;
      if (!ev) {
        ev = kal.createEvent(tytul, a.start, new Date(a.start.getTime() + CZAS_SESJI_MIN * 60000), { description: opis });
        ev.setVisibility(CalendarApp.Visibility.PRIVATE); ev.setTag('odporni-i-gotowi', klucz);
        mapa[klucz] = { id: ev.getId(), t: minuty(a.start) };
        wynik.nowe++;
      } else {
        let zmiana = false;   // długość wydarzenia zmieniona ręcznie w kalendarzu zostaje
        if (ev.getTitle() !== tytul) { ev.setTitle(tytul); zmiana = true; }
        if (ev.getDescription() !== opis) { ev.setDescription(opis); zmiana = true; }
        if (zmiana) wynik.zmienione++;
      }
      wynik.razem++;
    });

    props.setProperty('KAL_MAPA', JSON.stringify(mapa));
    if (wynik.uwagi.length) zapiszUwagi(wynik.uwagi);
    SpreadsheetApp.flush();
    return wynik;
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- Raporty Deep Dive (folder na Dysku → arkusz) ---------------- */
// Skrypt czyta wyłącznie NAZWY plików w folderze; treści raportów nie otwiera i nigdzie nie kopiuje.
// Wpisuje datę tylko do pustej komórki – daty wpisanej ręcznie nie zmienia.

function sprawdzRaportyZMenu() {
  SpreadsheetApp.getUi().alert(podsumujRaporty(sprawdzRaporty()));
}

function podsumujRaporty(r) {
  return `Raporty Deep Dive: w folderze ${r.pliki}, nowe daty w arkuszu: ${r.wpisane}.` + (r.uwagi.length ? '\n• ' + r.uwagi.join('\n• ') : '');
}

function sprawdzRaporty() {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const ss = SpreadsheetApp.getActive(), sh = karta(), u = uklad(sh), tz = ss.getSpreadsheetTimeZone();
    const wynik = { pliki: 0, wpisane: 0, uwagi: [] };
    const kRaport = u.kolumny.findIndex((k) => /deep\s*dive|raport/i.test(k));
    const kImie = u.kolumny.findIndex((k) => /imi/i.test(k));
    if (kRaport < 0 || kImie < 0 || !u.liczba) return wynik;
    const zakres = sh.getRange(u.pierwszy, 1, u.liczba, u.kolumny.length);
    const wysw = zakres.getDisplayValues();
    const osoby = wysw.map((w, r) => ({ r, imie: String(w[kImie]).trim(), slowa: bezOgonkow(w[kImie]).split(/\s+/).filter(Boolean), raport: String(w[kRaport]).trim() }))
      .filter((o) => o.imie);

    const pliki = DriveApp.getFolderById(FOLDER_RAPORTOW).getFiles();
    while (pliki.hasNext()) {
      const plik = pliki.next();
      if (plik.isTrashed()) continue;
      const nazwa = plik.getName();
      wynik.pliki++;
      const m = nazwa.match(/^(\d{4})-(\d{2})-(\d{2})_([^_]+)_([^_]+)_deep\s*dive/i);
      if (!m) { wynik.uwagi.push(`Raport „${nazwa}”: nazwa niezgodna ze wzorem RRRR-MM-DD_Nazwisko_Imię_DeepDive.pdf.`); continue; }
      const nazwisko = bezOgonkow(m[4]), imie = bezOgonkow(m[5]);
      const pasuje = osoby.filter((o) => o.slowa.includes(nazwisko) && o.slowa.includes(imie));
      if (pasuje.length !== 1) {
        wynik.uwagi.push(`Raport „${nazwa}”: ${pasuje.length ? 'pasuje do kilku osób' : 'nie ma takiej osoby w arkuszu'}.`);
        continue;
      }
      const o = pasuje[0];
      if (o.raport) continue;                                   // data już wpisana – nie zmieniamy
      const data = Utilities.parseDate(`${m[1]}-${m[2]}-${m[3]}`, tz, 'yyyy-MM-dd');
      sh.getRange(u.pierwszy + o.r, kRaport + 1).setValue(data).setNumberFormat('dd.mm.yyyy');
      o.raport = `${m[3]}.${m[2]}.${m[1]}`;
      wynik.wpisane++;
    }
    if (wynik.uwagi.length) zapiszUwagi(wynik.uwagi);
    SpreadsheetApp.flush();
    return wynik;
  } finally {
    lock.releaseLock();
  }
}
