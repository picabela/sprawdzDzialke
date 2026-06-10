import { geocodeAddress, reverseGeocode } from './apis/geocoding';
import { getParcelByCoords, getParcelById } from './apis/gugik';
import { getSolarPotential } from './apis/pvgis';
import { getFloodAssessment } from './apis/flood';
import { getNearestAirQuality } from './apis/airquality';
import { getGiosAirQuality } from './apis/gios';
import { getAirHistory, monthName } from './apis/air-history';
import { getMpzpInfo } from './apis/mpzp';
import { getSurroundings } from './apis/surroundings';
import { getLandslideInfo } from './apis/sopo';
import { getDemographics } from './apis/gus';
import { getDevelopmentInfo } from './apis/development';
import { getPropertyPrices } from './apis/prices';
import { generateJson } from './llm';
import type { GeoData, Report } from './types';

// Punkt startowy zebrany ze źródła (adres / klik na mapie / numer działki)
interface ResolvedLocation {
  lat: number;
  lng: number;
  displayName: string;
  city: string;
  county: string;
  province: string;
  apartmentStripped?: boolean;
  parcel?: GeoData['parcel'];
}

// Zbiera dane ze wszystkich API dla ustalonej lokalizacji.
async function collectGeoData(loc: ResolvedLocation): Promise<GeoData> {
  const { lat, lng } = loc;

  // Wszystkie zapytania Overpass (otoczenie, powódź, rozwój) wykonujemy
  // po kolei, żeby nie przekroczyć limitu równoległych zapytań per IP.
  const overpassChain = (async () => {
    const surr = await getSurroundings(lat, lng).catch(() => null);
    const flood = await getFloodAssessment(lat, lng).catch(() => null);
    const development = await getDevelopmentInfo(lat, lng).catch(() => null);
    return { surr, flood, development };
  })();

  const [parcel, solar, gios, openaq, airHist, mpzp, sopo, demo, prices, osm] =
    await Promise.allSettled([
      loc.parcel ? Promise.resolve(null) : getParcelByCoords(lat, lng),
      getSolarPotential(lat, lng),
      getGiosAirQuality(lat, lng),
      getNearestAirQuality(lat, lng),
      getAirHistory(lat, lng),
      getMpzpInfo(lat, lng),
      getLandslideInfo(lat, lng),
      getDemographics(loc.city),
      getPropertyPrices(loc.city, loc.county, loc.province),
      overpassChain,
    ]);

  const osmData = osm.status === 'fulfilled' ? osm.value : null;
  const floodData = osmData?.flood ?? null;
  const giosData = gios.status === 'fulfilled' ? gios.value : null;
  const airHistData = airHist.status === 'fulfilled' ? airHist.value : null;
  const mpzpData = mpzp.status === 'fulfilled' ? mpzp.value : null;
  const sopoData = sopo.status === 'fulfilled' ? sopo.value : null;
  const demoData = demo.status === 'fulfilled' ? demo.value : null;
  const pricesData = prices.status === 'fulfilled' ? prices.value : null;
  const surr = osmData?.surr ?? null;
  const devData = osmData?.development ?? null;
  const parcelByCoords =
    !loc.parcel && parcel.status === 'fulfilled' && parcel.value
      ? {
          parcelId: parcel.value.parcelId,
          parcelNumber: parcel.value.parcelNumber,
          region: parcel.value.region,
          commune: parcel.value.commune,
          county: parcel.value.county,
          voivodeship: parcel.value.voivodeship,
          areaM2: parcel.value.areaM2,
        }
      : undefined;

  return {
    address: loc.displayName,
    addressNormalized: loc.displayName.toLowerCase().trim(),
    city: loc.city,
    county: loc.county,
    province: loc.province,
    coords: { lat, lng },
    apartmentStripped: loc.apartmentStripped,
    parcel: loc.parcel ?? parcelByCoords,
    parcelId: (loc.parcel ?? parcelByCoords)?.parcelId,
    floodRisk: floodData?.risk ?? 'unknown',
    flood: floodData
      ? {
          riverName: floodData.riverName,
          riverType: floodData.riverType,
          riverDistanceM: floodData.riverDistanceM,
          elevationM: floodData.elevationM,
          elevationDiffM: floodData.elevationDiffM,
          method: floodData.method,
        }
      : undefined,
    solarPotential: solar.status === 'fulfilled' ? solar.value?.yearlyEnergy : undefined,
    airQualityIndex: openaq.status === 'fulfilled' ? (openaq.value?.aqi ?? undefined) : undefined,
    gios: giosData
      ? {
          stationName: giosData.stationName,
          distanceKm: giosData.distanceKm,
          indexCategory: giosData.indexCategory,
          indexValue: giosData.indexValue,
        }
      : undefined,
    airHistory: airHistData ?? undefined,
    mpzp: mpzpData
      ? {
          covered: mpzpData.covered,
          purposes: mpzpData.purposes,
          planName: mpzpData.planName,
          maxHeight: mpzpData.maxHeight,
        }
      : undefined,
    sopo: sopoData ?? undefined,
    demographics: demoData ?? undefined,
    development: devData ?? undefined,
    prices: pricesData ?? undefined,
    surroundings: surr ?? undefined,
  };
}

