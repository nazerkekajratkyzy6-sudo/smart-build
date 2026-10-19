import { describe, expect, it } from 'vitest';
import * as M from './math';
import { computeProject } from './engine';
import { createProject, newRoom } from './defaults';
import { budgetScenarios, compareSuppliers, compareVariants } from './compare';
import { MAT, MATERIALS } from './materials';
import type { MaterialId, Project } from './types';

const priceAll = (p: Project, price = 100) => { for (const d of MATERIALS) p.materials[d.id].price = price; return p; };
const mat = (r: ReturnType<typeof computeProject>, id: MaterialId) => r.materials.find(m => m.id === id)!;

describe('Дөңгелектеу және ақша', () => {
  it('ceilSafe қалқымалы үтір қатесін жоғары дөңгелектемейді', () => {
    expect(M.ceilSafe(0.1 * 3 / 0.3)).toBe(1);
    expect(M.ceilSafe(10.000000000001)).toBe(10);
    expect(M.ceilSafe(10.01)).toBe(11);
    expect(M.ceilSafe(0)).toBe(0);
  });
  it('ceilTo ондық таңбаға жоғары дөңгелектейді', () => {
    expect(M.ceilTo(3.01, 1)).toBe(3.1);
    expect(M.ceilTo(3.1, 1)).toBe(3.1);
  });
  it('ақша тиынмен дәл есептеледі', () => {
    expect(M.costTiyn(3, 0.1)).toBe(30);           // 0,3 ₸
    expect(M.costTiyn(0.1 + 0.2, 10)).toBe(300);   // 3 ₸
    expect(M.costTiyn(1234, 105.55)).toBe(13024870);
  });
  it('мыңдық бөлгішпен пішімдейді', () => {
    expect(M.fmt(1234567.5)).toBe('1 234 567,5');
    expect(M.fmtMoney(150000)).toBe('1 500 ₸');
  });
});

describe('Геометрия', () => {
  it('аудан, периметр, қабырға', () => {
    expect(M.rectArea(10, 8).value).toBe(80);
    expect(M.rectPerimeter(10, 8).value).toBe(36);
    expect(M.wallArea(36, 3).value).toBe(108);
    expect(M.wallVolume(108, 0.38).value).toBeCloseTo(41.04, 6);
  });
  it('теріс және нөл өлшемдерді қабылдамайды', () => {
    expect(M.rectArea(-1, 5).error).toBe(M.ERR_SIZE);
    expect(M.rectArea(0, 5).error).toBe(M.ERR_SIZE);
    expect(M.rectArea(NaN, 5).error).toBe(M.ERR_SIZE);
  });
  it('қабаттасқан бөліктердің ауданы екі рет есептелмейді', () => {
    const u = M.unionGeometry([{ x: 0, y: 0, length: 10, width: 8 }, { x: 6, y: 0, length: 8, width: 5 }]);
    expect(u.area).toBe(80 + 4 * 5);      // 100
    expect(u.perimeter).toBe(2 * (14 + 8)); // L-пішін периметрі = қоршау тіктөртбұрыштікі
  });
  it('L-пішін периметрі', () => {
    const u = M.unionGeometry([{ x: 0, y: 0, length: 10, width: 8 }, { x: 10, y: 0, length: 4, width: 5 }]);
    expect(u.area).toBe(100);
    expect(u.perimeter).toBe(44);
  });
});

