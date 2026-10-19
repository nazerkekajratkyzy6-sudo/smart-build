import { Plus, Trash2 } from 'lucide-react';
import { floorGeometry } from '../../lib/engine';
import { newFloor, uid } from '../../lib/defaults';
import { fmt } from '../../lib/math';
import type { FoundationType, RoofType, ShapeMode } from '../../lib/types';
import { useStore } from '../../store';
import { Alert, Button, Card, H2, NumField, Segmented, Select, TextField, Toggle } from '../../components/ui';
import { Facade, Plan } from '../../components/HousePlans';
import { useState } from 'react';
import { Box } from 'lucide-react';

export default function StepHouse() {
  const { current: p, update, ask, setView } = useStore();
  const [pv, setPv] = useState<'plan' | 'facade'>('plan');
  const [pf, setPf] = useState(0);
  if (!p) return null;
  const geos = p.floors.map(f => floorGeometry(f, p.wallThickness));
  const total = geos.reduce((s, g) => s + (g.error ? 0 : g.area), 0);

  return (
    <div className="space-y-4">
      <H2 sub="Барлық өлшемдер метрмен енгізіледі. Үтір мен нүкте қабылданады.">Үй параметрлері</H2>

      <Card className="space-y-3">
        <TextField label="Жобаның атауы" value={p.name} onChange={v => update(d => { d.name = v; })} />
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Қабырға қалыңдығы" unit="м" value={p.wallThickness} onChange={v => update(d => { d.wallThickness = v; })}
            help="Қабырға қалыңдығы — қабырғаның ішкі және сыртқы беттерінің арасындағы қашықтық. Метрмен енгізіледі. Мысалы, 1,5 кірпіш қалау ≈ 0,38 м." />
          <NumField label="Бөлмелер саны" value={p.roomsPlanned} integer onChange={v => update(d => { d.roomsPlanned = v; })}
            help="Жоспарланған бөлмелер саны. Әр бөлменің өлшемін келесі кезеңде жеке енгізесіз." />
        </div>
        <p className="text-sm text-slate-500">Қабат саны: <b>{p.floors.length}</b> · Жалпы аудан: <b className="num">{fmt(total)} м²</b> · Сыртқы қабырғалар ауданы: <b className="num">{fmt(geos.reduce((a, g) => a + (g.error ? 0 : g.extWallArea), 0))} м²</b></p>
      </Card>

      <Card className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-navy-800">Үйдің көрінісі</h3>
          <Button variant="outline" className="min-h-[40px] px-3 text-sm" onClick={() => setView('house')}><Box size={16} />3D макет</Button>
        </div>
        <Segmented value={pv} onChange={setPv} options={[['plan', '2D қабат жоспары'], ['facade', 'Сыртқы көрінісі']]} />
        {pv === 'plan' && p.floors.length > 1 && <Segmented value={String(Math.min(pf, p.floors.length - 1))} onChange={v => setPf(Number(v))} options={p.floors.map((f, i) => [String(i), f.name] as [string, string])} />}
        <div className="h-64 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">{pv === 'plan' ? <Plan p={p} fi={Math.min(pf, p.floors.length - 1)} /> : <Facade p={p} />}</div>
        <p className="text-xs text-slate-500">Өлшемдерді өзгерткенде сызба бірден жаңарады.</p>
      </Card>

      {p.floors.map((f, i) => {
        const g = geos[i];
        const set = (fn: (fl: typeof f) => void) => update(d => { const fl = d.floors.find(x => x.id === f.id); if (fl) fn(fl); });
        return (
          <Card key={f.id} className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-navy-800">{f.name}</h3>
              {p.floors.length > 1 && (
                <button type="button" aria-label="Қабатты жою" className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  onClick={async () => { if (await ask(`${f.name} және оның бөлмелері жойылсын ба?`)) update(d => { d.floors = d.floors.filter(x => x.id !== f.id); d.rooms = d.rooms.filter(r => r.floorId !== f.id); d.floors.forEach((x, k) => { x.name = `${k + 1}-қабат`; }); }); }}>
                  <Trash2 size={18} />
                </button>
              )}
            </div>
            <Segmented<ShapeMode> value={f.shape} onChange={v => set(fl => { fl.shape = v; if (v === 'sections' && !fl.sections.length) fl.sections = [{ id: uid(), x: 0, y: 0, length: fl.length || 10, width: fl.width || 8 }]; })}
              options={[['rect', 'Тік төртбұрыш'], ['sections', 'Бөліктерден'], ['manual', 'Қолмен']]} />

            {f.shape === 'rect' && (
              <div className="grid grid-cols-2 gap-3">
                <NumField label="Ұзындығы" unit="м" value={f.length} onChange={v => set(fl => { fl.length = v; })} />
                <NumField label="Ені" unit="м" value={f.width} onChange={v => set(fl => { fl.width = v; })} />
              </div>
            )}

            {f.shape === 'sections' && (
              <div className="space-y-2">
                <Alert>Күрделі пішін тік төртбұрышты бөліктерге бөлінеді. Әр бөліктің сол жақ төменгі бұрышының координаттарын (x, y) беріңіз — қабаттасқан аудан екі рет есептелмейді.</Alert>
                {f.sections.map((sec, k) => (
                  <div key={sec.id} className="rounded-xl bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold">{k + 1}-бөлік</span>
                      {f.sections.length > 1 && <button type="button" aria-label="Бөлікті жою" className="p-1 text-red-600" onClick={() => set(fl => { fl.sections = fl.sections.filter(x => x.id !== sec.id); })}><Trash2 size={16} /></button>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <NumField label="Ұзындығы" unit="м" value={sec.length} onChange={v => set(fl => { fl.sections[k].length = v; })} />
                      <NumField label="Ені" unit="м" value={sec.width} onChange={v => set(fl => { fl.sections[k].width = v; })} />
                      <NumField label="x координатасы" unit="м" allowZero value={sec.x} onChange={v => set(fl => { fl.sections[k].x = v; })} help="Бөліктің сол жақ шетінің бастапқы нүктеден қашықтығы." />
                      <NumField label="y координатасы" unit="м" allowZero value={sec.y} onChange={v => set(fl => { fl.sections[k].y = v; })} help="Бөліктің төменгі шетінің бастапқы нүктеден қашықтығы." />
                    </div>
                  </div>
                ))}
                <Button variant="ghost" className="w-full" onClick={() => set(fl => { const last = fl.sections[fl.sections.length - 1]; fl.sections.push({ id: uid(), x: last ? last.x + last.length : 0, y: 0, length: 4, width: 4 }); })}><Plus size={18} />Бөлік қосу</Button>
              </div>
            )}

            {f.shape === 'manual' && (
              <div className="space-y-2">
                <Alert>Пішіннің нақты геометриясы белгісіз болса, жалпы аудан мен сыртқы периметрді өзіңіз енгізіңіз.</Alert>
                <div className="grid grid-cols-2 gap-3">
                  <NumField label="Жалпы аудан" unit="м²" value={f.manualArea} onChange={v => set(fl => { fl.manualArea = v; })} />
                  <NumField label="Сыртқы периметр" unit="м" value={f.manualPerimeter} onChange={v => set(fl => { fl.manualPerimeter = v; })} />
                </div>
              </div>
            )}

            <NumField label="Қабырға биіктігі" unit="м" value={f.height} onChange={v => set(fl => { fl.height = v; })} help="Еденнен төбеге дейінгі қабырға биіктігі." />

            {g.error ? <Alert kind="error">{g.error}</Alert> : (
              <div className="grid grid-cols-3 gap-2 text-center">
                <Mini label="Ауданы" value={`${fmt(g.area)} м²`} />
                <Mini label="Периметрі" value={`${fmt(g.perimeter)} м`} />
                <Mini label="Қабырға ауданы" value={`${fmt(g.extWallArea)} м²`} />
              </div>
            )}
          </Card>
        );
      })}

      <Button variant="ghost" className="w-full" onClick={() => update(d => { const last = d.floors[d.floors.length - 1]; d.floors.push(newFloor(d.floors.length + 1, last?.length ?? 10, last?.width ?? 8, last?.height ?? 2.8)); if (d.floors.length > 1) d.interFloorSlab.enabled = true; })}>
        <Plus size={18} />Қабат қосу
      </Button>

      <Card className="space-y-3">
        <h3 className="text-lg font-bold text-navy-800">Іргетас</h3>
        <Select<FoundationType> label="Іргетас түрі" value={p.foundation.type} onChange={v => update(d => { d.foundation.type = v; })}
          options={[['strip', 'Таспалы іргетас'], ['slab', 'Плиталық іргетас'], ['manual', 'Басқа іргетас түрі — көлемді қолмен енгізу']]}
          help="Таспалы іргетас — сыртқы және көтергіш қабырғалардың астымен жүретін бетон таспа. Плиталық іргетас — бүкіл үйдің астына құйылатын тұтас бетон плита." />
        {p.foundation.type === 'strip' && (
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Таспалы іргетастың ені" unit="м" value={p.foundation.stripWidth} onChange={v => update(d => { d.foundation.stripWidth = v; })} />
            <NumField label="Таспалы іргетастың биіктігі (тереңдігі)" unit="м" value={p.foundation.stripHeight} onChange={v => update(d => { d.foundation.stripHeight = v; })} />
            <NumField className="col-span-2" label="Ішкі көтергіш қабырғалар астындағы таспа ұзындығы" unit="м" allowZero optional value={p.foundation.stripLength} onChange={v => update(d => { d.foundation.stripLength = v; })}
              help="Таспаның жалпы ұзындығы бірінші қабаттың сыртқы периметріне осы ішкі таспалардың ұзындығын қосып есептеледі. Ішкі таспа болмаса, бос қалдырыңыз." />
          </div>
        )}
        {p.foundation.type === 'slab' && <NumField label="Плиталық іргетастың қалыңдығы" unit="м" value={p.foundation.slabThickness} onChange={v => update(d => { d.foundation.slabThickness = v; })} />}
        {p.foundation.type === 'manual' && <NumField label="Іргетасқа кететін бетон көлемі" unit="м³" value={p.foundation.manualVolume} onChange={v => update(d => { d.foundation.manualVolume = v; })} />}

        {p.floors.length > 1 && (
          <div className="border-t border-slate-100 pt-2">
            <Toggle label="Қабаттар арасындағы бетон жабын" checked={p.interFloorSlab.enabled} onChange={v => update(d => { d.interFloorSlab.enabled = v; })} hint="Жоғарғы қабаттардың ауданы бойынша есептеледі" />
            {p.interFloorSlab.enabled && <NumField label="Жабын қалыңдығы" unit="м" value={p.interFloorSlab.thickness} onChange={v => update(d => { d.interFloorSlab.thickness = v; })} />}
          </div>
        )}

        <Select label="Бетон қалай алынады?" value={p.concreteSource} onChange={v => update(d => { d.concreteSource = v; })}
          options={[['ready', 'Дайын бетон сатып аламын'], ['mix', 'Цемент пен құмнан өзім дайындаймын']]}
          help="Бұл екі бөлек сценарий. Дайын бетон алсаңыз, оған цемент пен құм қосылмайды; өзіңіз дайындасаңыз, бетон бағасы қосылмай, цемент пен құм есептеледі. Шығын екі рет есептелмейді." />
      </Card>

      <Card className="space-y-3">
        <h3 className="text-lg font-bold text-navy-800">Шатыр</h3>
        <Select<RoofType> label="Шатыр түрі" value={p.roof.type} onChange={v => update(d => { d.roof.type = v; })}
          options={[['gable', 'Екі еңісті шатыр'], ['flat', 'Жалпақ (еңіссіз) шатыр'], ['manual', 'Басқа шатыр түрі — ауданды қолмен енгізу']]} />
        {p.roof.type === 'gable' && <NumField label="Шатыр еңісі" unit="°" allowZero value={p.roof.slope} onChange={v => update(d => { d.roof.slope = v; })} help="Шатыр беті мен горизонталь арасындағы бұрыш, градуспен. 80°-тан кіші болуы керек." />}
        {p.roof.type !== 'manual'
          ? <NumField label="Шығыңқы бөлігі (свес)" unit="м" allowZero value={p.roof.overhang} onChange={v => update(d => { d.roof.overhang = v; })} help="Шатырдың қабырғадан шығып тұратын бөлігі (свес). Үйдің екі жағына да қосылады." />
          : <NumField label="Шатыр ауданы" unit="м²" value={p.roof.manualArea} onChange={v => update(d => { d.roof.manualArea = v; })} />}
        <NumField label="Материалдың қабаттасу қоры" unit="%" allowZero value={p.roof.overlap} onChange={v => update(d => { d.roof.overlap = v; })} help="Шатыр парақтары бір-бірінің үстіне түсетін бөлік. Қалдық қорынан бөлек ескеріледі." />
      </Card>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-green-50 px-2 py-2">
      <p className="text-[11px] text-green-800">{label}</p>
      <p className="num text-sm font-bold text-green-900">{value}</p>
    </div>
  );
}
