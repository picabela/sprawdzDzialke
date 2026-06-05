'use client';

import { useState, useTransition } from 'react';
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
  'Gmina Piaseczno, działka 234/5',
];

export default function SearchForm({ onReport, onLoading, onError }: Props) {
  const [address, setAddress] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (addr: string) => {
    const trimmed = addr.trim();
    if (!trimmed || trimmed.length < 5) return;

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
      onLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex gap-2 bg-white rounded-2xl p-2 shadow-xl">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit(address)}
          placeholder="Wpisz adres działki lub mieszkania..."
          className="flex-1 px-4 py-3 text-base outline-none text-gray-800 placeholder-gray-400"
          disabled={isPending}
        />
        <button
          onClick={() => startTransition(() => { handleSubmit(address); })}
          disabled={isPending || address.length < 5}
          className="bg-green-800 text-white px-6 py-3 rounded-xl font-medium text-sm
                     hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors whitespace-nowrap"
        >
          {isPending ? 'Sprawdzam...' : 'Sprawdź →'}
        </button>
      </div>

      {/* Przykłady */}
      <div className="flex flex-wrap gap-2 mt-3 justify-center">
        {EXAMPLE_ADDRESSES.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setAddress(ex);
              handleSubmit(ex);
            }}
            className="text-xs px-3 py-1.5 rounded-full border border-white/20 text-white/70
                       hover:bg-white/10 transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
