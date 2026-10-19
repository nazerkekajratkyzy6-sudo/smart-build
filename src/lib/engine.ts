// SMART BUILD — жобаны толық есептеу қозғалтқышы.
import * as M from './math';
import type { Step } from './math';
import { MAT, MATERIALS, matName } from './materials';
import type { Floor, MaterialId, MaterialState, Project, Room } from './types';

export interface FloorGeo {
  id: string; name: string; area: number; perimeter: number; height: number;
  extWallArea: number; steps: Step[]; error?: string; estimated: boolean;
}

export interface RoomGeo {
  id: string; name: string; floorId: string; floorArea: number; perimeter: number; wallArea: number;
  steps: Step[]; error?: string; finishT: number; materials: MaterialId[]; notes: string[];
}

export interface MatResult {
  id: MaterialId; name: string; category: 'build' | 'finish'; unit: string;
  qty: number;            // сатып алынатын мөлшер (сатып алу бірлігімен)
  price: number;          // бірлік бағасы, ₸
  costT: number;          // құны, тиын
  counted: boolean;       // жалпы құнға қосылды ма
  manual: boolean;
  estimated: boolean;
  priceMissing: boolean;
  error?: string;
  steps: Step[];
  notes: string[];
  share: Record<string, number>; // бөлмелерге үлес (0..1)
  waste: number;
}

/** «Менің материалдарым»: «Басқа» санатындағы жеке материал жолының нәтижесі */
export interface CustomResult {
  lineId: string; name: string; category: 'build' | 'finish'; unit: string;
  qty: number; price: number; costT: number; manual: boolean; priceMissing: boolean;
  error?: string; steps: Step[]; notes: string[]; waste: number; area: number;
}

export const TARGET_NAMES: Record<string, string> = {
  'room-walls': 'бөлмелердің қабырғалары', 'room-floor': 'бөлмелердің едені', 'room-ceiling': 'бөлмелердің төбесі',
  'ext-walls': 'сыртқы қабырғалар', roof: 'шатыр', ground: 'бірінші қабат ауданы', manual: 'қолмен енгізілген аудан',
};

export interface ProjectResult {
  customs: CustomResult[];
  roofArea: number;
  floors: FloorGeo[];
  totalArea: number;
  extWallArea: number;
  extWallVolume: number;
  houseSteps: Step[];
  rooms: RoomGeo[];
  roomsArea: number;
  materials: MatResult[];
  buildT: number; finishT: number; deliveryT: number; totalT: number;
  totalSteps: Step[];
  materialsOnly: boolean;
  incomplete: boolean;
  budgetT: number;
  budget?: { D: number; steps: Step[]; ok: boolean };
  warnings: string[];
  errors: string[];
}

const num = (v: unknown) => (typeof v === 'number' ? v : Number(v));

/* ---------- Қабат геометриясы ---------- */

export function floorGeometry(f: Floor, t: number): FloorGeo {
  const g: FloorGeo = { id: f.id, name: f.name, area: 0, perimeter: 0, height: f.height, extWallArea: 0, steps: [], estimated: false };
  if (f.shape === 'rect') {
    const a = M.rectArea(f.length, f.width), p = M.rectPerimeter(f.length, f.width);
    if (a.error || p.error) return { ...g, error: M.ERR_SIZE };
    g.area = a.value; g.perimeter = p.value; g.steps.push(...a.steps, ...p.steps);
  } else if (f.shape === 'sections') {
    const u = M.unionGeometry(f.sections);
    if (u.error) return { ...g, error: u.error };
    const sum = M.round(f.sections.reduce((s, r) => s + r.length * r.width, 0));
    g.area = u.area; g.perimeter = u.perimeter;
    g.steps.push({
      title: 'Күрделі пішін ауданы', formula: 'S = S₁ ∪ S₂ ∪ … (қабаттасу бір рет)',
      subst: f.sections.map((r, i) => `S${i + 1} = ${M.fmt(r.length)} × ${M.fmt(r.width)}`).join('; '),
      result: `S = ${M.fmt(u.area)} м²`,
      note: sum - u.area > 1e-6
        ? `Бөліктер аудандарының қосындысы ${M.fmt(sum)} м², қабаттасқан ${M.fmt(M.round(sum - u.area))} м² екі рет есептелмеді.`
        : 'Бөліктер қабаттаспайды — аудан бөліктер аудандарының қосындысына тең.',
    });
    g.steps.push({ title: 'Сыртқы периметр', formula: 'P = сыртқы шекара ұзындығы', subst: 'Бөліктердің ортақ шекаралары алынып тасталды', result: `P = ${M.fmt(u.perimeter)} м` });
  } else {
    if (!M.isPos(f.manualArea) || !M.isPos(f.manualPerimeter)) return { ...g, error: 'Жалпы аудан мен сыртқы периметрді енгізіңіз' };
    g.area = f.manualArea; g.perimeter = f.manualPerimeter; g.estimated = true;
    g.steps.push({ title: 'Аудан мен периметр (қолмен)', formula: 'S, P — пайдаланушы енгізді', subst: `S = ${M.fmt(f.manualArea)}; P = ${M.fmt(f.manualPerimeter)}`, result: `S = ${M.fmt(f.manualArea)} м², P = ${M.fmt(f.manualPerimeter)} м` });
  }
  const w = M.wallArea(g.perimeter, f.height);
  if (w.error) return { ...g, error: 'Қабырға биіктігін дұрыс енгізіңіз' };
  g.extWallArea = w.value; g.steps.push(...w.steps);
  void t;
  return g;
}

/* ---------- Бөлме геометриясы ---------- */

