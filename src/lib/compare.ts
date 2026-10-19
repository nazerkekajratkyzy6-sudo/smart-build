// Жеткізушілерді салыстыру, бюджеттік сценарийлер және жобаларды (нұсқаларды) салыстыру.
import * as M from './math';
import type { MatResult, ProjectResult } from './engine';
import type { MaterialId, Project } from './types';

/* ---------- Жеткізушілер ---------- */

export interface OfferLine {
  supplierId: string; supplierName: string; price: number; minOrder: number;
  buyQty: number; costT: number; raisedToMin: boolean;
}
export interface MaterialOffers { id: MaterialId; name: string; unit: string; qty: number; lines: OfferLine[]; best?: OfferLine }

export interface SupplierOption {
  label: string;
  kind: 'single' | 'best-mix' | 'worst-mix';
  materialsT: number; deliveryT: number; totalT: number;
  picks: Record<string, string>; // materialId → supplierId
  usedSuppliers: string[];
}

export interface SupplierComparison {
  materials: MaterialOffers[];
  skipped: string[];              // бағасы белгісіз (ұсынысы жоқ) материалдар
  options: SupplierOption[];
  best?: SupplierOption;
  worst?: SupplierOption;
  diffWorstT: number;
  baseline?: { totalT: number; savingT: number; pct: number | null; note: string };
  baselineMissing: string[];
}

