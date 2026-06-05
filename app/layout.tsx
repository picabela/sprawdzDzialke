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
      <body className={`${geist.className} bg-gray-50 min-h-screen`}>
        {children}
        <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-100 mt-8">
          <p>© 2025 SprawdzDzialke.pl • Dane: GUGiK, ISOK, PVGIS, OpenAQ, OpenStreetMap</p>
          <p className="mt-1">
            <a href="#" className="hover:text-gray-600">
              Regulamin
            </a>{' '}
            ·
            <a href="#" className="hover:text-gray-600 ml-2">
              Polityka prywatności
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
