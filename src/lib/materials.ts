import type { MaterialId, MaterialState } from './types';

export type Field =
  | { key: string; label: string; unit?: string; kind: 'number'; help?: string; min?: number; step?: number }
  | { key: string; label: string; kind: 'select'; options: [string, string][]; help?: string }
  | { key: string; label: string; kind: 'bool'; help?: string };

export interface MaterialDef {
  id: MaterialId;
  no: number;
  name: string;
  category: 'build' | 'finish';
  structural?: boolean;     // қауіпсіздікке/беріктікке әсер етеді
  unitLabel: (s: MaterialState) => string; // сатып алу бірлігі
  defaultWaste: number;
  params: Record<string, number | string | boolean>;
  fields: Field[];
  formula: string;          // қысқа формула
  explain: string;          // түсіндірме
}

const pieceOrMeter = (s: MaterialState) => (s.p.unit === 'm' ? 'м' : 'дана');

export const MATERIALS: MaterialDef[] = [
  {
    id: 'brick', no: 1, name: 'Кірпіш', category: 'build', structural: true,
    unitLabel: s => (s.p.type === 'gasblock' && s.p.unit === 'm3' ? 'м³' : 'дана'), defaultWaste: 5,
    params: { type: 'red', L: 250, W: 120, H: 65, joint: 10, unit: 'piece', glueNorm: 25, glueBag: 25 },
    fields: [
      { key: 'type', label: 'Кірпіш түрі', kind: 'select', options: [['red', 'Қызыл кірпіш'], ['gasblock', 'Газоблок']],
        help: 'Қызыл кірпіш — күйдірілген саз балшықтан, цемент-құм ерітіндісімен қаланады. Газоблок — жеңіл, кеуекті газобетон блогы; ірі, арнайы желіммен жұқа жікпен қаланады.' },
      { key: 'L', label: 'Бір дананың ұзындығы', unit: 'мм', kind: 'number' },
      { key: 'W', label: 'Бір дананың ені', unit: 'мм', kind: 'number', help: 'Қабырғаның қалыңдығы бағытындағы өлшем. Газоблок үшін әдетте 200, 250, 300 немесе 400 мм.' },
      { key: 'H', label: 'Бір дананың биіктігі', unit: 'мм', kind: 'number' },
      { key: 'joint', label: 'Жік қалыңдығы', unit: 'мм', kind: 'number', help: 'Қызыл кірпіш: цемент-құм ерітіндісі, әдетте 10–12 мм. Газоблок: арнайы желім, әдетте 2–3 мм.' },
      { key: 'unit', label: 'Сатып алу бірлігі', kind: 'select', options: [['piece', 'дана'], ['m3', 'м³ (текше метр)']], help: 'Газоблок дүкенде көбіне текше метрмен сатылады.' },
      { key: 'glueNorm', label: 'Газоблок желімінің шығыны (1 м³ қалауға)', unit: 'кг', kind: 'number', help: 'Қапта жазылады; 2–3 мм жікте әдетте 20–30 кг/м³.' },
      { key: 'glueBag', label: 'Газоблок желімі қабының салмағы', unit: 'кг', kind: 'number' },
    ],
    formula: 'N = Vқ / ((L+j)(W+j)(H+j))',
    explain: 'Сыртқы қабырғалардың көлемі, кірпіштің немесе газоблоктың өлшемі және жік қалыңдығы ескеріліп есептеледі. Бұл — бастапқы сметалық бағалау.',
  },
  {
    id: 'concrete', no: 2, name: 'Бетон', category: 'build', structural: true, unitLabel: () => 'м³', defaultWaste: 3,
    params: {},
    fields: [],
    formula: 'V = L × b × h  немесе  V = S × t',
    explain: 'Таспалы іргетас немесе плиталық іргетас өлшемдері бойынша есептеледі; қабат аралық жабын бөлек қосылады. Іргетас параметрлері «Үй параметрлері» кезеңінде енгізіледі.',
  },
  {
    id: 'cement', no: 3, name: 'Цемент', category: 'build', structural: true, unitLabel: () => 'қап', defaultWaste: 5,
    params: { bagKg: 50, concreteNorm: 300, useMortar: true, mortarNorm: 400, extraLabel: 'Басқа жұмыс', extraAmount: 0, extraBasis: 'm3', extraNorm: 0 },
    fields: [
      { key: 'bagKg', label: 'Бір қаптың салмағы', unit: 'кг', kind: 'number' },
      { key: 'concreteNorm', label: '1 м³ бетонға цемент шығыны', unit: 'кг/м³', kind: 'number', help: 'Бетонды өзіңіз дайындасаңыз ғана қолданылады. Бетон маркасына байланысты — рецептіден алыңыз.' },
      { key: 'useMortar', label: 'Кірпіш қалау ерітіндісін қосу', kind: 'bool' },
      { key: 'mortarNorm', label: '1 м³ ерітіндіге цемент шығыны', unit: 'кг/м³', kind: 'number' },
      { key: 'extraLabel', label: 'Қосымша жұмыс атауы', kind: 'select', options: [['Басқа жұмыс', 'Басқа жұмыс'], ['Стяжка', 'Стяжка (еден құймасы)'], ['Сылақ', 'Цемент сылағы']] },
      { key: 'extraAmount', label: 'Қосымша жұмыс көлемі', unit: 'м³ / м²', kind: 'number' },
      { key: 'extraBasis', label: 'Көлем бірлігі', kind: 'select', options: [['m3', 'м³'], ['m2', 'м²']] },
      { key: 'extraNorm', label: 'Цемент шығыны (1 бірлікке)', unit: 'кг', kind: 'number' },
    ],
    formula: 'm = Vбетон×q₁ + Vер×q₂ + V₃×q₃;  n = ⌈m(1+k)/mқ⌉',
    explain: 'Жұмыс көлемі мен цементтің шығын нормасы бойынша есептеледі. Дайын бетон сатып алынса, бетонға арналған цемент қосылмайды — шығын екі рет есептелмейді.',
  },
  {
    id: 'sand', no: 4, name: 'Құм', category: 'build', unitLabel: () => 'м³', defaultWaste: 5,
    params: { concreteNorm: 0.5, useMortar: true, mortarNorm: 1.0, extraNorm: 0 },
    fields: [
      { key: 'concreteNorm', label: '1 м³ бетонға кететін құм', unit: 'м³', kind: 'number', help: 'Бетонды өзіңіз дайындасаңыз ғана қолданылады.' },
      { key: 'useMortar', label: 'Кірпіш қалау ерітіндісін қосу', kind: 'bool' },
      { key: 'mortarNorm', label: '1 м³ ерітіндіге кететін құм', unit: 'м³', kind: 'number' },
      { key: 'extraNorm', label: 'Цементтегі қосымша жұмыстың 1 бірлігіне құм', unit: 'м³', kind: 'number' },
    ],
    formula: 'V = Vбетон×q₁ + Vер×q₂ + V₃×q₃',
    explain: 'Бетон мен ерітінді көлемі және енгізілген шығын нормасы бойынша есептеледі.',
  },
  {
    id: 'roof', no: 5, name: 'Шатыр жабыны', category: 'build', structural: true, unitLabel: () => 'м²', defaultWaste: 5,
    params: {},
    fields: [],
    formula: 'Sшатыр = a × b / cos(α)',
    explain: 'Шатыр түрі, еңісі, шығыңқы бөлігі (свес) және қабаттасу қоры «Үй параметрлері» кезеңінде енгізіледі.',
  },
  {
    id: 'insulation', no: 6, name: 'Теплород жылу оқшаулағыш материалы', category: 'build', unitLabel: s => (s.p.unit === 'm2' ? 'м²' : 'қаптама'), defaultWaste: 5,
    params: { target: 'walls', manualArea: 0, thickness: 50, layers: 1, coverage: 5, unit: 'pack' },
    fields: [
      { key: 'target', label: 'Оқшауланатын бет', kind: 'select', options: [['walls', 'Сыртқы қабырғалар'], ['roof', 'Шатыр'], ['floor', 'Бірінші қабат едені'], ['manual', 'Ауданды өзім енгіземін']] },
      { key: 'manualArea', label: 'Аудан (қолмен)', unit: 'м²', kind: 'number' },
      { key: 'thickness', label: 'Материал қалыңдығы', unit: 'мм', kind: 'number', help: 'Ақпарат үшін: қаптаманың жабу ауданы осы қалыңдыққа сәйкес болуы керек.' },
      { key: 'layers', label: 'Қабат саны', kind: 'number' },
      { key: 'coverage', label: 'Бір қаптаманың жабу ауданы', unit: 'м²', kind: 'number', help: 'Қаптамада жазылады: мысалы, «5 м²».' },
      { key: 'unit', label: 'Сатып алу бірлігі', kind: 'select', options: [['pack', 'қаптама'], ['m2', 'м²']] },
    ],
    formula: 'n = ⌈S × k × (1+r) / Sқап⌉',
    explain: 'Оқшауланатын аудан, қабат саны және бір қаптаманың жабу ауданы бойынша қаптама саны табылады.',
  },
  {
    id: 'wallpaper', no: 7, name: 'Тұсқағаз', category: 'finish', unitLabel: () => 'рулон', defaultWaste: 0,
    params: { rollLength: 10.05, rollWidth: 0.53, repeat: 0, trim: 0.1 },
    fields: [
      { key: 'rollLength', label: 'Рулон ұзындығы', unit: 'м', kind: 'number' },
      { key: 'rollWidth', label: 'Рулон ені', unit: 'м', kind: 'number' },
      { key: 'repeat', label: 'Өрнек сәйкестендіру қадамы', unit: 'м', kind: 'number', help: 'Өрнек қайталанатын қашықтық (раппорт). Өрнексіз тұсқағаз үшін 0.' },
      { key: 'trim', label: 'Кесу қоры (бір жолаққа)', unit: 'м', kind: 'number', help: 'Жоғарғы және төменгі жиекті тегістеуге кететін қосымша ұзындық. Әдетте 0,05–0,1 м.' },
    ],
    formula: 'N = ⌈⌈P/bр⌉ / ⌊lр/lж⌋⌉',
    explain: 'Әр бөлмеге қажет жолақ саны мен бір рулоннан шығатын толық жолақ саны ескеріліп, рулон саны табылады.',
  },
  {
    id: 'linoleum', no: 8, name: 'Линолеум', category: 'finish', unitLabel: () => 'м²', defaultWaste: 0,
    params: { rollWidth: 3, margin: 0.1 },
    fields: [
      { key: 'rollWidth', label: 'Орам ені', unit: 'м', kind: 'number' },
      { key: 'margin', label: 'Қию қоры (ұзындыққа)', unit: 'м', kind: 'number' },
    ],
    formula: 'Sс = ⌈b/w⌉ × w × (a + m)',
    explain: 'Бөлме өлшемі мен орам ені бойынша сатып алынатын аудан есептеледі; қию қалдығы ескеріледі.',
  },
  {
    id: 'galtel', no: 9, name: 'Төбе галтелі', category: 'finish', unitLabel: pieceOrMeter, defaultWaste: 10,
    params: { pieceLength: 2, unit: 'piece' },
    fields: [
      { key: 'pieceLength', label: 'Бір дананың ұзындығы', unit: 'м', kind: 'number' },
      { key: 'unit', label: 'Сатып алу бірлігі', kind: 'select', options: [['piece', 'дана'], ['m', 'метр']] },
    ],
    formula: 'L = 2(a + b);  n = ⌈L(1+k)/l⌉',
    explain: 'Төбе мен қабырға түйіскен жердегі әшекей жолақ. Бөлме периметрі мен бір дананың ұзындығы бойынша есептеледі.',
  },
  {
    id: 'plinth', no: 10, name: 'Еден плинтусы', category: 'finish', unitLabel: pieceOrMeter, defaultWaste: 10,
    params: { pieceLength: 2.5, unit: 'piece' },
    fields: [
      { key: 'pieceLength', label: 'Стандарт ұзындығы', unit: 'м', kind: 'number' },
      { key: 'unit', label: 'Сатып алу бірлігі', kind: 'select', options: [['piece', 'дана'], ['m', 'метр']] },
    ],
    formula: 'L = 2(a + b);  n = ⌈L(1+k)/l⌉',
    explain: 'Қабырға мен еден түйіскен жердегі жолақ. Бөлме периметрі, стандарт ұзындығы және кесу қоры бойынша есептеледі.',
  },
  {
    id: 'paint', no: 11, name: 'Бояу', category: 'finish', unitLabel: s => (s.p.unit === 'l' ? 'л' : 'шелек'), defaultWaste: 5,
    params: { layers: 2, coverage: 10, bucket: 5, unit: 'bucket' },
    fields: [
      { key: 'layers', label: 'Бояу қабаттарының саны', kind: 'number' },
      { key: 'coverage', label: '1 литрдің жабу нормасы (бір қабат)', unit: 'м²/л', kind: 'number', help: 'Банкада жазылады: мысалы, «8–10 м²/л».' },
      { key: 'bucket', label: 'Бір шелектің көлемі', unit: 'л', kind: 'number' },
      { key: 'unit', label: 'Сатып алу бірлігі', kind: 'select', options: [['bucket', 'шелек'], ['l', 'литр']] },
    ],
    formula: 'Q = S × n / r',
    explain: 'Боялатын аудан, бояу қабаттарының саны және банкадағы жабу нормасы бойынша литр мен шелек саны табылады.',
  },
  {
    id: 'glue', no: 12, name: 'Желім', category: 'finish', unitLabel: () => 'қаптама', defaultWaste: 5,
    params: { norm: 8, packG: 200 },
    fields: [
      { key: 'norm', label: 'Шығын нормасы', unit: 'г/м²', kind: 'number', help: 'Қаптамада жазылған нормадан есептеңіз: қаптама салмағы / жабатын ауданы.' },
      { key: 'packG', label: 'Бір қаптаманың салмағы', unit: 'г', kind: 'number' },
    ],
    formula: 'n = ⌈S × q × (1+k) / mқап⌉',
    explain: 'Тұсқағаз жапсырылатын аудан бойынша есептеледі.',
  },
  {
    id: 'plaster', no: 13, name: 'Қабырға сылағы', category: 'finish', unitLabel: () => 'қап', defaultWaste: 5,
    params: { thickness: 10, norm: 0.9, bagKg: 30 },
    fields: [
      { key: 'thickness', label: 'Қабырға сылағы қабатының қалыңдығы', unit: 'мм', kind: 'number' },
      { key: 'norm', label: 'Өндіруші шығын нормасы', unit: 'кг/(м²·мм)', kind: 'number', help: 'Қапта жазылады: 1 мм қалыңдықта 1 м²-ге кететін қоспа, кг.' },
      { key: 'bagKg', label: 'Бір қаптың салмағы', unit: 'кг', kind: 'number' },
    ],
    formula: 'n = ⌈S × d × q × (1+k) / mқ⌉',
    explain: 'Сыланатын қабырға ауданы, қабат қалыңдығы және өндірушінің шығын нормасы бойынша қап саны табылады.',
  },
  {
    id: 'tile', no: 15, name: 'Кафель (плитка)', category: 'finish',
    unitLabel: s => (s.p.unit === 'piece' ? 'дана' : s.p.unit === 'box' ? 'қорап' : 'м²'), defaultWaste: 10,
    params: { L: 300, W: 300, joint: 2, unit: 'm2', perBox: 16, glueNorm: 5, glueBag: 25 },
    fields: [
      { key: 'L', label: 'Кафель ұзындығы', unit: 'мм', kind: 'number', help: 'Қорапта жазылады: мысалы, 300×300, 600×300, 250×400 мм.' },
      { key: 'W', label: 'Кафель ені', unit: 'мм', kind: 'number' },
      { key: 'joint', label: 'Жік (шов) ені', unit: 'мм', kind: 'number', help: 'Кафельдер арасындағы саңылау. Әдетте 1,5–3 мм.' },
      { key: 'unit', label: 'Сатып алу бірлігі', kind: 'select', options: [['m2', 'м² (шаршы метр)'], ['piece', 'дана'], ['box', 'қорап']], help: 'Дүкенде кафель көбіне м²-мен немесе қораппен сатылады.' },
      { key: 'perBox', label: 'Бір қораптағы кафель саны', unit: 'дана', kind: 'number' },
      { key: 'glueNorm', label: 'Кафель желімінің шығыны', unit: 'кг/м²', kind: 'number', help: 'Қапта жазылады; әдетте 3–6 кг/м².' },
      { key: 'glueBag', label: 'Кафель желімі қабының салмағы', unit: 'кг', kind: 'number' },
    ],
    formula: 'N = ⌈S / ((L+j)(W+j)) × (1+k)⌉',
    explain: 'Кафель төселетін аудан, бір кафельдің өлшемі мен жігі ескеріліп, қажетті дана, шаршы метр және қорап саны табылады.',
  },
  {
    id: 'leveler', no: 14, name: 'Еденді тегістейтін қоспа', category: 'finish', unitLabel: () => 'қап', defaultWaste: 5,
    params: { thickness: 10, norm: 1.6, bagKg: 25 },
    fields: [
      { key: 'thickness', label: 'Тегістеу қабатының қалыңдығы', unit: 'мм', kind: 'number' },
      { key: 'norm', label: 'Шығын нормасы', unit: 'кг/(м²·мм)', kind: 'number' },
      { key: 'bagKg', label: 'Бір қаптың салмағы', unit: 'кг', kind: 'number' },
    ],
    formula: 'n = ⌈S × d × q × (1+k) / mқ⌉',
    explain: 'Еден ауданы, тегістеу қабатының қалыңдығы және шығын нормасы бойынша қап саны табылады.',
  },
];

