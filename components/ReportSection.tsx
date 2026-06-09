import type { ReportSection as ReportSectionType } from '@/lib/types';

const STATUS_STYLES = {
  good: { tag: 'text-emerald-700 border-emerald-600', label: 'Dobry' },
  ok: { tag: 'text-amber-700 border-amber-600', label: 'Przeciętny' },
  bad: { tag: 'text-red-700 border-red-600', label: 'Uwaga' },
  neutral: { tag: 'text-neutral-500 border-neutral-300', label: 'Info' },
};

interface Props {
  section: ReportSectionType;
}

export default function ReportSection({ section }: Props) {
  const style = STATUS_STYLES[section.status] ?? STATUS_STYLES.neutral;

  return (
    <div className="border border-neutral-200 bg-white p-6 mb-4">
      {/* Nagłówek sekcji */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-xl">{section.icon}</span>
        <h3 className="font-semibold text-neutral-900 text-base tracking-tight">
          {section.title}
        </h3>
        <span
          className={`ml-auto text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 border ${style.tag}`}
        >
          {style.label}
        </span>
      </div>

      {/* Pozycje */}
      <div className="space-y-5">
        {section.items.map((item, i) => (
          <div key={i} className={`flex gap-4 ${i > 0 ? 'pt-5 border-t border-neutral-100' : ''}`}>
            <span className="text-lg mt-0.5 flex-shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                {item.label}
              </p>
              <p className="text-sm font-semibold text-neutral-900 mb-2">{item.value}</p>

              {/* Pasek postępu */}
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
          </div>
        ))}
      </div>
    </div>
  );
}
