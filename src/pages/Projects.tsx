import { ClipboardList, Copy, Download, FileSpreadsheet, FileText, FolderOpen, Pencil, Plus, Printer, Scale, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { compareVariants } from '../lib/compare';
import * as db from '../lib/db';
import { computeProject } from '../lib/engine';
import { fmt, fmtMoney } from '../lib/math';
import { buildResearchReport, houseTypeName } from '../lib/report';
import { useStore } from '../store';
import { Alert, Button, Card, cx, H2, Select } from '../components/ui';

export default function Projects() {
  const { projects, open, reload, toast, current, close, setStep, setView, ask, reloadCustoms } = useStore();
  const [sel, setSel] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const totals = useMemo(() => Object.fromEntries(projects.map(p => [p.id, computeProject(p)])), [projects]);

  const onImport = async (f: File) => {
    try {
      const text = await f.text();
      const list = db.parseBackup(text);
      for (const c of db.parseCustomFromBackup(text)) await db.saveCustom(c);
      for (const p of list) await db.saveProject(p);
      await reload(); await reloadCustoms();
      toast(`${list.length} жоба импортталды`);
    } catch (e) { toast((e as Error).message || 'Импорт орындалмады', 'error'); }
  };

  if (comparing && sel.length >= 2) return <Compare ids={sel} onBack={() => setComparing(false)} />;

  return (
    <div className="space-y-4">
      <H2 sub="Жобалар осы құрылғының жадында (IndexedDB) сақталады.">Менің жобаларым</H2>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => { setStep(0); setView('steps'); }}><Plus size={18} />Жаңа жоба</Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload size={18} />JSON импорт</Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />
      </div>

      {!projects.length && <Alert>Сақталған жоба жоқ. «Жаңа жоба» батырмасын басыңыз.</Alert>}

      {projects.length >= 2 && (
        <Alert>Ғылыми зерттеу үшін: жобаның көшірмесін жасап («Нұсқа»), тек бағаларын не материалдарын өзгертіңіз. Содан кейін 2–3 жобаны белгілеп, «Салыстыру» батырмасын басыңыз.</Alert>
      )}

      <div className="space-y-3">
        {projects.map(p => {
          const r = totals[p.id];
          const checked = sel.includes(p.id);
          return (
            <Card key={p.id} className={cx('space-y-3', current?.id === p.id && 'border-navy-600')}>
              <div className="flex items-start gap-3">
                <input type="checkbox" aria-label="Салыстыруға белгілеу" checked={checked} className="mt-1 h-5 w-5 accent-green-600"
                  onChange={e => setSel(s => (e.target.checked ? [...s, p.id].slice(-3) : s.filter(x => x !== p.id)))} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">{p.name}</p>
                  <p className="text-sm text-slate-500">{houseTypeName(p)} · {p.floors.length} қабат · {fmt(r.totalArea)} м² · {p.rooms.length} бөлме</p>
                  <p className="num text-sm">Жалпы құн: <b>{fmtMoney(r.totalT)}</b>{r.incomplete && <span className="text-amber-700"> · толық емес</span>}</p>
                  <p className="text-xs text-slate-400">Өзгертілді: {new Date(p.updatedAt).toLocaleString('ru-RU')}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <Act icon={Pencil} label="Өңдеу" onClick={() => open(p, 'calc')} />
                <Act icon={ClipboardList} label="Нәтиже" onClick={() => open(p, 'results')} />
                <Act icon={Copy} label="Нұсқа" onClick={async () => { const c = db.duplicateProject(p); await db.saveProject(c); await reload(); toast('Көшірме жасалды'); }} />
                <Act icon={Trash2} label="Жою" danger onClick={async () => {
                  if (!(await ask(`«${p.name}» жобасы жойылсын ба? Бұл әрекетті қайтару мүмкін емес.`))) return;
                  await db.deleteProject(p.id); if (current?.id === p.id) close(); setSel(s => s.filter(x => x !== p.id)); await reload(); toast('Жоба жойылды');
                }} />
              </div>
            </Card>
          );
        })}
      </div>

      {projects.length > 0 && (
        <Button variant="ghost" className="w-full" onClick={async () => db.downloadBlob(new Blob([JSON.stringify(await db.toBackupWithCustom(projects), null, 2)], { type: 'application/json' }), `smart-build-jobalar-${new Date().toISOString().slice(0, 10)}.json`)}>
          <Download size={18} />Барлық жобаны JSON-ға экспорттау
        </Button>
      )}

      {sel.length > 0 && (
        <div className="sticky bottom-20 z-30">
          <Button variant="green" className="w-full shadow-lg" disabled={sel.length < 2} onClick={() => setComparing(true)}>
            <Scale size={18} />{sel.length < 2 ? 'Салыстыру үшін тағы бір жоба белгілеңіз' : `Салыстыру (${sel.length})`}
          </Button>
        </div>
      )}
    </div>
  );
}