export function roomGeometry(r: Room): RoomGeo {
  const g: RoomGeo = { id: r.id, name: r.name, floorId: r.floorId, floorArea: 0, perimeter: 0, wallArea: 0, steps: [], finishT: 0, materials: [], notes: [] };
  const a = M.rectArea(r.length, r.width), p = M.rectPerimeter(r.length, r.width);
  if (a.error || p.error || !M.isPos(r.height)) return { ...g, error: 'Бөлме өлшемдерін дұрыс енгізіңіз' };
  const w = M.wallArea(p.value, r.height);
  g.floorArea = a.value; g.perimeter = p.value; g.wallArea = w.value;
  g.steps = [...a.steps, ...p.steps, { ...w.steps[0], title: 'Ішкі қабырғалар ауданы', formula: 'Sіш = P × h', subst: w.steps[0].subst.replace('Sқ', 'Sіш'), result: w.steps[0].result.replace('Sқ', 'Sіш') }];
  if (r.wallFinish === 'both') g.notes.push('Бір қабырғаға тұсқағаз бен бояу екеуі де арнайы таңдалған — екі материал да есептеледі.');
  return g;
}

/* ---------- Негізгі есеп ---------- */

export function computeProject(p: Project): ProjectResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const t = p.wallThickness;

  const floors = p.floors.map(f => floorGeometry(f, t));
  floors.forEach(f => f.error && errors.push(`${f.name}: ${f.error}`));
  if (!M.isPos(t)) errors.push('Қабырға қалыңдығы: ' + M.ERR_SIZE);
  if (!floors.length) errors.push('Кемінде бір қабат қосыңыз');

  const okFloors = floors.filter(f => !f.error);
  const totalArea = M.round(okFloors.reduce((s, f) => s + f.area, 0));
  const extWallArea = M.round(okFloors.reduce((s, f) => s + f.extWallArea, 0));
  const vol = M.isPos(extWallArea) && M.isPos(t) ? M.wallVolume(extWallArea, t) : { value: 0, steps: [] as Step[] };
  const extWallVolume = vol.value;
  const houseSteps: Step[] = [];
  if (okFloors.length > 1) {
    houseSteps.push({
      title: 'Жалпы аудан', formula: 'S = S₁ + S₂ + …', subst: 'S = ' + okFloors.map(f => M.fmt(f.area)).join(' + '), result: `S = ${M.fmt(totalArea)} м²`,
    });
    houseSteps.push({
      title: 'Сыртқы қабырғалардың жалпы ауданы', formula: 'Sқ = Sқ₁ + Sқ₂ + …', subst: 'Sқ = ' + okFloors.map(f => M.fmt(f.extWallArea)).join(' + '), result: `Sқ = ${M.fmt(extWallArea)} м²`,
    });
  }
  houseSteps.push(...vol.steps);

  // Бөлмелер
  const floorIds = new Set(p.floors.map(f => f.id));
  const rooms = p.rooms.filter(r => floorIds.has(r.floorId)).map(roomGeometry);
  rooms.forEach(r => r.error && errors.push(`${r.name}: ${r.error}`));
  const roomsArea = M.round(rooms.filter(r => !r.error).reduce((s, r) => s + r.floorArea, 0));
  for (const f of okFloors) {
    const ra = M.round(rooms.filter(r => r.floorId === f.id && !r.error).reduce((s, r) => s + r.floorArea, 0));
    if (ra > f.area + 1e-6) warnings.push(`${f.name}: бөлмелер аудандарының қосындысы (${M.fmt(ra)} м²) қабат ауданынан (${M.fmt(f.area)} м²) үлкен. Өлшемдерді тексеріңіз.`);
    else if (ra > 0 && ra < f.area * 0.6) warnings.push(`${f.name}: бөлмелер ауданы (${M.fmt(ra)} м²) қабат ауданынан (${M.fmt(f.area)} м²) едәуір аз. Дәліз, қабырға қалыңдығы және басқа аумақтар енгізілмеген болуы мүмкін.`);
  }

  const ctx = { p, floors: okFloors, totalArea, extWallArea, extWallVolume, rooms: rooms.filter(r => !r.error) };
  const results: MatResult[] = [];
  const derived: { concreteV: number; mortarV: number; roofArea: number } = { concreteV: 0, mortarV: 0, roofArea: 0 };

  // Ретімен есептеу: кірпіш → бетон → шатыр → қалғандары (тәуелділіктер үшін)
  const order: MaterialId[] = ['brick', 'concrete', 'roof', 'cement', 'sand', 'insulation', 'wallpaper', 'linoleum', 'galtel', 'plinth', 'paint', 'glue', 'plaster', 'leveler', 'tile'];
  for (const id of order) {
    const s = p.materials[id];
    const def = MAT[id];
    const r: MatResult = {
      id, name: matName(id, s), category: def.category, unit: def.unitLabel(s), qty: 0, price: s.price, costT: 0,
      counted: true, manual: s.mode === 'manual', estimated: false, priceMissing: false, steps: [], notes: [], share: {}, waste: s.waste,
    };
    const auto = autoQuantity(id, s, ctx, derived);
    if (!s.enabled) continue;
    if (s.mode === 'manual') {
      if (!M.isPos(s.manualQty)) r.error = 'Мөлшерді енгізіңіз';
      else {
        r.qty = s.manualQty;
        r.steps = [{ title: 'Мөлшер қолмен енгізілді', formula: 'Q — пайдаланушы енгізді', subst: `Q = ${M.fmt(s.manualQty)}`, result: `Q = ${M.fmt(s.manualQty)} ${r.unit}` }];
        r.notes.push('Мөлшер қолмен енгізілді (автоматты есептеу қолданылмады).');
        r.share = auto.share ?? {};
      }
    } else {
      r.qty = auto.value; r.steps = auto.steps; r.error = auto.error; r.estimated = !!auto.estimated;
      r.notes.push(...(auto.notes ?? [])); r.share = auto.share ?? {};
    }
    if (id === 'concrete' && p.concreteSource === 'mix') {
      r.counted = false;
      r.notes.push('Бетон өзіңіз дайындайсыз: оның құны цемент пен құм арқылы есептеледі, бетон бағасы жалпы құнға қосылмайды (шығын екі рет есептелмейді).');
    }
    if (!r.error && r.counted) {
      if (!M.isPos(s.price)) { r.priceMissing = true; r.notes.push('Материал бағасы көрсетілмеген.'); }
      else {
        r.costT = M.costTiyn(r.qty, s.price);
        r.steps.push({
          title: 'Құны', formula: 'C = Q × p', subst: `C = ${M.fmt(r.qty)} × ${M.fmt(s.price)} ₸`, result: `C = ${M.fmtMoney(r.costT)}`,
          legend: [['C', 'материалдың құны, ₸'], ['Q', 'сатып алынатын мөлшер'], ['p', 'бірлік бағасы, ₸']],
        });
      }
    }
    if (r.error) errors.push(`${r.name}: ${r.error}`);
    results.push(r);
  }
  // Ресми тізім ретімен (1–14)
  results.sort((a, b) => MAT[a.id].no - MAT[b.id].no);

  // Бөлмелердің әрлеу құны (пропорция бойынша үлестіру)
  for (const room of rooms) {
    for (const r of results) {
      if (r.category !== 'finish' || r.error) continue;
      const sh = r.share[room.id];
      if (sh && sh > 0) {
        room.materials.push(r.id);
        room.finishT += Math.round(r.costT * sh);
      }
    }
  }

  const customs = (p.customLines ?? []).filter(l => l.enabled).map(l => customLine(l, ctx, derived));
  customs.forEach(c => c.error && errors.push(`${c.name}: ${c.error}`));
  const sumT = (cat: 'build' | 'finish') =>
    results.filter(r => r.category === cat && r.counted && !r.error).reduce((s, r) => s + r.costT, 0) +
    customs.filter(c => c.category === cat && !c.error).reduce((s, c) => s + c.costT, 0);
  const buildT = sumT('build'), finishT = sumT('finish');
  const deliveryT = M.isPos(p.costs.delivery) ? M.toTiyn(p.costs.delivery) : 0;
  const totalT = buildT + finishT + deliveryT; // жұмысшылар еңбекақысы есепке кірмейді (оны тапсырыс беруші өзі есептейді)
  const totalSteps: Step[] = [{
    title: 'Жалпы шығын', formula: 'Cжалпы = Cқұрылыс + Cәрлеу + Cжеткізу',
    subst: `Cжалпы = ${M.fmtMoney(buildT)} + ${M.fmtMoney(finishT)} + ${M.fmtMoney(deliveryT)}`,
    result: `Cжалпы = ${M.fmtMoney(totalT)}`,
    legend: [['Cқұрылыс', 'құрылыс материалдары'], ['Cәрлеу', 'әрлеу материалдары'], ['Cжеткізу', 'жеткізу']],
  }];
  const incomplete = errors.length > 0 || results.some(r => r.priceMissing) || customs.some(c => c.priceMissing);
  const budgetT = M.isPos(p.budget) ? M.toTiyn(p.budget) : 0;
  let budget: ProjectResult['budget'];
  if (budgetT > 0) {
    const d = M.budgetDiff(budgetT, totalT);
    budget = { D: d.value, steps: d.steps, ok: d.value >= 0 };
  } else warnings.push('Бюджет енгізілмеген — бюджетпен салыстыру жасалмады.');
  if (!results.length) warnings.push('Бірде-бір материал таңдалмаған.');

  return {
    floors, totalArea, extWallArea, extWallVolume, houseSteps, rooms, roomsArea, materials: results, customs, roofArea: derived.roofArea,
    buildT, finishT, deliveryT, totalT, totalSteps, materialsOnly: deliveryT === 0,
    incomplete, budgetT, budget, warnings, errors,
  };
}

