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
      <section className="bg-neutral-950 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <p className="text-emerald-500 text-xs tracking-[0.3em] uppercase mb-3 font-semibold">
            SprawdzDzialke.pl
          </p>
          <h1 className="text-white text-2xl md:text-3xl font-semibold tracking-tight">
            Raport o nieruchomości
          </h1>
        </div>
      </section>

      <ReportCard report={report} />

      <div className="max-w-3xl mx-auto px-6 pb-12">
        <a
          href={`/api/pdf?id=${id}`}
          className="inline-block bg-neutral-950 text-white px-8 py-3.5 font-medium text-sm hover:bg-emerald-700 transition-colors"
        >
          Pobierz PDF
        </a>
      </div>
    </main>
  );
}