MATERIALS.sort((a, b) => a.no - b.no);

export const MAT: Record<MaterialId, MaterialDef> = Object.fromEntries(MATERIALS.map(m => [m.id, m])) as Record<MaterialId, MaterialDef>;

export function matName(id: MaterialId, s?: MaterialState): string {
  const dn = s?.displayName?.trim();
  if (id === 'brick') { const base = s?.p.type === 'gasblock' ? 'Газоблок' : 'Қызыл кірпіш'; return dn ? `${base} (${dn})` : base; }
  if (id === 'insulation') return `${dn || 'Теплород'} жылу оқшаулағыш материалы`;
  if (!dn) return MAT[id].name;
  return `${MAT[id].name} (${dn})`;
}

/** Терминдердің қысқа түсіндірмесі (ақпарат белгісі үшін). */
export const MATERIAL_INFO: Record<MaterialId, string> = {
  brick: 'Екі түрі бар. Қызыл кірпіш — күйдірілген саз балшықтан жасалған берік құрылыс тасы, цемент-құм ерітіндісімен қаланады. Газоблок (газобетон блогы) — жеңіл, кеуекті, жылуды жақсы ұстайтын ірі блок, арнайы желіммен жұқа жікпен қаланады.',
  concrete: 'Цемент, құм, шағыл тас және судан тұратын қатаятын қоспа. Іргетас пен қабат аралық жабынға құйылады.',
  cement: 'Сумен араласқанда қатаятын ұнтақ байланыстырғыш. Бетон мен кірпіш қалау ерітіндісін дайындауға қажет.',
  sand: 'Бетон мен ерітіндіге қосылатын толтырғыш, іргетас астындағы жастық қабат.',
  roof: 'Шатырдың сыртқы қабаты: металл черепица, профнастил, шифер және т.б. Үйді жаңбыр мен қардан қорғайды.',
  insulation: 'Теплород — минералды мақтадан жасалған жылу оқшаулағыш материал. Қабырға, шатыр немесе еден арқылы жылудың шығуын азайтады.',
  wallpaper: 'Бөлменің ішкі қабырғаларына желіммен жапсырылатын орама әрлеу материалы.',
  linoleum: 'Еденге төселетін икемді, суға төзімді орама жабын.',
  galtel: 'Төбе галтелі — төбе мен қабырға түйіскен бұрышқа желімделетін әшекей жолақ (потолочный плинтус).',
  plinth: 'Еден плинтусы — қабырға мен еден түйіскен жерді жабатын жолақ; кабель жасыруға арналған ойығы болуы мүмкін.',
  paint: 'Қабырға мен төбені әрлеуге арналған бояу. Шығыны банкадағы жабу нормасына байланысты.',
  glue: 'Тұсқағазды қабырғаға бекітуге арналған құрғақ желім; сумен араластырып қолданылады.',
  plaster: 'Қабырға сылағы — кірпіш немесе бетон қабырғаны тегістейтін құрғақ қоспа; одан кейін бояу не тұсқағаз жапсырылады.',
  tile: 'Кафель (керамикалық плитка) — ванна, жуынатын бөлме және асүйдің едені мен қабырғасына төселетін, суға төзімді беріктігі жоғары әрлеу материалы. Арнайы желіммен жапсырылып, жігі затиркамен толтырылады.',
  leveler: 'Еденді тегістейтін қоспа (стяжка) — бетон еденді тегіс әрі көлденең ететін, өздігінен жайылатын қоспа.',
};

