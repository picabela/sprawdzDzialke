import type { Report } from '@/lib/types';
import ScoreBadge from './ScoreBadge';
import ReportSection from './ReportSection';

interface Props {
  report: Report;
}

export default function ReportCard({ report }: Props) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Nagłówek raportu */}
      <div className="mb-6">
        <h2 className="text-xl font-medium text-gray-900">{report.address}</h2>
        <p className="text-gray-400 text-sm mt-1">
          Raport wygenerowany{' '}
          {new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Ogólna ocena */}
      <div className="mb-6">
        <ScoreBadge score={report.score} label={report.scoreLabel} summary={report.scoreSummary} />
      </div>

      {/* Sekcje */}
      {report.sections.map((section) => (
        <ReportSection key={section.id} section={section} />
      ))}
    </div>
  );
}
