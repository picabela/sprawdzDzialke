export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  city: string;
  county: string;
  province: string;
  country: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', address);
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
  };
}
