// Экспорттарға (PDF, Excel, басып шығару) ортақ есеп құрылымы.
import * as M from './math';
import { budgetScenarios, compareSuppliers, compareVariants, TIER_NAMES } from './compare';
import { computeProject, type ProjectResult } from './engine';
import { HOUSE_TYPES } from './defaults';
import { MAT } from './materials';
import type { Project } from './types';

export interface ReportTable { title: string; head: string[]; rows: string[][]; widths?: number[] }
export interface ReportBlock { title: string; lines?: string[]; kv?: [string, string][]; table?: ReportTable; steps?: { group: string; items: M.Step[] }[] }
export interface Report { title: string; subtitle: string; blocks: ReportBlock[]; disclaimer: string }

export const APP_TITLE = 'SMART BUILD — Ақылды есептеу, тиімді құрылыс.';
export const DISCLAIMER = 'SMART BUILD — құрылыс шығындарын алдын ала жоспарлауға арналған математикалық құрал. Ол кәсіби инженерлік жобалау, конструкциялық есептеу немесе ресми құрылыс сметасының орнына қолданылмайды.';

export const houseTypeName = (p: Project) => HOUSE_TYPES.find(h => h.id === p.houseType)?.title ?? '';

export function dimsText(p: Project): string {
  return p.floors.map(f => {
    if (f.shape === 'rect') return `${f.name}: ${M.fmt(f.length)} × ${M.fmt(f.width)} м, қабырға биіктігі ${M.fmt(f.height)} м`;
    if (f.shape === 'sections') return `${f.name}: ${f.sections.length} тік төртбұрышты бөлік, қабырға биіктігі ${M.fmt(f.height)} м`;
    return `${f.name}: ауданы ${M.fmt(f.manualArea)} м², периметрі ${M.fmt(f.manualPerimeter)} м, қабырға биіктігі ${M.fmt(f.height)} м`;
  }).join('; ');
}

