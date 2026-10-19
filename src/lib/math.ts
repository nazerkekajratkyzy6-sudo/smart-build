// SMART BUILD — математикалық функциялар.
// Әр функция таза (pure): енгізілген мәндерден нәтиже мен есептеу жолын (қадамдарын) қайтарады.

export interface Step {
  title: string;                  // не есептеледі
  formula: string;                // 1-кезең: формула
  subst: string;                  // 2-кезең: сандарды қою
  result: string;                 // 3-кезең: нәтиже (бірлігімен)
  legend?: [string, string][];    // әріптердің мағынасы
  note?: string;                  // түсіндірме
}

export interface Calc {
  value: number;
  steps: Step[];
  error?: string;
}

/* ---------- Сандарды пішімдеу ---------- */

const NBSP = ' ';

/** Мыңдық бөлгішпен, үтірлі ондық бөлшекпен пішімдеу: 12 345,67 */
export function fmt(n: number, maxDigits = 2): string {
  if (!Number.isFinite(n)) return '—';
  const neg = n < 0;
  const factor = 10 ** maxDigits;
  const rounded = Math.round(Math.abs(n) * factor + 1e-9) / factor;
  let [int, frac = ''] = rounded.toFixed(maxDigits).split('.');
  frac = frac.replace(/0+$/, '');
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return (neg ? '−' : '') + int + (frac ? ',' + frac : '');
}

/** Теңгемен: тиыннан (бүтін сан) ₸ мәтініне */
export function fmtMoney(tiyn: number): string {
  return fmt(tiyn / 100, 2) + NBSP + '₸';
}

/* ---------- Дөңгелектеу және ақша ---------- */

const EPS = 1e-9;

/** Жоғары дөңгелектеу, қалқымалы үтір қатесінен қорғалған (10,0000000001 → 10). */
export function ceilSafe(x: number): number {
  return Math.ceil(x - EPS * Math.max(1, Math.abs(x))) + 0; // +0: −0 болмауы үшін
}

/** n ондық таңбаға дейін жоғары дөңгелектеу. */
export function ceilTo(x: number, digits: number): number {
  const f = 10 ** digits;
  return ceilSafe(round(x * f, 6)) / f;
}

/** Қалыпты дөңгелектеу (геометриялық мәндер үшін). */
export function round(x: number, digits = 4): number {
  const f = 10 ** digits;
  return Math.round((x + Math.sign(x) * EPS) * f) / f;
}

/** Ақша тиынмен (бүтін сан) сақталады — қалқымалы үтір қатесі жиналмайды. */
export function toTiyn(tenge: number): number {
  return Math.round(round(tenge, 6) * 100);
}

/** C = Q × p, нәтиже тиынмен (бүтін сан). */
export function costTiyn(qty: number, price: number): number {
  return Math.round(round(qty * price, 6) * 100);
}

/* ---------- Тексеру ---------- */

export const ERR_SIZE = 'Өлшемді дұрыс енгізіңіз';

export function isPos(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x > 0;
}
export function isNonNeg(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0;
}

function fail(error: string): Calc {
  return { value: 0, steps: [], error };
}

const f = (n: number, d = 4) => fmt(n, d);

/* ---------- Геометрия ---------- */

export function rectArea(a: number, b: number): Calc {
  if (!isPos(a) || !isPos(b)) return fail(ERR_SIZE);
  const S = round(a * b);
  return {
    value: S,
    steps: [{
      title: 'Аудан', formula: 'S = a × b', subst: `S = ${f(a)} × ${f(b)}`, result: `S = ${f(S)} м²`,
      legend: [['S', 'аудан, м²'], ['a', 'ұзындық, м'], ['b', 'ен, м']],
    }],
  };
}

export function rectPerimeter(a: number, b: number): Calc {
  if (!isPos(a) || !isPos(b)) return fail(ERR_SIZE);
  const P = round(2 * (a + b));
  return {
    value: P,
    steps: [{
      title: 'Периметр', formula: 'P = 2(a + b)', subst: `P = 2(${f(a)} + ${f(b)})`, result: `P = ${f(P)} м`,
      legend: [['P', 'периметр, м'], ['a', 'ұзындық, м'], ['b', 'ен, м']],
    }],
  };
}

export interface SectionRect { x: number; y: number; length: number; width: number }

