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

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const { cleaned, stripped } = stripApartment(address);

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', cleaned);
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
  if (!data || data.length === 0) return null;

  const result = data[0];
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
