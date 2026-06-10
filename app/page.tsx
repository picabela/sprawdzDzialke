'use client';

import { useState } from 'react';
import SearchForm from '@/components/SearchForm';
import ReportSection from '@/components/ReportSection';
import LoadingReport from '@/components/LoadingReport';
import MapPreview from '@/components/MapPreview';
import type { Report } from '@/lib/types';

const FEATURES = [
  { icon: '🔊', label: 'Poziom hałasu' },
  { icon: '💨', label: 'Jakość powietrza (GIOŚ)' },
  { icon: '🗺️', label: 'Plan zagospodarowania' },
  { icon: '🌊', label: 'Zagrożenie powodzią' },
  { icon: '☀️', label: 'Potencjał solarny' },
  { icon: '🚌', label: 'Komunikacja' },
  { icon: '🏥', label: 'Infrastruktura' },
  { icon: '📈', label: 'Rynek nieruchomości' },
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
      <section className="bg-neutral-950 px-6 py-16 md:py-24">
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
            Hałas, powietrze, powódź, plan zagospodarowania, okolica — jeden prosty
            raport z publicznych danych, bez żargonu.
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
        <div className="max-w-3xl mx-auto mt-8 px-6">
          <div className="border-l-2 border-red-600 bg-red-50 px-5 py-4 text-red-700 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Ładowanie */}
      {loading && <LoadingReport />}

      {/* Raport */}
      {report && !loading && (
        <div id="report" className="max-w-3xl mx-auto px-6 py-12">
          {/* Nagłówek raportu */}
          <div className="mb-8 pb-6 border-b border-neutral-200">
            <p className="text-neutral-400 text-xs uppercase tracking-widest mb-2">Raport</p>
            <h2 className="text-2xl font-semibold text-neutral-900 tracking-tight">
              {report.address}
            </h2>
            <p className="text-neutral-400 text-sm mt-2">
              Wygenerowano{' '}
              {new Date().toLocaleDateString('pl-PL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Ogólna ocena */}
          <div className="border border-neutral-200 bg-white p-6 mb-8 flex items-start gap-6">
            <div
              className="w-20 h-20 flex flex-col items-center justify-center flex-shrink-0 text-white"
              style={{
                backgroundColor:
                  report.score >= 70 ? '#15803d' : report.score >= 45 ? '#d97706' : '#dc2626',
              }}
            >
              <span className="text-3xl font-bold leading-none">{report.score}</span>
              <span className="text-white/60 text-xs mt-1">/100</span>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 text-lg mb-1">{report.scoreLabel}</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">{report.scoreSummary}</p>
            </div>
          </div>

          {/* Mapa lokalizacji */}
          {report.coords && (
            <div className="mb-8">
              <MapPreview coords={report.coords} label={report.address} />
            </div>
          )}

          {/* Sekcje */}
          {report.sections.map((section) => (
            <ReportSection key={section.id} section={section} />
          ))}

          {/* Disclaimer + przycisk nowego wyszukiwania */}
          <div className="mt-12 pt-8 border-t border-neutral-200">
            <p className="text-neutral-400 text-xs mb-8 leading-relaxed max-w-xl">
              Raport ma charakter informacyjny i jest generowany przez AI na podstawie publicznie
              dostępnych danych (GIOŚ, geoportal.gov.pl, OpenStreetMap, PVGIS). Ocena powodziowa
              jest szacunkiem — dokładne mapy na wody.isok.gov.pl. Przed podjęciem decyzji
              inwestycyjnej skonsultuj się ze specjalistą.
            </p>
            <button
              onClick={handleNewSearch}
              className="bg-neutral-950 text-white px-8 py-3.5 font-medium text-sm hover:bg-emerald-700 transition-colors"
            >
              Sprawdź inny adres
            </button>
          </div>
        </div>
      )}

      {/* Jeśli brak raportu — info o funkcjach */}
      {!report && !loading && !error && (
        <section className="max-w-3xl mx-auto px-6 py-20">
          <p className="text-neutral-400 text-xs uppercase tracking-widest mb-8">
            Co znajdziesz w raporcie
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-l border-neutral-200">
            {FEATURES.map((item) => (
              <div
                key={item.label}
                className="border-b border-r border-neutral-200 p-6 bg-white hover:bg-neutral-50 transition-colors"
              >
                <div className="text-2xl mb-3">{item.icon}</div>
                <p className="text-sm text-neutral-700 font-medium leading-snug">{item.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