describe('Материал формулалары', () => {
  it('кірпіш', () => {
    const b = M.brickCount({ wallVolume: 10, L: 250, W: 120, H: 65, joint: 10, waste: 0 });
    // Vм = 0.26*0.13*0.075 = 0.002535 → 10/0.002535 = 3944.77
    expect(b.value).toBe(3945);
    expect(b.mortar).toBeGreaterThan(0);
  });
  it('бетон: таспалы және плиталық', () => {
    expect(M.stripVolume(36, 0.4, 1.2).value).toBeCloseTo(17.28);
    expect(M.slabVolume(80, 0.25).value).toBe(20);
  });
  it('цемент қаптары жоғары дөңгелектенеді, нөлдік қап қате', () => {
    expect(M.bagsFromMass(1001, 50, 0, 'Цемент').value).toBe(21);
    expect(M.bagsFromMass(1000, 50, 0, 'Цемент').value).toBe(20);
    expect(M.bagsFromMass(1000, 0, 0, 'Цемент').error).toBeTruthy();
  });
  it('шатыр: cos бойынша', () => {
    expect(M.roofArea(10, 8, 0).value).toBe(80);
    expect(M.roofArea(10, 8, 60).value).toBeCloseTo(160, 3);
    expect(M.roofArea(10, 8, 85).error).toBeTruthy();
  });
  it('жылу оқшаулағыш қаптамасы', () => {
    expect(M.packsByCoverage(100, 2, 5, 0).value).toBe(40);
    expect(M.packsByCoverage(100, 1, 0, 0).error).toBeTruthy();
  });
  it('тұсқағаз: жолақ әдісі', () => {
    // P=14, h=2.7, рулон 10.05×0.53, кесу қоры 0.1 → 27 жолақ, жолақ 2.8 м, рулонда 3 жолақ → 9 рулон
    const w = M.wallpaperRolls({ P: 14, h: 2.7, rollLength: 10.05, rollWidth: 0.53, repeat: 0, trim: 0.1 });
    expect(w.strips).toBe(27);
    expect(w.perRoll).toBe(3);
    expect(w.value).toBe(9);
    // өрнек қадамы 0.64 → жолақ 3.2 м → рулонда 3 жолақ
    const r = M.wallpaperRolls({ P: 14, h: 2.7, rollLength: 10.05, rollWidth: 0.53, repeat: 0.64, trim: 0.1 });
    expect(r.stripLen).toBeCloseTo(3.2);
    expect(r.perRoll).toBe(3);
  });
  it('линолеум сатып алу ауданы еден ауданынан кем емес', () => {
    const l = M.linoleumArea(4.5, 4, 3, 0.1);
    expect(l.value).toBeGreaterThanOrEqual(18);
    expect(l.value).toBeCloseTo(2 * 3 * 4.1); // 4 м бойымен, 2 жолақ
  });
  it('галтель/плинтус дана саны', () => {
    expect(M.piecesByLength(17, 2.5, 10, true).value).toBe(8); // 18.7/2.5=7.48
    expect(M.piecesByLength(17, 2.5, 0, false).value).toBe(17);
  });
  it('бояу Q = S·n/r және шелек', () => {
    expect(M.paintLitres(50, 2, 10).value).toBe(10);
    expect(M.containersFromVolume(10.5, 5, 'шелек', 'Шелек').value).toBe(3);
  });
  it('желім, сылақ, тегістегіш', () => {
    expect(M.gluePacks(100, 8, 200, 0).value).toBe(4);
    expect(M.mixMass(10, 10, 0.9).value).toBe(90);
  });
});

