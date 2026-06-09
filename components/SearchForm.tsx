'use client';

import { useState } from 'react';
import type { Report } from '@/lib/types';

interface Props {
  onReport: (report: Report) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string) => void;
}

const EXAMPLE_ADDRESSES = [
  'ul. Nowy Świat 15, Warszawa',
  'ul. Floriańska 3, Kraków',
  'ul. Świdnicka 10, Wrocław',
];

export default function SearchForm({ onReport, onLoading, onError }: Props) {
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (addr: string) => {
    const trimmed = addr.trim();
    if (!trimmed || trimmed.length < 5 || busy) return;

    setBusy(true);
    onLoading(true);
    onError('');

    try {
      const res = await fetch('/api/generuj-raport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: trimmed }),
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

  return (
    <div className="w-full">
      <div className="flex border border-neutral-700 bg-neutral-900 focus-within:border-emerald-500 transition-colors">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit(address)}
          placeholder="Wpisz adres, np. ul. Polna 12, Poznań"
          className="flex-1 px-5 py-4 text-base outline-none bg-transparent text-white placeholder-neutral-500"
          disabled={busy}
        />
        <button
          onClick={() => handleSubmit(address)}
          disabled={busy || address.trim().length < 5}
          className="bg-emerald-600 text-white px-8 py-4 font-medium text-sm
                     hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors whitespace-nowrap"
        >
          {busy ? 'Sprawdzam…' : 'Sprawdź'}
        </button>
      </div>

      {/* Przykłady */}
      <div className="flex flex-wrap gap-2 mt-4">
        {EXAMPLE_ADDRESSES.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setAddress(ex);
              handleSubmit(ex);
            }}
            className="text-xs px-3 py-1.5 border border-neutral-700 text-neutral-400
                       hover:border-emerald-600 hover:text-emerald-400 transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      <p className="text-neutral-500 text-xs mt-4">
        Podajesz adres z numerem lokalu? Lokalizujemy budynek — numer mieszkania nie zmienia danych
        o lokalizacji.
      </p>
    </div>
  );
}