/**
 * Тік төртбұрышты бөліктердің бірігуінің (union) ауданы мен периметрі.
 * Координаталарды сығу (coordinate compression) әдісі: жазықтық тор ұяшықтарына бөлінеді,
 * қабаттасқан бөлік бір-ақ рет есептеледі. Периметр — жабылған/бос ұяшықтар шекарасының ұзындығы.
 */
export function unionGeometry(rects: SectionRect[]): { area: number; perimeter: number; error?: string } {
  if (!rects.length) return { area: 0, perimeter: 0, error: 'Кемінде бір бөлік қосыңыз' };
  for (const r of rects) {
    if (!isPos(r.length) || !isPos(r.width) || !Number.isFinite(r.x) || !Number.isFinite(r.y)) {
      return { area: 0, perimeter: 0, error: ERR_SIZE };
    }
  }
  const xs = [...new Set(rects.flatMap(r => [round(r.x, 6), round(r.x + r.length, 6)]))].sort((a, b) => a - b);
  const ys = [...new Set(rects.flatMap(r => [round(r.y, 6), round(r.y + r.width, 6)]))].sort((a, b) => a - b);
  const nx = xs.length - 1, ny = ys.length - 1;
  const covered: boolean[][] = Array.from({ length: nx }, () => Array(ny).fill(false));
  for (const r of rects) {
    const x0 = xs.indexOf(round(r.x, 6)), x1 = xs.indexOf(round(r.x + r.length, 6));
    const y0 = ys.indexOf(round(r.y, 6)), y1 = ys.indexOf(round(r.y + r.width, 6));
    for (let i = x0; i < x1; i++) for (let j = y0; j < y1; j++) covered[i][j] = true;
  }
  const c = (i: number, j: number) => i >= 0 && j >= 0 && i < nx && j < ny && covered[i][j];
  let area = 0, perim = 0;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    if (!covered[i][j]) continue;
    const w = xs[i + 1] - xs[i], h = ys[j + 1] - ys[j];
    area += w * h;
    if (!c(i - 1, j)) perim += h;
    if (!c(i + 1, j)) perim += h;
    if (!c(i, j - 1)) perim += w;
    if (!c(i, j + 1)) perim += w;
  }
  return { area: round(area), perimeter: round(perim) };
}

/** Сыртқы қабырғалардың ауданы: Sқ = P × h (ойықтар шегерілмейді). */
export function wallArea(P: number, h: number): Calc {
  if (!isPos(P) || !isPos(h)) return fail(ERR_SIZE);
  const S = round(P * h);
  return {
    value: S,
    steps: [{
      title: 'Қабырға ауданы', formula: 'Sқ = P × h', subst: `Sқ = ${f(P)} × ${f(h)}`, result: `Sқ = ${f(S)} м²`,
      legend: [['Sқ', 'қабырғалардың ауданы, м²'], ['P', 'периметр, м'], ['h', 'қабырға биіктігі, м']],
      note: 'Қабырға ауданы ойықтарды шегермей есептелді',
    }],
  };
}

/** Қабырға көлемі: Vқ = Sқ × t */
export function wallVolume(S: number, t: number): Calc {
  if (!isPos(S) || !isPos(t)) return fail(ERR_SIZE);
  const V = round(S * t);
  return {
    value: V,
    steps: [{
      title: 'Қабырға көлемі', formula: 'Vқ = Sқ × t', subst: `Vқ = ${f(S)} × ${f(t)}`, result: `Vқ = ${f(V)} м³`,
      legend: [['Vқ', 'қабырға көлемі, м³'], ['Sқ', 'қабырға ауданы, м²'], ['t', 'қабырға қалыңдығы, м']],
    }],
  };
}

/** Қор коэффициентін қолдану: Q' = Q × (1 + k/100) */
export function withReserve(q: number, wastePct: number, unit: string, title = 'Қорды қосу'): Calc {
  if (!isNonNeg(q) || !isNonNeg(wastePct)) return fail(ERR_SIZE);
  const v = round(q * (1 + wastePct / 100), 6);
  return {
    value: v,
    steps: [{
      title, formula: "Q' = Q × (1 + k / 100)", subst: `Q' = ${f(q)} × (1 + ${f(wastePct)} / 100)`,
      result: `Q' = ${f(v)} ${unit}`,
      legend: [["Q'", 'қормен алынған мөлшер'], ['Q', 'есептелген мөлшер'], ['k', 'қалдыққа арналған қор, %']],
      note: 'Пайыз: 1 % — шаманың жүзден бір бөлігі.',
    }],
  };
}

