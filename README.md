# Odporni i gotowi – diagnoza Deep Dive (Lyra Polska)

Statyczna strona bez backendu i bez kosztów. Zawartość:
- `index.html` – cała aplikacja (3 moduły, wyniki, rekomendacje, raport PDF/MD). Ustawienia w bloku `CONFIG` na początku skryptu (adres e-mail, temat wiadomości).
- `logo.png`, `netlify.toml`, `robots.txt` (strona nie jest indeksowana w wyszukiwarkach).

## Wdrożenie
Netlify > Add new site > Deploy manually > przeciągnij ten folder. Gotowe.

## Jak raport trafia do prowadzącego
- Komputer: przycisk „Wyślij raport mailem” pobiera plik PDF i otwiera domyślny program pocztowy z adresem, tematem „Raport” i podsumowaniem wyników. Uczestnik dołącza pobrany plik (przeglądarki nie pozwalają dołączyć go automatycznie).
- Telefon/tablet: otwiera się systemowy arkusz udostępniania z już dołączonym PDF-em; adres prowadzącego jest skopiowany do schowka.
- Jeśli PDF nie może się wygenerować, zamiast niego tworzony jest raport .md.

## Kod danych
Treść maila zawiera linię `deepdive-1.0|E…|T…|B…|H…` – surowe odpowiedzi w zapisie kompaktowym (E: 20 określeń, 1–4; T: mapa dnia, 6 wartości 0–10, gdzie A = 10; B: 15 pozycji BW-15, 0–6; H: 36 pozycji, 1–5). Wystarczy do raportu zbiorczego nawet bez załącznika.

## Dane
Odpowiedzi zapisują się tylko w przeglądarce uczestnika (localStorage), co pozwala przerwać i wrócić. Nic nie jest wysyłane automatycznie.

## Źródła na Dysku Google i synchronizacja
Repozytorium powstało z plików w folderze Dysku `Fortum/Strona`:
- `files (1).zip` → `deepdive-lyra/` (wersja statyczna, 23.09, 18:15) — to jest katalog główny repo.
- `files.zip` — wcześniejsza wersja z funkcją Netlify `send-results.mjs` (wysyłka przez Brevo). Nie przeniesiona: zastąpiona wersją bez backendu.
- `index.html` (luzem) — starsza aplikacja „Kwestionariusz Rezyliencji”, zachowana w `archiwum/`.

Źródłem prawdy jest odtąd to repozytorium, nie Dysk. Git nie „widzi” Dysku bezpośrednio, więc zmiany z Dysku wprowadza się tak:
1. **Przez Claude (najprościej):** w sesji Claude Code z włączonym konektorem Google Drive poproś o „pobierz najnowszą wersję z folderu Fortum/Strona i zaktualizuj repo”.
2. **Ręcznie:** pobierz plik z Dysku → podmień w repo (GitHub: *Add file → Upload files*) → commit.
3. **Google Drive for desktop:** trzymaj klon repo poza folderem synchronizowanym z Dyskiem (synchronizacja katalogu `.git` psuje repozytorium), a kopiuj tylko gotowe pliki.

## Wdrożenie z GitHuba (zamiast przeciągania folderu)
Netlify → Add new site → Import an existing project → GitHub → `fortum`, gałąź główna, publish directory `.`. Każdy push aktualizuje stronę automatycznie.
