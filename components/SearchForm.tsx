'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Coordinates, Report } from '@/lib/types';
import Icon from './Icon';

const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false });

interface Props {
  onReport: (report: Report) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string) => void;
}

type Mode = 'address' | 'parcel' | 'map';

interface Suggestion {
  label: string;
  lat: number;
  lng: number;
  city: string;
}

const EXAMPLE_ADDRESSES = [
  'ul. Nowy Świat 15, Warszawa',
  'ul. Floriańska 3, Kraków',
  'ul. Świdnicka 10, Wrocław',
];

const TABS: { key: Mode; label: string; icon: 'search' | 'parcel' | 'map' }[] = [
  { key: 'address', label: 'Adres', icon: 'search' },
  { key: 'parcel', label: 'Numer działki', icon: 'parcel' },
  { key: 'map', label: 'Na mapie', icon: 'map' },
];

export default function SearchForm({ onReport, onLoading, onError }: Props) {
  const [mode, setMode] = useState<Mode>('address');
  const [address, setAddress] = useState('');
  const [parcelId, setParcelId] = useState('');
  const [picked, setPicked] = useState<Coordinates | null>(null);
  const [busy, setBusy] = useState(false);

  // autouzupełnianie
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSug, setShowSug] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode !== 'address' || address.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(address.trim())}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowSug(true);
      } catch {
        setSuggestions([]);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [address, mode]);

  const post = async (body: Record<string, unknown>) => {
    if (busy) return;
    setBusy(true);
    onLoading(true);
    onError('');
    setShowSug(false);
    try {
      const res = await fetch('/api/generuj-raport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || 'Coś poszło nie tak.');
        return;
      }
      onReport(data.report);
    } catch {
      onError('Błąd sieci. Sprawdź połączenie i spróbuj ponownie.');
    } finally {
      setBusy(false);
      onLoading(false);
    }
  };

  const submitAddress = (addr: string) => {
    const t = addr.trim();
    if (t.length < 5) {
      onError('Podaj pełniejszy adres — ulicę, numer i miasto.');
      return;
    }
    post({ address: t });
  };

  const submitParcel = () => {
    const t = parcelId.trim();
    // ULDK: WWPPGG_R.OBRĘB.NUMER — wymaga podkreślnika i kropek
    if (!/^\d{6}_\d+\.\d+(\.\d+(\/\d+)?)?$/.test(t)) {
      onError('Identyfikator działki ma format np. 141201_1.0001.1234/5 (TERYT). Sprawdź na geoportal.gov.pl.');
      return;
    }
    post({ parcelId: t });
  };

  const submitMap = () => {
    if (!picked) {
      onError('Najpierw kliknij punkt na mapie.');
      return;
    }
    post({ lat: picked.lat, lng: picked.lng });
  };

  return (
    <div className="w-full">
      {/* Zakładki trybu */}
      <div className="flex gap-px mb-4 bg-neutral-800 border border-neutral-700 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setMode(t.key);
              onError('');
              setShowSug(false);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              mode === t.key
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            <Icon name={t.icon} size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ADRES */}
      {mode === 'address' && (
        <div className="relative">
          <div className="flex border border-neutral-700 bg-neutral-900 focus-within:border-emerald-500 transition-colors">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onFocus={() => suggestions.length && setShowSug(true)}
              onKeyDown={(e) => e.key === 'Enter' && submitAddress(address)}
              placeholder="Wpisz adres, np. ul. Polna 12, Poznań"
              className="flex-1 px-5 py-4 text-base outline-none bg-transparent text-white placeholder-neutral-500"
              disabled={busy}
              autoComplete="off"
            />
            <button
              onClick={() => submitAddress(address)}
              disabled={busy || address.trim().length < 5}
              className="bg-emerald-600 text-white px-8 py-4 font-medium text-sm hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {busy ? 'Sprawdzam…' : 'Sprawdź'}
            </button>
          </div>

          {/* lista podpowiedzi */}
          {showSug && suggestions.length > 0 && (
            <ul className="absolute z-20 left-0 right-0 mt-1 bg-neutral-900 border border-neutral-700 max-h-72 overflow-auto">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    onClick={() => {
                      setAddress(s.label);
                      setShowSug(false);
                      submitAddress(s.label);
                    }}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-neutral-800 border-b border-neutral-800 last:border-0"
                  >
                    <span className="text-neutral-500 mt-0.5">
                      <Icon name="pin" size={15} />
                    </span>
                    <span className="text-sm text-neutral-200 leading-snug">{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            {EXAMPLE_ADDRESSES.map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  setAddress(ex);
                  submitAddress(ex);
                }}
                className="text-xs px-3 py-1.5 border border-neutral-700 text-neutral-400 hover:border-emerald-600 hover:text-emerald-400 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
          <p className="text-neutral-500 text-xs mt-4">
            Masz numer lokalu? Lokalizujemy budynek — numer mieszkania nie zmienia danych o lokalizacji.
          </p>
        </div>
      )}

      {/* NUMER DZIAŁKI */}
      {mode === 'parcel' && (
        <div>
          <div className="flex border border-neutral-700 bg-neutral-900 focus-within:border-emerald-500 transition-colors">
            <input
              type="text"
              value={parcelId}
              onChange={(e) => setParcelId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitParcel()}
              placeholder="np. 141201_1.0001.1234/5"
              className="flex-1 px-5 py-4 text-base outline-none bg-transparent text-white placeholder-neutral-500"
              disabled={busy}
              autoComplete="off"
            />
            <button
              onClick={submitParcel}
              disabled={busy || parcelId.trim().length < 6}
              className="bg-emerald-600 text-white px-8 py-4 font-medium text-sm hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {busy ? 'Sprawdzam…' : 'Sprawdź działkę'}
            </button>
          </div>
          <p className="text-neutral-500 text-xs mt-4 leading-relaxed">
            Identyfikator działki ewidencyjnej (TERYT) znajdziesz w księdze wieczystej albo na{' '}
            <a
              href="https://mapy.geoportal.gov.pl/imap/Imgp_2.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline"
            >
              geoportal.gov.pl
            </a>{' '}
            (kliknij działkę → identyfikator). Format: <span className="text-neutral-400">141201_1.0001.1234/5</span>.
          </p>
        </div>
      )}

      {/* NA MAPIE */}
      {mode === 'map' && (
        <div>
          <MapPicker value={picked} onChange={setPicked} />
          <button
            onClick={submitMap}
            disabled={busy || !picked}
            className="mt-3 bg-emerald-600 text-white px-8 py-3.5 font-medium text-sm hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? 'Sprawdzam…' : 'Sprawdź wskazany punkt'}
          </button>
        </div>
      )}
    </div>
  );
}
