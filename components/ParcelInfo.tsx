import type { GeoData } from '@/lib/types';
import Icon from './Icon';

interface Props {
  parcel: NonNullable<GeoData['parcel']>;
}

// Dane działki ewidencyjnej z ULDK (GUGiK) — twarde fakty, bez AI.
export default function ParcelInfo({ parcel }: Props) {
  const rows: { label: string; value?: string }[] = [
    { label: 'Numer działki', value: parcel.parcelNumber },
    { label: 'Obręb', value: parcel.region },
    { label: 'Gmina', value: parcel.commune },
    { label: 'Powiat', value: parcel.county },
    { label: 'Województwo', value: parcel.voivodeship },
    {
      label: 'Powierzchnia',
      value: parcel.areaM2
        ? parcel.areaM2 >= 10000
          ? `${(parcel.areaM2 / 10000).toFixed(2)} ha (${parcel.areaM2.toLocaleString('pl-PL')} m²)`
          : `${parcel.areaM2.toLocaleString('pl-PL')} m²`
        : undefined,
    },
    { label: 'Identyfikator (TERYT)', value: parcel.parcelId },
  ].filter((r) => r.value);

  return (
    <div className="border border-neutral-200 bg-white mb-4 break-inside-avoid">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-100">
        <span className="flex items-center justify-center w-8 h-8 text-neutral-600 bg-neutral-100">
          <Icon name="parcel" size={18} />
        </span>
        <h3 className="font-semibold text-neutral-950 text-base tracking-tight">Dane działki</h3>
        <span className="ml-auto text-[11px] text-neutral-400 uppercase tracking-wider">
          GUGiK · ULDK
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-px bg-neutral-100">
        {rows.map((r) => (
          <div key={r.label} className="bg-white px-6 py-3.5">
            <dt className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              {r.label}
            </dt>
            <dd className="text-sm font-medium text-neutral-900 break-words">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
