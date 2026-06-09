export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeoData {
  address: string;
  addressNormalized: string;
  city: string;
  county: string;
  province: string;
  coords: Coordinates;
  apartmentStripped?: boolean; // adres zawierał numer lokalu (lokalizujemy budynek)
  parcelId?: string;         // ID działki z GUGiK ULDK
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
  mpzp?: {                   // miejscowy plan zagospodarowania przestrzennego
    covered: boolean;
    purposes: string[];
    planName?: string;
    maxHeight?: string;
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
  };
  walkScore?: number;        // izochrone 15min pieszo — liczba POI
}

export interface ReportItem {
  icon: string;
  label: string;
  value: string;
  meter?: number;            // 0–100 dla paska postępu
  meterColor?: string;       // kolor paska (#hex)
  explain: string;           // Ludzkie wyjaśnienie
  sourceUrl?: string;        // Link do źródła danych
}

export interface ReportSection {
  id: string;
  icon: string;
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
