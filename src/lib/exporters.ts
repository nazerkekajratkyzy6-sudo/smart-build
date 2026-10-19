// PDF және Excel экспорты. Ауыр кітапханалар қажет кезде ғана жүктеледі (dynamic import).
import type { Report } from './report';
import { downloadBlob, safeFileName } from './db';

/* ---------- PDF (pdfmake + DejaVu Sans: қазақ әріптері мен ₸) ---------- */

export async function exportPdf(report: Report, fileBase: string): Promise<void> {
  const [{ default: pdfMake }, fonts] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('../fonts/dejavu'),
  ]);
  const pm = pdfMake as unknown as {
    vfs: Record<string, string>; fonts: Record<string, Record<string, string>>;
    createPdf: (d: unknown) => { getBlob: (cb: (b: Blob) => void) => void };
  };
  pm.vfs = { 'DejaVuSans.ttf': fonts.regular, 'DejaVuSans-Bold.ttf': fonts.bold };
  pm.fonts = { DejaVu: { normal: 'DejaVuSans.ttf', bold: 'DejaVuSans-Bold.ttf', italics: 'DejaVuSans.ttf', bolditalics: 'DejaVuSans-Bold.ttf' } };

  const content: unknown[] = [
    { text: 'SMART BUILD', style: 'brand' },
    { text: 'Ақылды есептеу, тиімді құрылыс', style: 'tag' },
    { text: report.subtitle, style: 'h1', margin: [0, 10, 0, 6] },
  ];
  for (const b of report.blocks) {
    content.push({ text: b.title, style: 'h2' });
    if (b.kv) {
      content.push({
        table: { widths: ['38%', '62%'], body: b.kv.map(([k, v]) => [{ text: k, bold: true }, v]) },
        layout: 'lightHorizontalLines', margin: [0, 0, 0, 6],
      });
    }
    if (b.table) {
      const n = b.table.head.length;
      content.push({
        table: {
          headerRows: 1,
          widths: b.table.widths ? b.table.widths.map(w => `${w}%`) : Array(n).fill('*'),
          body: [b.table.head.map(h => ({ text: h, style: 'th' })), ...b.table.rows],
        },
        layout: { fillColor: (row: number) => (row === 0 ? '#1e3a8a' : row % 2 === 0 ? '#f1f5f9' : null), hLineColor: () => '#cbd5e1', vLineColor: () => '#cbd5e1' },
        fontSize: n > 6 ? 7 : 8.5, margin: [0, 0, 0, 6],
      });
    }
    b.lines?.forEach(l => content.push({ text: l, margin: [0, 2, 0, 2] }));
    b.steps?.forEach(g => {
      content.push({ text: g.group, bold: true, color: '#1e3a8a', margin: [0, 6, 0, 2] });
      g.items.forEach(s => {
        content.push({
          margin: [8, 1, 0, 3],
          stack: [
            { text: s.title, italics: true, color: '#475569' },
            { text: [{ text: '1) ', color: '#94a3b8' }, s.formula, '    ', { text: '2) ', color: '#94a3b8' }, s.subst, '    ', { text: '3) ', color: '#94a3b8' }, { text: s.result, bold: true }] },
            ...(s.note ? [{ text: s.note, fontSize: 8, color: '#64748b' }] : []),
          ],
        });
      });
    });
  }
  content.push({ text: report.disclaimer, style: 'disc', margin: [0, 14, 0, 0] });

  const doc = {
    pageSize: 'A4', pageMargins: [36, 40, 36, 44],
    defaultStyle: { font: 'DejaVu', fontSize: 9, lineHeight: 1.15 },
    footer: (cur: number, total: number) => ({ text: `SMART BUILD — Ақылды есептеу, тиімді құрылыс.   ${cur} / ${total}`, alignment: 'center', fontSize: 7, color: '#94a3b8' }),
    styles: {
      brand: { fontSize: 20, bold: true, color: '#1e3a8a' },
      tag: { fontSize: 10, color: '#16a34a' },
      h1: { fontSize: 14, bold: true },
      h2: { fontSize: 11.5, bold: true, color: '#1e3a8a', margin: [0, 10, 0, 4] },
      th: { bold: true, color: '#ffffff' },
      disc: { fontSize: 8, italics: true, color: '#475569' },
    },
    content,
    info: { title: report.subtitle, creator: 'SMART BUILD' },
  };
  const blob = await new Promise<Blob>(res => pm.createPdf(doc).getBlob(res));
  downloadBlob(blob, `${safeFileName(fileBase)}.pdf`);
}

/* ---------- Excel (SheetJS) ---------- */

export async function exportExcel(report: Report, fileBase: string): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  const sheetName = (t: string) => {
    let n = t.replace(/[\\/?*[\]:]/g, ' ').slice(0, 28).trim() || 'Парақ';
    let k = 2; const base = n;
    while (used.has(n)) n = `${base.slice(0, 25)} ${k++}`;
    used.add(n); return n;
  };
  // 1-парақ: қорытынды (жоба туралы + шығын)
  const summary: (string | number)[][] = [[report.title], [report.subtitle], []];
  for (const b of report.blocks) {
    if (!b.kv && !b.lines?.length) continue;
    if (b.table || b.steps) continue;
    summary.push([b.title]);
    b.kv?.forEach(([k, v]) => summary.push([k, v]));
    b.lines?.forEach(l => summary.push([l]));
    summary.push([]);
  }
  summary.push([report.disclaimer]);
  const s1 = XLSX.utils.aoa_to_sheet(summary);
  s1['!cols'] = [{ wch: 34 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, s1, sheetName('Қорытынды'));

  for (const b of report.blocks) {
    if (b.table) {
      const rows = [b.table.head, ...b.table.rows, [], ...(b.lines ?? []).map(l => [l])];
      const sh = XLSX.utils.aoa_to_sheet(rows);
      sh['!cols'] = b.table.head.map((h, i) => ({ wch: Math.min(48, Math.max(h.length + 2, ...b.table!.rows.map(r => (r[i] ?? '').length + 2))) }));
      XLSX.utils.book_append_sheet(wb, sh, sheetName(b.title));
    }
    if (b.steps) {
      const rows: string[][] = [['Бөлім', 'Не есептеледі', '1. Формула', '2. Сандарды қою', '3. Нәтиже', 'Түсіндірме']];
      b.steps.forEach(g => g.items.forEach(s => rows.push([g.group, s.title, s.formula, s.subst, s.result, [s.note, ...(s.legend ?? []).map(([a, c]) => `${a} — ${c}`)].filter(Boolean).join('; ')])));
      const sh = XLSX.utils.aoa_to_sheet(rows);
      sh['!cols'] = [{ wch: 24 }, { wch: 30 }, { wch: 34 }, { wch: 46 }, { wch: 26 }, { wch: 60 }];
      XLSX.utils.book_append_sheet(wb, sh, sheetName('Есептеу жолы'));
    }
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${safeFileName(fileBase)}.xlsx`);
}
