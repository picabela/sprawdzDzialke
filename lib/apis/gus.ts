// Demografia gminy — Bank Danych Lokalnych GUS (api: bdl.stat.gov.pl).
// Zmienne (zweryfikowane):
//   72305  — ludność ogółem (gmina, stan na 31 XII)
//   458238 — gęstość zaludnienia powierzchni zabudowanej i zurbanizowanej (os./km²)
// API bywa niestabilne, więc każdy request ma ponawianie. Klucz nie jest
// wymagany (limit anonimowy wystarcza przy cache 24 h na gminę).

export interface Demographics {
  unitName?: string;        // nazwa gminy wg BDL
  population?: number;      // ludność ogółem (najnowszy rok)
  populationYear?: number;
  trendPct?: number;        // zmiana % populacji między najstarszym a najnowszym rokiem
  trendYears?: number;      // przez ile lat liczony trend
  density?: number;         // os./km² terenu zabudowanego
}

const BASE = 'https://bdl.stat.gov.pl/api/v1';
const HEADERS = {
  'User-Agent': 'SprawdzDzialke/1.0 (kontakt@sprawdzdzialke.pl)',
  Accept: 'application/json',
};

// cache w pamięci procesu — dane GUS zmieniają się raz w roku
const cache = new Map<string, { data: Demographics | null; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

async function bdlFetch(path: string): Promise<unknown | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return await res.json();
      if (res.status === 429) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    } catch {
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  return null;
}

interface BdlUnit {
  id: string;
  name: string;
  level: number;
}

interface BdlValue {
  year: string;
  val: number;
}

interface BdlDataByUnit {
  results?: { id: number; values?: BdlValue[] }[];
}

// Nazwy BDL bywają ozdobione ("M.st.Warszawa od 2002") — sprowadzamy do gołej nazwy
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/m\.?\s*st\.?\s*/g, '')
    .replace(/\b(od|do)\s+\d{4}\b/g, '')
    .replace(/[()]/g, '')
    .trim();
}

// Szuka gminy w rejestrze BDL po nazwie miasta/miejscowości
async function findUnit(city: string): Promise<BdlUnit | null> {
  const data = (await bdlFetch(
    `/units/search?name=${encodeURIComponent(city)}&level=6&format=json&page-size=40`
  )) as { results?: BdlUnit[] } | null;
  if (!data?.results?.length) return null;

  const target = normalizeName(city);
  // pomiń jednostki historyczne ("... do 2001")
  const candidates = data.results.filter((u) => !/\bdo \d{4}\b/i.test(u.name));
  return (
    candidates.find((u) => normalizeName(u.name) === target) ||
    candidates.find((u) => normalizeName(u.name).startsWith(target)) ||
    candidates[0] ||
    null
  );
}

export async function getDemographics(city: string): Promise<Demographics | null> {
  if (!city) return null;

  const key = city.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

  try {
    const unit = await findUnit(city);
    if (!unit) {
      cache.set(key, { data: null, ts: Date.now() });
      return null;
    }

    // ostatnie lata dla obu zmiennych jednym requestem
    const now = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => now - 1 - i); // np. 2025..2020
    const yearParams = years.map((y) => `year=${y}`).join('&');
    const data = (await bdlFetch(
      `/data/by-unit/${unit.id}?var-id=72305&var-id=458238&${yearParams}&format=json`
    )) as BdlDataByUnit | null;

    // "M.st.Warszawa od 2002" → "M.st.Warszawa"
    const result: Demographics = { unitName: unit.name.replace(/\s*\bod \d{4}\b/i, '').trim() };

    const popSeries = data?.results?.find((r) => r.id === 72305)?.values || [];
    if (popSeries.length > 0) {
      const sorted = [...popSeries].sort((a, b) => Number(a.year) - Number(b.year));
      const newest = sorted[sorted.length - 1];
      const oldest = sorted[0];
      result.population = newest.val;
      result.populationYear = Number(newest.year);
      if (sorted.length >= 2 && oldest.val > 0) {
        result.trendPct = Math.round(((newest.val - oldest.val) / oldest.val) * 1000) / 10;
        result.trendYears = Number(newest.year) - Number(oldest.year);
      }
    }

    const densSeries = data?.results?.find((r) => r.id === 458238)?.values || [];
    if (densSeries.length > 0) {
      const newest = [...densSeries].sort((a, b) => Number(b.year) - Number(a.year))[0];
      result.density = newest.val;
    }

    const out = result.population !== undefined ? result : null;
    cache.set(key, { data: out, ts: Date.now() });
    return out;
  } catch {
    return null;
  }
}
