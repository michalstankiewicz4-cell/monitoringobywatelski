# Monitoring Obywatelski

Krótki opis: projekt to mapa incydentów zgłaszanych przez policję lub służby medyczne, prezentowana w widoku dwukolumnowym.

**Układ UI**

**Legenda i oznaczenia**
  - Najnowsze punkty: czerwone, z subtelnym pulsowaniem (przyciąganie uwagi).
  - Miganie/blinking dla nieprzeczytanych: nie będzie używane.
  - Przeczytane: oznaczane jako czerwone bez pulsowania.

**Interakcje**

**Pierwszy temat:** Śmierć Olka w drodze do szpitala
Lokalizacja danych: używamy tylko `approved_incidents.json` w katalogu głównym repo — to jedyny plik z aktualnymi sprawami prezentowanymi na mapie.

Przykładowy wpis JSON do `pending_incidents.json`:
Przykładowy wpis JSON do `approved_incidents.json`:
```json
{
  "id": "olek-2026-07",
  "title": "Śmierć Olka w drodze do szpitala",
  "date": "2026-07-03T00:00:00Z",
  "status": "pending",
  "summary": "Opis krótkiego streszczenia zdarzenia",
  "sources": ["police-report.pdf", "eye-witness-video.mp4"],
  "materials": [
    {
      "type": "video",
      "file": "media/olek-evac.mp4",
      "timestamp": "2026-07-02T22:10:00Z"
    }
  ]
}
```

**Pliki/skrypty pomocnicze**


Lekki frontend pokazujący zgromadzone materiały dotyczące incydentów na mapie i w panelu osi czasu.

**Setup**
- **Serve locally:** uruchom w katalogu projektu:

```bash
python -m http.server 8000
# potem otwórz http://localhost:8000/index.html
```
- **Fetch thumbnails:** wymaga Node.js — uruchom `npm run fetch-thumbs` (skrypt: [scripts/fetch_article_thumbnails.mjs](scripts/fetch_article_thumbnails.mjs)).

**Pliki i krótki opis**
- **index.html:** główny single-page frontend (mapa Leaflet, lewy panel z listą spraw, prawy panel z materiałami). Zmiany UI i logika renderowania korzystają z danych z [data/approved_incidents.json](data/approved_incidents.json).
- **data/approved_incidents.json:** autorytatywna lista spraw wyświetlanych w aplikacji. Każda sprawa ma pole `materials` (tablica obiektów) opisujące artykuły, wideo i inne zasoby; pole `thumbnail` może być `null` i uzupełniane przez skrypt miniatur.
- **data/pending_incidents.json:** robocze propozycje spraw (niepokazywane automatycznie, wymagają zatwierdzenia przeniesienia do `approved_incidents.json`).
- **data/search_phrases.txt:** lista fraz używanych przy zbieraniu źródeł.
- **scripts/discover_incidents.mjs:** pomocniczy skrypt Node do wykrywania nowych linków/incydentów (uruchamiany ręcznie).
- **scripts/fetch_article_thumbnails.mjs:** pobiera HTML artykułów i próbuje wydobyć `og:image`/`twitter:image`; dla YouTube używa `img.youtube.com/vi/<id>/hqdefault.jpg`. Zapisuje aktualizacje do `approved_incidents.json`.
- **scripts/collect_incident_sources.py, scripts/get_youtube_titles.py:** narzędzia pomocnicze używane podczas zbierania i weryfikacji źródeł (Python).
- **favicon-*.png / favicon.ico / favicon.svg:** ikony używane w nagłówku strony.

**Dodatkowe narzędzia**
- **scripts/validate_incidents.py:** prosty walidator struktury `approved_incidents.json`. Uruchom przed commitem, aby sprawdzić wymagane pola.

**Uwagi dotyczące miniatur (fetch-thumbs)**
- Uruchom `npm run fetch-thumbs` żeby spróbować automatycznie pobrać `og:image`/`twitter:image` dla artykułów. Niektóre serwisy (np. gazety) mogą zwracać HTTP 403 — w takich przypadkach skrypt zostawi `thumbnail: null` lub użyje miniatury YouTube jeśli materiał jest wideo.

**Favicony i porządek plików**
- W repo dodano `favicon-16.png`, `favicon-32.png`, `favicon-48.png`, `favicon-512.png`, `favicon.ico` i `favicon.svg` oraz zaktualizowano `index.html` aby używać ich jako fallbacków.
- Usunąłem generowany plik `out_head.json` (niepotrzebny).

**Walidacja i podgląd lokalny**
- Walidacja danych:

```bash
python scripts/validate_incidents.py
```

- Podgląd:

```bash
python -m http.server 8000
# potem otwórz http://localhost:8000/index.html
```

**Jak działają dane (krótko)**
- Każda sprawa w [data/approved_incidents.json](data/approved_incidents.json) ma pola typu: `id`, `title`, `date`, `summary`, `materials`.
- `materials[]` zawiera obiekty z polami takimi jak `type` ("article"|"video"), `url`, `title`, `timestamp`, `thumbnail`.
- Skrypt [scripts/fetch_article_thumbnails.mjs](scripts/fetch_article_thumbnails.mjs) uzupełnia pole `thumbnail` jeśli znajdzie `og:image` lub odpowiednik; nieudane próby pozostawiają `thumbnail: null`.

**Praca z repo / Contributing**
- Aby dodać/zmodyfikować sprawę: edytuj [data/approved_incidents.json](data/approved_incidents.json) (lokalnie), opcjonalnie uruchom `npm run fetch-thumbs`, przetestuj przez `python -m http.server` i zrób commit + push.
- Unikaj automatycznych masowych zmian bez przeglądu (niektóre skrypty mogą napotkać blokady stron z powodu ochrony przed botami).
Jeśli chcesz, mogę od razu dodać powyższy przykładowy wpis do `pending_incidents.json` lub utworzyć issue/PR z tą zmianą.
