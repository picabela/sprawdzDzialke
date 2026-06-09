// Narzędzia geograficzne wspólne dla modułów API

export interface LatLng {
  lat: number;
  lon: number;
}

// Odległość po sferze (haversine) w metrach
export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

// Najmniejsza odległość od punktu do geometrii (listy wierzchołków) w metrach
export function minDistanceToGeometry(lat: number, lng: number, geometry: LatLng[]): number {
  let min = Infinity;
  for (const p of geometry) {
    const d = distanceM(lat, lng, p.lat, p.lon);
    if (d < min) min = d;
  }
  return min;
}