function fmtM(m?: number): string {
  if (m === undefined) return 'brak danych';
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

// Buduje prompt dla modelu z prawdziwymi danymi
function buildPrompt(address: string, geoData: GeoData): string {
  const s = geoData.surroundings;
  const f = geoData.flood;
  const sopo = geoData.sopo;
  const demo = geoData.demographics;
  const dev = geoData.development;

  const floodContext =
    geoData.floodRisk === 'unknown'
      ? 'BRAK DANYCH — nie udało się ocenić. NIE pisz że jest bezpiecznie, napisz że trzeba sprawdzić na mapach ISOK (wody.isok.gov.pl).'
      : `${geoData.floodRisk}${f?.riverDistanceM !== undefined ? ` — najbliższy ciek: ${f.riverName || f.riverType || 'ciek wodny'} w odległości ${fmtM(f.riverDistanceM)}${f.elevationDiffM !== undefined ? `, teren ${f.elevationDiffM} m nad poziomem cieku` : ''}` : ''}. UWAGA: to szacunek z odległości i wysokości terenu, nie oficjalna mapa ISOK.`;

  const sopoContext = !sopo?.checked
    ? 'BRAK DANYCH — usługa SOPO nie odpowiedziała. Napisz że warto sprawdzić na mapy.geoportal.gov.pl (warstwa SOPO).'
    : sopo.onLandslide
      ? `UWAGA: punkt leży na UDOKUMENTOWANYM OSUWISKU (rejestr SOPO, PIG-PIB)${sopo.activity ? ` — stopień aktywności: ${sopo.activity}` : ''}. To poważne ryzyko dla budynku i wartości nieruchomości.`
      : sopo.inThreatZone
        ? 'Punkt leży w TERENIE ZAGROŻONYM ruchami masowymi ziemi (rejestr SOPO, PIG-PIB). Przed budową konieczna opinia geotechniczna.'
        : 'Brak osuwisk i terenów zagrożonych w promieniu ~100 m (oficjalny rejestr SOPO, PIG-PIB).';

  const demoContext = demo?.population
    ? `Gmina ${demo.unitName}: ludność ${demo.population.toLocaleString('pl-PL')} (${demo.populationYear})${demo.trendPct !== undefined ? `, zmiana ${demo.trendPct > 0 ? '+' : ''}${demo.trendPct}% w ${demo.trendYears} lat (${(demo.trendPct ?? 0) >= 0 ? 'gmina rośnie' : 'gmina się wyludnia'})` : ''}${demo.density ? `, gęstość zaludnienia terenów zabudowanych: ${demo.density} os./km²` : ''}. Źródło: GUS BDL.`
    : 'Brak danych GUS dla tej gminy.';

  const ah = geoData.airHistory;
  const airContext = ah
    ? `Całoroczny przebieg PM2.5 (Open-Meteo CAMS, ostatnie 12 mies.): średnia roczna ${ah.yearAvgPm25} µg/m³` +
      `${ah.winterAvgPm25 !== undefined ? `, ZIMĄ (XII-II) ${ah.winterAvgPm25} µg/m³` : ''}` +
      `${ah.summerAvgPm25 !== undefined ? `, LATEM (VI-VIII) ${ah.summerAvgPm25} µg/m³` : ''}` +
      `${ah.worstMonth ? `, najgorszy miesiąc: ${monthName(ah.worstMonth.month)} (${ah.worstMonth.pm25} µg/m³)` : ''}` +
      `${ah.whoYearExceededTimes ? `. Norma roczna WHO to 5 µg/m³ — tu przekroczona ${ah.whoYearExceededTimes}×` : ''}` +
      `. WAŻNE: smog jest sezonowy — opisz RÓŻNICĘ lato/zima, bo mieszka się tam cały rok, nie tylko w dniu wyszukiwania.`
    : 'Brak danych całorocznych.';

  const pricesContext = geoData.prices
    ? `${geoData.prices.pricePerM2.toLocaleString('pl-PL')} zł/m² — mediana cen TRANSAKCYJNYCH (${geoData.prices.level}: ${geoData.prices.unitName}, dane GUS za ${geoData.prices.year}). To twarde dane z aktów notarialnych, ale z opóźnieniem publikacji — podaj rok.`
    : 'BRAK twardych danych GUS o cenach. NIE podawaj konkretnych kwot zł/m² jako pewnych — napisz że to orientacja i odeślij do serwisów z cenami ofertowymi.';

  const devContext = dev
    ? [
        dev.roadConstructionDistanceM !== undefined
          ? `- Duża droga ${dev.roadProposed ? 'PLANOWANA' : 'W BUDOWIE'}: ${dev.roadConstructionName} w odległości ${fmtM(dev.roadConstructionDistanceM)} — zmieni hałas i dojazd`
          : '- Brak dużych dróg w budowie/planowanych w promieniu 3 km',
        dev.constructionSitesCount
          ? `- Place budowy w 1 km: ${dev.constructionSitesCount} (presja deweloperska — okolica się zmienia)`
          : '- Brak aktywnych placów budowy w 1 km',
        dev.airportDistanceM !== undefined
          ? `- Lotnisko: ${dev.airportName} w odległości ${fmtM(dev.airportDistanceM)}${dev.airportDistanceM < 6000 ? ' — możliwy hałas lotniczy!' : ''}`
          : '- Brak lotnisk w promieniu 12 km',
        dev.protectedAreaDistanceM !== undefined
          ? `- Obszar chroniony: ${dev.protectedAreaName || dev.protectedAreaType} (${dev.protectedAreaType}) w odległości ${fmtM(dev.protectedAreaDistanceM)} — gwarancja zieleni, ale i ograniczenia zabudowy`
          : '- Brak obszarów chronionych w bezpośrednim sąsiedztwie',
      ].join('\n')
    : '- brak danych';

  const dataContext = `
ADRES: ${address}
${geoData.apartmentStripped ? 'UWAGA: adres zawierał numer lokalu — raport dotyczy BUDYNKU i jego lokalizacji (numer lokalu nie wpływa na dane lokalizacyjne).' : ''}
MIASTO: ${geoData.city}
POWIAT: ${geoData.county}
WOJEWÓDZTWO: ${geoData.province}
WSPÓŁRZĘDNE: ${geoData.coords.lat.toFixed(5)}, ${geoData.coords.lng.toFixed(5)}
${geoData.parcelId ? `ID DZIAŁKI (ULDK): ${geoData.parcelId}` : ''}

ZAGROŻENIE POWODZIOWE (szacunek): ${floodContext}

OSUWISKA (SOPO, PIG-PIB): ${sopoContext}

JAKOŚĆ POWIETRZA:
${geoData.gios ? `- GIOŚ (oficjalny indeks polski, AKTUALNY): "${geoData.gios.indexCategory || 'brak'}" — stacja ${geoData.gios.stationName}, ${geoData.gios.distanceKm} km od adresu` : '- GIOŚ: brak stacji w pobliżu'}
- ${airContext}
${geoData.airQualityIndex !== undefined ? `- OpenAQ AQI: ${geoData.airQualityIndex}` : ''}

CENY NIERUCHOMOŚCI: ${pricesContext}

PLAN ZAGOSPODAROWANIA (MPZP, geoportal.gov.pl):
${geoData.mpzp ? (geoData.mpzp.covered ? `- Punkt OBJĘTY planem miejscowym${geoData.mpzp.planName ? ` "${geoData.mpzp.planName}"` : ''}\n- Przeznaczenie terenu: ${geoData.mpzp.purposes.join('; ') || 'nie odczytano'}${geoData.mpzp.maxHeight ? `\n- Maks. wysokość zabudowy: ${geoData.mpzp.maxHeight} m` : ''}` : '- BRAK planu miejscowego w tym punkcie (lub plan niezdigitalizowany) — obowiązują warunki zabudowy (WZ)') : '- Brak danych z geoportalu'}

DEMOGRAFIA GMINY (GUS): ${demoContext}

ROZWÓJ OKOLICY (OpenStreetMap):
${devContext}

OTOCZENIE (OpenStreetMap, realne pomiary):
${s ? `- Linia kolejowa: ${fmtM(s.railwayDistanceM)}
- Droga główna (krajowa/ekspresowa/autostrada): ${fmtM(s.majorRoadDistanceM)}${s.majorRoadName ? ` (${s.majorRoadName})` : ''}
- Teren przemysłowy: ${fmtM(s.industrialDistanceM)}
- Linia wysokiego napięcia: ${fmtM(s.powerLineDistanceM)}
- Szkoły/przedszkola w 1,5 km: ${s.schoolsCount}${s.nearestSchoolM !== undefined ? ` (najbliższa ${fmtM(s.nearestSchoolM)})` : ''}
- Apteki w 1,5 km: ${s.pharmaciesCount}
- Sklepy spożywcze w 1,5 km: ${s.supermarketsCount}${s.nearestSupermarketM !== undefined ? ` (najbliższy ${fmtM(s.nearestSupermarketM)})` : ''}
- Przystanki (bus/tram/kolej) w 800 m: ${s.busStopsCount}${s.nearestBusStopM !== undefined ? ` (najbliższy ${fmtM(s.nearestBusStopM)})` : ''}
- Parki w 1 km: ${s.parksCount}` : '- brak danych'}

POTENCJAŁ SOLARNY (PVGIS): ${geoData.solarPotential ? `${geoData.solarPotential.toFixed(0)} kWh/kWp/rok` : 'brak danych'}
`;

  const floodMeter =
    geoData.floodRisk === 'none' ? 5 : geoData.floodRisk === 'low' ? 25 : geoData.floodRisk === 'medium' ? 60 : geoData.floodRisk === 'high' ? 90 : 50;
  const floodColor =
    geoData.floodRisk === 'none' ? '#15803d' : geoData.floodRisk === 'low' ? '#65a30d' : geoData.floodRisk === 'medium' ? '#d97706' : geoData.floodRisk === 'high' ? '#dc2626' : '#737373';
  const floodValue =
    geoData.floodRisk === 'none' ? 'Niskie ryzyko (brak cieków w pobliżu)' :
    geoData.floodRisk === 'low' ? `Podwyższona czujność${f?.riverDistanceM !== undefined ? ` — ciek w ${fmtM(f.riverDistanceM)}` : ''}` :
    geoData.floodRisk === 'medium' ? `Średnie ryzyko${f?.riverDistanceM !== undefined ? ` — ciek w ${fmtM(f.riverDistanceM)}` : ''}` :
    geoData.floodRisk === 'high' ? `WYSOKIE RYZYKO${f?.riverDistanceM !== undefined ? ` — rzeka w ${fmtM(f.riverDistanceM)}` : ''}` :
    'Brak danych — sprawdź mapy ISOK';

  const sopoValue = !sopo?.checked
    ? 'Brak danych — sprawdź rejestr SOPO'
    : sopo.onLandslide
      ? 'TEREN OSUWISKOWY (rejestr SOPO)'
      : sopo.inThreatZone
        ? 'Teren zagrożony ruchami masowymi'
        : 'Brak osuwisk w rejestrze SOPO';
  const sopoMeter = !sopo?.checked ? 50 : sopo.onLandslide ? 95 : sopo.inThreatZone ? 65 : 5;
  const sopoColor = !sopo?.checked ? '#737373' : sopo.onLandslide ? '#dc2626' : sopo.inThreatZone ? '#d97706' : '#15803d';

  const zagrozeniaStatus =
    geoData.floodRisk === 'high' || sopo?.onLandslide
      ? 'bad'
      : geoData.floodRisk === 'medium' || sopo?.inThreatZone
        ? 'ok'
        : geoData.floodRisk === 'unknown'
          ? 'neutral'
          : 'good';

  return `Jesteś ekspertem od analizy nieruchomości w Polsce z dostępem do rzeczywistych danych publicznych.

Poniżej masz PRAWDZIWE dane pobrane z oficjalnych API dla tej lokalizacji:

${dataContext}

Na podstawie tych danych oraz swojej wiedzy o tej lokalizacji w Polsce, wygeneruj kompletny raport.

ZASADY:
1. Pisz prostym, zrozumiałym językiem — jakbyś tłumaczył sąsiadowi, nie prawnikom
2. Każde wyjaśnienie (pole "explain") musi mówić CO TO ZNACZY dla mieszkańca/inwestora
3. Używaj danych z sekcji OTOCZENIE i ROZWÓJ OKOLICY — to realne pomiary, cytuj konkretne odległości
4. Jeśli danych brakuje — napisz uczciwie "brak danych" i co sprawdzić samodzielnie; NIE wymyślaj i NIE udawaj że jest bezpiecznie
5. Bliska kolej (<300 m) i droga główna (<300 m) = realny hałas; przemysł <500 m, linie WN <100 m i lotnisko <6 km = potencjalna uciążliwość — uwzględnij to w sekcjach hałas/zagrożenia
6. Status: "good" = zielony (dobrze), "ok" = żółty (przeciętnie), "bad" = czerwony (uwaga), "neutral" = szary
7. Zwróć obiekt JSON o DOKŁADNIE tej strukturze co poniżej

Zwróć TYLKO JSON (bez markdown, bez backticks) w tej strukturze:
{
  "address": "pełny sformatowany adres",
  "city": "miasto",
  "score": <liczba całkowita 1-100>,
  "scoreLabel": "<krótki label np. 'Dobra lokalizacja'>",
  "scoreSummary": "<2-3 zdania ogólnego podsumowania dla tej konkretnej lokalizacji>",
  "sections": [
    {
      "id": "halas",
      "title": "Poziom hałasu",
      "status": "good|ok|bad|neutral",
      "items": [<2-3 pozycje: hałas drogowy (użyj odległości do drogi głównej), kolejowy (odległość do torów), lotniczy ${dev?.airportDistanceM !== undefined ? `(lotnisko ${dev.airportName} w ${fmtM(dev.airportDistanceM)})` : 'jeśli dotyczy'}. Format pozycji: {"label":"...","value":"...","meter":<0-100>,"meterColor":"<#15803d|#d97706|#dc2626>","explain":"<2-3 zdania praktycznie>"}>]
    },
    {
      "id": "powietrze",
      "title": "Jakość powietrza",
      "status": "good|ok|bad|neutral",
      "items": [<2-3 pozycje. (1) AKTUALNY indeks GIOŚ: "${geoData.gios?.indexCategory || 'brak danych'}" ze stacji ${geoData.gios?.stationName || '—'} (${geoData.gios?.distanceKm ?? '—'} km). (2) OBOWIĄZKOWO pozycja "Smog zimą vs latem" oparta na danych całorocznych: ${ah ? `lato ${ah.summerAvgPm25} µg/m³ vs zima ${ah.winterAvgPm25} µg/m³, najgorszy ${ah.worstMonth ? monthName(ah.worstMonth.month) : '—'}` : 'brak'} — wyjaśnij, że kto szuka latem, nie zobaczy zimowego smogu, a mieszka się cały rok. Dla tej pozycji ustaw meter na bazie średniej rocznej PM2.5 (${ah?.yearAvgPm25 ?? '?'}: <12 zielony #15803d, 12-25 #d97706, >25 #dc2626).>]
    },
    {
      "id": "planowanie",
      "title": "Plan zagospodarowania (MPZP)",
      "status": "${geoData.mpzp?.covered ? 'good' : geoData.mpzp ? 'ok' : 'neutral'}",
      "items": [<1-2 pozycje: czy jest MPZP i co oznacza przeznaczenie terenu "${geoData.mpzp?.purposes?.join('; ') || ''}". Wyjaśnij: plan = przewidywalność (wiadomo co może powstać obok); brak planu = ryzyko niespodzianek, decyzje WZ. Jeśli przeznaczenie to usługi/przemysł obok mieszkań — ostrzeż.>]
    },
    {
      "id": "rozwoj",
      "title": "Rozwój i przyszłość okolicy",
      "status": "good|ok|bad|neutral",
      "items": [<2-3 pozycje na bazie sekcji ROZWÓJ OKOLICY: drogi w budowie/planowane (czy to szansa — lepszy dojazd, czy zagrożenie — hałas), place budowy (presja deweloperska), obszary chronione (zieleń gwarantowana vs ograniczenia). Powiedz wprost: jak ta okolica może wyglądać za 5 lat.>]
    },
    {
      "id": "komunikacja",
      "title": "Komunikacja i dojazd",
      "status": "good|ok|bad|neutral",
      "items": [<2-3 pozycje na bazie REALNYCH danych: ${s?.busStopsCount ?? '?'} przystanków w 800 m (najbliższy ${fmtM(s?.nearestBusStopM)}), drogi główne, kolej. Dodaj wiedzę o komunikacji w ${geoData.city}.>]
    },
    {
      "id": "infrastruktura",
      "title": "Infrastruktura w pobliżu",
      "status": "good|ok|bad|neutral",
      "items": [<2-4 pozycje z REALNYCH danych: szkoły (${s?.schoolsCount ?? '?'} w 1,5 km), sklepy (${s?.supermarketsCount ?? '?'}), apteki (${s?.pharmaciesCount ?? '?'}), parki (${s?.parksCount ?? '?'}).>]
    },
    {
      "id": "demografia",
      "title": "Demografia gminy",
      "status": "${demo?.trendPct !== undefined ? (demo.trendPct >= 0 ? 'good' : demo.trendPct < -3 ? 'bad' : 'ok') : 'neutral'}",
      "items": [<1-2 pozycje na bazie danych GUS: ${demoContext} Wyjaśnij co trend ludności znaczy dla wartości nieruchomości (rosnąca gmina = popyt i usługi, wyludniająca się = spadek wartości, zamykane szkoły).>]
    },
    {
      "id": "bezpieczenstwo",
      "title": "Bezpieczeństwo okolicy",
      "status": "good|ok|bad|neutral",
      "items": [<1-2 pozycje na podstawie wiedzy o ${geoData.city} i tej okolicy — przestępczość, oświetlenie, charakter dzielnicy. Bądź wyważony.>]
    },
    {
      "id": "zagrozenia",
      "title": "Zagrożenia naturalne i uciążliwości",
      "status": "${zagrozeniaStatus}",
      "items": [
        {
          "label": "Zagrożenie powodziowe (szacunek)",
          "value": "${floodValue}",
          "meter": ${floodMeter},
          "meterColor": "${floodColor}",
          "explain": "<wyjaśnij co to znaczy (ubezpieczenie, kredyt, budowa) + ZAWSZE dodaj: dokładne mapy na wody.isok.gov.pl>"
        },
        {
          "label": "Osuwiska (rejestr SOPO)",
          "value": "${sopoValue}",
          "meter": ${sopoMeter},
          "meterColor": "${sopoColor}",
          "explain": "<wyjaśnij na bazie danych SOPO: ${sopoContext} Co to znaczy dla kupującego (geotechnika, kredyt, ubezpieczenie).>"
        }<jeśli przemysł <800 m, linia WN <150 m, lotnisko <6 km lub inne uciążliwości — dodaj pozycje>
      ]
    },
    {
      "id": "solar",
      "title": "Potencjał solarny",
      "status": "neutral",
      "items": [
        {
          "label": "Roczna produkcja energii (1 kWp)",
          "value": "${geoData.solarPotential ? geoData.solarPotential.toFixed(0) + ' kWh/rok' : 'brak danych'}",
          "meter": ${geoData.solarPotential ? Math.min(100, Math.round((geoData.solarPotential / 1200) * 100)) : 50},
          "meterColor": "#d97706",
          "explain": "<ile to paneli i oszczędności w złotówkach rocznie przy obecnych cenach prądu>"
        }
      ]
    },
    {
      "id": "rynek",
      "title": "Rynek nieruchomości",
      "status": "neutral",
      "items": [<2-3 pozycje. ${geoData.prices ? `PIERWSZA pozycja MUSI podać twardą medianę GUS: "${geoData.prices.pricePerM2.toLocaleString('pl-PL')} zł/m²" (label: "Mediana cen transakcyjnych — ${geoData.prices.unitName} (${geoData.prices.year})"), w explain zaznacz że to ceny z aktów notarialnych GUS za ${geoData.prices.year} (transakcje, nie oferty).` : 'NIE podawaj konkretnej kwoty zł/m² jako pewnej — brak twardych danych GUS; napisz orientacyjnie i odeślij do serwisów z cenami ofertowymi.'} Dodaj trend/perspektywy${demo?.trendPct !== undefined ? ` (powiąż z trendem ludności: ${demo.trendPct > 0 ? '+' : ''}${demo.trendPct}%)` : ''}.>]
    }
  ]
}

Wypełnij WSZYSTKIE sekcje konkretnymi pozycjami. Cytuj realne odległości z danych. Bądź konkretny, nie ogólnikowy.`;
}

// Wspólny krok: z zebranych danych zbuduj raport przez model.
async function buildReportFromGeoData(geoData: GeoData): Promise<Report> {
  const prompt = buildPrompt(geoData.address, geoData);
  const rawText = await generateJson(prompt);

  let report: Report;
  try {
    report = JSON.parse(rawText.replace(/```json|```/g, '').trim());
  } catch {
    throw new Error('Błąd generowania raportu. Spróbuj ponownie.');
  }

  report.geoData = geoData;
  report.coords = geoData.coords;
  return report;
}

// Wejście 1: adres tekstowy
export async function generateReport(address: string): Promise<Report | null> {
  const geocode = await geocodeAddress(address);
  if (!geocode) {
    throw new Error(
      'Nie mogę zlokalizować podanego adresu. Sprawdź pisownię, dopisz miasto lub zaznacz miejsce na mapie.'
    );
  }
  const geoData = await collectGeoData({
    lat: geocode.lat,
    lng: geocode.lng,
    displayName: geocode.displayName,
    city: geocode.city,
    county: geocode.county,
    province: geocode.province,
    apartmentStripped: geocode.apartmentStripped,
  });
  return buildReportFromGeoData(geoData);
}

// Wejście 2: punkt na mapie (lat/lng) — np. klik użytkownika
export async function generateReportFromCoords(lat: number, lng: number): Promise<Report | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Nieprawidłowe współrzędne punktu.');
  }
  const rev = await reverseGeocode(lat, lng);
  const geoData = await collectGeoData({
    lat,
    lng,
    displayName: rev?.displayName || `Punkt ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    city: rev?.city || '',
    county: rev?.county || '',
    province: rev?.province || '',
  });
  return buildReportFromGeoData(geoData);
}

// Wejście 3: identyfikator działki ewidencyjnej (ULDK)
export async function generateReportFromParcel(parcelId: string): Promise<Report | null> {
  const parcel = await getParcelById(parcelId);
  if (!parcel || !parcel.centroid) {
    throw new Error(
      'Nie znaleziono działki o tym identyfikatorze. Sprawdź format (np. 141201_1.0001.1234/5).'
    );
  }
  const { lat, lng } = parcel.centroid;
  const rev = await reverseGeocode(lat, lng);
  const geoData = await collectGeoData({
    lat,
    lng,
    displayName:
      rev?.displayName ||
      `Działka ${parcel.parcelNumber}, ${parcel.region}, ${parcel.commune}`,
    city: rev?.city || parcel.commune.replace(/\s*\(.*\)/, ''),
    county: rev?.county || parcel.county,
    province: rev?.province || parcel.voivodeship,
    parcel: {
      parcelId: parcel.parcelId,
      parcelNumber: parcel.parcelNumber,
      region: parcel.region,
      commune: parcel.commune,
      county: parcel.county,
      voivodeship: parcel.voivodeship,
      areaM2: parcel.areaM2,
    },
  });
  return buildReportFromGeoData(geoData);
}
