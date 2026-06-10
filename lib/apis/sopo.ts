// Osuwiska — System Osłony Przeciwosuwiskowej (SOPO, PIG-PIB).
// Odpytujemy oficjalną usługę ArcGIS przez operację identify:
//   warstwa 14 — udokumentowane osuwiska (z oceną aktywności)
//   warstwa 12 — tereny zagrożone ruchami masowymi
// Bufor wyszukiwania ~100 m wokół punktu.

const SOPO_IDENTIFY =
  'https://cbdgmapa.pgi.gov.pl/arcgis/rest/services/geozagrozenia/sopo_obszary/MapServer/identify';

export interface LandslideInfo {
  checked: boolean;        // czy usługa odpowiedziała (false = brak danych, nie "bezpiecznie")
  onLandslide: boolean;    // punkt (±100 m) leży na udokumentowanym osuwisku
  activity?: string;       // stopień aktywności osuwiska wg karty SOPO
  inThreatZone: boolean;   // punkt w terenie zagrożonym ruchami masowymi
}

interface IdentifyResult {
  layerId: number;
  attributes?: Record<string, string>;
}

export async function getLandslideInfo(lat: number, lng: number): Promise<LandslideInfo> {
  try {
    // mapExtent ±0.005° i obraz 400 px → 1 px ≈ 2,8 m; tolerance 36 px ≈ 100 m bufora
    const d = 0.005;
    const params = new URLSearchParams({
      geometry: `${lng},${lat}`,
      geometryType: 'esriGeometryPoint',
      sr: '4326',
      layers: 'all:14,12',
      tolerance: '36',
      mapExtent: `${lng - d},${lat - d},${lng + d},${lat + d}`,
      imageDisplay: '400,400,96',
      returnGeometry: 'false',
      f: 'json',
    });

    const res = await fetch(`${SOPO_IDENTIFY}?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { checked: false, onLandslide: false, inThreatZone: false };

    const data = (await res.json()) as { results?: IdentifyResult[]; error?: unknown };
    if (data.error || !Array.isArray(data.results)) {
      return { checked: false, onLandslide: false, inThreatZone: false };
    }

    const landslide = data.results.find((r) => r.layerId === 14);
    const threat = data.results.some((r) => r.layerId === 12);

    return {
      checked: true,
      onLandslide: !!landslide,
      activity: landslide?.attributes?.['Stopień aktywności'] || undefined,
      inThreatZone: threat,
    };
  } catch {
    return { checked: false, onLandslide: false, inThreatZone: false };
  }
}