describe('Жобаны толық есептеу', () => {
  for (const type of ['small', 'family', 'twostory', 'custom'] as const) {
    it(`${type}: 15 материал қатесіз есептеледі (бөлме болса)`, () => {
      const p = priceAll(createProject(type));
      if (!p.rooms.length) p.rooms.push(newRoom(p.floors[0].id, 'living', 5, 4), newRoom(p.floors[0].id, 'bath', 2, 2));
      p.rooms[0].wallFinish = 'both'; p.rooms[0].paintCeiling = true;
      if (!p.rooms.some(r => r.tileFloor || r.wallFinish === 'tile')) { const last = p.rooms[p.rooms.length - 1]; last.tileFloor = true; last.linoleum = false; }
      if (!p.rooms.some(r => r.linoleum)) p.rooms[0].linoleum = true;
      const r = computeProject(p);
      expect(r.errors).toEqual([]);
      expect(r.materials).toHaveLength(15);
      for (const m of r.materials) {
        expect(m.qty, m.name).toBeGreaterThan(0);
        if (m.counted) expect(m.costT).toBe(M.costTiyn(m.qty, 100));
      }
      expect(r.totalT).toBe(r.buildT + r.finishT);
    });
  }

  it('екі қабатты үйде қабат аралық жабын бетонға қосылады', () => {
    const p = createProject('twostory');
    const with1 = mat(computeProject(p), 'concrete').qty;
    p.interFloorSlab.enabled = false;
    const without = mat(computeProject(p), 'concrete').qty;
    expect(with1).toBeGreaterThan(without);
  });

  it('дайын бетон: цементке бетон үлесі қосылмайды; өзім дайындаймын: бетон құны қосылмайды', () => {
    const p = priceAll(createProject('small'));
    p.materials.brick.enabled = false;
    p.materials.cement.p.extraAmount = 0;
    const ready = computeProject(p);
    expect(mat(ready, 'cement').error).toBeTruthy(); // цемент қажет ететін жұмыс жоқ
    expect(mat(ready, 'concrete').counted).toBe(true);
    p.concreteSource = 'mix';
    const mix = computeProject(p);
    expect(mat(mix, 'concrete').counted).toBe(false);
    expect(mat(mix, 'concrete').costT).toBe(0);
    expect(mat(mix, 'cement').qty).toBeGreaterThan(0);
    const concreteCost = mix.materials.filter(m => m.id === 'concrete' && m.counted).length;
    expect(concreteCost).toBe(0);
  });

  it('тұсқағаз бен бояу бір бөлмеде автоматты қосылмайды', () => {
    const p = createProject('small');
    p.rooms = [newRoom(p.floors[0].id, 'living', 4, 4)];
    p.rooms[0].wallFinish = 'wallpaper';
    const r = computeProject(p);
    expect(mat(r, 'paint').error).toBeTruthy();
    expect(mat(r, 'wallpaper').qty).toBeGreaterThan(0);
  });

  it('қолмен енгізілген мөлшер белгіленеді', () => {
    const p = priceAll(createProject('small'));
    p.materials.brick.mode = 'manual'; p.materials.brick.manualQty = 5000;
    const b = mat(computeProject(p), 'brick');
    expect(b.manual).toBe(true); expect(b.qty).toBe(5000); expect(b.costT).toBe(50000000);
  });

  it('баға өзгерсе нәтиже жаңарады; бағасыз материал толық емес деп белгіленеді', () => {
    const p = priceAll(createProject('small'));
    const a = computeProject(p).totalT;
    p.materials.brick.price = 200;
    const b = computeProject(p);
    expect(b.totalT).toBeGreaterThan(a);
    p.materials.sand.price = 0;
    const c = computeProject(p);
    expect(c.incomplete).toBe(true);
    expect(mat(c, 'sand').priceMissing).toBe(true);
  });

  it('бюджет жеткілікті / жетіспейді', () => {
    const p = priceAll(createProject('small'));
    const r0 = computeProject(p);
    p.budget = r0.totalT / 100 + 1000;
    expect(computeProject(p).budget!.ok).toBe(true);
    p.budget = r0.totalT / 100 - 1000;
    const r = computeProject(p);
    expect(r.budget!.ok).toBe(false);
    expect(r.budget!.D).toBe(-100000);
  });

  it('қате өлшем — түсінікті хабарлама', () => {
    const p = createProject('small');
    p.floors[0].length = -5;
    const r = computeProject(p);
    expect(r.errors.join(' ')).toContain('Өлшемді дұрыс енгізіңіз');
  });

  it('бөлмелерді қосу/жою аудан қосындысын өзгертеді', () => {
    const p = createProject('family');
    const a = computeProject(p).roomsArea;
    p.rooms.pop();
    expect(computeProject(p).roomsArea).toBeLessThan(a);
  });
});