export function buildReport(p: Project, r: ProjectResult = computeProject(p)): Report {
  const blocks: ReportBlock[] = [];
  blocks.push({
    title: 'Жоба туралы',
    kv: [
      ['Жобаның атауы', p.name],
      ['Үй түрі', houseTypeName(p)],
      ['Үй өлшемдері', dimsText(p)],
      ['Қабат саны', String(p.floors.length)],
      ['Жалпы аудан', `${M.fmt(r.totalArea)} м²`],
      ['Сыртқы қабырғалар ауданы', `${M.fmt(r.extWallArea)} м² (ойықтарды шегермей)`],
      ['Ішкі қабырғалар ауданы', `${M.fmt(r.rooms.reduce((a, g) => a + g.wallArea, 0))} м²`],
      ['Қабырға қалыңдығы', `${M.fmt(p.wallThickness)} м`],
      ['Бөлмелер саны', String(p.rooms.length)],
      ['Есеп күні', new Date().toLocaleDateString('ru-RU')],
    ],
  });
  blocks.push({
    title: 'Материалдар',
    table: {
      title: 'Материалдар', head: ['№', 'Материал', 'Мөлшері', 'Бірлік бағасы', 'Қор, %', 'Жалпы құны'], widths: [4, 30, 18, 18, 8, 22],
      rows: r.materials.map(m => [
        String(MAT[m.id].no), m.name + (m.manual ? ' (қолмен)' : '') + (m.estimated ? ' (болжамды)' : ''),
        m.error ? '—' : `${M.fmt(m.qty)} ${m.unit}`,
        m.price > 0 ? `${M.fmt(m.price)} ₸` : 'енгізілмеген',
        M.fmt(m.waste),
        m.error ? m.error : !m.counted ? 'қосылмайды' : m.priceMissing ? '—' : M.fmtMoney(m.costT),
      ]).concat(r.customs.map((c, i) => [
        `Ж${i + 1}`, `${c.name} (жеке)` + (c.manual ? ' (қолмен)' : ''),
        c.error ? '—' : `${M.fmt(c.qty)} ${c.unit}`, c.price > 0 ? `${M.fmt(c.price)} ₸` : 'енгізілмеген', M.fmt(c.waste),
        c.error ? c.error : c.priceMissing ? '—' : M.fmtMoney(c.costT),
      ])),
    },
  });
  const tot: [string, string][] = [
    ['Құрылыс материалдары', M.fmtMoney(r.buildT)],
    ['Әрлеу материалдары', M.fmtMoney(r.finishT)],
    ['Жеткізу шығыны', r.deliveryT ? M.fmtMoney(r.deliveryT) : 'енгізілмеген'],
    ['ЖАЛПЫ ҚҰН', M.fmtMoney(r.totalT) + (r.materialsOnly ? ' (жеткізусіз)' : '')],
    ['Жоспарланған бюджет', r.budgetT ? M.fmtMoney(r.budgetT) : 'енгізілмеген'],
  ];
  if (r.budget) tot.push(['Бюджет айырмашылығы', r.budget.ok ? `Бюджет жеткілікті. Қалған қаражат: ${M.fmtMoney(r.budget.D)}` : `Бюджеттен асқан сома: ${M.fmtMoney(-r.budget.D)}`]);
  const sup = compareSuppliers(p, r);
  if (sup.baseline) tot.push(['Материалдарды салыстыру арқылы үнем', `${M.fmtMoney(sup.baseline.savingT)}${sup.baseline.pct !== null ? ` (${M.fmt(sup.baseline.pct)} %)` : ''}`]);
  blocks.push({ title: 'Шығын және бюджет', kv: tot, lines: r.incomplete ? ['Есеп толық емес: кейбір материалдардың бағасы немесе параметрі жоқ. Бюджет сәйкестігі — алдын ала нәтиже.'] : [] });

  if (r.rooms.length) {
    blocks.push({
      title: 'Бөлмелер',
      table: {
        title: 'Бөлмелер', head: ['Бөлме', 'Еден, м²', 'Қабырға, м²', 'P, м', 'Әрлеу материалдары', 'Әрлеу құны'], widths: [20, 11, 12, 9, 30, 18],
        rows: r.rooms.map(g => [g.name, M.fmt(g.floorArea), M.fmt(g.wallArea), M.fmt(g.perimeter), g.materials.map(id => MAT[id].name).join(', ') || '—', M.fmtMoney(g.finishT)]),
      },
      lines: [`Бөлмелер аудандарының қосындысы: ${M.fmt(r.roomsArea)} м² (үйдің жалпы ауданы ${M.fmt(r.totalArea)} м²).`],
    });
  }

  if (sup.materials.length) {
    blocks.push({
      title: 'Жеткізушілерді салыстыру',
      table: {
        title: 'Нұсқалар', head: ['Нұсқа', 'Материалдар', 'Жеткізу', 'Барлығы'],
        rows: sup.options.map(o => [o.label, M.fmtMoney(o.materialsT), M.fmtMoney(o.deliveryT), M.fmtMoney(o.totalT)]),
      },
      lines: [
        sup.best ? `Ең тиімді: ${sup.best.label} — ${M.fmtMoney(sup.best.totalT)}` : '',
        sup.worst && sup.best ? `Ең қымбат нұсқамен айырмашылық: ${M.fmtMoney(sup.diffWorstT)}` : '',
        sup.skipped.length ? `Ұсынысы жоқ материалдар салыстырылмады: ${sup.skipped.join(', ')}` : '',
      ].filter(Boolean),
    });
  }

  const sc = budgetScenarios(p, r, id => !!MAT[id].structural);
  if (sc.scenarios[1].lines.length) {
    blocks.push({
      title: 'Бюджеттік сценарийлер',
      table: {
        title: 'Сценарийлер', head: ['Сценарий', 'Материалдар', 'Барлығы', 'Стандартпен айырма', 'Бюджетпен'],
        rows: sc.scenarios.map(s => [TIER_NAMES[s.tier], M.fmtMoney(s.materialsT), M.fmtMoney(s.totalT), (s.diffStandardT > 0 ? '+' : '') + M.fmtMoney(s.diffStandardT), s.budgetD === undefined ? '—' : s.budgetD >= 0 ? `қалады ${M.fmtMoney(s.budgetD)}` : `асады ${M.fmtMoney(-s.budgetD)}`]),
      },
      lines: ['Сценарий бағасы енгізілмеген материалдарға стандарт баға қолданылды. Құрылымдық материалдарды тек арзандығына қарап ауыстыруға болмайды.'],
    });
  }

  if (r.warnings.length || r.errors.length) blocks.push({ title: 'Ескертулер', lines: [...r.errors, ...r.warnings] });

  return { title: APP_TITLE, subtitle: `Есеп: «${p.name}»`, blocks, disclaimer: DISCLAIMER };
}

