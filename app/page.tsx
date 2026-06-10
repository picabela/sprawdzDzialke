'use client';

import { useState } from 'react';
import SearchForm from '@/components/SearchForm';
import LoadingReport from '@/components/LoadingReport';
import ReportCard from '@/components/ReportCard';
import Icon, { type IconName } from '@/components/Icon';
import type { Report } from '@/lib/types';

const AUDIENCE: { icon: IconName; title: string; desc: string }[] = [
  {
    icon: 'shield',
    title: 'Kupujesz mieszkanie lub dom',
    desc: 'Sprawdź smog, hałas, powódź i plany inwestycyjne ZANIM podpiszesz umowę. Mieszkasz tam latami — nie tylko w dniu oglądania.',
  },
  {
    icon: 'parcel',
    title: 'Kupujesz działkę',
    desc: 'Plan miejscowy, osuwiska, dane ewidencyjne, co może powstać obok. Unikasz działki, na której nie postawisz domu.',
  },
  {
    icon: 'chart',
    title: 'Inwestujesz lub pośredniczysz',
    desc: 'Mediana cen transakcyjnych GUS, trend ludności, rozwój okolicy. Twarde dane do decyzji i rozmów z klientem.',
  },
];

const VALUE: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'check', title: 'Tylko dane publiczne', desc: 'GIOŚ, GUGiK, geoportal, PIG-PIB, GUS, PVGIS, OpenStreetMap — źródła, którym możesz zaufać.' },
  { icon: 'clock', title: 'Raport w kilkadziesiąt sekund', desc: 'Bez czekania na rzeczoznawcę i bez przekopywania dziesiątek map i rejestrów.' },
  { icon: 'air', title: 'Smog przez cały rok', desc: 'Nie chwilowy odczyt, ale przebieg miesiąc po miesiącu — lato kontra zima.' },
  { icon: 'pin', title: 'Konkretne miejsca w okolicy', desc: 'Szkoły, sklepy, przystanki z adresami i odległościami, a nie ogólniki.' },
];

const FEATURES = [
  'Poziom hałasu',
  'Smog przez cały rok',
  'Plan zagospodarowania',
  'Zagrożenie powodzią',
  'Osuwiska (SOPO)',
  'Rozwój okolicy',
  'Demografia gminy (GUS)',
  'Ceny transakcyjne (GUS)',
  'Komunikacja',
  'Infrastruktura',
  'Dane działki',
  'Potencjał solarny',
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
            Hałas, smog przez cały rok, powódź, osuwiska, plan zagospodarowania, ceny
            transakcyjne i rozwój okolicy — jeden raport z publicznych danych, bez żargonu.
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
          <div className="border-l-2 border-red-600 bg-red-50 px-5 py-4 text-red-700 text-sm">{error}</div>
        </div>
      )}

      {/* Ładowanie */}
      {loading && <LoadingReport />}

      {/* Raport */}
      {report && !loading && (
        <div id="report">
          <ReportCard report={report} />
          <div className="max-w-3xl mx-auto px-6 pb-12">
            <div className="pt-8 border-t border-neutral-200">
              <p className="text-neutral-400 text-xs mb-8 leading-relaxed max-w-xl">
                Raport ma charakter informacyjny i powstaje automatycznie na podstawie publicznie
                dostępnych danych (GIOŚ, geoportal.gov.pl, PIG-PIB, GUS, OpenStreetMap, PVGIS,
                Open-Meteo). Ocena powodziowa jest szacunkiem — dokładne mapy na wody.isok.gov.pl.
                Przed podjęciem decyzji inwestycyjnej skonsultuj się ze specjalistą.
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

      {/* Marketing — tylko gdy nie ma raportu */}
      {!report && !loading && (
        <>
          {/* Dla kogo */}
          <section className="max-w-5xl mx-auto px-6 py-20 print:hidden">
            <p className="text-neutral-400 text-xs uppercase tracking-widest mb-3">Dla kogo</p>
            <h2 className="text-2xl md:text-3xl font-semibold text-neutral-950 tracking-tight mb-10 max-w-2xl">
              Jedna decyzja na lata. Podejmij ją z faktami, nie z przeczuciem.
            </h2>
            <div className="grid md:grid-cols-3 border-t border-l border-neutral-200">
              {AUDIENCE.map((a) => (
                <div key={a.title} className="border-b border-r border-neutral-200 p-7 bg-white">
                  <span className="inline-flex items-center justify-center w-11 h-11 bg-emerald-50 text-emerald-700 mb-5">
                    <Icon name={a.icon} size={22} />
                  </span>
                  <h3 className="font-semibold text-neutral-950 mb-2">{a.title}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">{a.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Co dostajesz */}
          <section className="bg-neutral-950 px-6 py-20 print:hidden">
            <div className="max-w-5xl mx-auto">
              <p className="text-emerald-500 text-xs uppercase tracking-widest mb-3">Co dostajesz</p>
              <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight mb-10 max-w-2xl">
                Wszystko, co wpływa na komfort i wartość nieruchomości — w jednym miejscu.
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 border-t border-l border-neutral-800">
                {VALUE.map((v) => (
                  <div key={v.title} className="border-b border-r border-neutral-800 p-6">
                    <span className="text-emerald-500 inline-block mb-4">
                      <Icon name={v.icon} size={22} />
                    </span>
                    <h3 className="text-white font-medium mb-2 text-sm">{v.title}</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed">{v.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Lista funkcji */}
          <section className="max-w-5xl mx-auto px-6 py-20 print:hidden">
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
        </>
      )}
    </main>
  );
}