describe('Жеткізушілер мен сценарийлер', () => {
  it('жеткізу мен ең аз тапсырысты ескереді, жалған үнем жоқ', () => {
    const p = createProject('small');
    for (const d of MATERIALS) p.materials[d.id].enabled = d.id === 'brick' || d.id === 'sand';
    p.materials.brick.price = 110; p.materials.sand.price = 5000;
    p.suppliers = [{ id: 'A', name: 'A', delivery: 20000 }, { id: 'B', name: 'B', delivery: 5000 }, { id: 'C', name: 'C', delivery: 0 }];
    p.offers = [
      { supplierId: 'A', materialId: 'brick', price: 105, minOrder: 0 },
      { supplierId: 'B', materialId: 'brick', price: 110, minOrder: 0 },
      { supplierId: 'C', materialId: 'brick', price: 115, minOrder: 0 },
      { supplierId: 'B', materialId: 'sand', price: 4500, minOrder: 1000 },
    ];
    const r = computeProject(p);
    const c = compareSuppliers(p, r);
    const brickQ = mat(r, 'brick').qty;
    expect(c.materials).toHaveLength(2);
    const sandLine = c.materials.find(m => m.id === 'sand')!.lines[0];
    expect(sandLine.raisedToMin).toBe(true);
    expect(c.best).toBeDefined();
    // Тек B екі материалды да ұсынады → бір жеткізуші нұсқасы B
    expect(c.options.filter(o => o.kind === 'single').map(o => o.usedSuppliers[0])).toEqual(['B']);
    const expectedBest = Math.min(
      M.costTiyn(brickQ, 110) + sandLine.costT + 500000,
      M.costTiyn(brickQ, 105) + sandLine.costT + 2000000 + 500000,
    );
    expect(c.best!.totalT).toBe(expectedBest);
    // Құмның бастапқы бағасы жоқ болса — үнем есептелмейді
    p.materials.sand.price = 0;
    const c2 = compareSuppliers(p, computeProject(p));
    expect(c2.baseline).toBeUndefined();
    expect(c2.baselineMissing.length).toBe(1);
  });

  it('үш сценарий енгізілген бағаларды ғана пайдаланады', () => {
    const p = createProject('small');
    for (const d of MATERIALS) p.materials[d.id].enabled = d.id === 'paint' || d.id === 'linoleum';
    p.materials.paint.price = 10000; p.materials.paint.tiers = { economy: 8000, premium: 15000 };
    p.materials.linoleum.price = 3000; // сценарий бағасы жоқ → өзгеріссіз
    const r = computeProject(p);
    const { scenarios } = budgetScenarios(p, r, id => !!MAT[id].structural);
    const [e, s, h] = scenarios;
    expect(e.totalT).toBeLessThan(s.totalT);
    expect(h.totalT).toBeGreaterThan(s.totalT);
    expect(e.lines.find(l => l.id === 'linoleum')!.fromStandard).toBe(true);
  });

  it('нұсқаларды салыстыру: үнем пайызы бастапқыға қатысты', () => {
    const a = priceAll(createProject('small'), 100); a.name = 'Стандарт';
    const b = structuredClone(a); b.name = 'Үнемді'; priceAll(b, 80);
    const ra = computeProject(a), rb = computeProject(b);
    const v = compareVariants([a, b], [ra, rb], 0);
    expect(v.sameDims).toBe(true);
    expect(v.savings[1].savingT).toBe(ra.totalT - rb.totalT);
    expect(v.savings[1].pct).toBeCloseTo(20, 1);
  });
});

