import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import ReportCard from '@/components/ReportCard';
import type { Report } from '@/lib/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Strona pojedynczego raportu — publiczna, czytana z Supabase.
export default async function RaportPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('reports')
    .select('ai_report, address, created_at, view_count')
    .eq('id', id)
    .single();

  if (error || !data) {
    notFound();
  }

  // Inkrementuj licznik wyświetleń (best-effort)
  await supabase
    .from('reports')
    .update({ view_count: (data.view_count ?? 0) + 1 })
    .eq('id', id);

  const report = data.ai_report as Report;

  return (
    <main>
      <section className="bg-green-900 px-6 py-10 text-center">
        <p className="text-green-300 text-xs tracking-widest uppercase mb-2 font-medium">
          SprawdzDzialke.pl
        </p>
        <h1 className="text-white text-2xl md:text-3xl font-light">Raport o nieruchomości</h1>
      </section>

      <ReportCard report={report} />

      <div className="max-w-2xl mx-auto px-4 pb-12 text-center">
        <a
          href={`/api/pdf?id=${id}`}
          className="inline-block bg-green-800 text-white px-8 py-3 rounded-xl font-medium text-sm hover:bg-green-700 transition-colors"
        >
          Pobierz PDF
        </a>
      </div>
    </main>
  );
}
