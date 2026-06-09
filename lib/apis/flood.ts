// Ocena zagrożenia powodziowego.
// Oficjalne mapy ISOK nie są dostępne przez publiczne, stabilne API,
// dlatego liczymy rzetelną heurystykę z dwóch źródeł:
//   1. OpenStreetMap (Overpass) — odległość do najbliższej rzeki/kanału/strumienia
//   2. Open-Meteo Elevation — różnica wysokości terenu względem rzeki
// Wynik 'unknown' jest uczciwie raportowany gdy brak danych — nigdy nie
// udajemy "bezpiecznie" gdy po prostu nie wiemy.

import { minDistanceToGeometry, type LatLng } from '../geo-utils';
import { overpassQuery } from './overpass';

export type FloodRisk = 'none' | 'low' | 'medium' | 'high' | 'unknown';

export interface FloodAssessment {
  risk: FloodRisk;
  riverName?: string;        // nazwa najbliższego cieku
  riverType?: string;        // river | canal | stream
  riverDistanceM?: number;   // odległość w metrach
  elevationM?: number;       // wysokość n.p.m. badanego punktu
  elevationDiffM?: number;   // ile metrów nad poziomem rzeki
  method: string;            // opis metody (do raportu)
}

interface OverpassWay {
  tags?: Record<string, string>;
  geometry?: LatLng[];
}

export async function getFloodAssessment(lat: number, lng: number): Promise<FloodAssessment> {
  try {
    // Krok 1: znajdź cieki wodne w okolicy (rzeki/kanały do 1500 m, strumienie do 500 m)
    const query = `[out:json][timeout:15];
(
  way["waterway"~"^(river|canal)$"](around:1500,${lat},${lng});
  way["waterway"="stream"](around:500,${lat},${lng});
  way["natural"="water"]["water"~"^(river|lake|reservoir)$"](around:800,${lat},${lng});
);
out geom 60;`;

    const data = (await overpassQuery(query, 20000)) as { elements?: OverpassWay[] } | null;
    if (!data) return { risk: 'unknown', method: 'Brak odpowiedzi z OpenStreetMap' };

    const elements: OverpassWay[] = data.elements || [];

    if (elements.length === 0) {
      // Brak jakiejkolwiek wody w promieniu 1,5 km — ryzyko znikome
      return {
        risk: 'none',
        method: 'Brak rzek, kanałów i zbiorników w promieniu 1,5 km (OpenStreetMap)',
      };
    }

    // Krok 2: oceniamy KAŻDY ciek osobno i bierzemy najgroźniejszy.
    // Duża rzeka 1 km dalej jest istotniejsza niż strumyk 300 m obok.
    const RISK_ORDER: FloodRisk[] = ['none', 'low', 'medium', 'high'];

    function riskByDistance(type: string, dist: number): FloodRisk {
      const isMajor = type === 'river' || type === 'canal';
      if (isMajor) {
        if (dist < 150) return 'high';
        if (dist < 500) return 'medium';
        if (dist < 1200) return 'low';
        return 'none';
      }
      if (dist < 80) return 'medium';
      if (dist < 250) return 'low';
      return 'none';
    }

    let worst: { risk: FloodRisk; dist: number; name: string; type: string; point: LatLng } | null =
      null;
    for (const el of elements) {
      const geom = el.geometry || [];
      if (geom.length === 0) continue;
      const dist = minDistanceToGeometry(lat, lng, geom);
      const type = el.tags?.waterway || el.tags?.water || 'water';
      const risk = riskByDistance(type, dist);

      const better =
        !worst ||
        RISK_ORDER.indexOf(risk) > RISK_ORDER.indexOf(worst.risk) ||
        (RISK_ORDER.indexOf(risk) === RISK_ORDER.indexOf(worst.risk) && dist < worst.dist);

      if (better) {
        // najbliższy wierzchołek tego cieku (do pomiaru wysokości lustra wody)
        let bestPt = geom[0];
        let bestD = Infinity;
        for (const p of geom) {
          const d = minDistanceToGeometry(lat, lng, [p]);
          if (d < bestD) {
            bestD = d;
            bestPt = p;
          }
        }
        worst = { risk, dist, name: el.tags?.name || '', type, point: bestPt };
      }
    }

    if (!worst) return { risk: 'unknown', method: 'Nie udało się zmierzyć odległości od wody' };

    // Krok 3: różnica wysokości terenu (punkt vs rzeka) — może obniżyć ryzyko
    let elevation: number | undefined;
    let elevationDiff: number | undefined;
    try {
      const elevRes = await fetch(
        `https://api.open-meteo.com/v1/elevation?latitude=${lat},${worst.point.lat}&longitude=${lng},${worst.point.lon}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (elevRes.ok) {
        const elevData = await elevRes.json();
        const [pointElev, riverElev] = elevData?.elevation || [];
        if (typeof pointElev === 'number' && typeof riverElev === 'number') {
          elevation = pointElev;
          elevationDiff = Math.round((pointElev - riverElev) * 10) / 10;
        }
      }
    } catch {
      // wysokość opcjonalna — heurystyka zadziała na samej odległości
    }

    // Krok 4: korekta o wysokość — teren wyraźnie nad rzeką obniża ryzyko
    let risk = worst.risk;
    if (elevationDiff !== undefined) {
      if (elevationDiff >= 20) risk = 'none';
      else if (elevationDiff >= 12 && RISK_ORDER.indexOf(risk) > RISK_ORDER.indexOf('low'))
        risk = 'low';
      else if (elevationDiff >= 8 && risk === 'high') risk = 'medium';
    }

    return {
      risk,
      riverName: worst.name || undefined,
      riverType: worst.type,
      riverDistanceM: worst.dist,
      elevationM: elevation,
      elevationDiffM: elevationDiff,
      method:
        'Szacunek na podstawie odległości od cieków (OpenStreetMap) i różnicy wysokości terenu (Open-Meteo). To nie jest oficjalna mapa zagrożenia powodziowego ISOK.',
    };
  } catch {
    return { risk: 'unknown', method: 'Błąd pobierania danych o wodach' };
  }
}
