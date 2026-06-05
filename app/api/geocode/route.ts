import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/apis/geocoding';

// GET /api/geocode?address=...
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address')?.trim();

  if (!address || address.length < 3) {
    return NextResponse.json({ error: 'Podaj adres (minimum 3 znaki).' }, { status: 400 });
  }

  try {
    const result = await geocodeAddress(address);
    if (!result) {
      return NextResponse.json({ error: 'Nie znaleziono adresu.' }, { status: 404 });
    }
    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Nieznany błąd';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
