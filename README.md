# Odporni i gotowi – strona programu (Fortum · Lyra Polska)

Statyczna strona bez backendu, hostowana na Netlify.

## Struktura
```
index.html            strona główna (kafelki + kontakt) — nie trzeba edytować
sekcja.html           szablon podstrony sekcji — nie trzeba edytować
badanie/index.html    diagnoza Deep Dive (osobna aplikacja, ustawienia w bloku CONFIG)
tresci/               ← TREŚCI (edytowane w CMS)
  sekcje.json         kafelki + treść każdej podstrony (Markdown)
  strona.json         nagłówek, wstęp, dane kontaktowe, link do Lyry
obrazy/               obrazki wgrywane przez CMS
.pages.yml            konfiguracja panelu Pages CMS
assets/               wygląd i kod (styl.css, strona.js, biblioteki w vendor/)
archiwum/             starszy kwestionariusz (nie jest podlinkowany)
```

## Edycja treści – Pages CMS
Panel: **https://app.pagescms.org** → *Sign in with GitHub* → repozytorium `JaroslawChybicki/fortum`
→ wybierz gałąź, z której Netlify publikuje stronę (obecnie `claude/inspiring-mendel-sm1dch`).

Przy pierwszym logowaniu Pages CMS poprosi o zainstalowanie aplikacji GitHub – zezwól tylko na repozytorium `fortum`.

W panelu są dwie pozycje:
- **Sekcje (kafelki i treści)** – lista kafelków. Każdy ma tytuł, opis, ikonę, przełączniki
  „wyróżniony” / „ukryj” oraz edytor treści podstrony (pogrubienia, listy, linki, obrazki).
  - Nagłówek poziomu 2 (H2) = osobna część strony i przycisk w spisie treści.
  - Pusta treść = „Materiały do tej sekcji pojawią się wkrótce”.
  - **Nowa sekcja:** *Add an item* na końcu listy → tytuł, treść, „Adres podstrony” (np. `oddech`) → Save.
  - Kolejność kafelków = kolejność na liście (przeciągnij).
  - „Link zewnętrzny zamiast podstrony” – tak działa kafelek „Badanie” (`badanie/`).
- **Strona główna i kontakt** – nagłówek, wstęp, telefon, e-mail, link do Lyry. Puste pole się nie wyświetla.

Każde *Save* to commit w repozytorium; Netlify publikuje zmianę po ok. minucie.
Obrazki wgrane w edytorze trafiają do katalogu `obrazy/`.

Edycja bez CMS też jest możliwa (GitHub → plik w `tresci/` → ołówek), ale w JSON łatwo o błąd składni –
panel pilnuje tego za Ciebie.

## Podgląd lokalny
Treści są wczytywane z plików, więc samo dwukliknięcie `index.html` nie wystarczy:
```
python3 -m http.server
```
i wejdź na http://localhost:8000.

## Wdrożenie
Netlify → Add new site → Import an existing project → GitHub → `fortum`, publish directory `.`.
Każdy commit automatycznie aktualizuje stronę. Strona nie jest indeksowana w wyszukiwarkach.

## Badanie (Deep Dive)
Odpowiedzi zapisują się tylko w przeglądarce uczestnika (localStorage). Raport uczestnik wysyła mailem sam
(PDF/MD). Treść maila zawiera linię `deepdive-1.0|E…|T…|B…|H…` z surowymi odpowiedziami
(E: 20 określeń, 1–4; T: mapa dnia, 6 wartości 0–10, gdzie A = 10; B: 15 pozycji BW-15, 0–6; H: 36 pozycji, 1–5).

## Źródła na Dysku Google
Pierwotne pliki: folder Dysku `Fortum/Strona` (`files (1).zip` → badanie; `files.zip` – starsza wersja z wysyłką
przez Brevo, nieprzeniesiona; luźny `index.html` → `archiwum/`). Źródłem prawdy jest teraz repozytorium.
Aktualizacja z Dysku: poproś Claude (konektor Google Drive) albo wgraj plik przez GitHub → *Add file → Upload files*.
Nie trzymaj klonu repo w folderze synchronizowanym z Dyskiem – synchronizacja katalogu `.git` psuje repozytorium.
