import { useMemo } from 'react';
import { budgetScenarios, TIER_NAMES } from '../../lib/compare';
import { computeProject, type ProjectResult } from '../../lib/engine';
import { MAT } from '../../lib/materials';
import { fmt, fmtMoney } from '../../lib/math';
import type { Project } from '../../lib/types';
import { useStore } from '../../store';
import { Alert, Card, Collapse, H2, NumField } from '../../components/ui';

export default function StepBudget() {
  const { current: p, update } = useStore();
  const res = useMemo(() => (p ? computeProject(p) : null), [p]);
  if (!p || !res) return null;
  return (
    <div className="space-y-4">
      <H2 sub="Жалпы шығынға құрылыс және әрлеу материалдары мен жеткізу кіреді. Жеткізу міндетті емес.">Шығындар және бюджет</H2>
      <Card className="space-y-3">
        <NumField label="Жеткізу шығыны (жалпы)" unit="₸" optional allowZero value={p.costs.delivery} onChange={v => update(d => { d.costs.delivery = v; })} placeholder="0" />
        <NumField label="Жоспарланған бюджет" unit="₸" optional allowZero value={p.budget} onChange={v => update(d => { d.budget = v; })} placeholder="Енгізіңіз"
          help="Құрылысқа бөлуге дайын жалпы сома. Қосымша есептелген жалпы шығынды осы сомамен салыстырып, қалатын немесе жетіспейтін қаражатты көрсетеді." />
      </Card>
      <BudgetStatus r={res} />
      <Scenarios p={p} r={res} />
    </div>
  );
}

export function BudgetStatus({ r }: { r: ProjectResult }) {
  return (
    <Card className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-slate-600">Есептелген жалпы шығын</span>
        <span className="num text-xl font-extrabold text-navy-800">{fmtMoney(r.totalT)}</span>
      </div>
      {r.materialsOnly && <p className="text-xs text-slate-500">Жеткізу шығыны енгізілмеген — тек материалдар есептелді.</p>}
      {r.budget ? (
        <Alert kind={r.budget.ok ? 'ok' : 'error'}>
          <b>{r.budget.ok ? `Бюджет жеткілікті. Қалған қаражат: ${fmtMoney(r.budget.D)}` : `Бюджеттен асқан сома: ${fmtMoney(-r.budget.D)}`}</b>
          {r.incomplete && <span className="block">Есеп толық емес (кейбір баға немесе параметр жоқ) — бұл алдын ала нәтиже.</span>}
        </Alert>
      ) : <Alert kind="warn">Бюджет енгізілмеген — салыстыру жасалмады.</Alert>}
    </Card>
  );
}

export function Scenarios({ p, r }: { p: Project; r: ProjectResult }) {
  const { scenarios, excluded } = budgetScenarios(p, r, id => !!MAT[id].structural);
  if (!scenarios[1].lines.length) return <Alert>Үш бюджеттік сценарийді салыстыру үшін материал бағаларын енгізіңіз.</Alert>;
  const anyTier = scenarios[0].changed + scenarios[2].changed > 0;
  const explain: Record<string, string> = {
    economy: 'Енгізілген «үнемді» бағалар қолданылды; енгізілмегенде — стандарт баға.',
    standard: 'Негізгі (бастапқы) бағалар бойынша.',
    premium: 'Енгізілген «жоғары» бағалар қолданылды; енгізілмегенде — стандарт баға.',
  };
  return (
    <section className="space-y-2">
      <h3 className="text-lg font-bold text-navy-800">Үш бюджеттік сценарий</h3>
      <p className="text-sm text-slate-500">Үй өлшемдері мен материал мөлшері өзгермейді — тек сіз енгізген бағалар ауысады.</p>
      {!anyTier && <Alert>Сценарийлер бірдей: «Материалдар» кезеңінде кейбір материалға үнемді/жоғары баға енгізіңіз.</Alert>}
      {scenarios.map(s => (
        <Collapse key={s.tier}
          title={<span><span className="block">{TIER_NAMES[s.tier]}</span><span className="num text-xs font-normal text-slate-500">{fmtMoney(s.totalT)}{s.tier !== 'standard' && s.pctVsStandard !== null && s.diffStandardT !== 0 ? ` · стандарттан ${s.diffStandardT <= 0 ? 'арзан' : 'қымбат'} ${fmtMoney(Math.abs(s.diffStandardT))} (${fmt(Math.abs(s.pctVsStandard))} %)` : ''}</span></span>}
          right={s.budgetD !== undefined ? <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${s.budgetD >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>{s.budgetD >= 0 ? 'бюджетке сыяды' : 'бюджеттен асады'}</span> : undefined}>
          <p className="mb-2 text-sm text-slate-600">{explain[s.tier]}</p>
          <ul className="divide-y divide-slate-100 text-sm">
            {s.lines.map(l => (
              <li key={l.id} className="flex justify-between gap-2 py-1.5">
                <span className="min-w-0">{l.name}{l.fromStandard && <span className="text-xs text-slate-400"> (стандарт баға)</span>}</span>
                <span className="num shrink-0 text-right">{fmt(l.qty)} × {fmt(l.price)} = <b>{fmtMoney(l.costT)}</b></span>
              </li>
            ))}
          </ul>
          {s.tier === 'economy' && s.lines.some(l => l.structural && !l.fromStandard) && (
            <Alert kind="warn">Кірпіш, бетон, цемент, шатыр — құрылымның беріктігі мен қауіпсіздігіне әсер етеді. Оларды тек арзандығына қарап ауыстыру ұсынылмайды: сапасы мен маркасы талапқа сай болуы керек.</Alert>
          )}
          {s.budgetD !== undefined && <p className="num mt-2 text-sm">{s.budgetD >= 0 ? `Бюджеттен қалады: ${fmtMoney(s.budgetD)}` : `Бюджеттен асады: ${fmtMoney(-s.budgetD)}`}</p>}
        </Collapse>
      ))}
      {excluded.length > 0 && <p className="text-xs text-slate-500">Бағасы жоқ, сценарийге кірмеген: {excluded.join(', ')}.</p>}
    </section>
  );
}