/* ---------- Жеке материал жолы: Q = ⌈S × q × (1 + k)⌉ ---------- */

function customLine(l: import('./types').CustomLine, ctx: Ctx, d: { roofArea: number }): CustomResult {
  const category: 'build' | 'finish' = l.target.startsWith('room') ? 'finish' : 'build';
  const r: CustomResult = { lineId: l.id, name: l.name || 'Атаусыз материал', category, unit: l.unit || 'бірлік', qty: 0, price: l.price, costT: 0, manual: l.mode === 'manual', priceMissing: false, steps: [], notes: [], waste: l.waste, area: 0 };
  if (l.mode === 'manual') {
    if (!M.isPos(l.manualQty)) { r.error = 'Мөлшерді енгізіңіз'; return r; }
    r.qty = l.manualQty;
    r.steps.push({ title: 'Мөлшер қолмен енгізілді', formula: 'Q — пайдаланушы енгізді', subst: `Q = ${M.fmt(l.manualQty)}`, result: `Q = ${M.fmt(l.manualQty)} ${r.unit}` });
  } else {
    const rooms = ctx.rooms.filter(g => !l.roomIds.length || l.roomIds.includes(g.id));
    let S = 0;
    if (l.target === 'room-walls') S = rooms.reduce((a, g) => a + g.wallArea, 0);
    else if (l.target === 'room-floor' || l.target === 'room-ceiling') S = rooms.reduce((a, g) => a + g.floorArea, 0);
    else if (l.target === 'ext-walls') S = ctx.extWallArea;
    else if (l.target === 'roof') S = d.roofArea;
    else if (l.target === 'ground') S = ctx.floors[0]?.area ?? 0;
    else S = l.manualArea;
    S = M.round(S); r.area = S;
    if (!M.isPos(S)) { r.error = 'Жабылатын аудан нөлге тең — бөлме немесе ауданды көрсетіңіз'; return r; }
    if (!M.isPos(l.norm)) { r.error = '1 м²-ге шығын нормасын енгізіңіз немесе мөлшерді қолмен жазыңыз'; return r; }
    const q = M.round(S * l.norm);
    r.steps.push({ title: 'Жабылатын аудан', formula: 'S', subst: `S = ${TARGET_NAMES[l.target]}`, result: `S = ${M.fmt(S)} м²` });
    r.steps.push({ title: 'Қажетті мөлшер', formula: 'Q = S × q', subst: `Q = ${M.fmt(S)} × ${M.fmt(l.norm)}`, result: `Q = ${M.fmt(q)} ${r.unit}`, legend: [['q', `1 м²-ге шығын, ${r.unit}/м²`]] });
    const wr = M.withReserve(q, M.isNonNeg(l.waste) ? l.waste : 0, r.unit);
    r.qty = M.ceilSafe(wr.value);
    r.steps.push(wr.steps[0], { title: 'Дөңгелектеу', formula: "N = ⌈Q'⌉", subst: `N = ⌈${M.fmt(wr.value)}⌉`, result: `N = ${r.qty} ${r.unit}` });
  }
  if (!M.isPos(l.price)) { r.priceMissing = true; r.notes.push('Материал бағасы көрсетілмеген.'); }
  else {
    r.costT = M.costTiyn(r.qty, l.price);
    r.steps.push({ title: 'Құны', formula: 'C = Q × p', subst: `C = ${M.fmt(r.qty)} × ${M.fmt(l.price)} ₸`, result: `C = ${M.fmtMoney(r.costT)}` });
  }
  r.notes.push('Жеке материал: стандарт материалдармен бір бетке қатар қолданылса, екеуі де есептеледі.');
  return r;
}

