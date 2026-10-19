import { ChevronDown, FilePlus2, FileSpreadsheet, FileText, Loader2, Plus, Printer, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as db from '../lib/db';
import { uid } from '../lib/defaults';
import { MAT, MATERIAL_INFO } from '../lib/materials';
import { fmt, fmtMoney } from '../lib/math';
import {
  computeQuick, emptyQuick, newQuickItem, QUICK_FIELDS, QUICK_MATERIALS, QUICK_TASKS, quickReport, quickTotal, quickUnit,
  SURFACE_NAMES, SURFACE_OF, type QuickCalc, type QuickItem, type QuickMaterial, type Surface,
} from '../lib/quick';
import type { MaterialId } from '../lib/types';
import { useStore } from '../store';
import { Alert, Button, Card, cx, H2, Help, NumField, Segmented, Select, TextField } from '../components/ui';
import { MaterialPhoto } from '../components/MaterialPhoto';

export default function QuickCalcPage() {
  const { toast, ask, print, customs } = useStore();
  const [calc, setCalc] = useState<QuickCalc | null>(null);
  const [saved, setSaved] = useState<QuickCalc[]>([]);
  const [busy, setBusy] = useState<'' | 'pdf' | 'xlsx'>('');
  const timer = useRef<number>();

  // Ашылғанда соңғы жылдам есепті жүктеу (жоқ болса — жаңасы)
  useEffect(() => {
    (async () => {
      let list: QuickCalc[] = [];
      try { list = await db.listQuick(); } catch { /* жеке режим */ }
      setSaved(list);
      setCalc(list[0] ?? emptyQuick(uid()));
    })();
  }, []);

  // Автоматты сақтау
  useEffect(() => {
    if (!calc || !calc.items.length) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      try { await db.saveQuick(calc); setSaved(await db.listQuick()); } catch { /* */ }
    }, 500);
    return () => window.clearTimeout(timer.current);
  }, [calc]);

  const total = useMemo(() => (calc ? quickTotal(calc) : null), [calc]);
  if (!calc || !total) return <p className="py-10 text-center text-slate-500">Жүктелуде…</p>;

  const set = (fn: (c: QuickCalc) => void) => setCalc(prev => { if (!prev) return prev; const n = structuredClone(prev); fn(n); n.updatedAt = Date.now(); return n; });
  const setItem = (id: string, fn: (i: QuickItem) => void) => set(c => { const i = c.items.find(x => x.id === id); if (i) fn(i); });
  const addItem = (m: QuickMaterial, s: Surface) => set(c => { c.items.push(newQuickItem(m, s, uid())); });
  const nameOf = (it: QuickItem) => {
    const base = MAT[it.material as MaterialId].name;
    const n = it.productName?.trim();
    return `${it.material === 'insulation' ? `${n || 'Теплород'} жылу оқшаулағыш материалы` : n ? `${base} (${n})` : base}${SURFACE_OF[it.material].length > 1 ? ` — ${SURFACE_NAMES[it.surface].toLowerCase()}` : ''}`;
  };
  const { length: a, width: b, height: h } = calc.room;
  const roomOk = a > 0 && b > 0;

  const run = async (kind: 'pdf' | 'xlsx') => {
    setBusy(kind);
    try {
      const ex = await import('../lib/exporters');
      const rep = quickReport(calc, nameOf);
      if (kind === 'pdf') await ex.exportPdf(rep, calc.name); else await ex.exportExcel(rep, calc.name);
      toast(kind === 'pdf' ? 'PDF файлы жүктелді' : 'Excel файлы жүктелді');
    } catch { toast('Экспорт орындалмады', 'error'); } finally { setBusy(''); }
  };

  return (
    <div className="space-y-4">
      <H2 sub="Үй салмай-ақ: бір бөлмеде тұсқағазды, линолеумды ауыстыру, бояу сияқты жұмыстарға қажетті материал мен құнды бірден есептейді.">Жылдам есеп</H2>

      <div className="flex gap-2">
        {saved.length > 0 && (
          <div className="min-w-0 flex-1">
            <Select label="Сақталған есептер" value={calc.id} onChange={id => { const q = saved.find(x => x.id === id); if (q) setCalc(q); }}
              options={[...(saved.some(x => x.id === calc.id) ? [] : [[calc.id, `${calc.name} (жаңа)`] as [string, string]]), ...saved.map(q => [q.id, `${q.name} · ${new Date(q.updatedAt).toLocaleDateString('ru-RU')}`] as [string, string])]} />
          </div>
        )}
        <Button variant="outline" className={cx('shrink-0', saved.length > 0 && 'mt-6')} onClick={() => setCalc(emptyQuick(uid()))}><FilePlus2 size={18} />Жаңа есеп</Button>
      </div>

      <Card className="space-y-3">
        <TextField label="Есептің атауы" value={calc.name} onChange={v => set(c => { c.name = v; })} placeholder="Мысалы: Жатын бөлменің жөндеуі" />
        <p className="text-sm font-semibold text-slate-700">Бөлменің өлшемдері</p>
        <div className="grid grid-cols-3 gap-2">
          <NumField label="Ұзындығы" unit="м" value={a} onChange={v => set(c => { c.room.length = v; })} />
          <NumField label="Ені" unit="м" value={b} onChange={v => set(c => { c.room.width = v; })} />
          <NumField label="Биіктігі" unit="м" value={h} onChange={v => set(c => { c.room.height = v; })} />
        </div>
        {roomOk && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat l="Еден ауданы" v={`${fmt(a * b)} м²`} />
            <Stat l="Қабырғалар ауданы" v={h > 0 ? `${fmt(2 * (a + b) * h)} м²` : '—'} />
            <Stat l="Периметрі" v={`${fmt(2 * (a + b))} м`} />
          </div>
        )}
        <p className="text-xs text-slate-500">Қабырғалар ауданы есік пен терезе ойықтарын шегермей есептеледі. Нақты ауданды білсеңіз, материал карточкасында «Ауданды өзім жазамын» тармағын таңдаңыз.</p>
      </Card>

      <section className="space-y-2">
        <h3 className="text-lg font-bold text-navy-800">Қандай жұмыс жасайсыз?</h3>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_TASKS.map(t => (
            <button key={t.id} type="button" onClick={() => { set(c => { t.items.forEach(x => { if (!c.items.some(i => i.material === x.material && i.surface === x.surface)) c.items.push(newQuickItem(x.material, x.surface, uid())); }); }); toast(`«${t.title}» қосылды`); }}
              className="flex min-h-[64px] items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 text-left transition hover:border-green-500 active:scale-[.98]">
              <MaterialPhoto id={t.items[0].material as MaterialId} className="h-11 w-14 shrink-0" />
              <span className="min-w-0"><span className="block text-sm font-semibold leading-tight">{t.title}</span><span className="block text-xs text-slate-500">{t.desc}</span></span>
            </button>
          ))}
        </div>
        <AddMaterial onAdd={addItem} />
      </section>

      {!calc.items.length && <Alert>Жоғарыдан жұмыс түрін немесе материалды таңдаңыз — есеп бірден шығады.</Alert>}

      <section className="space-y-3">
        {calc.items.map(it => (
          <ItemCard key={it.id} calc={calc} it={it} name={nameOf(it)} customs={customs.filter(c => c.category === it.material)}
            onChange={fn => setItem(it.id, fn)}
            onRemove={async () => { if (await ask(`«${nameOf(it)}» есептен алынсын ба?`)) set(c => { c.items = c.items.filter(x => x.id !== it.id); }); }} />
        ))}
      </section>

      {calc.items.length > 0 && (
        <Card className="space-y-3">
          <h3 className="text-lg font-bold text-navy-800">Жалпы шығын</h3>
          <div className="space-y-1.5">
            {calc.items.map(it => { const r = computeQuick(calc, it); return (
              <div key={it.id} className="flex justify-between gap-3 text-[15px]"><span className="min-w-0 text-slate-600">{nameOf(it)}{!r.error && <span className="num text-slate-400"> · {fmt(r.qty)} {r.unit}</span>}</span><span className="num shrink-0 font-semibold">{r.error ? '—' : r.priceMissing ? <span className="text-amber-700">баға жоқ</span> : fmtMoney(r.costT)}</span></div>
            ); })}
          </div>
          <NumField label="Жеткізу шығыны (міндетті емес)" unit="₸" optional allowZero value={calc.delivery ?? 0} onChange={v => set(c => { c.delivery = v; })} placeholder="0" />
          <div className="flex items-baseline justify-between border-t border-slate-100 pt-2">
            <span className="text-slate-600">Барлығы</span><span className="num text-2xl font-extrabold text-navy-800">{fmtMoney(total.totalT)}</span>
          </div>
          {total.missing > 0 && <Alert kind="warn">{total.missing} материалдың бағасы енгізілмеген — олар жалпы құнға кірмеді.</Alert>}
          {total.errors > 0 && <Alert kind="error">{total.errors} материалда мәлімет жетіспейді — карточкадағы қызыл жазуды қараңыз.</Alert>}
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={() => run('pdf')} disabled={!!busy}>{busy === 'pdf' ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}PDF</Button>
            <Button variant="green" onClick={() => run('xlsx')} disabled={!!busy}>{busy === 'xlsx' ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}Excel</Button>
            <Button variant="outline" onClick={() => print(quickReport(calc, nameOf))}><Printer size={18} /></Button>
          </div>
          <p className="text-xs text-slate-500">Есеп осы құрылғыда автоматты сақталады.</p>
          {saved.some(x => x.id === calc.id) && (
            <Button variant="danger" className="w-full" onClick={async () => {
              if (!(await ask(`«${calc.name}» есебі жойылсын ба?`))) return;
              await db.deleteQuick(calc.id); const list = await db.listQuick(); setSaved(list); setCalc(list[0] ?? emptyQuick(uid())); toast('Есеп жойылды');
            }}><Trash2 size={16} />Бұл есепті жою</Button>
          )}
        </Card>
      )}
    </div>
  );
}

