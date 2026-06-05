export interface SolarData {
  yearlyEnergy: number;      // kWh/kWp/rok
  monthlyData: {
    month: number;
    energy: number;          // kWh/kWp
    irradiation: number;     // kWh/m²
  }[];
  optimalAngle: number;      // optymalny kąt paneli w stopniach
}

export async function getSolarPotential(lat: number, lng: number): Promise<SolarData | null> {
  const url = new URL('https://re.jrc.ec.europa.eu/api/v5_3/PVcalc');
  url.searchParams.set('lat', lat.toString());
  url.searchParams.set('lon', lng.toString());
  url.searchParams.set('peakpower', '1');       // 1 kWp system
  url.searchParams.set('loss', '14');           // standardowe straty 14%
  url.searchParams.set('outputformat', 'json');
  url.searchParams.set('browser', '0');

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(8000),           // timeout 8 sekund
  });

  if (!res.ok) return null;

  const data = await res.json();
  const outputs = data?.outputs;
  if (!outputs) return null;

  const monthly = outputs.monthly?.fixed || [];

  return {
    yearlyEnergy: outputs.totals?.fixed?.['E_y'] || 0,
    optimalAngle: outputs.meta?.fixed_slope || 35,
    monthlyData: monthly.map((m: Record<string, number>, i: number) => ({
      month: i + 1,
      energy: m['E_m'] || 0,
      irradiation: m['H(i)_m'] || 0,
    })),
  };
}
