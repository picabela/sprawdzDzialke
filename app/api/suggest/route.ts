import { NextRequest, NextResponse } from 'next/server';
import { suggestAddresses } from '@/lib/apis/geocoding';

// GET /api/suggest?q=...  — podpowiedzi adresów (autouzupełnianie)
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  if (q.length < 3) return NextResponse.json({ suggestions: [] });

  try {
    const suggestions = await suggestAddresses(q);
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