function ceilStep(q: number, unit: string, what = 'сатып алу бірлігі'): Step {
  const n = ceilSafe(q);
  return {
    title: 'Дөңгелектеу', formula: 'N = ⌈Q⌉', subst: `N = ⌈${f(q)}⌉`, result: `N = ${fmt(n, 0)} ${unit}`,
    legend: [['⌈ ⌉', 'жоғары қарай бүтінге дөңгелектеу']],
    note: `${what} бөлшектеніп сатылмайтындықтан, жоғары дөңгелектенеді.`,
  };
}

/* ---------- 8.1 Кірпіш ---------- */

export interface BrickIn { wallVolume: number; L: number; W: number; H: number; joint: number; waste: number }

/** Кірпіш саны: N = Vқ / ((L+j)(W+j)(H+j)) — ерітінді жігін ескерген модульдік көлем. */
export function brickCount(i: BrickIn): Calc & { mortar: number; net: number } {
  if (!isPos(i.wallVolume) || !isPos(i.L) || !isPos(i.W) || !isPos(i.H) || !isNonNeg(i.joint) || !isNonNeg(i.waste)) {
    return { ...fail(ERR_SIZE), mortar: 0, net: 0 };
  }
  const mm = (x: number) => x / 1000;
  const vMod = mm(i.L + i.joint) * mm(i.W + i.joint) * mm(i.H + i.joint);
  const vBrick = mm(i.L) * mm(i.W) * mm(i.H);
  const net = round(i.wallVolume / vMod, 4);
  const withR = round(net * (1 + i.waste / 100), 6);
  const N = ceilSafe(withR);
  const mortar = round(Math.max(0, i.wallVolume - net * vBrick), 4);
  return {
    value: N, net, mortar,
    steps: [
      {
        title: 'Кірпіштің модульдік көлемі (жікпен)', formula: 'Vм = (L + j)(W + j)(H + j)',
        subst: `Vм = (${f(i.L)} + ${f(i.joint)})(${f(i.W)} + ${f(i.joint)})(${f(i.H)} + ${f(i.joint)}) мм³`,
        result: `Vм = ${fmt(vMod, 8)} м³`,
        legend: [['L, W, H', 'кірпіштің ұзындығы, ені, биіктігі, мм'], ['j', 'ерітінді жігінің қалыңдығы, мм']],
        note: '1 м = 1000 мм, сондықтан мм³ → м³ үшін 10⁹-ға бөлінеді.',
      },
      {
        title: 'Кірпіш саны (қорсыз)', formula: 'N₀ = Vқ / Vм', subst: `N₀ = ${f(i.wallVolume)} / ${fmt(vMod, 8)}`,
        result: `N₀ = ${f(net, 2)} дана`, legend: [['Vқ', 'қабырға көлемі, м³']],
      },
      withReserve(net, i.waste, 'дана').steps[0],
      ceilStep(withR, 'дана', 'Кірпіш'),
      {
        title: 'Ерітінді көлемі', formula: 'Vер = Vқ − N₀ × Vк', subst: `Vер = ${f(i.wallVolume)} − ${f(net, 2)} × ${fmt(vBrick, 8)}`,
        result: `Vер = ${f(mortar)} м³`, legend: [['Vк', 'бір кірпіштің өз көлемі, м³']],
        note: 'Ерітінді көлемі цемент пен құмды есептеуге қолданылады.',
      },
    ],
  };
}

/* ---------- 8.2 Бетон ---------- */

export function stripVolume(L: number, b: number, h: number): Calc {
  if (!isPos(L) || !isPos(b) || !isPos(h)) return fail(ERR_SIZE);
  const V = round(L * b * h);
  return {
    value: V,
    steps: [{
      title: 'Таспалы іргетас көлемі', formula: 'V = L × b × h', subst: `V = ${f(L)} × ${f(b)} × ${f(h)}`, result: `V = ${f(V)} м³`,
      legend: [['L', 'таспаның жалпы ұзындығы, м'], ['b', 'таспаның ені, м'], ['h', 'таспаның биіктігі, м']],
    }],
  };
}

