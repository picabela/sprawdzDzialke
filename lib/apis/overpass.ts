// Wspólny klient Overpass API (OpenStreetMap) z mirrorami i ponawianiem.
// Publiczne serwery Overpass limitują zapytania per IP (na Vercelu wiele
// raportów wychodzi z tych samych IP), więc:
//   - mamy kilka mirrorów i próbujemy je po kolei,
//   - przy 429/504 czekamy chwilę i robimy DRUGĄ rundę po wszystkich mirrorach,
//   - wyniki cache'ujemy per zapytanie na 30 min (powtórne raporty dla tej
//     samej okolicy nie zużywają limitu).

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function overpassQuery(query: string, timeoutMs = 20000): Promise<unknown | null> {
  const hit = cache.get(query);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

  for (let round = 0; round < 2; round++) {
    for (const url of MIRRORS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            // Overpass odrzuca żądania bez identyfikującego User-Agent (406)
            'User-Agent': 'SprawdzDzialke/1.0 (kontakt@sprawdzdzialke.pl)',
            Accept: 'application/json',
          },
          body: 'data=' + encodeURIComponent(query),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok) continue; // 429/504 → spróbuj kolejny mirror
        const data = await res.json();
        cache.set(query, { data, ts: Date.now() });
        return data;
      } catch {
        continue;
      }
    }
    // wszystkie mirrory odmówiły — krótka pauza przed drugą rundą
    if (round === 0) await sleep(2500);
  }
  return null;
}
