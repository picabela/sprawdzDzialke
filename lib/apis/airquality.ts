export interface AirQualityData {
  aqi?: number;              // Air Quality Index 0-500
  pm25?: number;             // PM2.5 µg/m³
  pm10?: number;             // PM10 µg/m³
  no2?: number;              // NO2 µg/m³
  stationName?: string;
  distanceKm?: number;
  timestamp?: string;
}

export async function getNearestAirQuality(lat: number, lng: number): Promise<AirQualityData | null> {
  // Szukamy stacji w promieniu 25 km
  const url = new URL('https://api.openaq.org/v3/locations');
  url.searchParams.set('coordinates', `${lat},${lng}`);
  url.searchParams.set('radius', '25000');   // 25 km
  url.searchParams.set('limit', '1');
  url.searchParams.set('order_by', 'distance');

  const headers: HeadersInit = {
    Accept: 'application/json',
  };

  if (process.env.OPENAQ_API_KEY) {
    headers['X-API-Key'] = process.env.OPENAQ_API_KEY;
  }

  try {
    const res = await fetch(url.toString(), {
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const locations = data?.results || [];
    if (locations.length === 0) return null;

    const station = locations[0];

    const result: AirQualityData = {
      stationName: station.name,
      distanceKm: Math.round(((station.distance || 0) / 1000) * 10) / 10,
    };

    // Pobierz ostatnie pomiary dla tej stacji
    const measurementsUrl = `https://api.openaq.org/v3/locations/${station.id}/latest`;
    const mRes = await fetch(measurementsUrl, { headers, signal: AbortSignal.timeout(5000) });

    if (mRes.ok) {
      const mData = await mRes.json();
      const measurements = mData?.results || [];

      for (const m of measurements) {
        const param = m.parameter?.name?.toLowerCase();
        const value = m.value;
        if (param === 'pm25' || param === 'pm2.5') result.pm25 = Math.round(value * 10) / 10;
        if (param === 'pm10') result.pm10 = Math.round(value * 10) / 10;
        if (param === 'no2') result.no2 = Math.round(value * 10) / 10;
      }

      // Przelicz AQI na podstawie PM2.5 (standard EPA)
      if (result.pm25 !== undefined) {
        result.aqi = calculateAQI(result.pm25);
      }
    }

    return result;
  } catch {
    return null;
  }
}

// Przelicznik PM2.5 → AQI (uproszczony standard EPA)
function calculateAQI(pm25: number): number {
  if (pm25 <= 12) return Math.round((50 / 12) * pm25);
  if (pm25 <= 35.4) return Math.round(50 + (50 / 23.4) * (pm25 - 12));
  if (pm25 <= 55.4) return Math.round(100 + (50 / 20) * (pm25 - 35.4));
  if (pm25 <= 150.4) return Math.round(150 + (50 / 95) * (pm25 - 55.4));
  return Math.round(200 + (100 / 99.6) * (pm25 - 150.4));
}
