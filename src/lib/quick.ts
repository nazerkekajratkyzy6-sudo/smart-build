// «Жылдам есеп»: үй жобасынсыз, бір бөлмеге жөндеу материалдарын есептеу (тұсқағаз, линолеум, бояу т.б.).
// Негізгі жобадағы математикалық функциялар қолданылады — алгоритмдер бірдей.
import * as M from './math';
import { MAT } from './materials';
import type { MaterialId } from './types';

export type QuickMaterial = 'wallpaper' | 'glue' | 'paint' | 'plaster' | 'linoleum' | 'tile' | 'leveler' | 'plinth' | 'galtel' | 'insulation';
export const QUICK_MATERIALS: QuickMaterial[] = ['tile', 'wallpaper', 'glue', 'paint', 'plaster', 'linoleum', 'leveler', 'plinth', 'galtel', 'insulation'];

/** Материал қай бетке қолданылады: қабырға, еден, төбе немесе периметр бойымен. */
export type Surface = 'walls' | 'floor' | 'ceiling' | 'perimeter';
export const SURFACE_OF: Record<QuickMaterial, Surface[]> = {
  wallpaper: ['walls'], glue: ['walls'], paint: ['walls', 'ceiling'], plaster: ['walls', 'ceiling'],
  linoleum: ['floor'], tile: ['floor', 'walls'], leveler: ['floor'], plinth: ['perimeter'], galtel: ['perimeter'], insulation: ['walls', 'floor', 'ceiling'],
};
export const SURFACE_NAMES: Record<Surface, string> = { walls: 'Қабырғалар', floor: 'Еден', ceiling: 'Төбе', perimeter: 'Бөлме периметрі' };

export interface QuickItem {
  id: string;
  material: QuickMaterial;
  surface: Surface;
  useRoom: boolean;          // бөлме өлшемінен алу немесе ауданды/ұзындықты қолмен жазу
  manualArea: number;        // м² (немесе периметр үшін м)
  price: number;             // бірлік бағасы, ₸
  waste: number;             // қор, %
  productName?: string;      // нақты өнім атауы (Менің материалдарымнан)
  p: Record<string, number | string>;
}

export interface QuickCalc {
  id: string;
  name: string;
  room: { length: number; width: number; height: number };
  items: QuickItem[];
  delivery: number;      // жеткізу шығыны, ₸
  updatedAt: number;
}

export interface QuickResult {
  qty: number; unit: string; costT: number; priceMissing: boolean; error?: string;
  base: { label: string; value: string };   // қандай аудан/ұзындық бойынша
  extra: [string, string][];                 // қосымша түсінікті мәліметтер (формуласыз)
}

/** Әр материалдың бастапқы параметрлері (негізгі каталогтағы мәндермен бірдей). */
export function defaultParams(m: QuickMaterial): Record<string, number | string> {
  const base = { ...MAT[m as MaterialId].params } as Record<string, number | string>;
  if (m === 'insulation') return { thickness: base.thickness, layers: base.layers, coverage: base.coverage };
  if (m === 'paint') return { layers: base.layers, coverage: base.coverage, bucket: base.bucket, unit: 'bucket' };
  if (m === 'galtel' || m === 'plinth') return { pieceLength: base.pieceLength };
  if (m === 'tile') return { L: base.L, W: base.W, joint: base.joint, unit: 'm2', perBox: base.perBox };
  return Object.fromEntries(Object.entries(base).filter(([, v]) => typeof v !== 'boolean')) as Record<string, number | string>;
}

