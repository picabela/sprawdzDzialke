// Analiza otoczenia przez OpenStreetMap (Overpass).
// Dwie warstwy informacji:
//   1. UCIĄŻLIWOŚCI liniowe/obszarowe — najbliższa kolej, droga główna,
//      teren przemysłowy, linia wysokiego napięcia (liczone z geometrii).
//   2. PUNKTY USŁUGOWE (POI) w kategoriach — z nazwami, adresami i
//      współrzędnymi, żeby raport mógł pokazać rozwijane listy konkretnych
//      miejsc z odnośnikami na mapę.

import { minDistanceToGeometry, distanceM, type LatLng } from '../geo-utils';
import { overpassQuery } from './overpass';

export interface Poi {
  name: string;
  distanceM: number;
  lat: number;
  lng: number;
  detail?: string; // adres lub dodatkowy opis
}

export interface PoiCategory {
  count: number;
  nearestM?: number;
  items: Poi[]; // kilka najbliższych nazwanych obiektów (do rozwijanej listy)
}

export interface SurroundingsData {
  // --- uciążliwości ---
  railwayDistanceM?: number;
  majorRoadDistanceM?: number;
  majorRoadName?: string;
  industrialDistanceM?: number;
  powerLineDistanceM?: number;

  // --- liczniki kompatybilne wstecz (używane w podsumowaniu AI) ---
  schoolsCount: number;
  pharmaciesCount: number;
  supermarketsCount: number;
  busStopsCount: number;
  parksCount: number;
  nearestSchoolM?: number;
  nearestSupermarketM?: number;
  nearestBusStopM?: number;

  // --- pełne kategorie POI z nazwami i współrzędnymi ---
  categories: Record<string, PoiCategory>;
}

// Definicje kategorii: klucz → etykieta + funkcja dopasowania po tagach OSM
interface CategoryDef {
  key: string;
  label: string;
  match: (t: Record<string, string>) => boolean;
}

const CATEGORIES: CategoryDef[] = [
  { key: 'education', label: 'Edukacja (szkoły, przedszkola, żłobki)', match: (t) => ['school', 'kindergarten', 'college', 'university', 'childcare'].includes(t.amenity) },
  { key: 'healthcare', label: 'Zdrowie (apteki, przychodnie, szpitale)', match: (t) => ['pharmacy', 'hospital', 'clinic', 'doctors', 'dentist', 'veterinary'].includes(t.amenity) },
  { key: 'shopping', label: 'Sklepy i supermarkety', match: (t) => ['supermarket', 'convenience', 'bakery', 'mall', 'greengrocer', 'butcher'].includes(t.shop) },
  { key: 'food', label: 'Gastronomia (restauracje, kawiarnie, bary)', match: (t) => ['restaurant', 'cafe', 'bar', 'fast_food', 'pub'].includes(t.amenity) },
  { key: 'sport', label: 'Sport i rekreacja', match: (t) => ['pitch', 'playground', 'fitness_centre', 'sports_centre', 'swimming_pool', 'stadium', 'track'].includes(t.leisure) },
  { key: 'parks', label: 'Parki, lasy, tereny zielone', match: (t) => t.leisure === 'park' || t.leisure === 'garden' || t.landuse === 'forest' || t.natural === 'wood' },
  { key: 'transit', label: 'Przystanki i transport publiczny', match: (t) => t.highway === 'bus_stop' || ['station', 'tram_stop', 'subway_entrance', 'halt'].includes(t.railway) },
  { key: 'culture', label: 'Kultura i religia (biblioteki, kina, kościoły)', match: (t) => ['library', 'cinema', 'theatre', 'arts_centre', 'community_centre', 'place_of_worship'].includes(t.amenity) },
  { key: 'services', label: 'Usługi (fryzjer, kosmetyczka)', match: (t) => ['hairdresser', 'beauty'].includes(t.shop) },
  { key: 'finance', label: 'Bankomaty i banki', match: (t) => ['atm', 'bank'].includes(t.amenity) },
  { key: 'post', label: 'Poczta i paczkomaty', match: (t) => t.amenity === 'post_office' || t.amenity === 'parcel_locker' },
  { key: 'fuel', label: 'Stacje paliw i ładowarki EV', match: (t) => ['fuel', 'charging_station'].includes(t.amenity) },
  { key: 'parking', label: 'Parkingi', match: (t) => t.amenity === 'parking' },
  { key: 'bike', label: 'Rowery miejskie', match: (t) => t.amenity === 'bicycle_rental' },
  { key: 'emergency', label: 'Służby (policja, straż, SOR)', match: (t) => ['police', 'fire_station'].includes(t.amenity) || t.emergency === 'yes' },
  { key: 'heritage', label: 'Zabytki i obiekty historyczne', match: (t) => !!t.historic || !!t.heritage },
];

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

function elementPoint(el: OverpassElement): LatLng | null {
  if (el.center) return el.center;
  if (el.lat !== undefined && el.lon !== undefined) return { lat: el.lat, lon: el.lon };
  if (el.geometry && el.geometry.length > 0) return el.geometry[0];
  return null;
}

