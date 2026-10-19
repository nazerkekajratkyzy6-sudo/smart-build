import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { computeProject, TARGET_NAMES, type CustomResult, type MatResult } from '../../lib/engine';
import { MATERIAL_INFO, MATERIALS, type MaterialDef } from '../../lib/materials';
import { fmt, fmtMoney } from '../../lib/math';
import type { CustomTarget, MaterialState, Project } from '../../lib/types';
import { useStore } from '../../store';
import { Alert, Button, Collapse, cx, H2, Help, NumField, Segmented, Select, Toggle } from '../../components/ui';
import { ImagePlus, Trash2 } from 'lucide-react';
import { MaterialPhoto } from '../../components/MaterialPhoto';
import { MaterialParams, MaterialResultBox, ShowOnModel } from '../../components/MaterialParams';

export default function StepMaterials() {
  const { current: p } = useStore();
  const res = useMemo(() => (p ? computeProject(p) : null), [p]);
  if (!p || !res) return null;
  const group = (cat: 'build' | 'finish') => MATERIALS.filter(m => m.category === cat);

  return (
    <div className="space-y-4">
      <H2 sub="Қажет материалдарды белгілеңіз — барлығын таңдау міндетті емес. Бағаны өзіңіз енгізесіз: қосымша ойдан баға қоймайды.">Материалдар және бағалар</H2>
      <Alert>Техникалық өлшемдердің бастапқы мәндері — үлгі ғана. Қаптамада жазылған нақты мәндерге сәйкес өзгертіңіз.</Alert>
      <section className="space-y-2">
        <h3 className="text-lg font-bold text-navy-800">Құрылыс материалдары</h3>
        {group('build').map(d => <MaterialCard key={d.id} def={d} p={p} r={res.materials.find(m => m.id === d.id)} />)}
      </section>
      <section className="space-y-2">
        <h3 className="text-lg font-bold text-navy-800">Әрлеу материалдары</h3>
        <p className="text-sm text-slate-500">Әрлеу материалдары «Бөлмелер» кезеңінде белгіленген бөлмелер бойынша есептеледі.</p>
        {group('finish').map(d => <MaterialCard key={d.id} def={d} p={p} r={res.materials.find(m => m.id === d.id)} />)}
      </section>
      <CustomLines p={p} results={res.customs} />
    </div>
  );
}

