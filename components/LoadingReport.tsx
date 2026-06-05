'use client';

import { useEffect, useState } from 'react';

const LOADING_MESSAGES = [
  '📍 Lokalizuję adres...',
  '🗺️ Sprawdzam dane katastralne...',
  '💨 Analizuję jakość powietrza...',
  '🌊 Weryfikuję zagrożenie powodziowe...',
  '☀️ Obliczam potencjał solarny...',
  '🤖 AI generuje raport...',
];

export default function LoadingReport() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center py-16 px-4">
      {/* Animowane kropki */}
      <div className="flex justify-center gap-2 mb-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full bg-green-800 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>

      <p className="text-gray-600 text-base transition-all duration-300">
        {LOADING_MESSAGES[msgIndex]}
      </p>
      <p className="text-gray-400 text-sm mt-2">Zazwyczaj trwa to 10–20 sekund</p>
    </div>
  );
}
