import type { GeoData } from '@/lib/types';
import Icon from './Icon';

const MONTHS_SHORT = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

// Kolor słupka wg poziomu PM2.5 (skala zdrowotna)
function barColor(pm: number): string {
  if (pm < 12) return '#15803d'; // dobrze
  if (pm < 25) return '#d97706'; // umiarkowanie
  if (pm < 50) return '#ea580c'; // źle
  return '#dc2626'; // bardzo źle
}

interface Props {
  air: NonNullable<GeoData['airHistory']>;
}

// Wykres całorocznego przebiegu PM2.5 — pokazuje sezonowość smogu,
// żeby letni kupujący nie dał się zwieść chwilowo czystemu powietrzu.
export default function AirChart({ air }: Props) {
  const months = air.monthly;
  if (!months.length) return null;
  const max = Math.max(...months.map((m) => m.pm25), 25);

  return (
    <div className="border border-neutral-200 bg-white mb-4 break-inside-avoid">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-100">
        <span className="flex items-center justify-center w-8 h-8 text-sky-700 bg-sky-50">
          <Icon name="air" size={18} />
        </span>
        <h3 className="font-semibold text-neutral-950 text-base tracking-tight">
          Smog przez cały rok (PM2.5)
        </h3>
        <span className="ml-auto text-[11px] text-neutral-400 uppercase tracking-wider">
          Open-Meteo · CAMS
        </span>
      </div>

      <div className="px-6 py-5">
        {/* statystyki */}
        <div className="grid grid-cols-3 gap-px bg-neutral-200 border border-neutral-200 mb-5">
          <Stat label="Średnia roczna" value={`${air.yearAvgPm25} µg/m³`} />
          <Stat label="Lato (VI–VIII)" value={air.summerAvgPm25 !== undefined ? `${air.summerAvgPm25} µg/m³` : '—'} accent="#15803d" />
          <Stat label="Zima (XII–II)" value={air.winterAvgPm25 !== undefined ? `${air.winterAvgPm25} µg/m³` : '—'} accent="#dc2626" />
        </div>

        {/* wykres słupkowy */}
        <div className="flex items-end gap-1.5 h-28">
          {months.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full" title={`${m.pm25} µg/m³`}>
              <div
                className="w-full"
                style={{ height: `${Math.max(4, (m.pm25 / max) * 100)}%`, backgroundColor: barColor(m.pm25) }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-1.5 mt-1.5">
          {months.map((m) => (
            <div key={m.month} className="flex-1 text-center text-[10px] text-neutral-400 tabular-nums">
              {MONTHS_SHORT[m.month - 1]}
            </div>
          ))}
        </div>

        <p className="text-xs text-neutral-500 leading-relaxed mt-4">
          Norma roczna WHO to 5 µg/m³.{' '}
          {air.worstMonth && (
            <>
              Najgorszy miesiąc to{' '}
              <strong className="text-neutral-700">
                {['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'][air.worstMonth.month - 1]}
              </strong>{' '}
              ({air.worstMonth.pm25} µg/m³).{' '}
            </>
          )}
          W mieszkaniu będziesz cały rok — patrz na zimę, nie tylko na dzień wyszukiwania.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-semibold" style={{ color: accent || '#0a0a0a' }}>
        {value}
      </p>
    </div>
  );
}
