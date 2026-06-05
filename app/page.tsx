'use client';

import { useState } from 'react';
import SearchForm from '@/components/SearchForm';
import ReportSection from '@/components/ReportSection';
import LoadingReport from '@/components/LoadingReport';
import type { Report } from '@/lib/types';

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
      <section className="bg-green-900 px-6 py-12 md:py-20 text-center">
        <p className="text-green-300 text-xs tracking-widest uppercase mb-4 font-medium">
          SprawdzDzialke.pl
        </p>
        <h1 className="text-white text-3xl md:text-5xl font-light mb-4 leading-tight">
          Wszystko o Twojej
          <br />
          <em className="font-light text-green-200 not-italic">nieruchomości</em> w 60 sekund
        </h1>
        <p className="text-green-300 text-base mb-10 max-w-lg mx-auto">
          Wpisz adres działki lub mieszkania — dostaniesz prosty raport bez żargonu
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
      </section>

      {/* Błąd */}
      {error && (
        <div className="max-w-2xl mx-auto mt-6 px-4">
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-700 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Ładowanie */}
      {loading && <LoadingReport />}

      {/* Raport */}
      {report && !loading && (
        <div id="report" className="max-w-2xl mx-auto px-4 py-8">
          {/* Nagłówek raportu */}
          <div className="mb-6">
            <h2 className="text-xl font-medium text-gray-900">{report.address}</h2>
            <p className="text-gray-400 text-sm mt-1">
              Raport wygenerowany{' '}
              {new Date().toLocaleDateString('pl-PL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Ogólna ocena */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 flex items-center gap-5">
            <div
              className="w-20 h-20 rounded-full flex flex-col items-center justify-center flex-shrink-0"
              style={{
                backgroundColor:
                  report.score >= 70 ? '#166534' : report.score >= 45 ? '#92400e' : '#991b1b',
              }}
            >
              <span className="text-white text-3xl font-bold leading-none">{report.score}</span>
              <span className="text-white/60 text-xs">/100</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg mb-1">{report.scoreLabel}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{report.scoreSummary}</p>
            </div>
          </div>

          {/* Sekcje */}
          {report.sections.map((section) => (
            <ReportSection key={section.id} section={section} />
          ))}

          {/* Disclaimer + przycisk nowego wyszukiwania */}
          <div className="mt-8 text-center">
            <p className="text-gray-400 text-xs mb-6 leading-relaxed max-w-lg mx-auto">
              Raport ma charakter informacyjny i jest generowany przez AI na podstawie publicznie
              dostępnych danych. Przed podjęciem decyzji inwestycyjnej skonsultuj się ze
              specjalistą.
            </p>
            <button
              onClick={handleNewSearch}
              className="bg-green-800 text-white px-8 py-3 rounded-xl font-medium text-sm hover:bg-green-700 transition-colors"
            >
              Sprawdź inny adres
            </button>
          </div>
        </div>
      )}

      {/* Jeśli brak raportu — info o funkcjach */}
      {!report && !loading && !error && (
        <section className="max-w-4xl mx-auto px-4 py-16">
          <h2 className="text-center text-gray-900 text-2xl font-light mb-10">
            Co znajdziesz w raporcie?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🔊', label: 'Poziom hałasu' },
              { icon: '💨', label: 'Jakość powietrza' },
              { icon: '🌊', label: 'Zagrożenie powodzią' },
              { icon: '☀️', label: 'Potencjał solarny' },
              { icon: '🚌', label: 'Komunikacja' },
              { icon: '🏥', label: 'Infrastruktura' },
              { icon: '🛡️', label: 'Bezpieczeństwo' },
              { icon: '📈', label: 'Rynek nieruchomości' },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white rounded-xl p-4 text-center border border-gray-100"
              >
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="text-sm text-gray-600 font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
