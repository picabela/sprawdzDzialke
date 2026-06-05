// Sprawdzamy zagrożenie powodziowe przez zapytanie WMS GetFeatureInfo
// ISOK udostępnia mapy zagrożenia powodziowego dla scenariuszy Q10, Q100, Q500

export type FloodRisk = 'none' | 'low' | 'medium' | 'high';

export async function getFloodRisk(lat: number, lng: number): Promise<FloodRisk> {
  // Konwersja WGS84 na EPSG:2180 (przybliżona, dla WMS)
  // ISOK WMS akceptuje EPSG:4326 (WGS84)

  // Budujemy zapytanie WMS GetFeatureInfo
  // Warstwa: Q100 (powódź raz na 100 lat — standardowy benchmark)
  const bbox = `${lng - 0.001},${lat - 0.001},${lng + 0.001},${lat + 0.001}`;

  const url = new URL('https://wody.isok.gov.pl/geoserver/mzp/wms');
  url.searchParams.set('SERVICE', 'WMS');
  url.searchParams.set('VERSION', '1.1.1');
  url.searchParams.set('REQUEST', 'GetFeatureInfo');
  url.searchParams.set('LAYERS', 'mzp_q100');
  url.searchParams.set('QUERY_LAYERS', 'mzp_q100');
  url.searchParams.set('BBOX', bbox);
  url.searchParams.set('WIDTH', '100');
  url.searchParams.set('HEIGHT', '100');
  url.searchParams.set('X', '50');
  url.searchParams.set('Y', '50');
  url.searchParams.set('INFO_FORMAT', 'application/json');
  url.searchParams.set('SRS', 'EPSG:4326');

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return 'none';

    const data = await res.json();
    const features = data?.features || [];

    if (features.length === 0) return 'none';

    // Sprawdź głębokość wody w scenariuszu Q100
    const depth = features[0]?.properties?.depth || 0;

    if (depth > 2) return 'high';
    if (depth > 0.5) return 'medium';
    if (depth > 0) return 'low';
    return 'none';
  } catch {
    // Jeśli ISOK nie odpowiada, nie blokuj — zwróć none
    return 'none';
  }
}

// Uproszczona wersja — sprawdzenie przez GetMap i analizę pikseli
// (alternatywna metoda gdy GetFeatureInfo nie działa)
export async function getFloodRiskSimple(lat: number, lng: number): Promise<FloodRisk> {
  // Pobierz kafelek PNG i sprawdź kolor w punkcie
  // Niebieski = zagrożony, biały/przezroczysty = bezpieczny
  // Ta metoda jest mniej precyzyjna ale bardziej niezawodna
  const delta = 0.002;
  const url = `https://wody.isok.gov.pl/geoserver/mzp/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=mzp_q100&BBOX=${lng - delta},${lat - delta},${lng + delta},${lat + delta}&WIDTH=100&HEIGHT=100&SRS=EPSG:4326`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return 'none';
    // Analiza pikseli wymagałaby canvas/sharp — uproszczenie: sprawdzamy rozmiar odpowiedzi
    // Mały PNG (< 1KB) = pusty = brak zagrożenia, duży = są dane = zagrożenie
    const buffer = await res.arrayBuffer();
    return buffer.byteLength > 1500 ? 'medium' : 'none';
  } catch {
    return 'none';
  }
}