export function compareSuppliers(p: Project, res: ProjectResult): SupplierComparison {
  const supp = new Map(p.suppliers.map(s => [s.id, s]));
  const mats: MaterialOffers[] = [];
  const skipped: string[] = [];
  for (const r of res.materials) {
    if (!r.counted || r.error || !(r.qty > 0)) continue;
    const lines: OfferLine[] = p.offers
      .filter(o => o.materialId === r.id && supp.has(o.supplierId) && M.isPos(o.price))
      .map(o => {
        const min = M.isPos(o.minOrder) ? o.minOrder : 0;
        const buyQty = Math.max(r.qty, min);
        return { supplierId: o.supplierId, supplierName: supp.get(o.supplierId)!.name || 'Атаусыз', price: o.price, minOrder: min, buyQty, costT: M.costTiyn(buyQty, o.price), raisedToMin: buyQty > r.qty };
      });
    if (!lines.length) { skipped.push(r.name); continue; }
    const best = lines.reduce((a, b) => (b.costT < a.costT ? b : a));
    mats.push({ id: r.id, name: r.name, unit: r.unit, qty: r.qty, lines, best });
  }
  const out: SupplierComparison = { materials: mats, skipped, options: [], diffWorstT: 0, baselineMissing: [] };
  if (!mats.length) return out;

  const delivery = (ids: string[]) => ids.reduce((s, id) => s + M.toTiyn(supp.get(id)?.delivery ?? 0), 0);

  // 1) Бәрін бір жеткізушіден
  for (const s of p.suppliers) {
    const picks: Record<string, string> = {}; let sum = 0; let ok = true;
    for (const m of mats) {
      const l = m.lines.find(x => x.supplierId === s.id);
      if (!l) { ok = false; break; }
      picks[m.id] = s.id; sum += l.costT;
    }
    if (ok) {
      const d = delivery([s.id]);
      out.options.push({ label: `Бәрі «${s.name || 'Атаусыз'}» жеткізушісінен`, kind: 'single', materialsT: sum, deliveryT: d, totalT: sum + d, picks, usedSuppliers: [s.id] });
    }
  }

  // 2) Бірнеше жеткізушіге бөлу: жеткізушілер жиындарын толық сұрыптау (жеткізу құны әр жеткізушіге бір рет)
  const ids = p.suppliers.map(s => s.id).filter(id => mats.some(m => m.lines.some(l => l.supplierId === id)));
  let bestMix: SupplierOption | undefined;
  const n = Math.min(ids.length, 12);
  for (let mask = 1; mask < 1 << n; mask++) {
    const subset = ids.filter((_, i) => mask & (1 << i));
    const picks: Record<string, string> = {}; let sum = 0; let ok = true; const used = new Set<string>();
    for (const m of mats) {
      const cand = m.lines.filter(l => subset.includes(l.supplierId));
      if (!cand.length) { ok = false; break; }
      const b = cand.reduce((a, c) => (c.costT < a.costT ? c : a));
      picks[m.id] = b.supplierId; sum += b.costT; used.add(b.supplierId);
    }
    if (!ok) continue;
    const u = [...used]; const d = delivery(u); const total = sum + d;
    if (!bestMix || total < bestMix.totalT) bestMix = { label: 'Бірнеше жеткізушіге бөлу (ең тиімді үйлесім)', kind: 'best-mix', materialsT: sum, deliveryT: d, totalT: total, picks, usedSuppliers: u };
  }
  if (bestMix && bestMix.usedSuppliers.length > 1) out.options.push(bestMix);

  // 3) Ең қымбат таңдау (әр материал ең қымбат ұсыныстан)
  {
    const picks: Record<string, string> = {}; let sum = 0; const used = new Set<string>();
    for (const m of mats) {
      const w = m.lines.reduce((a, c) => (c.costT > a.costT ? c : a));
      picks[m.id] = w.supplierId; sum += w.costT; used.add(w.supplierId);
    }
    const u = [...used]; const d = delivery(u);
    out.options.push({ label: 'Ең қымбат ұсыныстар', kind: 'worst-mix', materialsT: sum, deliveryT: d, totalT: sum + d, picks, usedSuppliers: u });
  }

  const feasible = out.options.filter(o => o.kind !== 'worst-mix');
  if (bestMix && !feasible.includes(bestMix)) feasible.push(bestMix);
  out.best = feasible.reduce<SupplierOption | undefined>((a, o) => (!a || o.totalT < a.totalT ? o : a), undefined);
  out.worst = out.options.reduce<SupplierOption | undefined>((a, o) => (!a || o.totalT > a.totalT ? o : a), undefined);
  if (out.best && out.worst) out.diffWorstT = out.worst.totalT - out.best.totalT;

  // Бастапқы таңдалған нұсқа: негізгі бағалар + жобадағы жалпы жеткізу шығыны
  const baseLines = res.materials.filter(r => mats.some(m => m.id === r.id));
  out.baselineMissing = baseLines.filter(r => !M.isPos(r.price)).map(r => r.name);
  if (out.best && !out.baselineMissing.length) {
    const baseT = baseLines.reduce((s, r) => s + r.costT, 0) + res.deliveryT;
    const saving = baseT - out.best.totalT;
    out.baseline = {
      totalT: baseT, savingT: saving, pct: M.savingPct(baseT, out.best.totalT),
      note: 'Бастапқы нұсқа = негізгі енгізілген бағалар бойынша материал құны + жобадағы жеткізу шығыны (тек салыстырылған материалдар).',
    };
  }
  return out;
}

/* ---------- Үш бюджеттік сценарий ---------- */

export type Tier = 'economy' | 'standard' | 'premium';
export const TIER_NAMES: Record<Tier, string> = { economy: 'Үнемді', standard: 'Стандарт', premium: 'Жоғары бюджет' };

export interface ScenarioLine { id: MaterialId; name: string; qty: number; unit: string; price: number; costT: number; fromStandard: boolean; structural: boolean }
export interface Scenario { tier: Tier; lines: ScenarioLine[]; materialsT: number; totalT: number; diffStandardT: number; pctVsStandard: number | null; budgetD?: number; changed: number }

