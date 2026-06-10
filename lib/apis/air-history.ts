// Jakość powietrza w ujęciu CAŁOROCZNYM (Open-Meteo Air Quality, model CAMS Europe).
// GIOŚ pokazuje tylko bieżący indeks — a smog w Polsce jest sezonowy: zimą
// (sezon grzewczy) PM2.5 potrafi być 4-5× wyższe niż latem. Kto szuka
// mieszkania w lipcu, dostałby fałszywie różowy obraz. Dlatego liczymy
// średnie MIESIĘCZNE z ostatnich 12 miesięcy + wartość bieżącą.

export interface AirHistoryMonth {
  month: number;        // 1-12
  pm25: number;         // średnia PM2.5 [µg/m³]
  pm10: number;         // średnia PM10  [µg/m³]
}

export interface AirHistory {
  current?: { pm25?: number; pm10?: number };  // ostatnia dostępna godzina
  monthly: AirHistoryMonth[];                    // 12 miesięcy kalendarzowych
  yearAvgPm25?: number;                          // średnia roczna PM2.5
  winterAvgPm25?: number;                        // średnia XII-II (sezon grzewczy)
  summerAvgPm25?: number;                        // średnia VI-VIII
  worstMonth?: { month: number; pm25: number };
  // WHO 2021: średnioroczna norma PM2.5 = 5 µg/m³, dobowa 15 µg/m³
  whoYearExceededTimes?: number;                 // ile razy ponad normę roczną WHO
}

const PL_MONTHS = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
];

export function monthName(m: number): string {
  return PL_MONTHS[(m - 1 + 12) % 12] || '';
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getAirHistory(lat: number, lng: number): Promise<AirHistory | null> {
  try {
    // ostatnie 12 pełnych miesięcy
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);

    const url =
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}` +
      `&hourly=pm2_5,pm10&start_date=${isoDate(start)}&end_date=${isoDate(end)}&domains=cams_europe`;

    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      hourly?: { time?: string[]; pm2_5?: (number | null)[]; pm10?: (number | null)[] };
    };
    const h = data.hourly;
    if (!h?.time?.length) return null;

    // agregacja po miesiącu kalendarzowym (1-12)
    const buckets: { pm25: number[]; pm10: number[] }[] = Array.from({ length: 12 }, () => ({
      pm25: [],
      pm10: [],
    }));
    let lastPm25: number | undefined;
    let lastPm10: number | undefined;

    for (let i = 0; i < h.time.length; i++) {
      const ts = h.time[i];
      const m = parseInt(ts.slice(5, 7), 10) - 1; // 0-11
      const v25 = h.pm2_5?.[i];
      const v10 = h.pm10?.[i];
      if (typeof v25 === 'number') {
        buckets[m].pm25.push(v25);
        lastPm25 = v25;
      }
      if (typeof v10 === 'number') {
        buckets[m].pm10.push(v10);
        lastPm10 = v10;
      }
    }

    const avg = (arr: number[]) =>
      arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

    const monthly: AirHistoryMonth[] = buckets
      .map((b, i) => ({ month: i + 1, pm25: avg(b.pm25), pm10: avg(b.pm10) }))
      .filter((m) => m.pm25 > 0 || m.pm10 > 0);

    if (monthly.length === 0) return null;

    const allPm25 = buckets.flatMap((b) => b.pm25);
    const yearAvgPm25 = avg(allPm25);

    const winterBuckets = [buckets[11], buckets[0], buckets[1]].flatMap((b) => b.pm25);
    const summerBuckets = [buckets[5], buckets[6], buckets[7]].flatMap((b) => b.pm25);

    const worst = monthly.reduce((a, b) => (b.pm25 > a.pm25 ? b : a), monthly[0]);

    return {
      current: { pm25: lastPm25, pm10: lastPm10 },
      monthly,
      yearAvgPm25,
      winterAvgPm25: winterBuckets.length ? avg(winterBuckets) : undefined,
      summerAvgPm25: summerBuckets.length ? avg(summerBuckets) : undefined,
      worstMonth: { month: worst.month, pm25: worst.pm25 },
      whoYearExceededTimes: yearAvgPm25 ? Math.round((yearAvgPm25 / 5) * 10) / 10 : undefined,
    };
  } catch {
    return null;
  }
}