function buildDetail(t: Record<string, string>): string | undefined {
  const street = t['addr:street'];
  const num = t['addr:housenumber'];
  if (street && num) return `${street} ${num}`;
  if (street) return street;
  return t.operator || t.brand || undefined;
}

export async function getSurroundings(lat: number, lng: number): Promise<SurroundingsData | null> {
  // Jedno zapytanie obejmujące uciążliwości (do 1,5 km) i POI (do 2 km).
  const query = `[out:json][timeout:25];
(
  way["railway"="rail"]["service"!~"."](around:1500,${lat},${lng});
  way["highway"~"^(motorway|trunk|primary)$"](around:1500,${lat},${lng});
  way["landuse"="industrial"](around:1500,${lat},${lng});
  way["power"="line"](around:800,${lat},${lng});

  nwr["amenity"~"^(school|kindergarten|college|university|childcare|pharmacy|hospital|clinic|doctors|dentist|veterinary|restaurant|cafe|bar|fast_food|pub|library|cinema|theatre|arts_centre|community_centre|place_of_worship|atm|bank|post_office|parcel_locker|fuel|charging_station|parking|bicycle_rental|police|fire_station)$"](around:2000,${lat},${lng});
  nwr["shop"~"^(supermarket|convenience|bakery|mall|greengrocer|butcher|hairdresser|beauty)$"](around:2000,${lat},${lng});
  nwr["leisure"~"^(pitch|playground|fitness_centre|sports_centre|swimming_pool|stadium|track|park|garden)$"](around:2000,${lat},${lng});
  nwr["historic"](around:1500,${lat},${lng});
  node["highway"="bus_stop"](around:1000,${lat},${lng});
  node["railway"~"^(station|tram_stop|subway_entrance|halt)$"](around:1000,${lat},${lng});
);
out tags center 800;`;

  try {
    const data = (await overpassQuery(query, 30000)) as { elements?: OverpassElement[] } | null;
    if (!data) return null;

    const elements: OverpassElement[] = data.elements || [];

    const result: SurroundingsData = {
      schoolsCount: 0,
      pharmaciesCount: 0,
      supermarketsCount: 0,
      busStopsCount: 0,
      parksCount: 0,
      categories: {},
    };

    // inicjalizacja kategorii
    const cat: Record<string, PoiCategory> = {};
    for (const c of CATEGORIES) cat[c.key] = { count: 0, items: [] };

    // żeby nie liczyć podwójnie tego samego obiektu pod różne kategorie,
    // a forest/wood bywają wielkie — parki traktujemy specjalnie (bez nazw spamu)
    const seen = new Set<string>();

    for (const el of elements) {
      const t = el.tags || {};
      const dist = elementDistance(lat, lng, el);

      // --- uciążliwości ---
      if (t.railway === 'rail') {
        if (result.railwayDistanceM === undefined || dist < result.railwayDistanceM)
          result.railwayDistanceM = dist;
        continue;
      }
      if (t.highway && ['motorway', 'trunk', 'primary'].includes(t.highway)) {
        if (result.majorRoadDistanceM === undefined || dist < result.majorRoadDistanceM) {
          result.majorRoadDistanceM = dist;
          result.majorRoadName = t.ref || t.name || undefined;
        }
        continue;
      }
      if (t.landuse === 'industrial') {
        if (result.industrialDistanceM === undefined || dist < result.industrialDistanceM)
          result.industrialDistanceM = dist;
        continue;
      }
      if (t.power === 'line') {
        if (result.powerLineDistanceM === undefined || dist < result.powerLineDistanceM)
          result.powerLineDistanceM = dist;
        continue;
      }

      // --- POI: znajdź pierwszą pasującą kategorię ---
      const def = CATEGORIES.find((c) => c.match(t));
      if (!def) continue;

      const dedupeKey = `${def.key}:${t.name || ''}:${Math.round(dist / 25)}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const c = cat[def.key];
      c.count++;
      if (c.nearestM === undefined || dist < c.nearestM) c.nearestM = dist;

      const pt = elementPoint(el);
      if (t.name && pt) {
        c.items.push({
          name: t.name,
          distanceM: dist,
          lat: pt.lat,
          lng: pt.lon,
          detail: buildDetail(t),
        });
      }
    }

    // posortuj i przytnij listy do 6 najbliższych nazwanych obiektów
    for (const key of Object.keys(cat)) {
      cat[key].items.sort((a, b) => a.distanceM - b.distanceM);
      cat[key].items = cat[key].items.slice(0, 6);
    }
    result.categories = cat;

    // --- liczniki kompatybilne wstecz dla podsumowania AI ---
    result.schoolsCount = cat.education.count;
    result.nearestSchoolM = cat.education.nearestM;
    result.pharmaciesCount = elements.filter((e) => e.tags?.amenity === 'pharmacy').length;
    result.supermarketsCount = cat.shopping.count;
    result.nearestSupermarketM = cat.shopping.nearestM;
    result.busStopsCount = cat.transit.count;
    result.nearestBusStopM = cat.transit.nearestM;
    result.parksCount = cat.parks.count;

    return result;
  } catch {
    return null;
  }
}

// Etykiety kategorii — używane przez UI i prompt
export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.label])
);