export function budgetScenarios(p: Project, res: ProjectResult, structural: (id: MaterialId) => boolean): { scenarios: Scenario[]; excluded: string[] } {
  const excluded: string[] = [];
  const base = res.materials.filter(r => r.counted && !r.error && r.qty > 0);
  const priced = base.filter(r => { if (!M.isPos(r.price)) { excluded.push(r.name); return false; } return true; });
  const make = (tier: Tier): Scenario => {
    let changed = 0;
    const lines = priced.map((r: MatResult) => {
      const s = p.materials[r.id];
      const tp = tier === 'economy' ? s.tiers.economy : tier === 'premium' ? s.tiers.premium : 0;
      const use = tier !== 'standard' && M.isPos(tp) ? tp : r.price;
      if (use !== r.price) changed++;
      return { id: r.id, name: r.name, qty: r.qty, unit: r.unit, price: use, costT: M.costTiyn(r.qty, use), fromStandard: use === r.price && tier !== 'standard', structural: structural(r.id) };
    });
    const materialsT = lines.reduce((s, l) => s + l.costT, 0);
    const customsT = (res.customs ?? []).filter(c => !c.error).reduce((a, c) => a + c.costT, 0); // жеке материалдар барлық сценарийде өзгеріссіз
    return { tier, lines, materialsT: materialsT + customsT, totalT: materialsT + customsT + res.deliveryT, diffStandardT: 0, pctVsStandard: null, changed };
  };
  const sc = (['economy', 'standard', 'premium'] as Tier[]).map(make);
  const std = sc[1];
  for (const s of sc) {
    s.diffStandardT = s.totalT - std.totalT;
    s.pctVsStandard = M.savingPct(std.totalT, s.totalT);
    if (res.budgetT > 0) s.budgetD = res.budgetT - s.totalT;
  }
  return { scenarios: sc, excluded };
}

/* ---------- Жобаларды (нұсқаларды) салыстыру — ғылыми зерттеу ---------- */

export interface VariantRow { id: MaterialId; name: string; unit: string; qty: (number | null)[]; costT: (number | null)[] }
export interface VariantComparison {
  names: string[];
  baseIndex: number;
  rows: VariantRow[];
  totals: number[];
  savings: { savingT: number; pct: number | null }[];
  budget: (number | null)[];
  sameDims: boolean;
  incomplete: boolean[];
  summary: string[];
}

export function compareVariants(projects: Project[], results: ProjectResult[], baseIndex: number): VariantComparison {
  const ids = new Set<MaterialId>();
  results.forEach(r => r.materials.forEach(m => ids.add(m.id)));
  const rows: VariantRow[] = [...ids].map(id => {
    const first = results.flatMap(r => r.materials).find(m => m.id === id)!;
    return {
      id, name: first.name, unit: first.unit,
      qty: results.map(r => { const m = r.materials.find(x => x.id === id); return m && !m.error ? m.qty : null; }),
      costT: results.map(r => { const m = r.materials.find(x => x.id === id); return m && !m.error && m.counted && !m.priceMissing ? m.costT : null; }),
    };
  });
  const totals = results.map(r => r.totalT);
  const base = totals[baseIndex];
  const savings = totals.map(t => ({ savingT: base - t, pct: M.savingPct(base, t) }));
  const dims = (pr: Project) => JSON.stringify(pr.floors.map(f => [f.shape, f.length, f.width, f.height, f.sections.map(s => [s.x, s.y, s.length, s.width]), f.manualArea, f.manualPerimeter]));
  const sameDims = projects.every(pr => dims(pr) === dims(projects[0]));
  const summary: string[] = [];
  projects.forEach((pr, i) => {
    if (i === baseIndex) return;
    const s = savings[i];
    const pct = s.pct === null ? '' : ` (${M.fmt(Math.abs(s.pct), 2)} %)`;
    if (s.savingT > 0) summary.push(`«${pr.name}» нұсқасы бастапқы «${projects[baseIndex].name}» нұсқасынан ${M.fmtMoney(s.savingT)} арзан${pct}.`);
    else if (s.savingT < 0) summary.push(`«${pr.name}» нұсқасы бастапқы «${projects[baseIndex].name}» нұсқасынан ${M.fmtMoney(-s.savingT)} қымбат${pct}.`);
    else summary.push(`«${pr.name}» мен «${projects[baseIndex].name}» нұсқаларының жалпы құны тең.`);
  });
  return {
    names: projects.map(p => p.name), baseIndex, rows, totals, savings,
    budget: results.map(r => (r.budgetT > 0 ? r.budgetT - r.totalT : null)),
    sameDims, incomplete: results.map(r => r.incomplete), summary,
  };
}
