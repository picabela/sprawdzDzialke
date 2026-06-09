// Analiza otoczenia przez OpenStreetMap (Overpass).
// Realne odległości do uciążliwości (tory, drogi główne, przemysł, linie WN)
// oraz liczba udogodnień w okolicy (szkoły, sklepy, apteki, przystanki, parki).

import { minDistanceToGeometry, distanceM, type LatLng } from '../geo-utils';
import { overpassQuery } from './overpass';

export interface SurroundingsData {
  railwayDistanceM?: number;       // najbliższa czynna linia kolejowa
  majorRoadDistanceM?: number;     // najbliższa droga główna (autostrada/ekspresowa/krajowa)
  majorRoadName?: string;
  industrialDistanceM?: number;    // najbliższy teren przemysłowy
  powerLineDistanceM?: number;     // najbliższa linia wysokiego napięcia
  schoolsCount: number;            // szkoły + przedszkola w 1,5 km
  pharmaciesCount: number;         // apteki w 1,5 km
  supermarketsCount: number;       // supermarkety w 1,5 km
  busStopsCount: number;           // przystanki w 800 m
  parksCount: number;              // parki w 1 km
  nearestSchoolM?: number;
  nearestSupermarketM?: number;
  nearestBusStopM?: number;
}

interface OverpassElement {
  type: string;
  lat?: number;
  lon?: number;
  center?: LatLng;
  geometry?: LatLng[];
  tags?: Record<string, string>;
}

function elementDistance(lat: number, lng: number, el: OverpassElement): number {
  if (el.geometry && el.geometry.length > 0) return minDistanceToGeometry(lat, lng, el.geometry);
  const p = el.center || (el.lat !== undefined ? { lat: el.lat, lon: el.lon! } : null);
  if (!p) return Infinity;
  return distanceM(lat, lng, p.lat, p.lon);
}

export async function getSurroundings(lat: number, lng: number): Promise<SurroundingsData | null> {
  const query = `[out:json][timeout:20];
(
  way["railway"="rail"]["service"!~"."](around:1500,${lat},${lng});
  way["highway"~"^(motorway|trunk|primary)$"](around:1500,${lat},${lng});
  way["landuse"="industrial"](around:1500,${lat},${lng});
  way["power"="line"](around:800,${lat},${lng});
  node["amenity"~"^(school|kindergarten)$"](around:1500,${lat},${lng});
  node["amenity"="pharmacy"](around:1500,${lat},${lng});
  node["shop"~"^(supermarket|convenience)$"](around:1500,${lat},${lng});
  node["highway"="bus_stop"](around:800,${lat},${lng});
  node["railway"~"^(station|tram_stop)$"](around:800,${lat},${lng});
  way["leisure"="park"](around:1000,${lat},${lng});
);
out geom 250;`;

  try {
    const data = (await overpassQuery(query, 25000)) as { elements?: OverpassElement[] } | null;
    if (!data) return null;

    const elements: OverpassElement[] = data.elements || [];

    const result: SurroundingsData = {
      schoolsCount: 0,
      pharmaciesCount: 0,
      supermarketsCount: 0,
      busStopsCount: 0,
      parksCount: 0,
    };

    for (const el of elements) {
      const t = el.tags || {};
      const dist = elementDistance(lat, lng, el);

      if (t.railway === 'rail') {
        if (result.railwayDistanceM === undefined || dist < result.railwayDistanceM)
          result.railwayDistanceM = dist;
      } else if (t.highway && ['motorway', 'trunk', 'primary'].includes(t.highway)) {
        if (result.majorRoadDistanceM === undefined || dist < result.majorRoadDistanceM) {
          result.majorRoadDistanceM = dist;
          result.majorRoadName = t.ref || t.name || undefined;
        }
      } else if (t.landuse === 'industrial') {
        if (result.industrialDistanceM === undefined || dist < result.industrialDistanceM)
          result.industrialDistanceM = dist;
      } else if (t.power === 'line') {
        if (result.powerLineDistanceM === undefined || dist < result.powerLineDistanceM)
          result.powerLineDistanceM = dist;
      } else if (t.amenity === 'school' || t.amenity === 'kindergarten') {
        result.schoolsCount++;
        if (result.nearestSchoolM === undefined || dist < result.nearestSchoolM)
          result.nearestSchoolM = dist;
      } else if (t.amenity === 'pharmacy') {
        result.pharmaciesCount++;
      } else if (t.shop === 'supermarket' || t.shop === 'convenience') {
        result.supermarketsCount++;
        if (result.nearestSupermarketM === undefined || dist < result.nearestSupermarketM)
          result.nearestSupermarketM = dist;
      } else if (t.highway === 'bus_stop' || t.railway === 'station' || t.railway === 'tram_stop') {
        result.busStopsCount++;
        if (result.nearestBusStopM === undefined || dist < result.nearestBusStopM)
          result.nearestBusStopM = dist;
      } else if (t.leisure === 'park') {
        result.parksCount++;
      }
    }

    return result;
  } catch {
    return null;
  }
}
