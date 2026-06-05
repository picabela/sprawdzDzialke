import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import type { Report } from '@/lib/types';

// GET /api/pdf?id=...
// Zwraca prostą, gotową do wydruku (Ctrl+P → zapisz jako PDF) wersję raportu.
// MVP nie używa @react-pdf/renderer — renderujemy lekki HTML, który przeglądarka
// potrafi zapisać do PDF. W fazie 2 można podmienić na pełny generator PDF.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')?.trim();

  if (!id) {
    return NextResponse.json({ error: 'Brak ID raportu.' }, { status: 400 });
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reports')
      .select('ai_report, address, created_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Nie znaleziono raportu.' }, { status: 404 });
    }

    // Oznacz że PDF został wygenerowany
    await supabase.from('reports').update({ pdf_generated: true }).eq('id', id);

    const report = data.ai_report as Report;
    const html = renderReportHtml(report);

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Nieznany błąd';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderReportHtml(report: Report): string {
  const sections = report.sections
    .map((section) => {
      const items = section.items
        .map(
          (item) => `
        <div class="item">
          <div class="item-label">${esc(item.icon)} ${esc(item.label)}</div>
          <div class="item-value">${esc(item.value)}</div>
          ${
            item.meter !== undefined
              ? `<div class="meter"><div class="meter-fill" style="width:${item.meter}%;background:${item.meterColor || '#2D7A4F'}"></div></div>`
              : ''
          }
          <div class="item-explain">${esc(item.explain)}</div>
        </div>`
        )
        .join('');
      return `
      <section class="report-section">
        <h2>${esc(section.icon)} ${esc(section.title)}</h2>
        ${items}
      </section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <title>Raport — ${esc(report.address)}</title>
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #1f2937; max-width: 720px; margin: 0 auto; padding: 32px; }
    h1 { font-size: 22px; font-weight: 500; }
    .score { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; width: 80px; height: 80px; border-radius: 50%; color: #fff; background: ${report.score >= 70 ? '#166534' : report.score >= 45 ? '#92400e' : '#991b1b'}; }
    .score b { font-size: 28px; }
    .report-section { border: 1px solid #f0f0f0; border-radius: 16px; padding: 20px; margin: 16px 0; }
    .report-section h2 { font-size: 16px; margin: 0 0 12px; }
    .item { padding: 10px 0; border-top: 1px solid #f5f5f5; }
    .item:first-of-type { border-top: none; }
    .item-label { font-size: 11px; text-transform: uppercase; color: #6b7280; }
    .item-value { font-weight: 600; font-size: 14px; margin: 2px 0; }
    .item-explain { font-size: 13px; color: #6b7280; }
    .meter { height: 6px; background: #f0f0f0; border-radius: 999px; margin: 6px 0; overflow: hidden; }
    .meter-fill { height: 100%; border-radius: 999px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${esc(report.address)}</h1>
  <p style="display:flex;align-items:center;gap:16px;">
    <span class="score"><b>${report.score}</b><span>/100</span></span>
    <span><strong>${esc(report.scoreLabel)}</strong><br/>${esc(report.scoreSummary)}</span>
  </p>
  ${sections}
  <p style="font-size:11px;color:#9ca3af;margin-top:24px;">
    Raport ma charakter informacyjny i jest generowany przez AI na podstawie publicznie dostępnych danych.
  </p>
</body>
</html>`;
}