export const QUICK_FIELDS: Record<QuickMaterial, { key: string; label: string; unit?: string; zero?: boolean; help?: string }[]> = {
  wallpaper: [
    { key: 'rollLength', label: 'Рулон ұзындығы', unit: 'м' },
    { key: 'rollWidth', label: 'Рулон ені', unit: 'м' },
    { key: 'repeat', label: 'Өрнек сәйкестендіру қадамы', unit: 'м', zero: true, help: 'Өрнек қайталанатын қашықтық (раппорт). Рулон жапсырмасында жазылады. Өрнексіз тұсқағаз үшін 0.' },
    { key: 'trim', label: 'Кесу қоры (бір жолаққа)', unit: 'м', zero: true },
  ],
  glue: [
    { key: 'norm', label: 'Шығын нормасы', unit: 'г/м²', help: 'Қаптамада жазылады. Мысалы, «200 г — 25 м²» болса: 200 ÷ 25 = 8 г/м².' },
    { key: 'packG', label: 'Бір қаптаманың салмағы', unit: 'г' },
  ],
  paint: [
    { key: 'layers', label: 'Бояу қабаттарының саны' },
    { key: 'coverage', label: '1 литрдің жабу нормасы', unit: 'м²/л', help: 'Банкада жазылады: мысалы, «8–10 м²/л».' },
    { key: 'bucket', label: 'Бір шелектің көлемі', unit: 'л' },
  ],
  plaster: [
    { key: 'thickness', label: 'Қабат қалыңдығы', unit: 'мм' },
    { key: 'norm', label: 'Шығын нормасы (1 мм қалыңдыққа)', unit: 'кг/м²', help: 'Қапта жазылады: 1 мм қалыңдықта 1 м²-ге кететін қоспа, кг.' },
    { key: 'bagKg', label: 'Бір қаптың салмағы', unit: 'кг' },
  ],
  leveler: [
    { key: 'thickness', label: 'Тегістеу қабатының қалыңдығы', unit: 'мм' },
    { key: 'norm', label: 'Шығын нормасы (1 мм қалыңдыққа)', unit: 'кг/м²' },
    { key: 'bagKg', label: 'Бір қаптың салмағы', unit: 'кг' },
  ],
  linoleum: [
    { key: 'rollWidth', label: 'Орам ені', unit: 'м', help: 'Дүкендегі линолеум орамының ені: 1,5; 2; 2,5; 3; 3,5; 4 м.' },
    { key: 'margin', label: 'Қию қоры', unit: 'м', zero: true },
  ],
  tile: [
    { key: 'L', label: 'Кафель ұзындығы', unit: 'мм', help: 'Қорапта жазылады: мысалы, 300×300, 600×300, 250×400 мм.' },
    { key: 'W', label: 'Кафель ені', unit: 'мм' },
    { key: 'joint', label: 'Жік (шов) ені', unit: 'мм', zero: true, help: 'Кафельдер арасындағы саңылау. Әдетте 1,5–3 мм.' },
    { key: 'perBox', label: 'Бір қораптағы кафель саны', unit: 'дана' },
  ],
  plinth: [{ key: 'pieceLength', label: 'Бір дананың ұзындығы', unit: 'м' }],
  galtel: [{ key: 'pieceLength', label: 'Бір дананың ұзындығы', unit: 'м' }],
  insulation: [
    { key: 'layers', label: 'Қабат саны' },
    { key: 'coverage', label: 'Бір қаптаманың жабу ауданы', unit: 'м²' },
  ],
};

export function quickUnit(it: QuickItem): string {
  switch (it.material) {
    case 'wallpaper': return 'рулон';
    case 'linoleum': return 'м²';
    case 'tile': return it.p.unit === 'piece' ? 'дана' : it.p.unit === 'box' ? 'қорап' : 'м²';
    case 'paint': return 'шелек';
    case 'glue': case 'insulation': return 'қаптама';
    case 'plaster': case 'leveler': return 'қап';
    case 'plinth': case 'galtel': return 'дана';
  }
}

const num = (v: unknown) => Number(v);

