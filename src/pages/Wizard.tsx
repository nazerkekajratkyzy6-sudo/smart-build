import { ArrowLeft, ArrowRight, Building2, Calculator, Check, Cloud, CloudOff, Home, Layers, Loader2, PenTool } from 'lucide-react';
import { createProject, HOUSE_TYPES } from '../lib/defaults';
import { computeProject } from '../lib/engine';
import { fmt } from '../lib/math';
import { Facade, Plan } from '../components/HousePlans';
import { useStore } from '../store';
import { Button, Card, cx, H2 } from '../components/ui';
import StepHouse from './wizard/StepHouse';
import StepRooms from './wizard/StepRooms';
import StepMaterials from './wizard/StepMaterials';
import StepSuppliers from './wizard/StepSuppliers';
import StepBudget from './wizard/StepBudget';
import type { HouseType } from '../lib/types';
import { lazy, Suspense } from 'react';
import type { CalcView } from '../store';
const HouseView = lazy(() => import('./HouseView'));
const RoomStudio = lazy(() => import('./RoomStudio'));
const Catalog = lazy(() => import('./Catalog'));
const QuickCalc = lazy(() => import('./QuickCalc'));

const STEPS = ['Үй түрі', 'Параметрлер', 'Бөлмелер', 'Материалдар', 'Жеткізушілер', 'Бюджет'];
const ICONS: Record<HouseType, typeof Home> = { small: Home, family: Building2, twostory: Layers, custom: PenTool };

const VIEWS: [CalcView, string][] = [['quick', 'Жылдам есеп'], ['steps', 'Үй жобасы'], ['house', 'Үй макеті'], ['room', 'Бөлме'], ['catalog', 'Каталог']];

export default function Wizard() {
  const { view, setView, current } = useStore();
  const v = current ? view : view === 'catalog' || view === 'quick' ? view : 'steps';
  return (
    <div>
      <div className="-mx-4 mb-3 overflow-x-auto px-4">
        <div className="flex min-w-max gap-1 rounded-xl bg-slate-100 p-1">
          {VIEWS.map(([k, l]) => (
            <button key={k} type="button" disabled={!current && k !== 'catalog' && k !== 'steps' && k !== 'quick'} onClick={() => setView(k)}
              className={cx('min-h-[40px] rounded-lg px-3 text-sm font-semibold transition disabled:opacity-40', v === k ? 'bg-white text-navy-800 shadow' : 'text-slate-500')}>{l}</button>
          ))}
        </div>
      </div>
      <Suspense fallback={<p className="py-10 text-center text-slate-500">Жүктелуде…</p>}>
        {v === 'quick' && <QuickCalc />}
        {v === 'steps' && <Steps />}
        {v === 'house' && <HouseView />}
        {v === 'room' && <RoomStudio />}
        {v === 'catalog' && <Catalog />}
      </Suspense>
    </div>
  );
}

function Steps() {
  const { step, setStep, current, saveState, saveNow, setTab } = useStore();
  const s = current ? step : 0;
  const go = (n: number) => { setStep(n); window.scrollTo({ top: 0 }); };

  return (
    <div>
      {current && s > 0 && (
        <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-slate-100 bg-white/95 px-4 pb-2 pt-1 backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-semibold text-slate-600">{current.name}</p>
            <button type="button" onClick={saveNow} className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100">
              {saveState === 'saving' ? <><Loader2 size={14} className="animate-spin" />Сақталуда</> :
                saveState === 'error' ? <><CloudOff size={14} className="text-red-600" /><span className="text-red-600">Сақталмады — қайталау</span></> :
                saveState === 'dirty' ? <><Cloud size={14} />Сақталуда…</> : <><Check size={14} className="text-green-600" />Сақталды</>}
            </button>
          </div>
          <ol className="mt-2 flex gap-1">
            {STEPS.slice(1).map((t, i) => (
              <li key={t} className="flex-1">
                <button type="button" onClick={() => go(i + 1)} aria-label={t}
                  className={cx('h-1.5 w-full rounded-full transition', i + 1 <= s ? 'bg-navy-800' : 'bg-slate-200')} />
              </li>
            ))}
          </ol>
          <p className="mt-1 text-xs text-slate-500">{s}-кезең / 5 · {STEPS[s]}</p>
        </div>
      )}

      {s === 0 && <ChooseType />}
      {s === 1 && <StepHouse />}
      {s === 2 && <StepRooms />}
      {s === 3 && <StepMaterials />}
      {s === 4 && <StepSuppliers />}
      {s === 5 && <StepBudget />}

      {current && s > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => go(s - 1)}><ArrowLeft size={18} />Артқа</Button>
          {s < 5
            ? <Button onClick={() => go(s + 1)}>Келесі<ArrowRight size={18} /></Button>
            : <Button variant="green" onClick={async () => { await saveNow(); setTab('results'); }}><Calculator size={18} />Есептеу</Button>}
        </div>
      )}
    </div>
  );
}

function ChooseType() {
  const { startNew, current, setStep } = useStore();
  return (
    <div>
      <H2 sub="Дайын үлгілердің өлшемдері тек мысал — барлығын кейін өзгерте аласыз. Сызбалар үлгінің нақты өлшемдерінен салынған.">Үй жобасын таңдаңыз</H2>
      <div className="grid gap-3 sm:grid-cols-2">
        {HOUSE_TYPES.map(h => {
          const I = ICONS[h.id];
          const t = createProject(h.id);
          const r = computeProject(t);
          const f = t.floors[0];
          const dims = f.shape === 'rect' ? `${fmt(f.length)} × ${fmt(f.width)} м` : 'күрделі пішін';
          return (
            <button key={h.id} type="button" onClick={() => startNew(h.id)} className="text-left">
              <Card className="space-y-2 p-3 transition hover:border-navy-600 hover:shadow-md">
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-32 overflow-hidden rounded-xl bg-slate-50" aria-label="Қасбет"><Facade p={t} /></div>
                  <div className="h-32 overflow-hidden rounded-xl bg-slate-50" aria-label="Қабат жоспары"><Plan p={t} fi={0} /></div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-800"><I size={24} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold leading-tight">{h.title}</p>
                    <p className="text-sm text-slate-500">{h.desc}</p>
                  </div>
                  <ArrowRight className="shrink-0 text-slate-400" />
                </div>
                <p className="num text-xs text-slate-500">Үлгі: {dims} · {t.floors.length} қабат · {fmt(r.totalArea)} м² · {t.rooms.length ? `${t.rooms.length} бөлме` : 'бөлмелерді өзіңіз қосасыз'}</p>
              </Card>
            </button>
          );
        })}
      </div>
      {current && (
        <div className="mt-4">
          <Button variant="outline" className="w-full" onClick={() => setStep(1)}>«{current.name}» жобасын жалғастыру</Button>
        </div>
      )}
    </div>
  );
}
