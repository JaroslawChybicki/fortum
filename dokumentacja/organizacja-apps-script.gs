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
 */

const KARTA = 'Uczestnicy';  // nazwa karty z danymi; gdy jej brak – pierwsza karta arkusza
// Kolumny, które NIGDY nie trafiają na stronę i nie mogą być z niej zmienione (np. hasła do stref uczestników).
const UKRYTE = /has[łl]o|adres strony/i;
const MAKS_BLEDOW = 8;       // tyle błędnych haseł…
const BLOKADA_S = 15 * 60;   // …blokuje logowanie na 15 minut

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Strona organizacyjna')
    .addItem('Ustaw lub zmień hasło', 'ustawHaslo')
    .addItem('Odblokuj logowanie', 'odblokuj')
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
    if (z.akcja === 'zapisz') return json(zapisz(z));
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
