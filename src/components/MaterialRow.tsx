// Макет панельдеріндегі материал жолы: сурет, атау, таңдау, өлшемдер, баға және дайын нәтиже.
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { MAT, MATERIAL_INFO } from '../lib/materials';
import { fmt, fmtMoney } from '../lib/math';
import type { MatResult } from '../lib/engine';
import type { MaterialId } from '../lib/types';
import { useStore } from '../store';
import { Help, Toggle, cx } from './ui';
import { MaterialPhoto } from './MaterialPhoto';
import { MaterialParams, MaterialResultBox } from './MaterialParams';

export function MaterialRow({ id, r, defaultOpen = false }: { id: MaterialId; r?: MatResult; defaultOpen?: boolean }) {
  const { current: p, update } = useStore();
  const [open, setOpen] = useState(defaultOpen);
  if (!p) return null;
  const s = p.materials[id];
  const unit = MAT[id].unitLabel(s);
  return (
    <div className="rounded-2xl border border-slate-200 p-2">
      <div className="flex items-center gap-2">
        <MaterialPhoto id={id} className={cx('h-12 w-16 shrink-0', !s.enabled && 'opacity-60')} />
        <div className="min-w-0 flex-1">
          <p className="flex items-start text-[15px] font-semibold leading-tight">{r?.name ?? MAT[id].name}<Help title={MAT[id].name} text={MATERIAL_INFO[id]} /></p>
          <p className="num text-xs text-slate-500">
            {!s.enabled ? 'есептеуге қосылмаған' : r?.error ? <span className="text-red-600">{r.error}</span> :
              r ? `${fmt(r.qty)} ${unit} · ${!r.counted ? 'құны қосылмайды' : r.priceMissing ? 'баға жоқ' : fmtMoney(r.costT)}` : ''}
          </p>
        </div>
        <Toggle label={<span className="sr-only">{MAT[id].name} — есептеуге қосу</span>} checked={s.enabled} onChange={v => update(d => { d.materials[id].enabled = v; })} />
      </div>
      {s.enabled && (
        <>
          <button type="button" onClick={() => setOpen(!open)} className="mt-1 flex min-h-[40px] w-full items-center justify-between rounded-xl px-2 text-sm font-semibold text-navy-800 hover:bg-slate-50">
            Өлшемдері мен бағасы<ChevronDown size={16} className={cx('transition', open && 'rotate-180')} />
          </button>
          {open && <div className="space-y-3 p-1 animate-fade"><MaterialParams id={id} compact /><MaterialResultBox r={r} unit={unit} /></div>}
        </>
      )}
    </div>
  );
}
