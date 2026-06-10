import type { Report } from '@/lib/types';
import ScoreBadge from './ScoreBadge';
import ReportSection from './ReportSection';
import MapPreview from './MapPreview';
import DownloadPdfButton from './DownloadPdfButton';
import AirChart from './AirChart';
import NeighborhoodExplorer from './NeighborhoodExplorer';
import ParcelInfo from './ParcelInfo';

interface Props {
  report: Report;
}

export default function ReportCard({ report }: Props) {
  const geo = report.geoData;
  const air = geo?.airHistory;
  const categories = geo?.surroundings?.categories;
  const parcel = geo?.parcel;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12" id="report-content">
      {/* Nagłówek raportu */}
      <div className="mb-8 pb-6 border-b border-neutral-200 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-neutral-400 text-xs uppercase tracking-widest mb-2">Raport</p>
          <h2 className="text-2xl font-semibold text-neutral-950 tracking-tight">{report.address}</h2>
          <p className="text-neutral-400 text-sm mt-2">
            Wygenerowano{' '}
            {new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <DownloadPdfButton />
      </div>

      {/* Ogólna ocena */}
      <div className="mb-4">
        <ScoreBadge score={report.score} label={report.scoreLabel} summary={report.scoreSummary} />
      </div>

      {/* Mapa lokalizacji */}
      {report.coords && (
        <div className="mb-8">
          <MapPreview coords={report.coords} label={report.address} />
        </div>
      )}

      {/* Dane działki (jeśli mamy) */}
      {parcel && <ParcelInfo parcel={parcel} />}

      {/* Sekcje opisowe + bloki z twardymi danymi wstrzykiwane tematycznie */}
      {report.sections.map((section, i) => (
        <div key={section.id}>
          <ReportSection section={section} index={i} />
          {section.id === 'powietrze' && air && <AirChart air={air} />}
          {section.id === 'infrastruktura' && categories && (
            <NeighborhoodExplorer categories={categories} />
          )}
        </div>
      ))}

      {/* Gdyby sekcji tematycznych nie było — pokaż bloki na końcu */}
      {air && !report.sections.some((s) => s.id === 'powietrze') && <AirChart air={air} />}
      {categories && !report.sections.some((s) => s.id === 'infrastruktura') && (
        <NeighborhoodExplorer categories={categories} />
      )}
    </div>
  );
}
