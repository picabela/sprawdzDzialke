# SprawdzDzialke.pl

Serwis generujący prosty, zrozumiały raport o nieruchomości lub działce. Użytkownik wpisuje adres → dostaje raport (hałas, powietrze, powódź, solar, komunikacja, infrastruktura, bezpieczeństwo, rynek) generowany przez AI na podstawie publicznych danych.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **AI** — OpenAI `gpt-4o-mini` (domyślnie) lub Anthropic Claude, przełączane przez `LLM_PROVIDER`
- **Supabase** (PostgreSQL) — zapis raportów
- **Leaflet** — mapa działki
- Publiczne API: Nominatim (geocoding), GUGiK ULDK, PVGIS (solar), ISOK (powódź), OpenAQ (powietrze), OpenRouteService + Overpass (dojazd)

## Uruchomienie lokalne

```bash
npm install --legacy-peer-deps   # react-leaflet 4.x ma peerDep React 18
cp .env.example .env.local        # uzupełnij klucze
npm run dev                       # http://localhost:3000
```

> `--legacy-peer-deps` jest potrzebne, bo `react-leaflet@4.2.1` deklaruje peerDependency na React 18, a projekt używa React 19.

## Zmienne środowiskowe

Zobacz `.env.example`. Wymagane: klucz wybranego dostawcy AI + Supabase.

**Wybór dostawcy AI** — zmienna `LLM_PROVIDER`:
- `openai` (domyślnie) → wymaga `OPENAI_API_KEY`, model z `OPENAI_MODEL` (domyślnie `gpt-4o-mini`)
- `anthropic` → wymaga `ANTHROPIC_API_KEY`, model z `ANTHROPIC_MODEL` (domyślnie `claude-sonnet-4-20250514`)

Supabase (wymagane): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
Opcjonalne: `ORS_API_KEY`, `OPENAQ_API_KEY`.

## Baza danych (Supabase SQL Editor)

```sql
-- Tabela raportów
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  address TEXT NOT NULL,
  address_normalized TEXT,
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  raw_geo_data JSONB,
  ai_report JSONB NOT NULL,
  score INTEGER,
  city TEXT,
  county TEXT,
  province TEXT,
  ip_address TEXT,
  pdf_generated BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0
);

CREATE INDEX idx_reports_address ON reports(address_normalized);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_city ON reports(city);
CREATE INDEX idx_reports_ip ON reports(ip_address);

CREATE TABLE waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'report_page'
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Raporty są publiczne" ON reports FOR SELECT USING (true);
CREATE POLICY "Tylko backend może pisać" ON reports FOR INSERT WITH CHECK (true);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tylko backend może pisać do waitlist" ON waitlist FOR INSERT WITH CHECK (true);
```

## Struktura

```
app/
  page.tsx                      # Strona główna z formularzem
  layout.tsx                    # Root layout
  globals.css
  raport/[id]/page.tsx          # Publiczna strona zapisanego raportu
  api/
    generuj-raport/route.ts     # POST — generuje i zapisuje raport
    geocode/route.ts            # GET  — geokodowanie adresu
    pdf/route.ts                # GET  — wersja raportu do wydruku/PDF
components/                     # SearchForm, ReportCard, ReportSection, MeterBar, ScoreBadge, MapPreview, LoadingReport
lib/
  llm.ts                        # Wybór dostawcy AI (OpenAI / Anthropic)
  openai.ts, anthropic.ts, supabase.ts, types.ts
  report-generator.ts           # Główna logika
  apis/                         # geocoding, gugik, pvgis, flood, airquality, openroute
```

## Skrypty

- `npm run dev` — serwer deweloperski
- `npm run build` — build produkcyjny
- `npm run start` — uruchom build
- `npm run lint` — ESLint
- `npx tsc --noEmit` — sprawdzenie typów
