// Материалдың енгізу өрістері: режим, техникалық өлшемдер, қор, баға. Формулалар көрсетілмейді.
import { Box } from 'lucide-react';
import { BRICK_TYPES, fieldVisible, MAT } from '../lib/materials';
import { fmt, fmtMoney } from '../lib/math';
import type { MatResult } from '../lib/engine';
import type { MaterialId, MaterialState } from '../lib/types';
import { MATERIAL_ON_MODEL, MATERIAL_PLACE } from '../lib/visual';
import { useStore } from '../store';
import { Alert, Button, NumField, Segmented, Select, TextField, Toggle } from './ui';

const ZERO_OK = ['repeat', 'extraAmount', 'extraNorm', 'trim', 'margin'];

export function MaterialParams({ id, compact = false }: { id: MaterialId; compact?: boolean }) {
  const { current: p, update } = useStore();
  if (!p) return null;
  const def = MAT[id], s = p.materials[id];
  const set = (fn: (m: MaterialState) => void) => update(d => fn(d.materials[id]));
  const unit = def.unitLabel(s);
  const fields = def.fields.filter(f => fieldVisible(f.key, s, p.concreteSource) && !(compact && f.kind === 'select' && f.key === 'extraLabel'));
  return (
    <div className="space-y-3">
      <Segmented value={s.mode} onChange={v => set(m => { m.mode = v; })} options={[['auto', 'Автоматты есептеу'], ['manual', 'Мөлшерді қолмен']]} />
      {s.mode === 'manual' && <NumField label="Мөлшері" unit={unit} value={s.manualQty} onChange={v => set(m => { m.manualQty = v; })} />}
      {id === 'insulation' && <TextField label="Жылу оқшаулағыштың өнім атауы" value={s.displayName ?? ''} onChange={v => set(m => { m.displayName = v; })} placeholder="Теплород" />}
      {s.mode === 'auto' && fields.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {fields.map(f => (
            <div key={f.key} className={f.kind !== 'number' ? 'col-span-2' : ''}>
              {f.kind === 'number' && <NumField label={f.label} unit={f.unit} help={f.help} allowZero={ZERO_OK.includes(f.key)} value={Number(s.p[f.key])} onChange={v => set(m => { m.p[f.key] = v; })} />}
              {f.kind === 'select' && <Select label={f.label} help={f.help} value={String(s.p[f.key])} options={f.options} onChange={v => set(m => { m.p[f.key] = v; if (id === 'brick' && f.key === 'type') { Object.assign(m.p, BRICK_TYPES[v as 'red' | 'gasblock']); m.p.unit = 'piece'; } })} />}
              {f.kind === 'bool' && <Toggle label={f.label} checked={!!s.p[f.key]} onChange={v => set(m => { m.p[f.key] = v; })} />}
            </div>
          ))}
        </div>
      )}
      {s.mode === 'auto' && (id === 'concrete' || id === 'roof') && (
        <p className="text-sm text-slate-500">Өлшемдері «Үй параметрлері» кезеңінде енгізіледі ({id === 'concrete' ? 'іргетас, қабат аралық жабын' : 'шатыр түрі, еңісі, шығыңқы бөлігі'}).</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <NumField label="Қалдық қоры" unit="%" allowZero value={s.waste} onChange={v => set(m => { m.waste = v; })}
          help="Кесу, сыну және ысырап үшін қосылатын қосымша мөлшер. Мысалы, 5 % деп жазсаңыз, есептелген мөлшерге тағы 5 % қосылады." />
        <NumField label={`Бағасы (1 ${unit})`} unit="₸" optional allowZero value={s.price} onChange={v => set(m => { m.price = v; })} placeholder="Енгізіңіз"
          help="Дүкендегі немесе жеткізушідегі нақты бағаны жазыңыз. Қосымша ойдан баға қоймайды." />
      </div>
    </div>
  );
}

/** Есептеу нәтижесі: тек сандар мен атаулар. */
export function MaterialResultBox({ r, unit }: { r?: MatResult; unit: string }) {
  if (!r) return null;
  if (r.error) return <Alert kind="error">{r.error}</Alert>;
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-xl bg-green-50 p-2.5"><p className="text-[11px] text-green-800">Қажетті мөлшер{r.manual ? ' (қолмен)' : ''}</p><p className="num text-lg font-extrabold text-green-900">{fmt(r.qty)} <span className="text-sm font-semibold">{unit}</span></p></div>
      <div className="rounded-xl bg-navy-50 p-2.5"><p className="text-[11px] text-navy-800">Құны</p><p className="num text-lg font-extrabold text-navy-900">{!r.counted ? 'қосылмайды' : r.priceMissing ? 'баға жоқ' : fmtMoney(r.costT)}</p></div>
    </div>
  );
}

export function ShowOnModel({ id }: { id: MaterialId }) {
  const { showOnModel } = useStore();
  const m = MATERIAL_ON_MODEL[id];
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
      <p className="min-w-0 text-sm text-slate-600"><b className="text-slate-700">Қолданылатын орны:</b> {MATERIAL_PLACE[id]}</p>
      <Button variant="outline" className="min-h-[40px] shrink-0 px-3 text-sm" onClick={() => showOnModel(m.part, m.view)}><Box size={16} />Макетте</Button>
    </div>
  );
}