/** Бетінің ауданын (немесе периметрін) анықтау. */
export function surfaceSize(calc: QuickCalc, it: QuickItem): { value: number; label: string; unit: string; error?: string } {
  const { length: a, width: b, height: h } = calc.room;
  const unit = it.surface === 'perimeter' ? 'м' : 'м²';
  const label = it.surface === 'perimeter' ? 'Ұзындығы (бөлме периметрі)' : `${SURFACE_NAMES[it.surface]} ауданы`;
  if (!it.useRoom) {
    if (!M.isPos(it.manualArea)) return { value: 0, label, unit, error: it.surface === 'perimeter' ? 'Ұзындықты енгізіңіз' : 'Ауданды енгізіңіз' };
    return { value: it.manualArea, label, unit };
  }
  const needH = it.surface === 'walls';
  if (!M.isPos(a) || !M.isPos(b) || (needH && !M.isPos(h))) return { value: 0, label, unit, error: 'Бөлме өлшемдерін енгізіңіз' };
  const P = M.round(2 * (a + b));
  const v = it.surface === 'walls' ? M.round(P * h) : it.surface === 'perimeter' ? P : M.round(a * b);
  return { value: v, label, unit };
}

export function computeQuick(calc: QuickCalc, it: QuickItem): QuickResult {
  const unit = quickUnit(it);
  const size = surfaceSize(calc, it);
  const out: QuickResult = { qty: 0, unit, costT: 0, priceMissing: false, base: { label: size.label, value: `${M.fmt(size.value)} ${size.unit}` }, extra: [] };
  if (size.error) return { ...out, error: size.error };
  const P = it.p, S = size.value, w = M.isNonNeg(it.waste) ? it.waste : 0;
  const { length: a, width: b, height: h } = calc.room;
  let qty = 0; let err: string | undefined;

  switch (it.material) {
    case 'wallpaper': {
      // Бөлме өлшемі берілсе — нақты жолақ әдісі; аудан қолмен берілсе — периметр = аудан / биіктік
      const height = M.isPos(h) ? h : NaN;
      if (!M.isPos(height)) { err = 'Тұсқағаз үшін қабырға биіктігін енгізіңіз'; break; }
      const perim = it.useRoom ? M.round(2 * (a + b)) : M.round(S / height);
      const r = M.wallpaperRolls({ P: perim, h: height, rollLength: num(P.rollLength), rollWidth: num(P.rollWidth), repeat: num(P.repeat), trim: num(P.trim) });
      if (r.error) { err = r.error; break; }
      qty = w > 0 ? M.ceilSafe(r.value * (1 + w / 100)) : r.value;
      out.extra.push(['Жолақ саны', `${r.strips}`], ['Бір рулоннан шығатын жолақ', `${r.perRoll}`], ['Бір жолақтың ұзындығы', `${M.fmt(r.stripLen)} м`]);
      if (!it.useRoom) out.extra.push(['Ескерту', 'Аудан қолмен берілгендіктен, периметр шамамен алынды']);
      break;
    }
    case 'linoleum': {
      if (!it.useRoom) {
        // Тек аудан белгілі: орам ені бойынша нақты қиюды есептеу мүмкін емес — ауданға қор қосылады
        qty = M.ceilTo(S * (1 + w / 100), 1);
        out.extra.push(['Ескерту', 'Бөлменің ұзындығы мен ені берілсе, орам ені бойынша дәлірек есептеледі']);
        break;
      }
      const r = M.linoleumArea(a, b, num(P.rollWidth), num(P.margin));
      if (r.error) { err = r.error; break; }
      qty = M.ceilTo(r.value * (1 + w / 100), 2);
      out.extra.push(['Еден ауданы', `${M.fmt(M.round(a * b))} м²`], ['Орам жолағы', `${r.strips} × ${M.fmt(r.cutLen)} м`], ['Қию қалдығы', `${M.fmt(M.round(r.value - a * b))} м²`]);
      break;
    }
    case 'tile': {
      const c = M.tileCount({ S, L: num(P.L), W: num(P.W), joint: num(P.joint), waste: w });
      if (c.error) { err = c.error; break; }
      qty = c.pieces;
      if (P.unit === 'm2') qty = M.ceilTo(c.m2, 2);
      if (P.unit === 'box') { if (!M.isPos(num(P.perBox))) { err = 'Бір қораптағы кафель санын енгізіңіз'; break; } qty = M.ceilSafe(M.round(c.pieces / num(P.perBox), 6)); }
      out.extra.push(['Кафель саны', `${c.pieces} дана`], ['Кафель ауданы (сатып алу)', `${M.fmt(c.m2)} м²`], ['1 м²-де', `≈ ${M.fmt(c.perM2, 1)} дана`]);
      if (P.unit === 'box') out.extra.push(['Қораптардағы кафель', `${qty * num(P.perBox)} дана`]);
      out.extra.push(['Кафель желімі (≈5 кг/м²)', `≈ ${M.ceilSafe(S * 5 * (1 + w / 100) / 25)} қап × 25 кг`]);
      break;
    }
    case 'paint': {
      const q = M.paintLitres(S, num(P.layers), num(P.coverage));
      if (q.error) { err = q.error; break; }
      const litres = M.round(q.value * (1 + w / 100), 4);
      const c = M.containersFromVolume(litres, num(P.bucket), 'шелек', 'Шелек');
      if (c.error) { err = c.error; break; }
      qty = c.value;
      out.extra.push(['Қажетті бояу', `${M.fmt(litres)} л`], ['Бір шелек', `${M.fmt(num(P.bucket))} л`]);
      break;
    }
    case 'glue': {
      const c = M.gluePacks(S, num(P.norm), num(P.packG), w);
      if (c.error) { err = c.error; break; }
      qty = c.value;
      out.extra.push(['Қажетті желім', `${M.fmt(M.round(S * num(P.norm) * (1 + w / 100)))} г`]);
      break;
    }
    case 'plaster':
    case 'leveler': {
      const m = M.mixMass(S, num(P.thickness), num(P.norm));
      if (m.error) { err = m.error; break; }
      const b2 = M.bagsFromMass(m.value, num(P.bagKg), w, 'Қоспа');
      if (b2.error) { err = b2.error; break; }
      qty = b2.value;
      out.extra.push(['Қоспа салмағы', `${M.fmt(M.round(m.value * (1 + w / 100)))} кг`]);
      break;
    }
    case 'plinth':
    case 'galtel': {
      const c = M.piecesByLength(S, num(P.pieceLength), w, true);
      if (c.error) { err = c.error; break; }
      qty = c.value;
      out.extra.push(['Қормен алынған ұзындық', `${M.fmt(c.meters)} м`]);
      break;
    }
    case 'insulation': {
      const c = M.packsByCoverage(S, num(P.layers), num(P.coverage), w);
      if (c.error) { err = c.error; break; }
      qty = c.value;
      break;
    }
  }
  if (err) return { ...out, error: err };
  out.qty = qty;
  if (!M.isPos(it.price)) out.priceMissing = true;
  else out.costT = M.costTiyn(qty, it.price);
  return out;
}

