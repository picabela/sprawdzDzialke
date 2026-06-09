// MPZP — Miejscowy Plan Zagospodarowania Przestrzennego
// Krajowa Integracja MPZP (GUGiK / geoportal.gov.pl). Darmowe, bez klucza.
// Odpowiedzi są niejednorodne (różne gminy → różne serwery): XML ROWSET lub HTML ESRI.

export interface MpzpInfo {
  covered: boolean;          // czy punkt jest objęty planem miejscowym
  purposes: string[];        // przeznaczenie terenu, np. "tereny usług (A 2.1/C)"
  planName?: string;         // nazwa planu
  maxHeight?: string;        // maksymalna wysokość zabudowy (jeśli podana)
  raw?: string;              // surowy fragment odpowiedzi (do debugowania)
}

const MPZP_URL =
  'https://mapy.geoportal.gov.pl/wss/ext/KrajowaIntegracjaMiejscowychPlanowZagospodarowaniaPrzestrzennego';

export async function getMpzpInfo(lat: number, lng: number): Promise<MpzpInfo | null> {
  const d = 0.002;
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetFeatureInfo',
    LAYERS: 'plany,raster,wektor-str',
    QUERY_LAYERS: 'plany,raster,wektor-str',
    SRS: 'EPSG:4326',
    BBOX: `${lng - d},${lat - d},${lng + d},${lat + d}`,
    WIDTH: '101',
    HEIGHT: '101',
    X: '50',
    Y: '50',
    INFO_FORMAT: 'text/html',
    FEATURE_COUNT: '10',
  });

  try {
    const res = await fetch(`${MPZP_URL}?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const text = await res.text();

    // Format 1: XML ROWSET (np. Warszawa)
    if (text.includes('<ROW ') || text.includes('<ROWSET')) {
      const purposes: string[] = [];
      let planName: string | undefined;
      let maxHeight: string | undefined;

      const rows = text.match(/<ROW[\s\S]*?<\/ROW>/g) || [];
      for (const row of rows) {
        const fun = row.match(/<FUN_NAZWA>([^<]*)<\/FUN_NAZWA>/)?.[1]?.trim();
        const symb = row.match(/<FUN_SYMB>([^<]*)<\/FUN_SYMB>/)?.[1]?.trim();
        const plan = row.match(/<NAZWA_PLAN>([^<]*)<\/NAZWA_PLAN>/)?.[1]?.trim();
        const wys = row.match(/<MAX_WYS>([^<]*)<\/MAX_WYS>/)?.[1]?.trim();
        if (fun && fun !== 'null') {
          purposes.push(symb && symb !== 'null' ? `${fun} (${symb})` : fun);
        }
        if (plan && plan !== 'null' && !planName) planName = plan;
        if (wys && wys !== 'null' && wys !== '' && !maxHeight) maxHeight = wys;
      }

      if (purposes.length > 0) {
        return { covered: true, purposes: [...new Set(purposes)].slice(0, 4), planName, maxHeight };
      }
      // ROWSET pusty = punkt nie jest objęty planem (lub plan niezdigitalizowany)
      return { covered: false, purposes: [] };
    }

    // Format 2: HTML ESRI (np. Kraków) — tabela FeatureInfoCollection
    if (text.includes('FeatureInfoCollection')) {
      // Wyciągnij komórki tabeli — uproszczone parsowanie
      const cells = (text.match(/<td>([^<]*)<\/td>/g) || [])
        .map((c) => c.replace(/<\/?td>/g, '').trim())
        .filter((c) => c.length > 2 && c !== 'null');
      return {
        covered: true,
        purposes: cells.slice(0, 4),
        raw: cells.join(' | ').slice(0, 300),
      };
    }

    // Pusta odpowiedź HTML (body bez tabeli) = brak planu w tym punkcie
    if (text.includes('<body>')) {
      return { covered: false, purposes: [] };
    }

    return null;
  } catch {
    return null;
  }
}
