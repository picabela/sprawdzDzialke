'use client';

import { useState } from 'react';
import type { PoiCategory } from '@/lib/types';
import Icon, { CATEGORY_ICONS, type IconName } from './Icon';
import { CATEGORY_LABELS } from '@/lib/apis/surroundings';

interface Props {
  categories: Record<string, PoiCategory>;
}

function fmtDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

// kolejność wyświetlania kategorii (najważniejsze na górze)
const ORDER = [
  'education', 'healthcare', 'shopping', 'transit', 'food', 'parks',
  'sport', 'culture', 'finance', 'post', 'services', 'fuel',
  'parking', 'bike', 'emergency', 'heritage',
];

// Rozwijane listy konkretnych obiektów w okolicy — twarde szczegóły
// (nazwa, adres, odległość, link do mapy) pod opisowym podsumowaniem.
export default function NeighborhoodExplorer({ categories }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  const present = ORDER.map((key) => ({ key, cat: categories[key] })).filter(
    (c) => c.cat && c.cat.count > 0
  );
  if (present.length === 0) return null;

  return (
    <div className="border border-neutral-200 bg-white mb-4 break-inside-avoid">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-100">
        <span className="flex items-center justify-center w-8 h-8 text-neutral-600 bg-neutral-100">
          <Icon name="pin" size={18} />
        </span>
        <h3 className="font-semibold text-neutral-950 text-base tracking-tight">
          Co masz w okolicy — szczegóły
        </h3>
        <span className="ml-auto text-[11px] text-neutral-400 uppercase tracking-wider">
          OpenStreetMap
        </span>
      </div>

      <div className="divide-y divide-neutral-100">
        {present.map(({ key, cat }) => {
          const isOpen = open === key;
          const hasItems = cat.items.length > 0;
          return (
            <div key={key}>
              <button
                onClick={() => hasItems && setOpen(isOpen ? null : key)}
                className={`w-full flex items-center gap-3 px-6 py-3.5 text-left transition-colors ${
                  hasItems ? 'hover:bg-neutral-50 cursor-pointer' : 'cursor-default'
                }`}
              >
                <span className="text-neutral-400">
                  <Icon name={(CATEGORY_ICONS[key] as IconName) ?? 'check'} size={18} />
                </span>
                <span className="text-sm text-neutral-800 font-medium flex-1">
                  {CATEGORY_LABELS[key] || key}
                </span>
                <span className="text-xs text-neutral-400 tabular-nums">
                  {cat.count} {cat.nearestM !== undefined && `· od ${fmtDist(cat.nearestM)}`}
                </span>
                {hasItems && (
                  <span className={`text-neutral-300 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    <Icon name="chevron" size={16} />
                  </span>
                )}
              </button>

              {isOpen && hasItems && (
                <ul className="px-6 pb-4 pt-1 space-y-1">
                  {cat.items.map((poi, i) => (
                    <li key={i}>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${poi.lat}&mlon=${poi.lng}#map=18/${poi.lat}/${poi.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 py-1.5 px-3 -mx-1 hover:bg-neutral-50 group"
                      >
                        <span className="text-neutral-300 group-hover:text-emerald-600">
                          <Icon name="pin" size={14} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm text-neutral-800 truncate">{poi.name}</span>
                          {poi.detail && (
                            <span className="block text-xs text-neutral-400 truncate">{poi.detail}</span>
                          )}
                        </span>
                        <span className="text-xs text-neutral-400 tabular-nums whitespace-nowrap">
                          {fmtDist(poi.distanceM)}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
