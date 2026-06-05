import { NextRequest, NextResponse } from 'next/server';
import { generateReport } from '@/lib/report-generator';
import { createClient } from '@/lib/supabase';

// Rate limiting prosty (w produkcji użyj Upstash Redis)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 godzina
  const maxRequests = 5; // 5 raportów na godzinę per IP

  const record = requestCounts.get(ip);
  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) return false;

  record.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // Pobierz IP
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    'unknown';

  // Rate limit
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Przekroczono limit. Możesz wygenerować max 5 raportów na godzinę.' },
      { status: 429 }
    );
  }

  // Pobierz adres
  let address: string;
  try {
    const body = await req.json();
    address = body.address?.trim();
    if (!address || address.length < 5) {
      return NextResponse.json({ error: 'Podaj adres (minimum 5 znaków).' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Nieprawidłowe żądanie.' }, { status: 400 });
  }

  try {
    // Generuj raport
    const report = await generateReport(address);
    if (!report) {
      return NextResponse.json({ error: 'Nie można wygenerować raportu.' }, { status: 500 });
    }

    // Zapisz do Supabase
    const supabase = createClient();
    const { data: saved, error: dbError } = await supabase
      .from('reports')
      .insert({
        address: address,
        address_normalized: address.toLowerCase().trim(),
        lat: report.coords?.lat,
        lng: report.coords?.lng,
        ai_report: report,
        score: report.score,
        city: report.city,
        ip_address: ip,
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('Błąd zapisu do DB:', dbError);
      // Nie blokuj — zwróć raport bez ID
      return NextResponse.json({ report });
    }

    return NextResponse.json({
      report: { ...report, id: saved.id },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Nieznany błąd';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
