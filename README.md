# Odporni i gotowi – strona programu (Fortum · Lyra Polska)

Statyczna strona bez backendu, hostowana na Netlify.

## Struktura
```
index.html            strona główna (kafelki + kontakt) — nie trzeba edytować
sekcja.html           szablon podstrony sekcji — nie trzeba edytować
filmy.html            biblioteka filmów (treść: tresci/filmy.json)
ksiazki.html          polecane książki (treść: tresci/ksiazki.json)
cwiczenia.html        ćwiczenia i gry (strona zbiorcza)
mapa-energii.html     dziennik energii i napięcia (dane tylko w przeglądarce uczestnika)
oddech.html           oddech z wydłużonym wydechem + trzyminutowa przestrzeń oddechowa
medytacja-gory.html   nagranie „Medytacja góry” (plik: audio/medytacja-gory.mp3)
quiz.html             quiz „Mity o stresie i wypaleniu” (treść: tresci/quiz.json, edycja w CMS)
gra-zespol.html       gra decyzyjna „Pomyłka w zespole” (scenariusz: tresci/gra-zespol.json)
gra-sezon.html        gra decyzyjna „Tydzień przed sezonem grzewczym” (scenariusz: tresci/gra-sezon.json)
kalkulator.html       kalkulator kosztów (wartości domyślne w assets/kalkulator.js)
badanie/index.html    diagnoza Deep Dive (osobna aplikacja, ustawienia w bloku CONFIG)
tresci/               ← TREŚCI (edytowane w CMS)
  sekcje.json         kafelki + treść każdej podstrony (Markdown)
  strona.json         nagłówek, wstęp, dane kontaktowe, link do Lyry
  filmy.json          biblioteka filmów
  ksiazki.json        polecane książki
obrazy/               obrazki wgrywane przez CMS
.pages.yml            konfiguracja panelu Pages CMS
assets/               wygląd i kod (styl.css, strona.js, biblioteki w vendor/)
archiwum/             starszy kwestionariusz (nie jest podlinkowany)
```

## Edycja treści – Pages CMS
Panel: **https://app.pagescms.org** → *Sign in with GitHub* → repozytorium `JaroslawChybicki/fortum`
→ wybierz gałąź, z której Netlify publikuje stronę (obecnie `claude/inspiring-mendel-sm1dch`).

Przy pierwszym logowaniu Pages CMS poprosi o zainstalowanie aplikacji GitHub – zezwól tylko na repozytorium `fortum`.

W panelu są cztery pozycje (dodatkowo **Biblioteka filmów** – link z YouTube, tytuł, autor, temat, opis – oraz **Polecane książki**):
- **Sekcje (kafelki i treści)** – lista kafelków. Każdy ma tytuł, opis, ikonę, przełączniki
  „wyróżniony” / „ukryj” oraz edytor treści podstrony (pogrubienia, listy, linki, obrazki).
  - **Wprowadzenie** – krótki tekst nad zakładkami (opcjonalny).
  - **Podsekcje (zakładki)** – np. „Badania i dane”, „Po czym poznać”, „Przyczyny”, „Jak przeciwdziałać”;
    w każdej sekcji mogą być inne. Podsekcja bez treści jest ukryta, więc tytuły można przygotować zawczasu.
    Link do konkretnej zakładki: `sekcja.html?s=wypalenie#przyczyny`.
  - Sekcja bez wprowadzenia i bez wypełnionych podsekcji = „Materiały do tej sekcji pojawią się wkrótce”.
  - **Nowa sekcja:** *Add an item* na końcu listy → tytuł, treść, „Adres podstrony” (np. `oddech`) → Save.
  - Kolejność kafelków = kolejność na liście (przeciągnij).
  - „Link zewnętrzny zamiast podstrony” – tak działa kafelek „Badanie” (`badanie/`).
- **Strona główna i kontakt** – nagłówek, wstęp, telefon, e-mail, link do Lyry. Puste pole się nie wyświetla.

Odnośniki w treści sekcji: film – cytat „**Film:** [tytuł](filmy.html#film=ID_YOUTUBE)”,
książka – cytat „**Książka:** [tytuł](ksiazki.html#ksiazka=ID_KSIĄŻKI)” (ID z pola „Identyfikator” w „Polecanych książkach”),
ćwiczenie – cytat „**Ćwiczenie:** [nazwa](mapa-energii.html | oddech.html | oddech.html#przestrzen | quiz.html | gra-zespol.html)”.
Oba otwierają się w oknie na podstronie, bez opuszczania tekstu.

Każde *Save* to commit w repozytorium; Netlify publikuje zmianę po ok. minucie.
Obrazki wgrane w edytorze trafiają do katalogu `obrazy/`.

Edycja bez CMS też jest możliwa (GitHub → plik w `tresci/` → ołówek), ale w JSON łatwo o błąd składni –
panel pilnuje tego za Ciebie.

## Kalkulator kosztów
`kalkulator.html` – absencja, prezenteizm, rotacja i zwrot z inwestycji. Wpisane wartości zapisują się w adresie strony,
więc przycisk „Kopiuj link” pozwala wysłać gotowe wyliczenie (np. klientowi). Wartości domyślne i ich źródła:
blok `DOMYSLNE` w `assets/kalkulator.js` oraz opisy pól w `kalkulator.html`.

## Gry decyzyjne
Silnik: `assets/gra.js`. Scenariusz to plik JSON wskazany w `data-scenariusz` elementu `#gra`: sceny z opcjami
(`tekst`, zmiana wskaźników `zaufanie`/`napiecie`, `komentarz`, `dalej` = id następnej sceny lub `koniec`),
nazwy wskaźników (`mierniki`), `zakonczenia` (warunki progowe, pierwsze pasujące wygrywa), `macierz`, pytania do refleksji
i linki „Pogłębienie”. Nowa gra = nowy plik JSON + kopia `gra-sezon.html` ze zmienionym `data-scenariusz`.

## Formularz kontaktowy
Na stronie głównej (sekcja `#napisz`), link „Napisz wiadomość” w stopce każdej podstrony.
Wysyłka na e-mail przez **Web3Forms** (darmowy plan: 250 wiadomości/mies.). Klucz `access_key` jest w `index.html`
(publiczny z założenia – pozwala tylko wysyłać wiadomości na przypisany adres). Zmiana adresu odbiorcy:
nowy klucz na web3forms.com i podmiana wartości `access_key`. Obsługa wysyłki: `assets/kontakt.js`.

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