function MaterialCard({ def, p, r }: { def: MaterialDef; p: Project; r?: MatResult }) {
  const { update } = useStore();
  const [open, setOpen] = useState(false);
  const s = p.materials[def.id];
  const set = (fn: (m: MaterialState) => void) => update(d => fn(d.materials[def.id]));
  const unit = def.unitLabel(s);
  const summary = !s.enabled ? <span className="text-xs text-slate-400">таңдалмаған</span> :
    r?.error ? <span className="text-xs text-red-600">{r.error}</span> :
      r ? <span className="num text-xs text-slate-500">{fmt(r.qty)} {unit}{!r.counted ? ' · құны қосылмайды' : r.priceMissing ? ' · баға енгізілмеген' : ` · ${fmtMoney(r.costT)}`}{r.manual ? ' · қолмен' : ''}</span> : null;

  return (
    <div className={cx('rounded-2xl border transition', s.enabled ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50/60')}>
      <div className="flex items-center gap-3 p-2.5">
        <MaterialPhoto id={def.id} className={cx('h-14 w-[75px] shrink-0', !s.enabled && 'opacity-60')} />
        <div className="min-w-0 flex-1">
          <p className="flex items-start font-semibold leading-tight">{r?.name ?? def.name}<Help title={def.name} text={MATERIAL_INFO[def.id]} /></p>
          <p className="text-xs text-slate-400">Өлшем бірлігі: {unit}</p>
          {summary}
        </div>
        <Toggle label={<span className="sr-only">{def.name} таңдау</span>} checked={s.enabled} onChange={v => { set(m => { m.enabled = v; }); if (v) setOpen(true); }} />
      </div>
      {s.enabled && (
        <button type="button" onClick={() => setOpen(!open)} className="flex min-h-[44px] w-full items-center justify-between border-t border-slate-100 px-3 text-sm font-semibold text-navy-800 hover:bg-slate-50">
          {open ? 'Жасыру' : 'Өлшемдері, бағасы және нәтиже'}<ChevronDown size={16} className={cx('transition', open && 'rotate-180')} />
        </button>
      )}
      {s.enabled && open && (
        <div className="space-y-3 border-t border-slate-100 p-3">
          <ShowOnModel id={def.id} />
          <MaterialParams id={def.id} />
          <MaterialResultBox r={r} unit={unit} />
          <Collapse title={<span className="text-sm">Сценарий бағалары (үнемді / жоғары)</span>}>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Үнемді нұсқа" unit="₸" optional allowZero value={s.tiers.economy} onChange={v => set(m => { m.tiers.economy = v; })} placeholder="—" />
              <NumField label="Жоғары нұсқа" unit="₸" optional allowZero value={s.tiers.premium} onChange={v => set(m => { m.tiers.premium = v; })} placeholder="—" />
            </div>
            <p className="mt-2 text-xs text-slate-500">Бос қалса, сценарийде стандарт баға қолданылады.{def.structural && ' Бұл материал құрылымның беріктігіне әсер етеді — тек арзандығына қарап ауыстырмаңыз.'}</p>
          </Collapse>
          <p className="text-xs text-slate-500">{def.explain}</p>
          {r?.notes.map(n => <Alert key={n} kind={n.includes('бағасы көрсетілмеген') ? 'warn' : 'info'}>{n}</Alert>)}
        </div>
      )}
    </div>
  );
}

/* ---------- «Менің материалдарым»: Басқа санатындағы жеке материалдар ---------- */

function CustomLines({ p, results }: { p: Project; results: CustomResult[] }) {
  const { update, setView, customs } = useStore();
  return (
    <section className="space-y-2">
      <h3 className="text-lg font-bold text-navy-800">Жеке материалдар</h3>
      <p className="text-sm text-slate-500">Өзіңіз қосқан «Басқа» санатындағы материалдар. 15 материалдың біріне жататын өнімдер сол материалдың карточкасында есептеледі.</p>
      {!p.customLines.length && <Button variant="ghost" className="w-full" onClick={() => setView('catalog')}><ImagePlus size={18} />Каталогтан өз материалымды қосу</Button>}
      {p.customLines.map((l, i) => {
        const r = results.find(x => x.lineId === l.id);
        const photo = customs.find(c => c.id === l.customId)?.photo;
        const set = (fn: (x: typeof l) => void) => update(d => fn(d.customLines[i]));
        return (
          <div key={l.id} className="rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 px-3 py-2">
              {photo ? <img src={photo} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <span className="h-10 w-10 shrink-0 rounded-lg bg-slate-100" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{l.name}</p>
                <p className="num text-xs text-slate-500">{!l.enabled ? 'таңдалмаған' : r?.error ? <span className="text-red-600">{r.error}</span> : r ? `${fmt(r.qty)} ${r.unit} · ${r.priceMissing ? 'баға жоқ' : fmtMoney(r.costT)}` : ''}</p>
              </div>
              <Toggle label={<span className="sr-only">Таңдау</span>} checked={l.enabled} onChange={v => set(x => { x.enabled = v; })} />
            </div>
            {l.enabled && (
              <div className="space-y-3 border-t border-slate-100 p-3">
                <Segmented value={l.mode} onChange={v => set(x => { x.mode = v; })} options={[['auto', 'Аудан бойынша'], ['manual', 'Мөлшерді қолмен']]} />
                {l.mode === 'manual' ? <NumField label="Мөлшері" unit={l.unit} value={l.manualQty} onChange={v => set(x => { x.manualQty = v; })} /> : (
                  <>
                    <Select<CustomTarget> label="Қолданылатын бет" value={l.target} onChange={v => set(x => { x.target = v; })} options={Object.entries(TARGET_NAMES) as [CustomTarget, string][]} />
                    {l.target.startsWith('room') && p.rooms.length > 0 && (
                      <div className="rounded-xl bg-slate-50 p-2">
                        <p className="mb-1 text-xs text-slate-500">Бөлмелер (ешқайсысы белгіленбесе — барлығы)</p>
                        {p.rooms.map(rm => <Toggle key={rm.id} label={rm.name} checked={l.roomIds.includes(rm.id)} onChange={v => set(x => { x.roomIds = v ? [...x.roomIds, rm.id] : x.roomIds.filter(k => k !== rm.id); })} />)}
                      </div>
                    )}
                    {l.target === 'manual' && <NumField label="Аудан" unit="м²" value={l.manualArea} onChange={v => set(x => { x.manualArea = v; })} />}
                    <div className="grid grid-cols-2 gap-3">
                      <NumField label="1 м² бетке кететін мөлшер" unit={l.unit} value={l.norm} onChange={v => set(x => { x.norm = v; })} />
                      <NumField label="Қалдық қоры" unit="%" allowZero value={l.waste} onChange={v => set(x => { x.waste = v; })} />
                    </div>
                  </>
                )}
                <NumField label={`Бағасы (1 ${l.unit})`} unit="₸" optional allowZero value={l.price} onChange={v => set(x => { x.price = v; })} />
                {r && (r.error ? <Alert kind="error">{r.error}</Alert> : <div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-green-50 p-2.5"><p className="text-[11px] text-green-800">Қажетті мөлшер</p><p className="num text-lg font-extrabold text-green-900">{fmt(r.qty)} <span className="text-sm">{r.unit}</span></p></div><div className="rounded-xl bg-navy-50 p-2.5"><p className="text-[11px] text-navy-800">Құны</p><p className="num text-lg font-extrabold text-navy-900">{r.priceMissing ? 'баға жоқ' : fmtMoney(r.costT)}</p></div></div>)}
                {r?.notes.filter(n => !n.includes('бағасы')).map(n => <p key={n} className="text-xs text-slate-500">{n}</p>)}
                <Button variant="danger" className="w-full" onClick={() => update(d => { d.customLines.splice(i, 1); })}><Trash2 size={16} />Жобадан алып тастау</Button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