function Act({ icon: I, label, onClick, danger }: { icon: typeof FolderOpen; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cx('flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold', danger ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700')}>
      <I size={18} />{label}
    </button>
  );
}

function Compare({ ids, onBack }: { ids: string[]; onBack: () => void }) {
  const { projects, toast, print } = useStore();
  const list = ids.map(id => projects.find(p => p.id === id)!).filter(Boolean);
  const [base, setBase] = useState(0);
  const results = useMemo(() => list.map(p => computeProject(p)), [list]);
  const v = useMemo(() => compareVariants(list, results, base), [list, results, base]);

  const exp = async (kind: 'pdf' | 'xlsx') => {
    try {
      const ex = await import('../lib/exporters');
      const rep = buildResearchReport(list, base);
      if (kind === 'pdf') await ex.exportPdf(rep, 'zertteu-natizhesi'); else await ex.exportExcel(rep, 'zertteu-natizhesi');
      toast('Зерттеу нәтижесі экспортталды');
    } catch { toast('Экспорт орындалмады', 'error'); }
  };

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={onBack}>← Жобаларға оралу</Button>
      <H2 sub="Ғылыми жобаға арналған зерттеу: нұсқалардың материал мөлшері, құны, үнемі және бюджетке сәйкестігі.">Нұсқаларды салыстыру</H2>
      {!v.sameDims && <Alert kind="warn">Нұсқалардың үй өлшемдері әртүрлі. Таза салыстыру үшін бір жобаның көшірмесін жасап, тек материалдар мен бағаларды өзгертіңіз.</Alert>}
      <Select label="Бастапқы нұсқа (үнем осыған қатысты есептеледі)" value={String(base)} onChange={x => setBase(Number(x))} options={list.map((p, i) => [String(i), p.name] as [string, string])} />

      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${list.length}, minmax(0,1fr))` }}>
        {list.map((p, i) => (
          <Card key={p.id} className={cx('p-3', i === base && 'border-navy-600')}>
            <p className="truncate text-sm font-bold">{p.name}</p>
            <p className="num text-base font-extrabold text-navy-800">{fmtMoney(v.totals[i])}</p>
            {i === base ? <p className="text-xs text-slate-500">бастапқы</p> : (
              <p className={cx('num text-xs font-semibold', v.savings[i].savingT >= 0 ? 'text-green-700' : 'text-red-700')}>
                {v.savings[i].savingT >= 0 ? 'Үнем ' : 'Артық '}{fmtMoney(Math.abs(v.savings[i].savingT))}{v.savings[i].pct !== null && ` (${fmt(Math.abs(v.savings[i].pct!))} %)`}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">{v.budget[i] === null ? 'бюджет жоқ' : v.budget[i]! >= 0 ? 'бюджетке сыяды' : 'бюджеттен асады'}</p>
            {v.incomplete[i] && <p className="text-xs text-amber-700">толық емес</p>}
          </Card>
        ))}
      </div>

      <Card className="space-y-1">
        <p className="font-semibold">Қорытынды</p>
        {v.summary.map(s => <p key={s} className="text-[15px]">{s}</p>)}
        <p className="pt-1 text-xs text-slate-500">Үнем пайызы бастапқы нұсқаның құнына қатысты көрсетілген.</p>
      </Card>

      <section className="space-y-2">
        <h3 className="font-bold text-navy-800">Материалдар бойынша</h3>
        {v.rows.map(r => (
          <Card key={r.id} className="p-3">
            <p className="mb-1 text-sm font-semibold">{r.name} <span className="font-normal text-slate-400">({r.unit})</span></p>
            <div className="grid gap-2 text-xs" style={{ gridTemplateColumns: `repeat(${list.length}, minmax(0,1fr))` }}>
              {list.map((p, i) => {
                const dq = r.qty[i] !== null && r.qty[base] !== null && i !== base ? r.qty[i]! - r.qty[base]! : null;
                return (
                  <div key={p.id} className="num">
                    <p className="truncate text-slate-400">{p.name}</p>
                    <p>{r.qty[i] === null ? '—' : fmt(r.qty[i]!)}{dq ? <span className={dq > 0 ? 'text-red-600' : 'text-green-700'}> ({dq > 0 ? '+' : ''}{fmt(dq)})</span> : null}</p>
                    <p className="font-semibold">{r.costT[i] === null ? '—' : fmtMoney(r.costT[i]!)}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </section>

      <Card className="space-y-2">
        <h3 className="font-bold text-navy-800">Зерттеу нәтижесін экспорттау</h3>
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => exp('pdf')}><FileText size={18} />PDF</Button>
          <Button variant="green" onClick={() => exp('xlsx')}><FileSpreadsheet size={18} />Excel</Button>
          <Button variant="outline" onClick={() => print(buildResearchReport(list, base))}><Printer size={18} /></Button>
        </div>
        <p className="text-xs text-slate-500">Экспортта параметрлер, салыстырылған нұсқалар мен нәтижелер болады.</p>
      </Card>
    </div>
  );
}
