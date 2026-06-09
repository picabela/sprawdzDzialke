'use client';

import { useEffect, useState } from 'react';

const LOADING_MESSAGES = [
  'Lokalizuję adres…',
  'Sprawdzam dane katastralne…',
  'Pobieram indeks jakości powietrza (GIOŚ)…',
  'Sprawdzam plan zagospodarowania (MPZP)…',
  'Mierzę odległość od rzek i torów…',
  'Obliczam potencjał solarny…',
  'AI składa raport…',
];

export default function LoadingReport() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <div className="border border-neutral-200 bg-white p-10 text-center">
        {/* Pasek aktywności */}
        <div className="flex justify-center gap-1.5 mb-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-2 h-8 bg-emerald-600 animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>

        <p className="text-neutral-800 text-base font-medium">{LOADING_MESSAGES[msgIndex]}</p>
        <p className="text-neutral-400 text-sm mt-2">
          Odpytujemy 7 publicznych źródeł danych — zwykle 15–30 sekund
        </p>
      </div>
    </div>
  );
}
