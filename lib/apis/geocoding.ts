export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  city: string;
  county: string;
  province: string;
  country: string;
  apartmentStripped?: boolean;  // czy usunęliśmy numer lokalu przy geokodowaniu
}

// Numer lokalu (np. "15/3", "15 m. 3", "15 lok. 3") nie istnieje w bazach
// geokodowania — lokalizujemy budynek. Usuwamy część lokalową, żeby
// Nominatim nie pomylił "15/3" z numerem budynku "15/3" lub nie odrzucił adresu.
function stripApartment(address: string): { cleaned: string; stripped: boolean } {
  const cleaned = address
    .replace(/(\d+[a-zA-Z]?)\s*(?:m\.?|lok\.?|mieszkania?|mieszk\.?)\s*\d+[a-zA-Z]?/gi, '$1')
    .replace(/(\d+[a-zA-Z]?)\s*\/\s*\d+[a-zA-Z]?(?=\s*(?:,|$))/g, '$1')
    .trim();
  return { cleaned, stripped: cleaned !== address.trim() };
}

interface NominatimPlace {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country_code?: string;
  };
}

// Pojedyncze zapytanie do Nominatim
async function queryNominatim(q: string): Promise<NominatimPlace | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'pl');
  url.searchParams.set('addressdetails', '1');

  const res = await fetch(url.toString(), {
    headers: {
      // WAŻNE: Nominatim wymaga User-Agent z nazwą aplikacji
      'User-Agent': 'SprawdzDzialke/1.0 (kontakt@sprawdzdzialke.pl)',
    },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data && data.length > 0 ? data[0] : null;
}

// Nominatim często nie znajduje adresów z prefiksem typu ulicy ("ul. Polna" vs "Polna"),
// więc przy braku wyniku ponawiamy zapytanie bez prefiksu.
function stripStreetPrefix(address: string): string {
  return address.replace(/\b(ul|ulica|al|aleja|aleje|pl|plac|os|osiedle)\.?\s+/gi, '').trim();
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const { cleaned, stripped } = stripApartment(address);

  let result = await queryNominatim(cleaned);
  if (!result) {
    const noPrefix = stripStreetPrefix(cleaned);
    if (noPrefix !== cleaned) result = await queryNominatim(noPrefix);
  }
  if (!result) return null;
  return {
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    displayName: result.display_name,
    city: result.address?.city || result.address?.town || result.address?.village || '',
    county: result.address?.county || '',
    province: result.address?.state || '',
    country: result.address?.country_code || '',
    apartmentStripped: stripped,
  };
}

export interface AddressSuggestion {
  label: string; // czytelny adres do pokazania
  lat: number;
  lng: number;
  city: string;
}

// Podpowiedzi adresów (autouzupełnianie) — kilka dopasowań z Nominatim.
export async function suggestAddresses(query: string): Promise<AddressSuggestion[]> {
  const q = stripApartment(query).cleaned;
  if (q.length < 3) return [];

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '6');
  url.searchParams.set('countrycodes', 'pl');
  url.searchParams.set('addressdetails', '1');

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'SprawdzDzialke/1.0 (kontakt@sprawdzdzialke.pl)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as NominatimPlace[];
    const seen = new Set<string>();
    const out: AddressSuggestion[] = [];
    for (const r of data) {
      const label = r.display_name;
      if (!label || seen.has(label)) continue;
      seen.add(label);
      out.push({
        label,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        city: r.address?.city || r.address?.town || r.address?.village || '',
      });
    }
    return out;
  } catch {
    return [];
  }
}

// Odwrotne geokodowanie — z punktu (klik na mapie / środek działki) na adres.
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('zoom', '18');

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'SprawdzDzialke/1.0 (kontakt@sprawdzdzialke.pl)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const r = (await res.json()) as NominatimPlace & { error?: string };
    if (!r || r.error || !r.display_name) return null;
    return {
      lat,
      lng,
      displayName: r.display_name,
      city: r.address?.city || r.address?.town || r.address?.village || '',
      county: r.address?.county || '',
      province: r.address?.state || '',
      country: r.address?.country_code || '',
    };
  } catch {
    return null;
  }
}