export function slabVolume(S: number, t: number, title = 'Плиталық іргетас көлемі'): Calc {
  if (!isPos(S) || !isPos(t)) return fail(ERR_SIZE);
  const V = round(S * t);
  return {
    value: V,
    steps: [{
      title, formula: 'V = S × t', subst: `V = ${f(S)} × ${f(t)}`, result: `V = ${f(V)} м³`,
      legend: [['S', 'плитаның ауданы, м²'], ['t', 'плитаның қалыңдығы, м']],
    }],
  };
}

/* ---------- 8.3 Цемент / масса → қап ---------- */

export function bagsFromMass(kg: number, bagKg: number, waste: number, what: string): Calc {
  if (!isNonNeg(kg) || !isNonNeg(waste)) return fail(ERR_SIZE);
  if (!isPos(bagKg)) return fail('Қаптың салмағы нөлден үлкен болуы керек');
  const withR = round(kg * (1 + waste / 100), 6);
  const raw = round(withR / bagKg, 6);
  const n = ceilSafe(raw);
  return {
    value: n,
    steps: [
      withReserve(kg, waste, 'кг').steps[0],
      {
        title: 'Қап саны', formula: "n = m' / mқ", subst: `n = ${f(withR)} / ${f(bagKg)}`, result: `n = ${f(raw)} қап`,
        legend: [["m'", 'қормен алынған масса, кг'], ['mқ', 'бір қаптың салмағы, кг']],
      },
      ceilStep(raw, 'қап', `${what} қабы`),
    ],
  };
}

/* ---------- 8.5 Шатыр ---------- */

export function roofArea(a: number, b: number, alphaDeg: number): Calc {
  if (!isPos(a) || !isPos(b) || !isNonNeg(alphaDeg)) return fail(ERR_SIZE);
  if (alphaDeg >= 80) return fail('Шатыр еңісі 80°-тан кіші болуы керек');
  const cos = Math.cos((alphaDeg * Math.PI) / 180);
  const S = round((a * b) / cos);
  return {
    value: S,
    steps: [{
      title: 'Шатыр ауданы', formula: 'Sшатыр = a × b / cos(α)',
      subst: `Sшатыр = ${f(a)} × ${f(b)} / cos(${f(alphaDeg, 2)}°) = ${f(a * b)} / ${fmt(cos, 4)}`,
      result: `Sшатыр = ${f(S)} м²`,
      legend: [['a, b', 'шатырдың жоспардағы өлшемдері (шығыңқы бөлігімен), м'], ['α', 'еңістің горизонтқа қатысты бұрышы']],
      note: 'Формула қарапайым екі еңісті шатырдың жалпы жазықтық ауданына арналған.',
    }],
  };
}

/* ---------- 8.6 Жабу ауданы бойынша қаптама ---------- */

export function packsByCoverage(area: number, layers: number, coverage: number, waste: number): Calc {
  if (!isPos(area) || !isPos(layers) || !isNonNeg(waste)) return fail(ERR_SIZE);
  if (!isPos(coverage)) return fail('Қаптаманың жабу ауданы нөлден үлкен болуы керек');
  const total = round(area * layers);
  const withR = round(total * (1 + waste / 100), 6);
  const raw = round(withR / coverage, 6);
  return {
    value: ceilSafe(raw),
    steps: [
      {
        title: 'Жабылатын жалпы аудан', formula: 'Sж = S × k', subst: `Sж = ${f(area)} × ${f(layers, 0)}`, result: `Sж = ${f(total)} м²`,
        legend: [['S', 'оқшауланатын аудан, м²'], ['k', 'қабат саны']],
      },
      withReserve(total, waste, 'м²').steps[0],
      {
        title: 'Қаптама саны', formula: "n = S' / Sқап", subst: `n = ${f(withR)} / ${f(coverage)}`, result: `n = ${f(raw)} қаптама`,
        legend: [['Sқап', 'бір қаптаманың жабу ауданы, м²']],
      },
      ceilStep(raw, 'қаптама', 'Қаптама'),
    ],
  };
}

/* ---------- 8.7 Тұсқағаз ---------- */

export interface WallpaperIn { P: number; h: number; rollLength: number; rollWidth: number; repeat: number; trim: number }

