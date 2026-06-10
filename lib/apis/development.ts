// Rozwój i przyszłość okolicy — OpenStreetMap (Overpass).
// Sprawdzamy rzeczy, które zmienią okolicę w najbliższych latach:
//   - duże drogi w budowie lub planowane (motorway/trunk/primary) do 3 km
//   - place budowy (landuse=construction) do 1 km — presja deweloperska
//   - lotniska do 12 km — hałas lotniczy
//   - obszary chronione do 2 km — ograniczenia zabudowy, ale i gwarancja zieleni

import { distanceM } from '../geo-utils';
import { overpassQuery } from './overpass';

export interface DevelopmentInfo {
  roadConstructionName?: string;    // nazwa/typ drogi w budowie
  roadConstructionDistanceM?: number;
  roadProposed?: boolean;           // true = dopiero planowana, false = w budowie
  constructionSitesCount?: number;  // place budowy w 1 km
  airportName?: string;
  airportDistanceM?: number;
  protectedAreaName?: string;
  protectedAreaType?: string;       // park narodowy / rezerwat / obszar chroniony
  protectedAreaDistanceM?: number;
}

interface OverpassElement {
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const MAJOR = /^(motorway|trunk|primary|secondary)/;

export async function getDevelopmentInfo(lat: number, lng: number): Promise<DevelopmentInfo | null> {
  const query = `[out:json][timeout:18];
(
  way["highway"="construction"](around:3000,${lat},${lng});
  way["highway"="proposed"](around:3000,${lat},${lng});
  way["landuse"="construction"](around:1000,${lat},${lng});
  way["aeroway"="aerodrome"](around:12000,${lat},${lng});
  relation["aeroway"="aerodrome"](around:12000,${lat},${lng});
  relation["boundary"="national_park"](around:3000,${lat},${lng});
  relation["boundary"="protected_area"](around:2000,${lat},${lng});
  way["leisure"="nature_reserve"](around:2000,${lat},${lng});
  relation["leisure"="nature_reserve"](around:2000,${lat},${lng});
);
out tags center 80;`;

  const data = (await overpassQuery(query, 22000)) as { elements?: OverpassElement[] } | null;
  if (!data?.elements) return null;

  const info: DevelopmentInfo = {};
  let bestRoad = Infinity;
  let bestAirport = Infinity;
  let bestProtected = Infinity;
  let sites = 0;

  for (const el of data.elements) {
    const t = el.tags || {};
    const pt = el.center || (el.lat !== undefined ? { lat: el.lat, lon: el.lon! } : null);
    if (!pt) continue;
    const dist = distanceM(lat, lng, pt.lat, pt.lon);

    // drogi w budowie/planowane — tylko duże klasy (remonty ulic pomijamy)
    if (t.highway === 'construction' || t.highway === 'proposed') {
      const targetClass = t.construction || t.proposed || '';
      if (MAJOR.test(targetClass) && dist < bestRoad) {
        bestRoad = dist;
        info.roadConstructionName = t.name || targetClass;
        info.roadConstructionDistanceM = dist;
        info.roadProposed = t.highway === 'proposed';
      }
      continue;
    }

    if (t.landuse === 'construction') {
      sites++;
      continue;
    }

    if (t.aeroway === 'aerodrome') {
      if (dist < bestAirport) {
        bestAirport = dist;
        info.airportName = t.name || 'lotnisko';
        info.airportDistanceM = dist;
      }
      continue;
    }

    const isProtected =
      t.boundary === 'national_park' ||
      t.boundary === 'protected_area' ||
      t.leisure === 'nature_reserve';
    if (isProtected && dist < bestProtected) {
      bestProtected = dist;
      info.protectedAreaName = t.name || undefined;
      info.protectedAreaType =
        t.boundary === 'national_park'
          ? 'park narodowy'
          : t.leisure === 'nature_reserve'
            ? 'rezerwat przyrody'
            : 'obszar chroniony';
      info.protectedAreaDistanceM = dist;
    }
  }

  if (sites > 0) info.constructionSitesCount = sites;
  return info;
}
