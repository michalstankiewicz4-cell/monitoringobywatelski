# Monitoring Obywatelski

Krótki opis: projekt to mapa incydentów zgłaszanych przez policję lub służby medyczne, prezentowana w widoku dwukolumnowym.

**Układ UI**
- **Lewy panel:** lista spraw (kolejka/incydenty).
- **Prawy panel:** materiały powiązane z wybraną sprawą ułożone w linii czasu, od najnowszych do najstarszych.
- **Dolny pasek czasu:** kontrola zakresu czasu — na końcu paska powinna być opcja/etykieta **"wszystko"**.

**Legenda i oznaczenia**
- **Legenda:** usuwamy — interfejs nie pokazuje rozbudowanej legendy.
- **Punkty (markery):**
  - Najnowsze punkty: czerwone, z subtelnym pulsowaniem (przyciąganie uwagi).
  - Miganie/blinking dla nieprzeczytanych: nie będzie używane.
  - Przeczytane: oznaczane jako czerwone bez pulsowania.
- Pozostałe elementy legendy usuwamy — zachowujemy prostą kolorystykę opartą na czerwieni dla istotnych zdarzeń.

**Interakcje**
- Kliknięcie sprawy w lewym panelu otwiera powiązane materiały po prawej w formie osi czasu.
- Oś czasu sortowana jest malejąco (najpierw najnowsze).
- Dolny pasek pozwala filtrować zakres; warto, by opcja **"wszystko"** zawsze była dostępna na końcu suwaka.

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
- Skrypty do przetwarzania/detekcji incydentów: [scripts/discover_incidents.mjs](scripts/discover_incidents.mjs).
- Dane znajdują się w katalogu `data/` — edytuj ostrożnie i ewentualnie korzystaj z narzędzi/skryptów do walidacji przed zatwierdzeniem.

---

Jeśli chcesz, mogę od razu dodać powyższy przykładowy wpis do `pending_incidents.json` lub utworzyć issue/PR z tą zmianą.