export function wallpaperRolls(i: WallpaperIn): Calc & { strips: number; stripLen: number; perRoll: number } {
  const bad = { strips: 0, stripLen: 0, perRoll: 0 };
  if (!isPos(i.P) || !isPos(i.h) || !isNonNeg(i.repeat) || !isNonNeg(i.trim)) return { ...fail(ERR_SIZE), ...bad };
  if (!isPos(i.rollLength) || !isPos(i.rollWidth)) return { ...fail('Рулонның ұзындығы мен ені нөлден үлкен болуы керек'), ...bad };
  const strips = ceilSafe(round(i.P / i.rollWidth, 6));
  const base = round(i.h + i.trim);
  const stripLen = i.repeat > 0 ? round(ceilSafe(round(base / i.repeat, 6)) * i.repeat) : base;
  const perRoll = Math.floor(round(i.rollLength / stripLen, 6) + 1e-9);
  if (perRoll < 1) return { ...fail('Бір жолақ рулон ұзындығынан ұзын — рулон параметрлерін тексеріңіз'), ...bad };
  const rolls = ceilSafe(strips / perRoll);
  return {
    value: rolls, strips, stripLen, perRoll,
    steps: [
      {
        title: 'Жолақ саны', formula: 'nж = ⌈P / bр⌉', subst: `nж = ⌈${f(i.P)} / ${f(i.rollWidth)}⌉`, result: `nж = ${strips} жолақ`,
        legend: [['P', 'бөлме периметрі, м'], ['bр', 'рулон ені, м']],
      },
      {
        title: 'Бір жолақтың ұзындығы', formula: i.repeat > 0 ? 'lж = ⌈(h + c) / r⌉ × r' : 'lж = h + c',
        subst: i.repeat > 0 ? `lж = ⌈(${f(i.h)} + ${f(i.trim)}) / ${f(i.repeat)}⌉ × ${f(i.repeat)}` : `lж = ${f(i.h)} + ${f(i.trim)}`,
        result: `lж = ${f(stripLen)} м`,
        legend: [['h', 'қабырға биіктігі, м'], ['c', 'кесу қоры, м'], ['r', 'өрнек сәйкестендіру қадамы, м']],
      },
      {
        title: 'Бір рулоннан шығатын толық жолақ', formula: 'k = ⌊lр / lж⌋', subst: `k = ⌊${f(i.rollLength)} / ${f(stripLen)}⌋`,
        result: `k = ${perRoll} жолақ`, legend: [['lр', 'рулон ұзындығы, м'], ['⌊ ⌋', 'төмен қарай бүтінге дөңгелектеу']],
        note: 'Рулонның қалған қысқа бөлігінен толық жолақ шықпайды.',
      },
      {
        title: 'Рулон саны', formula: 'N = ⌈nж / k⌉', subst: `N = ⌈${strips} / ${perRoll}⌉`, result: `N = ${rolls} рулон`,
      },
    ],
  };
}

/* ---------- 8.8 Линолеум ---------- */

export function linoleumArea(a: number, b: number, rollWidth: number, margin: number): Calc & { strips: number; cutLen: number } {
  const bad = { strips: 0, cutLen: 0 };
  if (!isPos(a) || !isPos(b) || !isNonNeg(margin)) return { ...fail(ERR_SIZE), ...bad };
  if (!isPos(rollWidth)) return { ...fail('Орам ені нөлден үлкен болуы керек'), ...bad };
  const opt = (len: number, across: number) => {
    const strips = ceilSafe(round(across / rollWidth, 6));
    const cutLen = round(len + margin);
    return { strips, cutLen, area: round(strips * rollWidth * cutLen) };
  };
  const o1 = opt(a, b), o2 = opt(b, a);
  const best = o1.area <= o2.area ? o1 : o2;
  const lay = best === o1 ? [a, b] : [b, a];
  const S = round(a * b);
  return {
    value: best.area, strips: best.strips, cutLen: best.cutLen,
    steps: [
      {
        title: 'Еден ауданы', formula: 'S = a × b', subst: `S = ${f(a)} × ${f(b)}`, result: `S = ${f(S)} м²`,
      },
      {
        title: 'Орам жолақтарының саны', formula: 'n = ⌈b / w⌉', subst: `n = ⌈${f(lay[1])} / ${f(rollWidth)}⌉`, result: `n = ${best.strips} жолақ`,
        legend: [['w', 'орам ені, м'], ['b', 'жолақтарға көлденең өлшем, м']],
        note: 'Екі бағыт салыстырылып, қалдығы аз бағыт таңдалды.',
      },
      {
        title: 'Сатып алу ауданы', formula: 'Sс = n × w × (a + m)', subst: `Sс = ${best.strips} × ${f(rollWidth)} × (${f(lay[0])} + ${f(margin)})`,
        result: `Sс = ${f(best.area)} м²`, legend: [['m', 'қию қоры, м']],
      },
      {
        title: 'Қию қалдығы', formula: 'Δ = Sс − S', subst: `Δ = ${f(best.area)} − ${f(S)}`, result: `Δ = ${f(round(best.area - S))} м²`,
        note: 'Сатып алу ауданы еден ауданынан кем емес.',
      },
    ],
  };
}