describe('Визуализация жүйесімен байланыс', () => {
  it('жеке материал жолы: Q = ⌈S × q × (1 + k)⌉, құн жалпы шығынға қосылады', () => {
    const p = priceAll(createProject('small'));
    const before = computeProject(p).totalT;
    p.customLines = [{ id: 'l1', customId: 'c1', name: 'Декор панель', unit: 'дана', price: 1000, norm: 2, waste: 10, target: 'room-walls', roomIds: [p.rooms[0].id], manualArea: 0, mode: 'auto', manualQty: 0, enabled: true }];
    const r = computeProject(p);
    const c = r.customs[0];
    const S = 2 * (4.6 + 3.6) * 2.7; // қонақ бөлме қабырғасы
    expect(c.area).toBeCloseTo(S, 6);
    expect(c.qty).toBe(Math.ceil(S * 2 * 1.1 - 1e-9));
    expect(r.totalT - before).toBe(M.costTiyn(c.qty, 1000));
    expect(c.category).toBe('finish');
  });
  it('жеке материал басқа материалдардың нәтижесін өзгертпейді', () => {
    const p = priceAll(createProject('family'));
    const a = computeProject(p).materials.map(m => [m.id, m.qty]);
    p.customLines = [{ id: 'l1', customId: 'c1', name: 'X', unit: 'м²', price: 10, norm: 1, waste: 0, target: 'roof', roomIds: [], manualArea: 0, mode: 'auto', manualQty: 0, enabled: true }];
    const r = computeProject(p);
    expect(r.materials.map(m => [m.id, m.qty])).toEqual(a);
    expect(r.customs[0].area).toBeCloseTo(r.roofArea, 6);
  });
  it('визуалды таңдау (түс/текстура) есепке әсер етпейді', () => {
    const p = priceAll(createProject('small'));
    const a = computeProject(p).totalT;
    p.rooms[0].look = { wallColor: '#123456', wallpaper: { kind: 'preset', id: 'wp-geo' }, floor: { kind: 'preset', id: 'fl-tile' } };
    p.look = { roofColor: '#000000', facade: 'plaster' };
    expect(computeProject(p).totalT).toBe(a);
  });
  it('нормасыз жеке материал — түсінікті қате, жалған сан жоқ', () => {
    const p = createProject('small');
    p.customLines = [{ id: 'l1', customId: 'c1', name: 'X', unit: 'дана', price: 10, norm: 0, waste: 0, target: 'room-floor', roomIds: [], manualArea: 0, mode: 'auto', manualQty: 0, enabled: true }];
    const c = computeProject(p).customs[0];
    expect(c.error).toBeTruthy(); expect(c.costT).toBe(0);
  });
});

describe('Терминдер толық жазылған', () => {
  it('материал атаулары', () => {
    const names = MATERIALS.map(m => m.name);
    expect(names).toContain('Төбе галтелі');
    expect(names).toContain('Еден плинтусы');
    expect(names).toContain('Теплород жылу оқшаулағыш материалы');
    expect(names).toContain('Қабырға сылағы');
    expect(names).toContain('Еденді тегістейтін қоспа');
    const r = computeProject(createProject('small'));
    expect(r.materials.find(m => m.id === 'insulation')!.name).toBe('Теплород жылу оқшаулағыш материалы');
  });
});

import { computeQuick, emptyQuick, newQuickItem, quickTotal } from './quick';

