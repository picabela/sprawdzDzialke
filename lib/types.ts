export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Poi {
  name: string;
  distanceM: number;
  lat: number;
  lng: number;
  detail?: string;
}

export interface PoiCategory {
  count: number;
  nearestM?: number;
  items: Poi[];
}

export interface GeoData {
  address: string;
  addressNormalized: string;
  city: string;
  county: string;
  province: string;
  coords: Coordinates;
  apartmentStripped?: boolean; // adres zawierał numer lokalu (lokalizujemy budynek)
  parcel?: {                 // dane działki ewidencyjnej (GUGiK ULDK)
    parcelId: string;
    parcelNumber: string;
    region: string;
    commune: string;
    county: string;
    voivodeship: string;
    areaM2?: number;
  };
  parcelId?: string;         // ID działki z GUGiK ULDK (legacy)
  parcelArea?: number;       // Powierzchnia działki w m²
  parcelType?: string;       // Typ użytku (Br, R, B, etc.)
  floodRisk?: 'none' | 'low' | 'medium' | 'high' | 'unknown';
  flood?: {                  // szczegóły oceny powodziowej
    riverName?: string;
    riverType?: string;
    riverDistanceM?: number;
    elevationM?: number;
    elevationDiffM?: number;
    method?: string;
  };
  solarPotential?: number;   // kWh/kWp/rok z PVGIS
  airQualityIndex?: number;  // AQI z OpenAQ
  gios?: {                   // oficjalny indeks GIOŚ
    stationName?: string;
    distanceKm?: number;
    indexCategory?: string;
    indexValue?: number;
  };
  airHistory?: {             // całoroczny przebieg PM2.5/PM10 (Open-Meteo CAMS)
    current?: { pm25?: number; pm10?: number };
    monthly: { month: number; pm25: number; pm10: number }[];
    yearAvgPm25?: number;
    winterAvgPm25?: number;
    summerAvgPm25?: number;
    worstMonth?: { month: number; pm25: number };
    whoYearExceededTimes?: number;
  };
  prices?: {                 // ceny transakcyjne GUS BDL
    pricePerM2: number;
    year: number;
    level: 'powiat' | 'województwo';
    unitName: string;
    source: string;
  };
  mpzp?: {                   // miejscowy plan zagospodarowania przestrzennego
    covered: boolean;
    purposes: string[];
    planName?: string;
    maxHeight?: string;
  };
  sopo?: {                   // osuwiska (SOPO, PIG-PIB)
    checked: boolean;
    onLandslide: boolean;
    activity?: string;
    inThreatZone: boolean;
  };
  demographics?: {           // demografia gminy (GUS BDL)
    unitName?: string;
    population?: number;
    populationYear?: number;
    trendPct?: number;
    trendYears?: number;
    density?: number;
  };
  development?: {            // rozwój okolicy (OpenStreetMap)
    roadConstructionName?: string;
    roadConstructionDistanceM?: number;
    roadProposed?: boolean;
    constructionSitesCount?: number;
    airportName?: string;
    airportDistanceM?: number;
    protectedAreaName?: string;
    protectedAreaType?: string;
    protectedAreaDistanceM?: number;
  };
  surroundings?: {           // otoczenie z OpenStreetMap
    railwayDistanceM?: number;
    majorRoadDistanceM?: number;
    majorRoadName?: string;
    industrialDistanceM?: number;
    powerLineDistanceM?: number;
    schoolsCount?: number;
    pharmaciesCount?: number;
    supermarketsCount?: number;
    busStopsCount?: number;
    parksCount?: number;
    nearestSchoolM?: number;
    nearestSupermarketM?: number;
    nearestBusStopM?: number;
    categories?: Record<string, PoiCategory>; // pełne kategorie POI z nazwami
  };
  walkScore?: number;        // izochrone 15min pieszo — liczba POI
}

export interface ReportItem {
  icon?: string;             // legacy — nieużywane w nowym wyglądzie
  label: string;
  value: string;
  meter?: number;            // 0–100 dla paska postępu
  meterColor?: string;       // kolor paska (#hex)
  explain: string;           // Ludzkie wyjaśnienie
  sourceUrl?: string;        // Link do źródła danych
}

export interface ReportSection {
  id: string;
  icon?: string;             // legacy — nieużywane w nowym wyglądzie
  title: string;
  status: 'good' | 'ok' | 'bad' | 'neutral';
  items: ReportItem[];
}

export interface Report {
  id?: string;
  createdAt?: string;
  address: string;
  city: string;
  score: number;             // 0–100
  scoreLabel: string;        // np. "Świetna lokalizacja"
  scoreSummary: string;      // 1-2 zdania ogólnego podsumowania
  sections: ReportSection[];
  coords?: Coordinates;
  geoData?: Partial<GeoData>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
