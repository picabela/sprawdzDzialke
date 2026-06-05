export interface IsochroneData {
  walkable15min: number;    // Liczba POI w zasięgu 15 min pieszo
  drivable30min: number;    // Liczba POI w zasięgu 30 min autem
  nearestHospitalMin?: number;
  nearestSchoolMin?: number;
  nearestShopMin?: number;
}

export async function getAccessibilityData(lat: number, lng: number): Promise<IsochroneData | null> {
  if (!process.env.ORS_API_KEY) {
    return null;
  }

  try {
    // Izochrone 15 minut pieszo
    const isoRes = await fetch('https://api.openrouteservice.org/v2/isochrones/foot-walking', {
      method: 'POST',
      headers: {
        Authorization: process.env.ORS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locations: [[lng, lat]],    // ORS przyjmuje [lng, lat]!
        range: [900],               // 15 minut = 900 sekund
        range_type: 'time',
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!isoRes.ok) return null;

    // Zapytaj Overpass API (OpenStreetMap) o POI w tej izochronie
    // Zamiast implementować pełne intersection, użyjemy prostego bbox
    const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `[out:json][timeout:10];
        (
          node["amenity"="school"](around:1200,${lat},${lng});
          node["amenity"="hospital"](around:3000,${lat},${lng});
          node["amenity"="pharmacy"](around:1000,${lat},${lng});
          node["shop"="supermarket"](around:1000,${lat},${lng});
          node["amenity"="restaurant"](around:800,${lat},${lng});
          node["public_transport"="stop_position"](around:600,${lat},${lng});
        );
        out count;`,
      signal: AbortSignal.timeout(10000),
    });

    let poiCount = 0;
    if (overpassRes.ok) {
      const overpassData = await overpassRes.json();
      poiCount = overpassData?.elements?.[0]?.tags?.total || 0;
    }

    return {
      walkable15min: poiCount,
      drivable30min: poiCount * 3,   // szacunek
    };
  } catch {
    return null;
  }
}