describe('Жылдам есеп (жеке жөндеу жұмыстары)', () => {
  const room = (l: number, w: number, h: number) => { const q = emptyQuick('q'); q.room = { length: l, width: w, height: h }; return q; };

  it('тұсқағаз: негізгі жобадағы бөлме есебімен бірдей рулон саны', () => {
    const q = room(4, 3, 2.7);
    const it = newQuickItem('wallpaper', 'walls', 'a'); it.waste = 0; it.price = 4500;
    const r = computeQuick(q, it);
    const w = M.wallpaperRolls({ P: 14, h: 2.7, rollLength: 10.05, rollWidth: 0.53, repeat: 0, trim: 0.1 });
    expect(r.qty).toBe(w.value);
    expect(r.costT).toBe(M.costTiyn(w.value, 4500));
  });
  it('линолеум: сатып алу ауданы еден ауданынан кем емес, орам ені ескеріледі', () => {
    const q = room(4.5, 4, 2.7);
    const it = newQuickItem('linoleum', 'floor', 'b'); it.waste = 0;
    const r = computeQuick(q, it);
    expect(r.qty).toBeGreaterThanOrEqual(18);
    expect(r.qty).toBeCloseTo(24.6, 6);
  });
  it('бояу: қабырға немесе төбе бетін таңдау', () => {
    const q = room(4, 3, 2.5);
    const walls = newQuickItem('paint', 'walls', 'c'); walls.waste = 0;
    const ceil = newQuickItem('paint', 'ceiling', 'd'); ceil.waste = 0;
    // қабырға 35 м² × 2 қабат / 10 = 7 л → 2 шелек (5 л); төбе 12 м² → 2,4 л → 1 шелек
    expect(computeQuick(q, walls).qty).toBe(2);
    expect(computeQuick(q, ceil).qty).toBe(1);
  });
  it('плинтус периметр бойынша, ауданды қолмен жазу режимі', () => {
    const q = room(4, 3, 2.7);
    const pl = newQuickItem('plinth', 'perimeter', 'e'); pl.waste = 10;
    expect(computeQuick(q, pl).qty).toBe(Math.ceil(14 * 1.1 / 2.5));
    const lv = newQuickItem('leveler', 'floor', 'f'); lv.useRoom = false; lv.manualArea = 20; lv.waste = 0;
    // 20 м² × 10 мм × 1,6 = 320 кг → 25 кг қаптан 13 қап
    expect(computeQuick(q, lv).qty).toBe(13);
  });
  it('өлшем жоқ — түсінікті қате; бағасыз — жалпы құнға кірмейді', () => {
    const q = room(0, 3, 2.7);
    const it = newQuickItem('glue', 'walls', 'g');
    expect(computeQuick(q, it).error).toBe('Бөлме өлшемдерін енгізіңіз');
    const q2 = room(4, 3, 2.7);
    const a = newQuickItem('glue', 'walls', 'h'); a.price = 1500;
    const b = newQuickItem('plinth', 'perimeter', 'i');
    q2.items = [a, b]; q2.delivery = 20000;
    const t = quickTotal(q2);
    expect(t.missing).toBe(1);
    expect(t.totalT).toBe(computeQuick(q2, a).costT + 2000000);
  });
});

describe('Кірпіш түрлері: қызыл кірпіш және газоблок', () => {
  const gasProject = () => {
    const p = priceAll(createProject('small'));
    Object.assign(p.materials.brick.p, { type: 'gasblock', L: 600, W: 300, H: 200, joint: 3 });
    p.wallThickness = 0.3;
    return p;
  };
  it('атауы түріне қарай', () => {
    const p = createProject('small');
    expect(computeProject(p).materials.find(m => m.id === 'brick')!.name).toBe('Қызыл кірпіш');
    expect(computeProject(gasProject()).materials.find(m => m.id === 'brick')!.name).toBe('Газоблок');
  });
  it('газоблок саны: модульдік көлем бойынша, жоғары дөңгелектеу', () => {
    const r = computeProject(gasProject());
    const V = r.extWallVolume;
    const vm = 0.603 * 0.303 * 0.203;
    expect(r.materials.find(m => m.id === 'brick')!.qty).toBe(Math.ceil(Math.round((V / vm) * 1e4) / 1e4 * 1.05 - 1e-9));
  });
  it('газоблок цемент-құм ерітіндісін қоспайды', () => {
    const red = priceAll(createProject('small')); red.concreteSource = 'mix';
    const gas = gasProject(); gas.concreteSource = 'mix'; gas.wallThickness = red.wallThickness;
    const cRed = computeProject(red).materials.find(m => m.id === 'cement')!.qty;
    const cGas = computeProject(gas).materials.find(m => m.id === 'cement')!.qty;
    expect(cGas).toBeLessThan(cRed);
    const r = computeProject(gas).materials.find(m => m.id === 'brick')!;
    expect(r.notes.join(' ')).toContain('арнайы желіммен');
  });
  it('газоблок текше метрмен сатып алу', () => {
    const p = gasProject(); p.materials.brick.p.unit = 'm3'; p.materials.brick.price = 30000;
    const r = computeProject(p).materials.find(m => m.id === 'brick')!;
    const pcs = computeProject(gasProject()).materials.find(m => m.id === 'brick')!.qty;
    expect(r.unit).toBe('м³');
    expect(r.qty).toBeCloseTo(M.ceilTo(pcs * 0.6 * 0.3 * 0.2, 2), 6);
    expect(r.costT).toBe(M.costTiyn(r.qty, 30000));
  });
});

