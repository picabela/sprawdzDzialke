import type { ReportSection as ReportSectionType } from '@/lib/types';

const STATUS_STYLES = {
  good: { tag: 'bg-green-100 text-green-800', label: 'Dobry' },
  ok: { tag: 'bg-amber-100 text-amber-800', label: 'Przeciętny' },
  bad: { tag: 'bg-red-100 text-red-800', label: 'Uwaga' },
  neutral: { tag: 'bg-gray-100 text-gray-600', label: 'Neutralny' },
};

interface Props {
  section: ReportSectionType;
}

export default function ReportSection({ section }: Props) {
  const style = STATUS_STYLES[section.status];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
      {/* Nagłówek sekcji */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{section.icon}</span>
        <h3 className="font-medium text-gray-900 text-base">{section.title}</h3>
        <span className={`ml-auto text-xs font-medium px-3 py-1 rounded-full ${style.tag}`}>
          {style.label}
        </span>
      </div>

      {/* Pozycje */}
      <div className="space-y-4">
        {section.items.map((item, i) => (
          <div key={i} className={`flex gap-3 ${i > 0 ? 'pt-4 border-t border-gray-50' : ''}`}>
            <span className="text-xl mt-0.5 flex-shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                {item.label}
              </p>
              <p className="text-sm font-semibold text-gray-900 mb-1.5">{item.value}</p>

              {/* Pasek postępu */}
              {item.meter !== undefined && (
                <div className="h-1.5 bg-gray-100 rounded-full mb-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${item.meter}%`,
                      backgroundColor: item.meterColor || '#2D7A4F',
                    }}
                  />
                </div>
              )}

              {/* Wyjaśnienie */}
              <p className="text-sm text-gray-500 leading-relaxed">{item.explain}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
