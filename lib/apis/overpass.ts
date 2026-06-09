// Wspólny klient Overpass API (OpenStreetMap) z mirrorami i ponawianiem.
// Publiczne serwery Overpass limitują równoległe zapytania per IP,
// więc w razie błędu próbujemy kolejny mirror.

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

export async function overpassQuery(query: string, timeoutMs = 20000): Promise<unknown | null> {
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
      if (!res.ok) continue; // 429/504 → spróbuj mirror
      return await res.json();
    } catch {
      continue;
    }
  }
  return null;
}