function Stat({ l, v }: { l: string; v: string }) {
  return <div className="rounded-xl bg-green-50 p-2"><p className="text-[11px] text-green-800">{l}</p><p className="num font-bold text-green-900">{v}</p></div>;
}

function AddMaterial({ onAdd }: { onAdd: (m: QuickMaterial, s: Surface) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200">
      <button type="button" onClick={() => setOpen(!open)} className="flex min-h-[48px] w-full items-center justify-between px-3 font-semibold text-navy-800">
        <span className="flex items-center gap-2"><Plus size={18} />Жеке материал қосу</span><ChevronDown size={18} className={cx('transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="grid grid-cols-1 gap-2 border-t border-slate-100 p-2 animate-fade sm:grid-cols-2">
          {QUICK_MATERIALS.flatMap(m => SURFACE_OF[m].map(s => (
            <button key={m + s} type="button" onClick={() => onAdd(m, s)} className="flex items-center gap-2 rounded-xl p-1.5 text-left hover:bg-slate-50">
              <MaterialPhoto id={m as MaterialId} className="h-10 w-12 shrink-0" />
              <span className="min-w-0 text-sm"><span className="block font-semibold leading-tight">{MAT[m as MaterialId].name}</span><span className="text-xs text-slate-500">{SURFACE_NAMES[s]}</span></span>
            </button>
          )))}
        </div>
      )}
    </div>
  );
}