export function quickTotal(calc: QuickCalc): { materialsT: number; deliveryT: number; totalT: number; missing: number; errors: number } {
  const rs = calc.items.map(i => computeQuick(calc, i));
  const materialsT = rs.reduce((s, r) => s + (r.error ? 0 : r.costT), 0);
  const deliveryT = M.isPos(calc.delivery) ? M.toTiyn(calc.delivery) : 0;
  return { materialsT, deliveryT, totalT: materialsT + deliveryT, missing: rs.filter(r => !r.error && r.priceMissing).length, errors: rs.filter(r => r.error).length };
}

/** Дайын жұмыс түрлері: бір басумен қажетті материалдар қосылады. */
export const QUICK_TASKS: { id: string; title: string; desc: string; items: { material: QuickMaterial; surface: Surface }[] }[] = [
  { id: 'bath', title: 'Ваннаға кафель төсеу', desc: 'Еден және қабырға кафелі', items: [{ material: 'tile', surface: 'floor' }, { material: 'tile', surface: 'walls' }] },
  { id: 'tilefloor', title: 'Еденге кафель төсеу', desc: 'Еден кафелі + тегістеу', items: [{ material: 'leveler', surface: 'floor' }, { material: 'tile', surface: 'floor' }] },
  { id: 'wallpaper', title: 'Тұсқағазды ауыстыру', desc: 'Тұсқағаз + желім', items: [{ material: 'wallpaper', surface: 'walls' }, { material: 'glue', surface: 'walls' }] },
  { id: 'linoleum', title: 'Линолеумды ауыстыру', desc: 'Линолеум + еден плинтусы', items: [{ material: 'linoleum', surface: 'floor' }, { material: 'plinth', surface: 'perimeter' }] },
  { id: 'paint', title: 'Қабырғаны бояу', desc: 'Бояу', items: [{ material: 'paint', surface: 'walls' }] },
  { id: 'ceiling', title: 'Төбені жаңарту', desc: 'Бояу + төбе галтелі', items: [{ material: 'paint', surface: 'ceiling' }, { material: 'galtel', surface: 'perimeter' }] },
  { id: 'plaster', title: 'Қабырғаны сылау', desc: 'Қабырға сылағы', items: [{ material: 'plaster', surface: 'walls' }] },
  { id: 'floor', title: 'Еденді тегістеу', desc: 'Еденді тегістейтін қоспа', items: [{ material: 'leveler', surface: 'floor' }] },
];

