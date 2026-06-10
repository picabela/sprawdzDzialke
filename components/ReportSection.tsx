import type { ReportSection as ReportSectionType } from '@/lib/types';
import Icon, { SECTION_ICONS } from './Icon';

const STATUS_STYLES = {
  good: { tag: 'text-emerald-700 border-emerald-600', dot: 'bg-emerald-600', icon: 'text-emerald-700 bg-emerald-50', label: 'Dobry' },
  ok: { tag: 'text-amber-700 border-amber-600', dot: 'bg-amber-500', icon: 'text-amber-700 bg-amber-50', label: 'Przeciętny' },
  bad: { tag: 'text-red-700 border-red-600', dot: 'bg-red-600', icon: 'text-red-700 bg-red-50', label: 'Uwaga' },
  neutral: { tag: 'text-neutral-500 border-neutral-300', dot: 'bg-neutral-400', icon: 'text-neutral-600 bg-neutral-100', label: 'Info' },
};

interface Props {
  section: ReportSectionType;
  index?: number; // numer porządkowy sekcji (01, 02, …)
}

export default function ReportSection({ section, index }: Props) {
  const style = STATUS_STYLES[section.status] ?? STATUS_STYLES.neutral;
  const iconName = SECTION_ICONS[section.id] ?? 'check';

  return (
    <div className="border border-neutral-200 bg-white mb-4 break-inside-avoid">
      {/* Nagłówek sekcji */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-100">
        <span className={`flex items-center justify-center w-8 h-8 ${style.icon}`}>
          <Icon name={iconName} size={18} />
        </span>
        {index !== undefined && (
          <span className="text-[11px] font-semibold text-neutral-300 tabular-nums tracking-wider">
            {String(index + 1).padStart(2, '0')}
          </span>
        )}
        <h3 className="font-semibold text-neutral-950 text-base tracking-tight">
          {section.title}
        </h3>
        <span
          className={`ml-auto inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 border ${style.tag}`}
        >
          <span className={`w-1.5 h-1.5 ${style.dot}`} />
          {style.label}
        </span>
      </div>

      {/* Pozycje */}
      <div className="px-6 py-5 space-y-5">
        {section.items.map((item, i) => (
          <div key={i} className={i > 0 ? 'pt-5 border-t border-neutral-100' : ''}>
            <div className="flex items-baseline justify-between gap-4 mb-1.5">
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                {item.label}
              </p>
            </div>
            <p className="text-sm font-semibold text-neutral-950 mb-2">{item.value}</p>

            {/* Pasek pomiaru */}
            {item.meter !== undefined && (
              <div className="h-1 bg-neutral-100 mb-2.5 overflow-hidden">
                <div
                  className="h-full transition-all duration-700"
                  style={{
                    width: `${Math.max(0, Math.min(100, item.meter))}%`,
                    backgroundColor: item.meterColor || '#15803d',
                  }}
                />
              </div>
            )}

            {/* Wyjaśnienie */}
            <p className="text-sm text-neutral-500 leading-relaxed">{item.explain}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
