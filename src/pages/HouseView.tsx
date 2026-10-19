import { lazy, Suspense, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { computeProject, type ProjectResult } from '../lib/engine';
import { fmt } from '../lib/math';
import { PART_MATERIALS, PART_NAMES, ROOF_COLORS, type HousePart } from '../lib/visual';
import type { Project } from '../lib/types';
import { useStore } from '../store';
import { Alert, Card, cx, H2, Segmented } from '../components/ui';
import { PanZoom } from '../components/PanZoom';
import { Facade, Plan } from '../components/HousePlans';
import { MaterialRow } from '../components/MaterialRow';

const House3D = lazy(() => import('../components/House3D'));

type Mode = '3d' | 'plan' | 'facade';

export default function HouseView() {
  const { current: p, update, focusPart } = useStore();
  const [mode, setMode] = useState<Mode>('3d');
  const [part, setPart] = useState<HousePart | null>(focusPart && focusPart in PART_NAMES ? (focusPart as HousePart) : null);
  const [floorIdx, setFloorIdx] = useState(0);
  const res = useMemo(() => (p ? computeProject(p) : null), [p]);
  if (!p || !res) return null;
  const fi = Math.min(floorIdx, p.floors.length - 1);

  return (
    <div className="space-y-4">
      <H2 sub="Макет жобаның нақты өлшемдерінен құрылады. Бөлікті басыңыз — оған қолданылатын материалдар мен есеп ашылады.">Үй макеті</H2>
      <Segmented<Mode> value={mode} onChange={setMode} options={[['3d', '3D көрініс'], ['plan', '2D жоспар'], ['facade', 'Қасбет']]} />

      {mode === '3d' && (
        <Suspense fallback={<div className="flex h-[340px] items-center justify-center rounded-2xl border border-slate-200 text-slate-500"><Loader2 className="mr-2 animate-spin" />3D модель жүктелуде…</div>}>
          <House3D p={p} selected={part} onSelect={setPart} onFail={() => setMode('plan')} />
        </Suspense>
      )}
      {mode === 'plan' && (
        <>
          {p.floors.length > 1 && <Segmented value={String(fi)} onChange={v => setFloorIdx(Number(v))} options={p.floors.map((f, i) => [String(i), f.name] as [string, string])} />}
          <PanZoom height={340}><Plan p={p} fi={fi} part={part} onPart={setPart} /></PanZoom>
          <p className="text-xs text-slate-500">Сыртқы контур мен өлшемдер — нақты. Бөлмелердің жоспардағы орны шартты (бөлмелердің координаттары енгізілмейді), өлшемдері — нақты масштабта.</p>
        </>
      )}
      {mode === 'facade' && (
        <>
          <PanZoom height={340}><Facade p={p} part={part} onPart={setPart} /></PanZoom>
          <p className="text-xs text-slate-500">Үйдің бүйір (фронтон) жағынан көрінісі: биіктіктер, іргетас тереңдігі және шатыр еңісі енгізілген мәндерден салынады.</p>
        </>
      )}

      <div className="flex flex-wrap gap-2">
        {(Object.keys(PART_NAMES) as HousePart[]).filter(k => k !== 'slab' || p.floors.length > 1).map(k => (
          <button key={k} type="button" onClick={() => setPart(part === k ? null : k)}
            className={cx('min-h-[40px] rounded-full px-4 text-sm font-semibold transition', part === k ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-700')}>{PART_NAMES[k]}</button>
        ))}
      </div>

      {part ? <PartPanel part={part} p={p} res={res} /> : <Alert>Макеттен немесе жоғарыдағы батырмалардан үйдің бөлігін таңдаңыз.</Alert>}

      <Card className="space-y-2">
        <p className="font-semibold">Сыртқы көрініс</p>
        <div className="flex items-center gap-2"><span className="w-24 text-sm text-slate-600">Қасбет</span>
          <Segmented value={p.look?.facade ?? 'brick'} onChange={v => update(d => { d.look = { ...d.look, facade: v }; })} options={[['brick', p.materials.brick.p.type === 'gasblock' ? 'Газоблок' : 'Қызыл кірпіш'], ['plaster', 'Сылақпен әрленген']]} /></div>
        <div className="flex items-center gap-2"><span className="w-24 text-sm text-slate-600">Шатыр түсі</span>
          <div className="flex flex-wrap gap-2">{ROOF_COLORS.map(([c, n]) => <Swatch key={c} color={c} name={n} active={p.look?.roofColor === c} onClick={() => update(d => { d.look = { ...d.look, roofColor: c }; })} />)}</div></div>
        <p className="text-xs text-slate-500">Түс пен фактура — шамамен көрініс; есептеуге әсер етпейді.</p>
      </Card>
    </div>
  );
}

export function Swatch({ color, name, active, onClick }: { color: string; name: string; active?: boolean; onClick: () => void }) {
  return <button type="button" title={name} aria-label={name} onClick={onClick} className={cx('h-9 w-9 rounded-full border-2 shadow-sm transition', active ? 'border-green-600 ring-2 ring-green-200' : 'border-white ring-1 ring-slate-300')} style={{ background: color }} />;
}

function PartPanel({ part, p, res }: { part: HousePart; p: Project; res: ProjectResult }) {
  const info: [string, string][] = [];
  if (part === 'walls') { info.push(['Сыртқы қабырғалар ауданы', `${fmt(res.extWallArea)} м²`], ['Қабырға көлемі', `${fmt(res.extWallVolume)} м³`], ['Бөлмелердің ішкі қабырғалары', `${fmt(res.rooms.reduce((a, r) => a + r.wallArea, 0))} м²`]); }
  if (part === 'floor') { info.push(['1-қабат ауданы', `${fmt(res.floors[0]?.area ?? 0)} м²`], ['Бөлмелер едені', `${fmt(res.roomsArea)} м²`]); }
  if (part === 'roof') info.push(['Шатыр ауданы (қорсыз)', `${fmt(res.roofArea)} м²`], ['Еңіс', p.roof.type === 'gable' ? `${fmt(p.roof.slope)}°` : p.roof.type === 'flat' ? 'жалпақ' : 'қолмен']);
  if (part === 'foundation') { const c = res.materials.find(m => m.id === 'concrete'); info.push(['Іргетас түрі', p.foundation.type === 'strip' ? 'таспалы іргетас' : p.foundation.type === 'slab' ? 'плиталық іргетас' : 'көлемі қолмен'], ['Бетон (қормен)', c && !c.error ? `${fmt(c.qty)} м³` : '—']); }
  if (part === 'slab') info.push(['Жабын қалыңдығы', p.interFloorSlab.enabled ? `${fmt(p.interFloorSlab.thickness)} м` : 'қосылмаған']);
  return (
    <Card className="space-y-3">
      <h3 className="text-lg font-bold text-navy-800">{PART_NAMES[part]}</h3>
      <div className="grid grid-cols-2 gap-2">{info.map(([k, v]) => <div key={k} className="rounded-xl bg-green-50 p-2"><p className="text-[11px] text-green-800">{k}</p><p className="num font-bold text-green-900">{v}</p></div>)}</div>
      <p className="text-sm text-slate-500">Материалды қосу/алып тастау тек сол материалдың есебін өзгертеді; цемент пен құм ғана бетон мен ерітінді көлеміне тәуелді.</p>
      <div className="space-y-2">{PART_MATERIALS[part].map(id => <MaterialRow key={id} id={id} r={res.materials.find(m => m.id === id)} />)}</div>
    </Card>
  );
}