export function newQuickItem(material: QuickMaterial, surface: Surface, id: string): QuickItem {
  return { id, material, surface, useRoom: true, manualArea: 0, price: 0, waste: MAT[material as MaterialId].defaultWaste, p: defaultParams(material) };
}

export function emptyQuick(id: string): QuickCalc {
  return { id, name: 'Жөндеу есебі', room: { length: 4, width: 3.5, height: 2.7 }, items: [], delivery: 0, updatedAt: Date.now() };
}

/* ---------- Экспорт (PDF / Excel / басып шығару) ---------- */
import type { Report } from './report';
import { DISCLAIMER, APP_TITLE } from './report';

export function quickReport(calc: QuickCalc, names: (it: QuickItem) => string): Report {
  const t = quickTotal(calc);
  const { length: a, width: b, height: h } = calc.room;
  return {
    title: APP_TITLE, subtitle: `Жылдам есеп: «${calc.name}»`, disclaimer: DISCLAIMER,
    blocks: [
      { title: 'Бөлме', kv: [['Өлшемдері', `${M.fmt(a)} × ${M.fmt(b)} м, биіктігі ${M.fmt(h)} м`], ['Еден ауданы', M.isPos(a) && M.isPos(b) ? `${M.fmt(M.round(a * b))} м²` : '—'], ['Қабырғалар ауданы', M.isPos(a) && M.isPos(b) && M.isPos(h) ? `${M.fmt(M.round(2 * (a + b) * h))} м² (ойықтарды шегермей)` : '—'], ['Есеп күні', new Date().toLocaleDateString('ru-RU')]] },
      {
        title: 'Материалдар',
        table: {
          title: 'Материалдар', head: ['Материал', 'Беті', 'Мөлшері', 'Бірлік бағасы', 'Жалпы құны'], widths: [30, 22, 16, 15, 17],
          rows: calc.items.map(it => { const r = computeQuick(calc, it); return [names(it), `${r.base.label}: ${r.base.value}`, r.error ? '—' : `${M.fmt(r.qty)} ${r.unit}`, it.price > 0 ? `${M.fmt(it.price)} ₸` : 'енгізілмеген', r.error ? r.error : r.priceMissing ? '—' : M.fmtMoney(r.costT)]; }),
        },
      },
      { title: 'Жалпы шығын', kv: [['Материалдар', M.fmtMoney(t.materialsT)], ['Жеткізу шығыны', t.deliveryT ? M.fmtMoney(t.deliveryT) : 'енгізілмеген'], ['ЖАЛПЫ ҚҰН', M.fmtMoney(t.totalT)]], lines: t.missing ? ['Кейбір материалдардың бағасы енгізілмеген — олар жалпы құнға кірмеді.'] : [] },
    ],
  };
}