/** Материалдың қай параметрлері пайдаланушыға көрсетіледі. */
export function fieldVisible(key: string, s: MaterialState, concreteSource: string): boolean {
  if (key === 'manualArea') return s.p.target === 'manual';
  if (key === 'perBox' && 'perBox' in s.p) return s.p.unit === 'box';
  if (['unit', 'glueNorm', 'glueBag'].includes(key) && s.p.unit !== undefined && 'glueNorm' in s.p) return s.p.type === 'gasblock';
  if (key === 'concreteNorm') return concreteSource === 'mix';
  if (key === 'mortarNorm') return !!s.p.useMortar;
  if (['extraBasis', 'extraNorm'].includes(key)) return Number(s.p.extraAmount) > 0;
  return true;
}

export function defaultMaterialState(def: MaterialDef, enabled: boolean): MaterialState {
  return {
    enabled, mode: 'auto', manualQty: 0, price: 0, waste: def.defaultWaste,
    displayName: def.id === 'insulation' ? 'Теплород' : undefined,
    tiers: { economy: 0, premium: 0 },
    p: { ...def.params },
  };
}

/** Кірпіш түрлерінің бастапқы өлшемдері (түр ауысқанда қойылады). */
export const BRICK_TYPES: Record<'red' | 'gasblock', { L: number; W: number; H: number; joint: number }> = {
  red: { L: 250, W: 120, H: 65, joint: 10 },
  gasblock: { L: 600, W: 300, H: 200, joint: 3 },
};