/* ---------- 8.9 / 8.10 Ұзындық бойынша (галтель, плинтус) ---------- */

export function piecesByLength(L: number, pieceLen: number, waste: number, byPiece: boolean): Calc & { meters: number } {
  if (!isPos(L) || !isNonNeg(waste)) return { ...fail(ERR_SIZE), meters: 0 };
  const withR = round(L * (1 + waste / 100), 6);
  const steps: Step[] = [withReserve(L, waste, 'м', 'Кесу қорын қосу').steps[0]];
  if (!byPiece) {
    const m = ceilTo(withR, 1);
    steps.push({ title: 'Дөңгелектеу', formula: 'L = ⌈L\'⌉₀,₁', subst: `L = ⌈${f(withR)}⌉`, result: `L = ${f(m)} м`, note: 'Метрмен сатылғанда 0,1 м дәлдікпен жоғары дөңгелектенді.' });
    return { value: m, meters: m, steps };
  }
  if (!isPos(pieceLen)) return { ...fail('Бір дананың ұзындығы нөлден үлкен болуы керек'), meters: 0 };
  const raw = round(withR / pieceLen, 6);
  steps.push({
    title: 'Дана саны', formula: "n = L' / l", subst: `n = ${f(withR)} / ${f(pieceLen)}`, result: `n = ${f(raw)} дана`,
    legend: [['l', 'бір дананың стандарт ұзындығы, м']],
  });
  steps.push(ceilStep(raw, 'дана', 'Дана'));
  return { value: ceilSafe(raw), meters: withR, steps };
}

/* ---------- Кафель (плитка) ---------- */

export interface TileIn { S: number; L: number; W: number; joint: number; waste: number }

/** Кафель саны: N = ⌈S / ((L + j)(W + j)) × (1 + k)⌉; сатып алу ауданы = N × L × W. */
export function tileCount(i: TileIn): Calc & { pieces: number; m2: number; perM2: number } {
  const bad = { pieces: 0, m2: 0, perM2: 0 };
  if (!isPos(i.S) || !isNonNeg(i.joint) || !isNonNeg(i.waste)) return { ...fail(ERR_SIZE), ...bad };
  if (!isPos(i.L) || !isPos(i.W)) return { ...fail('Кафельдің ұзындығы мен енін енгізіңіз'), ...bad };
  const mod = ((i.L + i.joint) / 1000) * ((i.W + i.joint) / 1000);
  const perM2 = round(1 / mod, 4);
  const raw = round(i.S / mod, 4);
  const withR = round(raw * (1 + i.waste / 100), 6);
  const N = ceilSafe(withR);
  const m2 = round(N * (i.L / 1000) * (i.W / 1000), 4);
  return {
    value: N, pieces: N, m2, perM2,
    steps: [
      { title: 'Бір кафельдің жігімен алатын ауданы', formula: 'Sм = (L + j)(W + j)', subst: `Sм = (${f(i.L)} + ${f(i.joint)})(${f(i.W)} + ${f(i.joint)}) мм²`, result: `Sм = ${fmt(mod, 6)} м²` },
      { title: 'Кафель саны (қорсыз)', formula: 'N₀ = S / Sм', subst: `N₀ = ${f(i.S)} / ${fmt(mod, 6)}`, result: `N₀ = ${f(raw, 2)} дана` },
      withReserve(raw, i.waste, 'дана', 'Кесу мен сынуға қор').steps[0],
      ceilStep(withR, 'дана', 'Кафель'),
    ],
  };
}

/* ---------- 8.11 Бояу ---------- */