/* ---------- Әр материалдың автоматты мөлшері ---------- */

interface Ctx {
  p: Project; floors: FloorGeo[]; totalArea: number; extWallArea: number; extWallVolume: number; rooms: RoomGeo[];
}
interface Auto { value: number; steps: Step[]; error?: string; estimated?: boolean; notes?: string[]; share?: Record<string, number> }

function roomsWhere(ctx: Ctx, pred: (r: Room) => boolean): { geo: RoomGeo; room: Room }[] {
  return ctx.rooms.map(geo => ({ geo, room: ctx.p.rooms.find(r => r.id === geo.id)! })).filter(x => x.room && pred(x.room));
}

function shares(items: { id: string; v: number }[]): Record<string, number> {
  const total = items.reduce((s, i) => s + i.v, 0);
  if (!(total > 0)) return {};
  return Object.fromEntries(items.map(i => [i.id, i.v / total]));
}

const NO_ROOMS = 'Бұл материал таңдалған бөлме жоқ. Бөлмеге белгілеңіз немесе мөлшерді қолмен енгізіңіз.';

function areaSumStep(title: string, items: { name: string; v: number }[], sym = 'S'): Step {
  const total = M.round(items.reduce((s, i) => s + i.v, 0));
  return {
    title, formula: `${sym} = ${sym}₁ + ${sym}₂ + …`, subst: `${sym} = ` + items.map(i => M.fmt(i.v)).join(' + '),
    result: `${sym} = ${M.fmt(total)} м²`, note: items.map(i => `${i.name}: ${M.fmt(i.v)} м²`).join('; '),
  };
}

