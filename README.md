# Odporni i gotowi – strona programu (Fortum · Lyra Polska)

Statyczna strona bez backendu, hostowana na Netlify.

## Struktura
```
index.html            strona główna (4 kafelki + kontakt) — nie trzeba edytować
sekcja.html           szablon podstrony sekcji — nie trzeba edytować
badanie/index.html    diagnoza Deep Dive (osobna aplikacja, ustawienia w bloku CONFIG)
tresci/               ← TU EDYTUJESZ TREŚCI
  ustawienia.json     kafelki, nagłówek strony, dane kontaktowe, link do Lyry
  wypalenie.md        treść sekcji „Wypalenie zawodowe”
  energia.md          treść sekcji „Energia w pracy”
  odpornosc.md        treść sekcji „Odporność”
obrazy/               obrazki używane w treściach
assets/               wygląd i kod (styl.css, strona.js, biblioteki w vendor/)
archiwum/             starszy kwestionariusz (nie jest podlinkowany)
```

## Jak zmieniać treści (bez ruszania kodu)

### Treść sekcji
Otwórz na GitHubie np. `tresci/wypalenie.md` → ikona ołówka → pisz w Markdown → *Commit changes*.
Netlify opublikuje zmianę w ok. minutę.

- `## Tytuł` – nowa sekcja; przy 2+ sekcjach na górze strony pojawia się spis treści z przyciskami.
- `### Podtytuł`, `**pogrubienie**`, `*kursywa*`, `- lista`, `[link](https://…)`
- `> tekst` – wyróżniona ramka (ćwiczenie, cytat).
- `![opis](obrazy/plik.jpg)` – obrazek (plik wrzuć wcześniej do `obrazy/`).
- Film z YouTube: wklej kod `<iframe …>` z opcji „Umieść”.
- Pusty plik (albo tylko komentarz `<!-- -->`) = na stronie widać „Materiały pojawią się wkrótce”.

### Kafelki i kontakt – `tresci/ustawienia.json`
- `tytul`, `opis`, `przycisk` – teksty na kafelku.
- `ukryj: true` – chowa kafelek bez usuwania.
- `wyroznij: true` – kafelek w kolorze (obecnie „Badanie”).
- `adres` – kafelek prowadzi pod wskazany adres zamiast do sekcji Markdown (tak działa „Badanie”).
- **Nowa sekcja:** dopisz kafelek `{ "id": "nazwa", "tytul": "…", "opis": "…", "plik": "nazwa.md" }` i utwórz `tresci/nazwa.md`. Ikony dostępne: `badanie`, `wypalenie`, `energia`, `odpornosc` (pole `ikona`).
- `kontakt` – imię, rola, e-mail, telefon, strona www, link do Lyry. Puste pole = nie wyświetla się.

Uwaga na składnię JSON: teksty w cudzysłowach, przecinki między elementami, bez przecinka po ostatnim.
Gdy strona główna pokazuje błąd wczytywania, najczęściej to brakujący lub nadmiarowy przecinek.

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