export function paintLitres(S: number, n: number, r: number): Calc {
  if (!isPos(S) || !isPos(n)) return fail(ERR_SIZE);
  if (!isPos(r)) return fail('Бояудың жабу нормасы нөлден үлкен болуы керек');
  const Q = round((S * n) / r);
  return {
    value: Q,
    steps: [{
      title: 'Бояу мөлшері', formula: 'Q = S × n / r', subst: `Q = ${f(S)} × ${f(n, 0)} / ${f(r)}`, result: `Q = ${f(Q)} л`,
      legend: [['Q', 'бояу мөлшері, л'], ['S', 'боялатын аудан, м²'], ['n', 'қабат саны'], ['r', '1 литрдің бір қабатта жабатын ауданы, м²/л']],
    }],
  };
}

export function containersFromVolume(q: number, size: number, unit: string, what: string): Calc {
  if (!isNonNeg(q)) return fail(ERR_SIZE);
  if (!isPos(size)) return fail(`${what} көлемі нөлден үлкен болуы керек`);
  const raw = round(q / size, 6);
  return {
    value: ceilSafe(raw),
    steps: [
      { title: `${what} саны`, formula: 'n = Q / V', subst: `n = ${f(q)} / ${f(size)}`, result: `n = ${f(raw)} ${unit}`, legend: [['V', `бір ${what.toLowerCase()} көлемі, л`]] },
      ceilStep(raw, unit, what),
    ],
  };
}

/* ---------- 8.12 Желім ---------- */

export function gluePacks(S: number, normG: number, packG: number, waste: number): Calc {
  if (!isPos(S) || !isNonNeg(waste)) return fail(ERR_SIZE);
  if (!isPos(normG)) return fail('Желімнің шығын нормасын енгізіңіз');
  if (!isPos(packG)) return fail('Қаптаманың салмағы нөлден үлкен болуы керек');
  const m = round(S * normG);
  const withR = round(m * (1 + waste / 100), 6);
  const raw = round(withR / packG, 6);
  return {
    value: ceilSafe(raw),
    steps: [
      { title: 'Желім массасы', formula: 'm = S × q', subst: `m = ${f(S)} × ${f(normG)}`, result: `m = ${f(m)} г`, legend: [['S', 'жабылатын аудан, м²'], ['q', 'шығын нормасы, г/м²']] },
      withReserve(m, waste, 'г').steps[0],
      { title: 'Қаптама саны', formula: "n = m' / mқап", subst: `n = ${f(withR)} / ${f(packG)}`, result: `n = ${f(raw)} қаптама` },
      ceilStep(raw, 'қаптама', 'Қаптама'),
    ],
  };
}

/* ---------- 8.13 / 8.14 Қалыңдық бойынша құрғақ қоспа ---------- */

export function mixMass(S: number, thicknessMm: number, norm: number): Calc {
  if (!isPos(S) || !isPos(thicknessMm)) return fail(ERR_SIZE);
  if (!isPos(norm)) return fail('Өндірушінің шығын нормасын енгізіңіз');
  const m = round(S * thicknessMm * norm);
  return {
    value: m,
    steps: [{
      title: 'Қоспа массасы', formula: 'm = S × d × q', subst: `m = ${f(S)} × ${f(thicknessMm)} × ${f(norm)}`, result: `m = ${f(m)} кг`,
      legend: [['S', 'аудан, м²'], ['d', 'қабат қалыңдығы, мм'], ['q', 'шығын нормасы, кг/(м²·мм)']],
    }],
  };
}

/* ---------- Бюджет, үнем ---------- */

export function budgetDiff(budgetTiyn: number, costT: number): Calc {
  const D = budgetTiyn - costT;
  return {
    value: D,
    steps: [{
      title: 'Бюджет айырмашылығы', formula: 'D = B − C', subst: `D = ${fmtMoney(budgetTiyn)} − ${fmtMoney(costT)}`, result: `D = ${fmtMoney(D)}`,
      legend: [['B', 'жоспарланған бюджет'], ['C', 'есептелген жалпы шығын'], ['D', 'қалған (+) немесе жетіспейтін (−) қаражат']],
    }],
  };
}

/** Үнем пайызы бастапқы құнға қатысты: e = (C₀ − C₁) / C₀ × 100 % */
export function savingPct(baseT: number, newT: number): number | null {
  if (!(baseT > 0)) return null;
  return round(((baseT - newT) / baseT) * 100, 2);
}
