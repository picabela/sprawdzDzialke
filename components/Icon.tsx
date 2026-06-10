// Lekki zestaw ikon liniowych (stroke = currentColor) — bez emoji, spójny styl.
// Używany w sekcjach raportu, kategoriach POI i na stronie głównej.

import type { SVGProps } from 'react';

export type IconName =
  | 'noise'
  | 'air'
  | 'plan'
  | 'development'
  | 'transit'
  | 'infrastructure'
  | 'demography'
  | 'shield'
  | 'alert'
  | 'sun'
  | 'chart'
  | 'water'
  | 'mountain'
  | 'parcel'
  | 'education'
  | 'healthcare'
  | 'shopping'
  | 'food'
  | 'sport'
  | 'parks'
  | 'culture'
  | 'services'
  | 'finance'
  | 'post'
  | 'fuel'
  | 'parking'
  | 'bike'
  | 'emergency'
  | 'heritage'
  | 'pin'
  | 'chevron'
  | 'search'
  | 'map'
  | 'download'
  | 'check'
  | 'clock';

const PATHS: Record<IconName, React.ReactNode> = {
  noise: <><path d="M3 9v6h4l5 4V5L7 9H3z" /><path d="M16 8a5 5 0 0 1 0 8" /><path d="M19 5a9 9 0 0 1 0 14" /></>,
  air: <><path d="M2 12h13a3 3 0 1 0-3-3" /><path d="M2 16h17a3 3 0 1 1-3 3" /><path d="M2 8h6" /></>,
  plan: <><path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3z" /><path d="M9 3v15M15 6v15" /></>,
  development: <><path d="M3 21h18" /><path d="M5 21V8l8-5v18" /><path d="M13 21V9l6 4v8" /><path d="M9 9h.01M9 13h.01M9 17h.01" /></>,
  transit: <><rect x="4" y="3" width="16" height="14" rx="2" /><path d="M4 11h16" /><path d="M8 17v3M16 17v3" /><path d="M8 7h8" /></>,
  infrastructure: <><path d="M3 21h18" /><rect x="4" y="9" width="6" height="12" /><rect x="14" y="4" width="6" height="17" /><path d="M7 13h.01M7 17h.01M17 8h.01M17 12h.01M17 16h.01" /></>,
  demography: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-1a6 6 0 0 1 12 0v1" /><path d="M16 3.5a3 3 0 0 1 0 6" /><path d="M21 21v-1a6 6 0 0 0-4-5.6" /></>,
  shield: <><path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3z" /><path d="m9 12 2 2 4-4" /></>,
  alert: <><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v5M12 18h.01" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></>,
  chart: <><path d="M3 3v18h18" /><path d="m7 14 3-3 3 3 5-6" /></>,
  water: <><path d="M12 3s6 6 6 11a6 6 0 0 1-12 0c0-5 6-11 6-11z" /></>,
  mountain: <><path d="m3 20 6-12 4 7 2-3 6 8H3z" /></>,
  parcel: <><rect x="3" y="3" width="18" height="18" /><path d="M3 9h18M9 3v18" strokeDasharray="2 2" /></>,
  education: <><path d="M3 8l9-4 9 4-9 4-9-4z" /><path d="M7 10v5c0 1.5 2.5 3 5 3s5-1.5 5-3v-5" /></>,
  healthcare: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 8v8M8 12h8" /></>,
  shopping: <><path d="M5 7h14l-1 13H6L5 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></>,
  food: <><path d="M5 3v8a3 3 0 0 0 6 0V3M8 3v18" /><path d="M16 3c-1.5 0-2 2-2 5s.5 4 2 4v9" /></>,
  sport: <><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 0 0 18M3 12h18M12 3a14 14 0 0 1 0 18" /></>,
  parks: <><path d="M12 2 7 11h10L12 2z" /><path d="M9 11 5 18h14l-4-7" /><path d="M12 18v4" /></>,
  culture: <><path d="M3 9l9-6 9 6" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
  services: <><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.5 15.5M14 10l6 10" /></>,
  finance: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 9v6M18 9v6" /></>,
  post: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  fuel: <><path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12" /><path d="M14 8h3a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3" /></>,
  parking: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" /></>,
  bike: <><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="M6 17 10 7h4l3 10M10 7h6" /></>,
  emergency: <><path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3z" /><path d="M12 8v6M9 11h6" /></>,
  heritage: <><path d="M4 21h16M5 21V10l7-5 7 5v11M9 21v-7h6v7" /></>,
  pin: <><path d="M12 21s7-6.7 7-12a7 7 0 1 0-14 0c0 5.3 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  map: <><path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3z" /><path d="M9 3v15M15 6v15" /></>,
  download: <><path d="M12 3v12m0 0-4-4m4 4 4-4" /><path d="M5 21h14" /></>,
  check: <path d="m5 12 5 5 9-9" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
};

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export default function Icon({ name, size = 20, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

// Mapowanie ID sekcji raportu → ikona
export const SECTION_ICONS: Record<string, IconName> = {
  halas: 'noise',
  powietrze: 'air',
  planowanie: 'plan',
  rozwoj: 'development',
  komunikacja: 'transit',
  infrastruktura: 'infrastructure',
  demografia: 'demography',
  bezpieczenstwo: 'shield',
  zagrozenia: 'alert',
  solar: 'sun',
  rynek: 'chart',
  dzialka: 'parcel',
  okolica: 'pin',
};

// Mapowanie kategorii POI → ikona
export const CATEGORY_ICONS: Record<string, IconName> = {
  education: 'education',
  healthcare: 'healthcare',
  shopping: 'shopping',
  food: 'food',
  sport: 'sport',
  parks: 'parks',
  transit: 'transit',
  culture: 'culture',
  services: 'services',
  finance: 'finance',
  post: 'post',
  fuel: 'fuel',
  parking: 'parking',
  bike: 'bike',
  emergency: 'emergency',
  heritage: 'heritage',
};