function ItemCard({ calc, it, name, customs, onChange, onRemove }: {
  calc: QuickCalc; it: QuickItem; name: string; customs: { id: string; name: string; price: number; photo: string }[];
  onChange: (fn: (i: QuickItem) => void) => void; onRemove: () => void;
}) {
  const [more, setMore] = useState(it.material === 'tile');
  const r = computeQuick(calc, it);
  const unit = quickUnit(it);
  const surfaces = SURFACE_OF[it.material];
  const fields = QUICK_FIELDS[it.material];
  const product = customs.find(c => c.name === it.productName);
  return (
    <Card className="space-y-3 p-3">
      <div className="flex items-start gap-3">
        <MaterialPhoto id={product ? undefined : (it.material as MaterialId)} src={product?.photo} className="h-16 w-[85px] shrink-0" alt={name} />
        <div className="min-w-0 flex-1">
          <p className="flex items-start font-bold leading-tight">{name}<Help title={MAT[it.material as MaterialId].name} text={MATERIAL_INFO[it.material as MaterialId]} /></p>
          <p className="num text-xs text-slate-500">{r.base.label}: {r.error && r.base.value.startsWith('0') ? '—' : r.base.value}</p>
        </div>
        <button type="button" aria-label="Есептен алу" onClick={onRemove} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={18} /></button>
      </div>

      {surfaces.length > 1 && <Segmented value={it.surface} onChange={v => onChange(i => { i.surface = v; })} options={surfaces.map(s => [s, SURFACE_NAMES[s]] as [Surface, string])} />}
      <Segmented value={it.useRoom ? 'room' : 'manual'} onChange={v => onChange(i => { i.useRoom = v === 'room'; })}
        options={[['room', 'Бөлме өлшемінен'], ['manual', it.surface === 'perimeter' ? 'Ұзындықты өзім жазамын' : 'Ауданды өзім жазамын']]} />
      {!it.useRoom && <NumField label={it.surface === 'perimeter' ? 'Ұзындығы' : 'Ауданы'} unit={it.surface === 'perimeter' ? 'м' : 'м²'} value={it.manualArea} onChange={v => onChange(i => { i.manualArea = v; })} />}

      {customs.length > 0 && (
        <Select label="Менің материалдарымнан" value={it.productName ?? ''} onChange={v => onChange(i => { const c = customs.find(x => x.name === v); i.productName = v || undefined; if (c && c.price > 0) i.price = c.price; })}
          options={[['', 'Таңдалмаған'], ...customs.map(c => [c.name, c.name] as [string, string])]} />
      )}

      <div className="grid grid-cols-2 gap-3">
        <NumField label={`Бағасы (1 ${unit})`} unit="₸" optional allowZero value={it.price} onChange={v => onChange(i => { i.price = v; })} placeholder="Енгізіңіз" />
        <NumField label="Қалдық қоры" unit="%" allowZero value={it.waste} onChange={v => onChange(i => { i.waste = v; })} help="Кесу мен ысырапқа қосылатын қосымша мөлшер." />
      </div>

      <button type="button" onClick={() => setMore(!more)} className="flex min-h-[40px] w-full items-center justify-between rounded-xl px-1 text-sm font-semibold text-navy-800">
        Материалдың өлшемдері (қаптамадан)<ChevronDown size={16} className={cx('transition', more && 'rotate-180')} />
      </button>
      {it.material === 'tile' && (
        <Segmented value={String(it.p.unit ?? 'm2') as 'm2' | 'piece' | 'box'} onChange={v => onChange(i => { i.p.unit = v; })} options={[['m2', 'м²-мен сатып алу'], ['piece', 'Данамен'], ['box', 'Қораппен']]} />
      )}
      {more && (
        <div className="grid grid-cols-2 gap-3 animate-fade">
          {it.material === 'insulation' && <div className="col-span-2"><TextField label="Өнім атауы" value={it.productName ?? ''} onChange={v => onChange(i => { i.productName = v; })} placeholder="Теплород" /></div>}
          {fields.filter(f => !(it.material === 'tile' && f.key === 'perBox' && it.p.unit !== 'box')).map(f => <NumField key={f.key} label={f.label} unit={f.unit} help={f.help} allowZero={f.zero} value={Number(it.p[f.key])} onChange={v => onChange(i => { i.p[f.key] = v; })} />)}
        </div>
      )}

      {r.error ? <Alert kind="error">{r.error}</Alert> : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-green-50 p-2.5"><p className="text-[11px] text-green-800">Қажетті мөлшер</p><p className="num text-xl font-extrabold text-green-900">{fmt(r.qty)} <span className="text-sm font-semibold">{r.unit}</span></p></div>
            <div className="rounded-xl bg-navy-50 p-2.5"><p className="text-[11px] text-navy-800">Құны</p><p className="num text-xl font-extrabold text-navy-900">{r.priceMissing ? <span className="text-base text-amber-700">бағаны енгізіңіз</span> : fmtMoney(r.costT)}</p></div>
          </div>
          {r.extra.length > 0 && (
            <ul className="space-y-0.5 text-xs text-slate-500">{r.extra.map(([k, v]) => <li key={k} className="flex justify-between gap-2"><span>{k}</span><span className="num text-right text-slate-700">{v}</span></li>)}</ul>
          )}
        </>
      )}
    </Card>
  );
}

