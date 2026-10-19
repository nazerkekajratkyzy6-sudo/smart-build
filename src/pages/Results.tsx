import { FileJson, FileSpreadsheet, FileText, Loader2, Pencil, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { compareSuppliers } from '../lib/compare';
import { downloadBlob, safeFileName, toBackupWithCustom } from '../lib/db';
import { computeProject } from '../lib/engine';
import { MAT } from '../lib/materials';
import { fmt, fmtMoney } from '../lib/math';
import { buildReport, dimsText, houseTypeName, type Report } from '../lib/report';
import { useStore } from '../store';
import { Alert, Button, Card, H2 } from '../components/ui';
import { MaterialPhoto } from '../components/MaterialPhoto';
import type { MaterialId } from '../lib/types';
import { SupplierSummary } from './wizard/StepSuppliers';
import { BudgetStatus, Scenarios } from './wizard/StepBudget';

export default function Results() {
  const { current: p, setTab, setStep, toast, print, setView, customs } = useStore();
  const res = useMemo(() => (p ? computeProject(p) : null), [p]);
  const sup = useMemo(() => (p && res ? compareSuppliers(p, res) : null), [p, res]);
  const [busy, setBusy] = useState<'' | 'pdf' | 'xlsx'>('');

  if (!p || !res || !sup) {
    return (
      <div className="space-y-3">
        <H2>Нәтижелер</H2>
        <Alert>Әзірге ашық жоба жоқ. Жаңа жоба бастаңыз немесе сақталған жобаны ашыңыз.</Alert>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => { setStep(0); setView('steps'); }}>Жаңа жоба</Button>
          <Button variant="outline" onClick={() => setTab('projects')}>Жобаларым</Button>
        </div>
      </div>
    );
  }

  const run = async (kind: 'pdf' | 'xlsx') => {
    setBusy(kind);
    try {
      const ex = await import('../lib/exporters');
      const rep = buildReport(p, res);
      if (kind === 'pdf') await ex.exportPdf(rep, p.name); else await ex.exportExcel(rep, p.name);
      toast(kind === 'pdf' ? 'PDF файлы жүктелді' : 'Excel файлы жүктелді');
    } catch (e) {
      console.error(e);
      toast(kind === 'pdf' ? 'PDF экспорты орындалмады. Қайталап көріңіз.' : 'Excel экспорты орындалмады.', 'error');
    } finally { setBusy(''); }
  };

  const build = res.materials.filter(m => m.category === 'build');
  const finish = res.materials.filter(m => m.category === 'finish');

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <H2 sub={`${houseTypeName(p)} · ${p.floors.length} қабат`}>{p.name}</H2>
        <Button variant="outline" className="shrink-0" onClick={() => { setStep(1); setView('steps'); }}><Pencil size={16} />Өңдеу</Button>
      </div>

      {res.errors.length > 0 && <Alert kind="error"><b>Толтырылмаған немесе қате деректер:</b><ul className="mt-1 list-disc pl-5">{res.errors.map(e => <li key={e}>{e}</li>)}</ul></Alert>}

      <Card className="grid grid-cols-2 gap-3 text-sm">
        <Kv k="Жалпы аудан" v={`${fmt(res.totalArea)} м²`} />
        <Kv k="Сыртқы қабырғалар ауданы" v={`${fmt(res.extWallArea)} м²`} />
        <Kv k="Қабырға көлемі" v={`${fmt(res.extWallVolume)} м³`} />
        <Kv k="Бөлмелер" v={`${p.rooms.length} · ${fmt(res.roomsArea)} м²`} />
        <Kv k="Ішкі қабырғалар ауданы" v={`${fmt(res.rooms.reduce((a, r) => a + r.wallArea, 0))} м²`} />
        <Kv k="Қабат саны" v={`${p.floors.length}`} />
        <p className="col-span-2 text-xs text-slate-500">{dimsText(p)}. Қабырға ауданы ойықтарды шегермей есептелді.</p>
      </Card>

      <Card className="space-y-1.5">
        <Line k="Құрылыс материалдары" v={fmtMoney(res.buildT)} />
        <Line k="Әрлеу материалдары" v={fmtMoney(res.finishT)} />
        <Line k="Жеткізу шығыны" v={res.deliveryT ? fmtMoney(res.deliveryT) : 'енгізілмеген'} />
        <Line k="Жоспарланған бюджет" v={res.budgetT ? fmtMoney(res.budgetT) : 'енгізілмеген'} />
        {sup.baseline && <Line k="Материалдарды салыстыру арқылы үнем" v={fmtMoney(sup.baseline.savingT)} />}
        <div className="border-t border-slate-100 pt-1.5"><Line k="Жалпы құрылыс шығыны" v={fmtMoney(res.totalT)} /></div>
      </Card>
      <BudgetStatus r={res} />
      {res.materials.some(m => m.priceMissing) && <Alert kind="warn">Бағасы көрсетілмеген материалдар: {res.materials.filter(m => m.priceMissing).map(m => m.name).join(', ')}. Олар жалпы құнға кірмеді.</Alert>}
      {res.warnings.filter(w => !w.startsWith('Бюджет')).map(w => <Alert key={w} kind="warn">{w}</Alert>)}

      <section className="space-y-2">
        <h3 className="text-lg font-bold text-navy-800">Материалдар</h3>
        {!res.materials.length && !res.customs.length && <Alert>Материал таңдалмаған.</Alert>}
        <div className="hidden grid-cols-[1fr_7rem_6.5rem_7.5rem] gap-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:grid">
          <span>Материал</span><span className="text-right">Мөлшері</span><span className="text-right">Бірлік бағасы</span><span className="text-right">Жалпы құны</span>
        </div>
        {build.length > 0 && <p className="pt-1 text-sm font-semibold text-slate-500">Құрылыс материалдары</p>}
        {build.map(m => <MatLine key={m.id} m={m} />)}
        {finish.length > 0 && <p className="pt-1 text-sm font-semibold text-slate-500">Әрлеу материалдары</p>}
        {finish.map(m => <MatLine key={m.id} m={m} />)}
        {res.customs.length > 0 && <p className="pt-1 text-sm font-semibold text-slate-500">Жеке материалдар</p>}
        {res.customs.map(c => <MatLine key={c.lineId} m={{ ...c, id: undefined, counted: true, estimated: false }} photo={customs.find(x => p.customLines.find(l => l.id === c.lineId)?.customId === x.id)?.photo} />)}
      </section>

      {res.rooms.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-lg font-bold text-navy-800">Бөлмелер бойынша әрлеу</h3>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            {res.rooms.map((g, i) => (
              <div key={g.id} className={`px-3 py-2.5 ${i ? 'border-t border-slate-100' : ''}`}>
                <div className="flex items-baseline justify-between gap-2"><p className="font-semibold">{g.name}</p><p className="num font-bold">{g.error ? '—' : fmtMoney(g.finishT)}</p></div>
                <p className="num text-xs text-slate-500">{g.error ?? `Еден ${fmt(g.floorArea)} м² · қабырға ${fmt(g.wallArea)} м²`}{g.materials.length ? ` · ${g.materials.map(id => MAT[id].name).join(', ')}` : ''}</p>
                {g.notes.map(n => <p key={n} className="text-xs text-amber-700">{n}</p>)}
              </div>
            ))}
          </div>
        </section>
      )}

      {p.suppliers.length > 0 && <SupplierSummary cmp={sup} />}
      <Scenarios p={p} r={res} />

      <Card className="space-y-2">
        <h3 className="font-bold text-navy-800">Сақтау және экспорт</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => run('pdf')} disabled={!!busy}>{busy === 'pdf' ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}PDF</Button>
          <Button variant="green" onClick={() => run('xlsx')} disabled={!!busy}>{busy === 'xlsx' ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}Excel</Button>
          <Button variant="outline" onClick={() => print(buildReport(p, res))}><Printer size={18} />Басып шығару</Button>
          <Button variant="outline" onClick={async () => downloadBlob(new Blob([JSON.stringify(await toBackupWithCustom([p]), null, 2)], { type: 'application/json' }), `${safeFileName(p.name)}.json`)}><FileJson size={18} />JSON</Button>
        </div>
        <p className="text-xs text-slate-500">Жоба осы құрылғыда автоматты сақталады. JSON файлы — басқа құрылғыға көшіруге немесе резервтік көшірмеге.</p>
      </Card>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return <div><p className="text-xs text-slate-500">{k}</p><p className="num font-bold">{v}</p></div>;
}
function Line({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3 text-[15px]"><span className="text-slate-600">{k}</span><span className="num text-right font-semibold">{v}</span></div>;
}

type LineData = { id?: MaterialId; name: string; qty: number; unit: string; price: number; costT: number; counted: boolean; priceMissing: boolean; manual: boolean; estimated: boolean; error?: string; notes: string[] };

function MatLine({ m, photo }: { m: LineData; photo?: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 sm:grid sm:grid-cols-[1fr_7rem_6.5rem_7.5rem] sm:items-center sm:gap-2">
      <div className="flex min-w-0 items-center gap-3">
        <MaterialPhoto id={m.id} src={m.id ? undefined : photo} className="h-14 w-[75px] shrink-0" alt={m.name} />
        <div className="min-w-0">
          <p className="font-semibold leading-tight">{m.name}{m.manual && <Tag>қолмен</Tag>}{m.estimated && <Tag>болжамды есеп</Tag>}</p>
          {m.error ? <p className="text-xs text-red-600">{m.error}</p> : (
            <p className="num text-xs text-slate-500 sm:hidden">{fmt(m.qty)} {m.unit} × {m.price > 0 ? `${fmt(m.price)} ₸` : 'баға жоқ'}</p>
          )}
          {!m.counted && <p className="text-xs text-slate-500">Құны цемент пен құм арқылы есептеледі</p>}
        </div>
      </div>
      {!m.error && <>
        <p className="num hidden text-right text-[15px] sm:block">{fmt(m.qty)} <span className="text-slate-500">{m.unit}</span></p>
        <p className="num hidden text-right text-[15px] sm:block">{m.price > 0 ? `${fmt(m.price)} ₸` : '—'}</p>
        <p className="num ml-auto self-center text-right text-[15px] font-bold sm:ml-0">{!m.counted ? '—' : m.priceMissing ? <span className="text-sm font-semibold text-amber-700">баға жоқ</span> : fmtMoney(m.costT)}</p>
      </>}
    </div>
  );
}

function Tag({ children }: { children: string }) {
  return <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 align-middle text-[10px] font-semibold text-amber-800">{children}</span>;
}

/** Басып шығаруға арналған нұсқа (тек print кезінде көрінеді). */
export function PrintReport({ report }: { report: Report }) {
  return (
    <div className="text-[11px] leading-snug text-black">
      <h1 className="text-xl font-bold">SMART BUILD</h1>
      <p className="mb-2">Ақылды есептеу, тиімді құрылыс · {report.subtitle}</p>
      {report.blocks.map(b => (
        <section key={b.title} className="mb-3 break-inside-avoid-page">
          <h2 className="mb-1 border-b border-black text-[13px] font-bold">{b.title}</h2>
          {b.kv && <table className="w-full"><tbody>{b.kv.map(([k, v]) => <tr key={k}><td className="w-[38%] pr-2 align-top font-semibold">{k}</td><td>{v}</td></tr>)}</tbody></table>}
          {b.table && (
            <table className="w-full border-collapse">
              <thead><tr>{b.table.head.map(h => <th key={h} className="border border-slate-400 bg-slate-100 px-1 text-left">{h}</th>)}</tr></thead>
              <tbody>{b.table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="border border-slate-400 px-1">{c}</td>)}</tr>)}</tbody>
            </table>
          )}
          {b.lines?.map(l => <p key={l}>{l}</p>)}
          {b.steps?.map(g => (
            <div key={g.group} className="mt-1">
              <p className="font-bold">{g.group}</p>
              {g.items.map((s, i) => <p key={i} className="pl-2">{s.title}: {s.formula} → {s.subst} → <b>{s.result}</b></p>)}
            </div>
          ))}
        </section>
      ))}
      <p className="mt-4 italic">{report.disclaimer}</p>
    </div>
  );
}
