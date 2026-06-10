// Ceny nieruchomości — REALNE dane transakcyjne z GUS BDL.
// Źródło: "Mediana cen za 1 m² lokali mieszkalnych sprzedanych w ramach
// transakcji rynkowych" (podmiot P3787). To są ceny z aktów notarialnych
// raportowane przez GUS — twarde dane, nie szacunek. Mają jednak ~rocznym
// opóźnieniem publikacji, dlatego ZAWSZE zwracamy rok danych, a UI to pokazuje.
//
// Identyfikator zmiennej rozwiązujemy w locie (wyszukiwarką BDL) i cache'ujemy,
// żeby nie zależeć od zmian w katalogu. Gdy BDL nie odpowiada albo nie ma danych
// dla danego obszaru — zwracamy null i raport UCZCIWIE pisze "brak twardych
// danych", zamiast zmyślać aktualną cenę.

const BASE = 'https://bdl.stat.gov.pl/api/v1';
const HEADERS = {
  'User-Agent': 'SprawdzDzialke/1.0 (kontakt@sprawdzdzialke.pl)',
  Accept: 'application/json',
};

export interface PriceData {
  pricePerM2: number; // mediana ceny za 1 m² [zł]
  year: number; // rok danych GUS
  level: 'powiat' | 'województwo';
  unitName: string; // nazwa obszaru, którego dotyczy cena
  source: string;
}

async function bdlFetch(path: string): Promise<unknown | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return await res.json();
      if (res.status === 429 || res.status === 503)
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    } catch {
      await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
    }
  }
  return null;
}

// --- rozwiązanie ID zmiennej (cache na czas życia procesu) ---
let cachedVarId: number | null | undefined;

interface VarSearchResult {
  id: number;
  subjectId?: string;
  n1?: string;
  n2?: string;
}

async function resolvePriceVariableId(): Promise<number | null> {
  if (cachedVarId !== undefined) return cachedVarId;

  const data = (await bdlFetch(
    `/variables/search?name=${encodeURIComponent('mediana cen za 1 m2 lokali mieszkalnych')}&format=json&page-size=50`
  )) as { results?: VarSearchResult[] } | null;

  const results = data?.results || [];
  // preferuj podmiot transakcji RYNKOWYCH (P3787), wariant "ogółem"
  const pick =
    results.find(
      (r) => r.subjectId === 'P3787' && /ogó/i.test(`${r.n1} ${r.n2}`)
    ) ||
    results.find((r) => r.subjectId === 'P3787') ||
    results.find((r) => /transakcji rynkowych/i.test(r.n1 || '')) ||
    results[0];

  cachedVarId = pick ? pick.id : null;
  return cachedVarId;
}

// --- znajdź jednostkę BDL danego poziomu po nazwie ---
interface BdlUnit {
  id: string;
  name: string;
  level: number;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/powiat\s+/g, '')
    .replace(/m\.?\s*st\.?\s*/g, '')
    .replace(/\b(od|do)\s+\d{4}\b/g, '')
    .replace(/[()]/g, '')
    .trim();
}

async function findUnit(name: string, level: number): Promise<BdlUnit | null> {
  if (!name) return null;
  const data = (await bdlFetch(
    `/units/search?name=${encodeURIComponent(name)}&level=${level}&format=json&page-size=40`
  )) as { results?: BdlUnit[] } | null;
  const results = (data?.results || []).filter((u) => !/\bdo \d{4}\b/i.test(u.name));
  if (results.length === 0) return null;
  const target = normalize(name);
  return (
    results.find((u) => normalize(u.name) === target) ||
    results.find((u) => normalize(u.name).startsWith(target)) ||
    results[0]
  );
}

interface BdlDataByUnit {
  results?: { id: number; values?: { year: string; val: number }[] }[];
}

async function priceForUnit(
  unit: BdlUnit,
  varId: number
): Promise<{ price: number; year: number } | null> {
  const now = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => now - 1 - i).map((y) => `year=${y}`).join('&');
  const data = (await bdlFetch(
    `/data/by-unit/${unit.id}?var-id=${varId}&${years}&format=json`
  )) as BdlDataByUnit | null;

  const values = data?.results?.[0]?.values || [];
  if (values.length === 0) return null;
  const newest = [...values]
    .filter((v) => typeof v.val === 'number')
    .sort((a, b) => Number(b.year) - Number(a.year))[0];
  if (!newest) return null;
  return { price: Math.round(newest.val), year: Number(newest.year) };
}

// county może przyjść jako "powiat Warszawa" / "powiat miński" — czyścimy
function cleanCounty(county: string): string {
  return county.replace(/^powiat\s+/i, '').trim();
}

export async function getPropertyPrices(
  city: string,
  county: string,
  province: string
): Promise<PriceData | null> {
  try {
    const varId = await resolvePriceVariableId();
    if (!varId) return null;

    // 1) spróbuj na poziomie powiatu (najbliżej lokalizacji)
    const countyName = cleanCounty(county) || city;
    const powiat = await findUnit(countyName, 5);
    if (powiat) {
      const p = await priceForUnit(powiat, varId);
      if (p)
        return {
          pricePerM2: p.price,
          year: p.year,
          level: 'powiat',
          unitName: powiat.name,
          source: 'GUS BDL — mediana cen transakcyjnych za 1 m² (transakcje rynkowe)',
        };
    }

    // 2) fallback: poziom województwa
    const woj = await findUnit(province, 2);
    if (woj) {
      const p = await priceForUnit(woj, varId);
      if (p)
        return {
          pricePerM2: p.price,
          year: p.year,
          level: 'województwo',
          unitName: woj.name,
          source: 'GUS BDL — mediana cen transakcyjnych za 1 m² (transakcje rynkowe)',
        };
    }

    return null;
  } catch {
    return null;
  }
}
