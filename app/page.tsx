'use client';

import { useState } from 'react';
import SearchForm from '@/components/SearchForm';
import LoadingReport from '@/components/LoadingReport';
import ReportCard from '@/components/ReportCard';
import type { Report } from '@/lib/types';

const FEATURES = [
  'Poziom hałasu',
  'Jakość powietrza (GIOŚ)',
  'Plan zagospodarowania',
  'Zagrożenie powodzią',
  'Osuwiska (SOPO)',
  'Rozwój okolicy',
  'Demografia gminy (GUS)',
  'Komunikacja',
  'Infrastruktura',
  'Potencjał solarny',
  'Bezpieczeństwo',
  'Rynek nieruchomości',
];

export default function Home() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNewSearch = () => {
    setReport(null);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main>
      {/* Hero z formularzem */}
      <section className="bg-neutral-950 px-6 py-16 md:py-24 print:hidden">
        <div className="max-w-3xl mx-auto">
          <p className="text-emerald-500 text-xs tracking-[0.3em] uppercase mb-6 font-semibold">
            SprawdzDzialke.pl
          </p>
          <h1 className="text-white text-4xl md:text-6xl font-semibold mb-5 leading-[1.05] tracking-tight">
            Sprawdź adres,
            <br />
            zanim kupisz.
          </h1>
          <p className="text-neutral-400 text-base md:text-lg mb-10 max-w-xl">
            Hałas, powietrze, powódź, osuwiska, plan zagospodarowania, rozwój okolicy —
            jeden prosty raport z publicznych danych, bez żargonu.
          </p>

          <SearchForm
            onReport={(r) => {
              setReport(r);
              setTimeout(
                () => document.getElementById('report')?.scrollIntoView({ behavior: 'smooth' }),
                100
              );
            }}
            onLoading={setLoading}
            onError={setError}
          />
        </div>
      </section>

      {/* Błąd */}
      {error && (
        <div className="max-w-3xl mx-auto mt-8 px-6 print:hidden">
          <div className="border-l-2 border-red-600 bg-red-50 px-5 py-4 text-red-700 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Ładowanie */}
      {loading && <LoadingReport />}

      {/* Raport */}
      {report && !loading && (
        <div id="report">
          <ReportCard report={report} />

          {/* Disclaimer + przycisk nowego wyszukiwania */}
          <div className="max-w-3xl mx-auto px-6 pb-12">
            <div className="pt-8 border-t border-neutral-200">
              <p className="text-neutral-400 text-xs mb-8 leading-relaxed max-w-xl">
                Raport ma charakter informacyjny i powstaje automatycznie na podstawie publicznie
                dostępnych danych (GIOŚ, geoportal.gov.pl, PIG-PIB, GUS, OpenStreetMap, PVGIS).
                Ocena powodziowa jest szacunkiem — dokładne mapy na wody.isok.gov.pl. Przed
                podjęciem decyzji inwestycyjnej skonsultuj się ze specjalistą.
              </p>
              <button
                onClick={handleNewSearch}
                className="bg-neutral-950 text-white px-8 py-3.5 font-medium text-sm hover:bg-emerald-700 transition-colors print:hidden"
              >
                Sprawdź inny adres
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Jeśli brak raportu — info o funkcjach */}
      {!report && !loading && !error && (
        <section className="max-w-3xl mx-auto px-6 py-20 print:hidden">
          <p className="text-neutral-400 text-xs uppercase tracking-widest mb-8">
            Co znajdziesz w raporcie
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-l border-neutral-200">
            {FEATURES.map((label, i) => (
              <div
                key={label}
                className="border-b border-r border-neutral-200 p-6 bg-white hover:bg-neutral-50 transition-colors"
              >
                <p className="text-[11px] font-semibold text-neutral-300 tabular-nums tracking-wider mb-3">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <p className="text-sm text-neutral-700 font-medium leading-snug">{label}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