function autoQuantity(id: MaterialId, s: MaterialState, ctx: Ctx, d: { concreteV: number; mortarV: number; roofArea: number }): Auto {
  const p = ctx.p;
  const P = s.p;
  switch (id) {
    case 'brick': {
      if (!M.isPos(ctx.extWallVolume)) return { value: 0, steps: [], error: 'Үй өлшемдерін енгізіңіз' };
      const gas = P.type === 'gasblock';
      const b = M.brickCount({ wallVolume: ctx.extWallVolume, L: num(P.L), W: num(P.W), H: num(P.H), joint: num(P.joint), waste: s.waste });
      const notes = ['Болжамды есеп: бастапқы сметалық бағалау. Қабырға ауданы ойықтарды шегермей есептелді.'];
      if (b.error) return { value: 0, steps: b.steps, error: b.error };
      const wMm = num(P.W);
      if (M.isPos(wMm) && Math.abs(p.wallThickness * 1000 - wMm) > 1 && gas) {
        notes.push(`Газоблок ені ${M.fmt(wMm / 1000)} м, ал қабырға қалыңдығы ${M.fmt(p.wallThickness)} м. Бір қатар газоблокпен қаласаңыз, «Үй параметрлерінде» қабырға қалыңдығын ${M.fmt(wMm / 1000)} м деп жазыңыз.`);
      }
      if (!gas) { d.mortarV = b.mortar; return { value: b.value, steps: b.steps, estimated: true, notes }; }
      // Газоблок: цемент-құм ерітіндісі қолданылмайды, арнайы желіммен қаланады
      d.mortarV = 0;
      const gb = M.bagsFromMass(M.round(ctx.extWallVolume * num(P.glueNorm)), num(P.glueBag), s.waste, 'Желім');
      if (!gb.error) notes.push(`Газоблок арнайы желіммен қаланады: шамамен ${gb.value} қап (${M.fmt(num(P.glueBag))} кг). Желімнің құнын қосу үшін оны «Менің материалдарым» арқылы жеке материал ретінде енгізіңіз. Цемент пен құм есебіне қалау ерітіндісі қосылмады.`);
      if (P.unit === 'm3') {
        const vb = (num(P.L) / 1000) * (num(P.W) / 1000) * (num(P.H) / 1000);
        const m3 = M.ceilTo(b.value * vb, 2);
        return { value: m3, steps: [...b.steps, { title: 'Текше метрге айналдыру', formula: 'V = N × Vбл', subst: `V = ${b.value} × ${M.fmt(vb, 6)}`, result: `V = ${M.fmt(m3)} м³` }], estimated: true, notes: [...notes, `${b.value} дана газоблок ≈ ${M.fmt(m3)} м³.`] };
      }
      return { value: b.value, steps: b.steps, estimated: true, notes };
    }
    case 'concrete': {
      const steps: Step[] = []; const notes: string[] = [];
      let V = 0;
      const f1 = ctx.floors[0];
      const fd = p.foundation;
      if (fd.type === 'strip') {
        if (!f1) return { value: 0, steps, error: 'Бірінші қабат өлшемдерін енгізіңіз' };
        const L = M.round(f1.perimeter + (M.isNonNeg(fd.stripLength) ? fd.stripLength : 0));
        steps.push({ title: 'Таспаның жалпы ұзындығы', formula: 'L = P₁ + Lіш', subst: `L = ${M.fmt(f1.perimeter)} + ${M.fmt(fd.stripLength)}`, result: `L = ${M.fmt(L)} м`, legend: [['P₁', 'бірінші қабаттың сыртқы периметрі, м'], ['Lіш', 'ішкі көтергіш қабырғалар астындағы таспа ұзындығы, м']] });
        const c = M.stripVolume(L, fd.stripWidth, fd.stripHeight);
        if (c.error) return { value: 0, steps, error: 'Іргетас өлшемдерін дұрыс енгізіңіз' };
        V += c.value; steps.push(...c.steps);
      } else if (fd.type === 'slab') {
        if (!f1) return { value: 0, steps, error: 'Бірінші қабат өлшемдерін енгізіңіз' };
        const c = M.slabVolume(f1.area, fd.slabThickness);
        if (c.error) return { value: 0, steps, error: 'Плита қалыңдығын дұрыс енгізіңіз' };
        V += c.value; steps.push(...c.steps);
      } else {
        if (!M.isPos(fd.manualVolume)) return { value: 0, steps, error: 'Іргетас бетонының көлемін енгізіңіз' };
        V += fd.manualVolume;
        steps.push({ title: 'Іргетас көлемі (қолмен)', formula: 'V — пайдаланушы енгізді', subst: `V = ${M.fmt(fd.manualVolume)}`, result: `V = ${M.fmt(fd.manualVolume)} м³` });
      }
      if (p.interFloorSlab.enabled) {
        if (ctx.floors.length < 2) notes.push('Қабат аралық жабын бір қабатты үйде есептелмеді.');
        else {
          const upper = ctx.floors.slice(1);
          const S = M.round(upper.reduce((a, f) => a + f.area, 0));
          const c = M.slabVolume(S, p.interFloorSlab.thickness, 'Қабат аралық жабын көлемі');
          if (c.error) return { value: 0, steps, error: 'Қабат аралық жабын қалыңдығын енгізіңіз' };
          V += c.value; steps.push(...c.steps);
          steps.push({ title: 'Бетонның жалпы көлемі', formula: 'V = Vіргетас + Vжабын', subst: `V = ${M.fmt(V - c.value)} + ${M.fmt(c.value)}`, result: `V = ${M.fmt(M.round(V))} м³` });
        }
      }
      V = M.round(V);
      d.concreteV = V;
      const wr = M.withReserve(V, s.waste, 'м³');
      const q = M.ceilTo(wr.value, 1);
      steps.push(wr.steps[0], { title: 'Дөңгелектеу', formula: 'V = ⌈V\'⌉ (0,1 м³ дәлдікпен)', subst: `V = ⌈${M.fmt(wr.value)}⌉`, result: `V = ${M.fmt(q)} м³` });
      return { value: q, steps, notes };
    }
    case 'roof': {
      const top = ctx.floors[ctx.floors.length - 1];
      const rf = p.roof; const steps: Step[] = []; let estimated = false;
      let area = 0;
      if (rf.type === 'manual') {
        if (!M.isPos(rf.manualArea)) return { value: 0, steps, error: 'Шатыр ауданын енгізіңіз' };
        area = rf.manualArea;
        steps.push({ title: 'Шатыр ауданы (қолмен)', formula: 'S — пайдаланушы енгізді', subst: `S = ${M.fmt(area)}`, result: `S = ${M.fmt(area)} м²` });
      } else {
        if (!top) return { value: 0, steps, error: 'Үй өлшемдерін енгізіңіз' };
        const o = M.isNonNeg(rf.overhang) ? rf.overhang : 0;
        const alpha = rf.type === 'flat' ? 0 : rf.slope;
        const fl = p.floors.find(f => f.id === top.id)!;
        if (fl.shape === 'rect') {
          const a = M.round(fl.length + 2 * o), b = M.round(fl.width + 2 * o);
          steps.push({ title: 'Шатырдың жоспардағы өлшемдері', formula: 'a = L + 2o;  b = B + 2o', subst: `a = ${M.fmt(fl.length)} + 2×${M.fmt(o)};  b = ${M.fmt(fl.width)} + 2×${M.fmt(o)}`, result: `a = ${M.fmt(a)} м;  b = ${M.fmt(b)} м`, legend: [['o', 'шатырдың шығыңқы бөлігі (свес), м']] });
          const c = M.roofArea(a, b, alpha);
          if (c.error) return { value: 0, steps, error: c.error };
          area = c.value; steps.push(...c.steps);
        } else {
          estimated = true;
          const plan = M.round(top.area + top.perimeter * o + 4 * o * o);
          steps.push({ title: 'Шатырдың жоспардағы ауданы', formula: 'Sж = S + P·o + 4o²', subst: `Sж = ${M.fmt(top.area)} + ${M.fmt(top.perimeter)}×${M.fmt(o)} + 4×${M.fmt(o)}²`, result: `Sж = ${M.fmt(plan)} м²`, note: 'Күрделі пішін үшін шамамен (тік төртбұрыш үшін дәл).' });
          if (alpha >= 80) return { value: 0, steps, error: 'Шатыр еңісі 80°-тан кіші болуы керек' };
          const cos = Math.cos((alpha * Math.PI) / 180);
          area = M.round(plan / cos);
          steps.push({ title: 'Шатыр ауданы', formula: 'Sшатыр = Sж / cos(α)', subst: `Sшатыр = ${M.fmt(plan)} / ${M.fmt(cos, 4)}`, result: `Sшатыр = ${M.fmt(area)} м²` });
        }
      }
      d.roofArea = area;
      const ov = M.withReserve(area, M.isNonNeg(rf.overlap) ? rf.overlap : 0, 'м²', 'Қабаттасу қоры');
      const wr = M.withReserve(ov.value, s.waste, 'м²', 'Қалдық қоры');
      const q = M.ceilSafe(wr.value);
      steps.push(ov.steps[0], wr.steps[0], { title: 'Дөңгелектеу', formula: 'S = ⌈S\'⌉', subst: `S = ⌈${M.fmt(wr.value)}⌉`, result: `S = ${q} м²` });
      return { value: q, steps, estimated, notes: ['Шатырдың шығыңқы бөлігі мен материалдың қабаттасу қоры бөлек ескерілді.'] };
    }
    case 'cement': {
      const steps: Step[] = []; const notes: string[] = []; const parts: string[] = []; const nums: string[] = [];
      let kg = 0;
      if (p.materials.concrete.enabled && p.concreteSource === 'mix' && d.concreteV > 0) {
        const m = M.round(d.concreteV * num(P.concreteNorm));
        kg += m; parts.push('Vб×q₁'); nums.push(`${M.fmt(d.concreteV)}×${M.fmt(num(P.concreteNorm))}`);
      } else if (p.materials.concrete.enabled && p.concreteSource === 'ready') {
        notes.push('Бетон дайын күйінде сатып алынады — бетонға арналған цемент қосылмады (шығын екі рет есептелмейді).');
      }
      if (P.useMortar && p.materials.brick.enabled && d.mortarV > 0) {
        const m = M.round(d.mortarV * num(P.mortarNorm));
        kg += m; parts.push('Vер×q₂'); nums.push(`${M.fmt(d.mortarV)}×${M.fmt(num(P.mortarNorm))}`);
      }
      if (M.isPos(num(P.extraAmount)) && M.isPos(num(P.extraNorm))) {
        const m = M.round(num(P.extraAmount) * num(P.extraNorm));
        kg += m; parts.push('V₃×q₃'); nums.push(`${M.fmt(num(P.extraAmount))}×${M.fmt(num(P.extraNorm))}`);
      }
      if (!(kg > 0)) return { value: 0, steps, notes, error: 'Цемент қажет ететін жұмыс жоқ немесе шығын нормасы енгізілмеген' };
      kg = M.round(kg);
      steps.push({
        title: 'Цемент массасы', formula: 'm = ' + parts.join(' + '), subst: 'm = ' + nums.join(' + '), result: `m = ${M.fmt(kg)} кг`,
        legend: [['Vб', 'өзіңіз дайындайтын бетон көлемі, м³'], ['Vер', 'кірпіш қалау ерітіндісінің көлемі, м³'], ['V₃', `қосымша жұмыс (${String(P.extraLabel)}) көлемі`], ['q', 'цементтің шығын нормасы, кг']],
      });
      const b = M.bagsFromMass(kg, num(P.bagKg), s.waste, 'Цемент');
      if (b.error) return { value: 0, steps, error: b.error };
      return { value: b.value, steps: [...steps, ...b.steps], notes };
    }
    case 'sand': {
      const steps: Step[] = []; const parts: string[] = []; const nums: string[] = []; const notes: string[] = [];
      let V = 0;
      if (p.materials.concrete.enabled && p.concreteSource === 'mix' && d.concreteV > 0) {
        V += d.concreteV * num(P.concreteNorm); parts.push('Vб×q₁'); nums.push(`${M.fmt(d.concreteV)}×${M.fmt(num(P.concreteNorm))}`);
      } else if (p.materials.concrete.enabled && p.concreteSource === 'ready') notes.push('Дайын бетонға арналған құм қосылмады (шығын екі рет есептелмейді).');
      if (P.useMortar && p.materials.brick.enabled && d.mortarV > 0) {
        V += d.mortarV * num(P.mortarNorm); parts.push('Vер×q₂'); nums.push(`${M.fmt(d.mortarV)}×${M.fmt(num(P.mortarNorm))}`);
      }
      const ex = num(p.materials.cement.p.extraAmount);
      if (M.isPos(ex) && M.isPos(num(P.extraNorm))) {
        V += ex * num(P.extraNorm); parts.push('V₃×q₃'); nums.push(`${M.fmt(ex)}×${M.fmt(num(P.extraNorm))}`);
      }
      V = M.round(V);
      if (!(V > 0)) return { value: 0, steps, notes, error: 'Құм қажет ететін жұмыс жоқ немесе шығын нормасы енгізілмеген' };
      steps.push({ title: 'Құм көлемі', formula: 'V = ' + parts.join(' + '), subst: 'V = ' + nums.join(' + '), result: `V = ${M.fmt(V)} м³`, legend: [['q', 'құмның шығын нормасы, м³/м³']] });
      const wr = M.withReserve(V, s.waste, 'м³');
      const q = M.ceilTo(wr.value, 1);
      steps.push(wr.steps[0], { title: 'Дөңгелектеу', formula: 'V = ⌈V\'⌉ (0,1 м³ дәлдікпен)', subst: `V = ⌈${M.fmt(wr.value)}⌉`, result: `V = ${M.fmt(q)} м³` });
      return { value: q, steps, notes };
    }
    case 'insulation': {
      const steps: Step[] = [];
      let area = 0;
      const target = String(P.target);
      if (target === 'walls') area = ctx.extWallArea;
      else if (target === 'roof') area = d.roofArea;
      else if (target === 'floor') area = ctx.floors[0]?.area ?? 0;
      else area = num(P.manualArea);
      if (!M.isPos(area)) return { value: 0, steps, error: target === 'roof' ? 'Шатыр ауданы есептелмеген (шатыр жабыны материалын қосыңыз)' : 'Оқшауланатын ауданды енгізіңіз' };
      const names: Record<string, string> = { walls: 'сыртқы қабырғалар', roof: 'шатыр', floor: 'бірінші қабат едені', manual: 'қолмен енгізілген' };
      steps.push({ title: 'Оқшауланатын аудан', formula: 'S', subst: `S = ${names[target]} ауданы`, result: `S = ${M.fmt(area)} м²`, note: `Материал қалыңдығы: ${M.fmt(num(P.thickness))} мм.` });
      if (P.unit === 'm2') {
        const tot = M.round(area * num(P.layers));
        if (!M.isPos(num(P.layers))) return { value: 0, steps, error: M.ERR_SIZE };
        const wr = M.withReserve(tot, s.waste, 'м²');
        const q = M.ceilSafe(wr.value);
        steps.push({ title: 'Жабылатын жалпы аудан', formula: 'Sж = S × k', subst: `Sж = ${M.fmt(area)} × ${M.fmt(num(P.layers), 0)}`, result: `Sж = ${M.fmt(tot)} м²` }, wr.steps[0], { title: 'Дөңгелектеу', formula: "S = ⌈S'⌉", subst: `S = ⌈${M.fmt(wr.value)}⌉`, result: `S = ${q} м²` });
        return { value: q, steps };
      }
      const c = M.packsByCoverage(area, num(P.layers), num(P.coverage), s.waste);
      return { value: c.value, steps: [...steps, ...c.steps], error: c.error };
    }
    case 'wallpaper': {
      const list = roomsWhere(ctx, r => r.wallFinish === 'wallpaper' || r.wallFinish === 'both');
      if (!list.length) return { value: 0, steps: [], error: NO_ROOMS };
      const steps: Step[] = []; const items: { id: string; v: number }[] = [];
      let total = 0;
      for (const { geo, room } of list) {
        const c = M.wallpaperRolls({ P: geo.perimeter, h: room.height, rollLength: num(P.rollLength), rollWidth: num(P.rollWidth), repeat: num(P.repeat), trim: num(P.trim) });
        if (c.error) return { value: 0, steps, error: c.error };
        total += c.value; items.push({ id: geo.id, v: c.value });
        steps.push(...c.steps.map(st => ({ ...st, title: `${geo.name}: ${st.title}` })));
      }
      steps.push({ title: 'Барлық бөлмеге рулон', formula: 'N = N₁ + N₂ + …', subst: 'N = ' + items.map(i => i.v).join(' + '), result: `N = ${total} рулон`, note: 'Әр бөлме жеке есептелді: бір бөлменің қалдығы екінші бөлмеге қолданылмайды деп алынды.' });
      if (s.waste > 0) {
        const wr = M.withReserve(total, s.waste, 'рулон');
        const q = M.ceilSafe(wr.value);
        steps.push(wr.steps[0], { title: 'Дөңгелектеу', formula: 'N = ⌈N\'⌉', subst: `N = ⌈${M.fmt(wr.value)}⌉`, result: `N = ${q} рулон` });
        total = q;
      }
      return { value: total, steps, share: shares(items) };
    }
    case 'linoleum': {
      const list = roomsWhere(ctx, r => r.linoleum);
      if (!list.length) return { value: 0, steps: [], error: NO_ROOMS };
      const steps: Step[] = []; const items: { id: string; v: number }[] = [];
      let total = 0;
      for (const { geo, room } of list) {
        const c = M.linoleumArea(room.length, room.width, num(P.rollWidth), num(P.margin));
        if (c.error) return { value: 0, steps, error: c.error };
        total += c.value; items.push({ id: geo.id, v: c.value });
        steps.push(...c.steps.map(st => ({ ...st, title: `${geo.name}: ${st.title}` })));
      }
      total = M.round(total);
      steps.push({ title: 'Жалпы сатып алу ауданы', formula: 'S = S₁ + S₂ + …', subst: 'S = ' + items.map(i => M.fmt(i.v)).join(' + '), result: `S = ${M.fmt(total)} м²` });
      const wr = M.withReserve(total, s.waste, 'м²');
      const q = M.ceilTo(wr.value, 2);
      if (s.waste > 0) steps.push(wr.steps[0]);
      return { value: q, steps, share: shares(items) };
    }
    case 'galtel':
    case 'plinth': {
      const list = roomsWhere(ctx, r => (id === 'galtel' ? r.galtel : r.plinth));
      if (!list.length) return { value: 0, steps: [], error: NO_ROOMS };
      const items = list.map(x => ({ id: x.geo.id, v: x.geo.perimeter, name: x.geo.name }));
      const L = M.round(items.reduce((a, i) => a + i.v, 0));
      const steps: Step[] = [{ title: 'Жалпы ұзындық', formula: 'L = 2(a₁ + b₁) + 2(a₂ + b₂) + …', subst: 'L = ' + items.map(i => M.fmt(i.v)).join(' + '), result: `L = ${M.fmt(L)} м`, note: items.map(i => `${i.name}: ${M.fmt(i.v)} м`).join('; ') }];
      const c = M.piecesByLength(L, num(P.pieceLength), s.waste, P.unit !== 'm');
      return { value: c.value, steps: [...steps, ...c.steps], error: c.error, share: shares(items) };
    }
    case 'paint': {
      const list = roomsWhere(ctx, r => r.wallFinish === 'paint' || r.wallFinish === 'both' || r.paintCeiling);
      if (!list.length) return { value: 0, steps: [], error: NO_ROOMS };
      const items = list.map(({ geo, room }) => ({
        id: geo.id, name: geo.name + (room.paintCeiling ? ' (төбесімен)' : ''),
        v: M.round((room.wallFinish === 'paint' || room.wallFinish === 'both' ? geo.wallArea : 0) + (room.paintCeiling ? geo.floorArea : 0)),
      }));
      const S = M.round(items.reduce((a, i) => a + i.v, 0));
      const steps: Step[] = [areaSumStep('Боялатын аудан', items)];
      const q = M.paintLitres(S, num(P.layers), num(P.coverage));
      if (q.error) return { value: 0, steps, error: q.error };
      steps.push(...q.steps);
      const wr = M.withReserve(q.value, s.waste, 'л');
      steps.push(wr.steps[0]);
      if (P.unit === 'l') {
        const l = M.ceilTo(wr.value, 1);
        steps.push({ title: 'Дөңгелектеу', formula: 'Q = ⌈Q\'⌉ (0,1 л)', subst: `Q = ⌈${M.fmt(wr.value)}⌉`, result: `Q = ${M.fmt(l)} л` });
        return { value: l, steps, share: shares(items) };
      }
      const c = M.containersFromVolume(wr.value, num(P.bucket), 'шелек', 'Шелек');
      return { value: c.value, steps: [...steps, ...c.steps], error: c.error, share: shares(items) };
    }
    case 'glue': {
      const list = roomsWhere(ctx, r => r.wallFinish === 'wallpaper' || r.wallFinish === 'both');
      if (!list.length) return { value: 0, steps: [], error: 'Тұсқағаз таңдалған бөлме жоқ. Желім тұсқағаз ауданы бойынша есептеледі.' };
      const items = list.map(({ geo }) => ({ id: geo.id, name: geo.name, v: geo.wallArea }));
      const S = M.round(items.reduce((a, i) => a + i.v, 0));
      const c = M.gluePacks(S, num(P.norm), num(P.packG), s.waste);
      return { value: c.value, steps: [areaSumStep('Тұсқағаз жапсырылатын аудан', items), ...c.steps], error: c.error, share: shares(items) };
    }
    case 'tile': {
      const list = roomsWhere(ctx, r => !!r.tileFloor || r.wallFinish === 'tile');
      if (!list.length) return { value: 0, steps: [], error: 'Кафель таңдалған бөлме жоқ. «Бөлмелер» кезеңінде еденге немесе қабырғаға кафельді белгілеңіз.' };
      const items = list.map(({ geo, room }) => ({
        id: geo.id, name: geo.name + (room.tileFloor && room.wallFinish === 'tile' ? ' (еден + қабырға)' : room.tileFloor ? ' (еден)' : ' (қабырға)'),
        v: M.round((room.tileFloor ? geo.floorArea : 0) + (room.wallFinish === 'tile' ? geo.wallArea : 0)),
      }));
      const S = M.round(items.reduce((a, i) => a + i.v, 0));
      const c = M.tileCount({ S, L: num(P.L), W: num(P.W), joint: num(P.joint), waste: s.waste });
      if (c.error) return { value: 0, steps: [], error: c.error };
      const steps: Step[] = [areaSumStep('Кафель төселетін аудан', items), ...c.steps];
      const notes: string[] = [`${c.pieces} дана кафель ≈ ${M.fmt(c.m2)} м² (1 м²-де шамамен ${M.fmt(c.perM2, 1)} дана).`];
      const gb = M.bagsFromMass(M.round(S * num(P.glueNorm)), num(P.glueBag), s.waste, 'Желім');
      if (!gb.error) notes.push(`Кафель желімі шамамен ${gb.value} қап (${M.fmt(num(P.glueBag))} кг). Желім мен затирканың құнын «Менің материалдарым» арқылы қосуға болады.`);
      let qty = c.pieces;
      if (P.unit === 'm2') { qty = M.ceilTo(c.m2, 2); steps.push({ title: 'Шаршы метрге айналдыру', formula: 'Sс = N × L × W', subst: `Sс = ${c.pieces} × ${M.fmt(num(P.L) / 1000)} × ${M.fmt(num(P.W) / 1000)}`, result: `Sс = ${M.fmt(qty)} м²` }); }
      if (P.unit === 'box') {
        if (!M.isPos(num(P.perBox))) return { value: 0, steps, error: 'Бір қораптағы кафель санын енгізіңіз' };
        const raw = M.round(c.pieces / num(P.perBox), 6); qty = M.ceilSafe(raw);
        steps.push({ title: 'Қорап саны', formula: 'n = ⌈N / nқ⌉', subst: `n = ⌈${c.pieces} / ${M.fmt(num(P.perBox))}⌉`, result: `n = ${qty} қорап` });
        notes.push(`${qty} қорапта ${qty * num(P.perBox)} дана кафель болады.`);
      }
      return { value: qty, steps, notes, share: shares(items) };
    }
    case 'plaster':
    case 'leveler': {
      const list = roomsWhere(ctx, r => (id === 'plaster' ? r.plaster : r.leveler));
      if (!list.length) return { value: 0, steps: [], error: NO_ROOMS };
      const items = list.map(({ geo }) => ({ id: geo.id, name: geo.name, v: id === 'plaster' ? geo.wallArea : geo.floorArea }));
      const S = M.round(items.reduce((a, i) => a + i.v, 0));
      const m = M.mixMass(S, num(P.thickness), num(P.norm));
      if (m.error) return { value: 0, steps: [], error: m.error };
      const b = M.bagsFromMass(m.value, num(P.bagKg), s.waste, id === 'plaster' ? 'Сылақ' : 'Қоспа');
      return {
        value: b.value, error: b.error, share: shares(items),
        steps: [areaSumStep(id === 'plaster' ? 'Сыланатын аудан' : 'Тегістелетін еден ауданы', items), ...m.steps, ...b.steps],
      };
    }
  }
}

export { MATERIALS };