describe('Кафель (плитка)', () => {
  it('математика: 30×30, жік 2 мм, 6 м², қорсыз', () => {
    const c = M.tileCount({ S: 6, L: 300, W: 300, joint: 2, waste: 0 });
    // 1 кафель жігімен = 0,302 × 0,302 = 0,091204 м² → 6 / 0,091204 = 65,79 → 66 дана
    expect(c.pieces).toBe(66);
    expect(c.m2).toBeCloseTo(66 * 0.09, 6);
    expect(M.tileCount({ S: 6, L: 0, W: 300, joint: 2, waste: 0 }).error).toBeTruthy();
  });
  it('жобада: ваннаның едені мен қабырғасы, м² / дана / қорап', () => {
    const p = priceAll(createProject('family'));
    const bath = p.rooms.find(r => r.kind === 'bath')!;
    expect(bath.tileFloor).toBe(true);
    expect(bath.wallFinish).toBe('tile');
    const S = M.round(bath.length * bath.width + 2 * (bath.length + bath.width) * bath.height);
    const c = M.tileCount({ S, L: 300, W: 300, joint: 2, waste: 10 });
    const t = computeProject(p).materials.find(m => m.id === 'tile')!;
    expect(t.unit).toBe('м²');
    expect(t.qty).toBeCloseTo(M.ceilTo(c.m2, 2), 6);
    p.materials.tile.p.unit = 'piece';
    expect(computeProject(p).materials.find(m => m.id === 'tile')!.qty).toBe(c.pieces);
    p.materials.tile.p.unit = 'box';
    expect(computeProject(p).materials.find(m => m.id === 'tile')!.qty).toBe(Math.ceil(c.pieces / 16));
  });
  it('кафель таңдалған бөлмеде линолеум мен бояу есептелмейді', () => {
    const p = createProject('small');
    p.rooms = [newRoom(p.floors[0].id, 'bath', 2.5, 2)];
    const r = computeProject(p);
    expect(r.materials.find(m => m.id === 'linoleum')!.error).toBeTruthy();
    expect(r.materials.find(m => m.id === 'paint')!.error).toBeTruthy();
    expect(r.materials.find(m => m.id === 'tile')!.qty).toBeGreaterThan(0);
  });
  it('жылдам есеп: ванна еденіне кафель', () => {
    const q = emptyQuick('t'); q.room = { length: 2.5, width: 2, height: 2.6 };
    const it = newQuickItem('tile', 'floor', 'x'); it.waste = 10; it.price = 6000;
    const r = computeQuick(q, it);
    const c = M.tileCount({ S: 5, L: 300, W: 300, joint: 2, waste: 10 });
    expect(r.qty).toBeCloseTo(M.ceilTo(c.m2, 2), 6);
    expect(r.costT).toBe(M.costTiyn(r.qty, 6000));
  });
  it('еңбекақы жалпы шығынға кірмейді', () => {
    const p = priceAll(createProject('small'));
    p.costs.delivery = 10000;
    (p.costs as { labor?: number }).labor = 500000;
    const r = computeProject(p);
    expect(r.totalT).toBe(r.buildT + r.finishT + 1000000);
  });
});
