import { Plus, Trash2, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { compareSuppliers, type SupplierComparison } from '../../lib/compare';
import { computeProject } from '../../lib/engine';
import { uid } from '../../lib/defaults';
import { fmt, fmtMoney } from '../../lib/math';
import type { MaterialId } from '../../lib/types';
import { useStore } from '../../store';
import { Alert, Button, Card, Collapse, H2, NumField, TextField } from '../../components/ui';

export default function StepSuppliers() {
  const { current: p, update, toast } = useStore();
  const res = useMemo(() => (p ? computeProject(p) : null), [p]);
  const cmp = useMemo(() => (p && res ? compareSuppliers(p, res) : null), [p, res]);
  if (!p || !res || !cmp) return null;
  const mats = res.materials.filter(m => m.counted && !m.error && m.qty > 0);

  const offer = (sid: string, mid: MaterialId) => p.offers.find(o => o.supplierId === sid && o.materialId === mid);
  const setOffer = (sid: string, mid: MaterialId, key: 'price' | 'minOrder', v: number) => update(d => {
    let o = d.offers.find(x => x.supplierId === sid && x.materialId === mid);
    if (!o) { o = { supplierId: sid, materialId: mid, price: 0, minOrder: 0 }; d.offers.push(o); }
    o[key] = v;
  });

  return (
    <div className="space-y-4">
      <H2 sub="Міндетті емес кезең. Әр материалға бірнеше жеткізушінің ұсынысын енгізіп, жеткізу мен ең аз тапсырысты ескерген жалпы құнды салыстырыңыз.">Жеткізушілерді салыстыру</H2>

      <Card className="space-y-3">
        <h3 className="font-bold text-navy-800">Жеткізушілер</h3>
        {!p.suppliers.length && <p className="text-sm text-slate-500">Әзірге жеткізуші жоқ. Кемінде екеуін қосыңыз.</p>}
        {p.suppliers.map((s, i) => (
          <div key={s.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <TextField label={`${i + 1}. Атауы`} value={s.name} onChange={v => update(d => { d.suppliers[i].name = v; })} />
            <NumField label="Жеткізу құны" unit="₸" optional allowZero value={s.delivery} onChange={v => update(d => { d.suppliers[i].delivery = v; })}
              help="Осы жеткізушіден тапсырыс бергенде бір рет төленетін жеткізу ақысы." />
            <button type="button" aria-label="Жеткізушіні жою" className="mb-1 rounded-lg p-3 text-red-600 hover:bg-red-50"
              onClick={() => update(d => { d.suppliers = d.suppliers.filter(x => x.id !== s.id); d.offers = d.offers.filter(o => o.supplierId !== s.id); })}><Trash2 size={18} /></button>
          </div>
        ))}
        <Button variant="ghost" className="w-full" disabled={p.suppliers.length >= 8}
          onClick={() => update(d => { d.suppliers.push({ id: uid(), name: `Жеткізуші ${String.fromCharCode(65 + d.suppliers.length)}`, delivery: 0 }); })}>
          <Plus size={18} />Жеткізуші қосу
        </Button>
      </Card>

      {p.suppliers.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-lg font-bold text-navy-800">Ұсыныстар</h3>
          {!mats.length && <Alert kind="warn">Мөлшері есептелген материал жоқ. Алдымен материалдарды таңдаңыз.</Alert>}
          {mats.map(m => {
            const mo = cmp.materials.find(x => x.id === m.id);
            return (
              <Collapse key={m.id}
                title={<span><span className="block">{m.name}</span><span className="num text-xs font-normal text-slate-500">Қажет: {fmt(m.qty)} {m.unit}{mo?.best ? ` · ең арзаны: ${mo.best.supplierName}` : ' · ұсыныс жоқ'}</span></span>}>
                <div className="space-y-3">
                  {p.suppliers.map(s => {
                    const o = offer(s.id, m.id);
                    const line = mo?.lines.find(l => l.supplierId === s.id);
                    return (
                      <div key={s.id} className="rounded-xl bg-slate-50 p-3">
                        <p className="mb-2 text-sm font-semibold">{s.name || 'Атаусыз'}{mo?.best?.supplierId === s.id && <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">ең тиімді</span>}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <NumField label={`Бағасы (1 ${m.unit})`} unit="₸" optional allowZero value={o?.price ?? 0} onChange={v => setOffer(s.id, m.id, 'price', v)} placeholder="—" />
                          <NumField label="Ең аз тапсырыс" unit={m.unit} optional allowZero value={o?.minOrder ?? 0} onChange={v => setOffer(s.id, m.id, 'minOrder', v)} placeholder="жоқ" />
                        </div>
                        {line && <p className="num mt-2 text-sm text-slate-600">{fmt(line.buyQty)} × {fmt(line.price)} ₸ = <b>{fmtMoney(line.costT)}</b>{line.raisedToMin && ' (ең аз тапсырысқа дейін көбейтілді)'}</p>}
                      </div>
                    );
                  })}
                </div>
              </Collapse>
            );
          })}
        </section>
      )}

      <SupplierSummary cmp={cmp} onApply={cmp.best ? () => {
        const best = cmp.best!;
        update(d => {
          for (const m of cmp.materials) {
            const sid = best.picks[m.id];
            const line = m.lines.find(l => l.supplierId === sid);
            if (line) d.materials[m.id].price = line.price;
          }
          d.costs.delivery = best.deliveryT / 100;
        });
        toast('Тиімді нұсқаның бағалары негізгі баға ретінде қойылды');
      } : undefined} />
    </div>
  );
}

export function SupplierSummary({ cmp, onApply }: { cmp: SupplierComparison; onApply?: () => void }) {
  if (!cmp.materials.length) return <Alert>Салыстыру үшін кемінде бір материалға жеткізуші бағасын енгізіңіз.</Alert>;
  const name = (o: NonNullable<SupplierComparison['best']>) => o.label;
  return (
    <Card className="space-y-3">
      <h3 className="flex items-center gap-2 font-bold text-navy-800"><Trophy size={20} className="text-green-600" />Салыстыру нәтижесі</h3>
      <div className="space-y-2">
        {cmp.options.map(o => (
          <div key={o.label} className={`rounded-xl border p-3 ${cmp.best === o ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}>
            <p className="text-sm font-semibold">{o.label}</p>
            <p className="num text-sm text-slate-600">Материалдар {fmtMoney(o.materialsT)} + жеткізу {fmtMoney(o.deliveryT)} = <b className="text-slate-900">{fmtMoney(o.totalT)}</b></p>
          </div>
        ))}
      </div>
      {cmp.best && (
        <ul className="space-y-1 text-[15px]">
          <li>Ең тиімді нұсқа: <b>{name(cmp.best)}</b></li>
          <li>Ең төменгі жалпы құн: <b className="num">{fmtMoney(cmp.best.totalT)}</b></li>
          <li>Ең қымбат нұсқамен айырмашылық: <b className="num">{fmtMoney(cmp.diffWorstT)}</b></li>
          {cmp.baseline && (
            <li>Бастапқы таңдалған нұсқамен салыстырғандағы үнем: <b className={`num ${cmp.baseline.savingT >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmtMoney(cmp.baseline.savingT)}{cmp.baseline.pct !== null && ` (${fmt(cmp.baseline.pct)} %)`}</b>
              <span className="block text-xs text-slate-500">{cmp.baseline.note}</span></li>
          )}
        </ul>
      )}
      {cmp.baselineMissing.length > 0 && <Alert kind="warn">Бастапқы бағасы енгізілмеген материалдар бар ({cmp.baselineMissing.join(', ')}) — жалған үнем көрсетпеу үшін бастапқы нұсқамен салыстыру жасалмады.</Alert>}
      {cmp.skipped.length > 0 && <Alert>Ұсынысы жоқ материалдар салыстыруға кірмеді: {cmp.skipped.join(', ')}.</Alert>}
      {onApply && <Button variant="outline" className="w-full" onClick={onApply}>Тиімді нұсқаның бағаларын негізгі баға ретінде қолдану</Button>}
    </Card>
  );
}