/** Ғылыми жобаға арналған зерттеу есебі: бірнеше нұсқаны салыстыру. */
export function buildResearchReport(projects: Project[], baseIndex: number): Report {
  const results = projects.map(p => computeProject(p));
  const v = compareVariants(projects, results, baseIndex);
  const blocks: ReportBlock[] = [];
  blocks.push({
    title: 'Зерттеу параметрлері',
    kv: [
      ['Салыстырылған нұсқалар', v.names.map((n, i) => `${i + 1}) ${n}`).join('; ')],
      ['Бастапқы (салыстыру негізі)', v.names[baseIndex]],
      ['Үй өлшемдері', v.sameDims ? `Барлық нұсқада бірдей: ${dimsText(projects[0])}` : 'Нұсқалардың өлшемдері әртүрлі — салыстыру материалдар мен өлшемдердің бірлескен әсерін көрсетеді'],
      ['Жалпы аудан', results.map((r, i) => `${v.names[i]}: ${M.fmt(r.totalArea)} м²`).join('; ')],
    ],
  });
  blocks.push({
    title: 'Материал мөлшері мен құны',
    table: {
      title: 'Материалдар', head: ['Материал', ...v.names.map(n => `${n}: мөлшер`), ...v.names.map(n => `${n}: құн`)],
      rows: v.rows.map(r => [r.name + ` (${r.unit})`, ...r.qty.map(q => (q === null ? '—' : M.fmt(q))), ...r.costT.map(c => (c === null ? '—' : M.fmtMoney(c)))]),
    },
  });
  blocks.push({
    title: 'Нәтижелер',
    table: {
      title: 'Нәтижелер', head: ['Нұсқа', 'Жалпы құн', 'Үнем (бастапқыға қатысты)', 'Үнем, %', 'Бюджетке сәйкестік'],
      rows: v.names.map((n, i) => [
        n + (i === baseIndex ? ' (бастапқы)' : '') + (v.incomplete[i] ? ' *' : ''),
        M.fmtMoney(v.totals[i]),
        i === baseIndex ? '—' : M.fmtMoney(v.savings[i].savingT),
        i === baseIndex || v.savings[i].pct === null ? '—' : `${M.fmt(v.savings[i].pct!)} %`,
        v.budget[i] === null ? 'бюджет енгізілмеген' : v.budget[i]! >= 0 ? `жеткілікті, қалады ${M.fmtMoney(v.budget[i]!)}` : `асады ${M.fmtMoney(-v.budget[i]!)}`,
      ]),
    },
    lines: [...v.summary, ...(v.incomplete.some(Boolean) ? ['* — есеп толық емес (кейбір баға/параметр жоқ), нәтиже алдын ала.'] : [])],
  });
  return { title: APP_TITLE, subtitle: 'Зерттеу нәтижесі: нұсқаларды салыстыру', blocks, disclaimer: DISCLAIMER };
}
