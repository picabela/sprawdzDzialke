import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SprawdzDzialke.pl — Raport o nieruchomości w 60 sekund',
  description:
    'Wpisz adres działki lub mieszkania i dostań prosty raport: hałas, powietrze, powódź, solar, komunikacja i rynek nieruchomości.',
  keywords:
    'raport o działce, sprawdź działkę, analiza nieruchomości, zagrożenie powodziowe, jakość powietrza',
  openGraph: {
    title: 'SprawdzDzialke.pl',
    description: 'Prosty raport o każdej nieruchomości w Polsce',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className={`${geist.className} bg-neutral-50 min-h-screen antialiased`}>
        {children}
        <footer className="max-w-3xl mx-auto px-6 py-10 text-xs text-neutral-400 border-t border-neutral-200 mt-12 print:hidden">
          <p>© 2026 SprawdzDzialke.pl — Dane: GIOŚ, GUGiK, geoportal.gov.pl, PIG-PIB, GUS, PVGIS, OpenAQ, OpenStreetMap</p>
          <p className="mt-2">
            <a href="#" className="hover:text-neutral-700">
              Regulamin
            </a>
            <span className="mx-2">·</span>
            <a href="#" className="hover:text-neutral-700">
              Polityka prywatności
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
