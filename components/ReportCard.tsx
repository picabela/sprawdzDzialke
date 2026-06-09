import type { Report } from '@/lib/types';
import ScoreBadge from './ScoreBadge';
import ReportSection from './ReportSection';

interface Props {
  report: Report;
}

export default function ReportCard({ report }: Props) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Nagłówek raportu */}
      <div className="mb-8 pb-6 border-b border-neutral-200">
        <p className="text-neutral-400 text-xs uppercase tracking-widest mb-2">Raport</p>
        <h2 className="text-2xl font-semibold text-neutral-900 tracking-tight">{report.address}</h2>
        <p className="text-neutral-400 text-sm mt-2">
          Wygenerowano{' '}
          {new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Ogólna ocena */}
      <div className="mb-8">
        <ScoreBadge score={report.score} label={report.scoreLabel} summary={report.scoreSummary} />
      </div>

      {/* Sekcje */}
      {report.sections.map((section) => (
        <ReportSection key={section.id} section={section} />
      ))}
    </div>
  );
}
