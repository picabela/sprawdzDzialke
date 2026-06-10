'use client';

// Pobranie raportu jako PDF przez natywny dialog drukowania przeglądarki.
// Style @media print w globals.css ukrywają wszystko poza treścią raportu,
// więc "Zapisz jako PDF" daje czysty dokument bez formularzy i przycisków.
export default function DownloadPdfButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2.5 border border-neutral-300 bg-white text-neutral-950
                 px-5 py-2.5 text-sm font-medium hover:border-neutral-950 transition-colors print:hidden"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M8 1v9m0 0L4.5 6.5M8 10l3.5-3.5M2 12.5V14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
        />
      </svg>
      Pobierz PDF
    </button>
  );
}
