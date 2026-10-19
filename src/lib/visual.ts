// Визуализацияға арналған дайын үлгілер: түстер мен текстуралар.
// Текстуралар браузерде canvas арқылы бағдарламалық түрде салынады — сыртқы сурет, интернет және лицензия қажет емес.
import type { CustomMaterial, MaterialId, Place, TexRef } from './types';

export const PAINT_COLORS: [string, string][] = [
  ['#f8f6f1', 'Ақ сүт'], ['#e9e4d8', 'Құм'], ['#d9e3ea', 'Аспан'], ['#cfe0cf', 'Жалбыз'],
  ['#f1dcc8', 'Шабдалы'], ['#c9ccd6', 'Сұр-көк'], ['#8fa8b8', 'Теңіз'], ['#7a8f73', 'Зәйтүн'],
];
export const TRIM_COLORS: [string, string][] = [
  ['#ffffff', 'Ақ'], ['#efe9df', 'Кілегей'], ['#a0764e', 'Емен'], ['#5b4636', 'Жаңғақ'], ['#6b7280', 'Сұр'], ['#1f2937', 'Графит'],
];
export const ROOF_COLORS: [string, string][] = [
  ['#7f1d1d', 'Қызыл қоңыр'], ['#374151', 'Графит'], ['#1e3a5f', 'Көк'], ['#3f5f3a', 'Жасыл'], ['#6b4f3a', 'Қоңыр'],
];

export interface TexPreset { id: string; name: string; kind: 'wallpaper' | 'floor' | 'walltile'; size: number /* бір плитка, м */; draw: (g: CanvasRenderingContext2D, s: number) => void }

function rnd(seed: number) { let x = seed; return () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646; }

export const TEXTURES: TexPreset[] = [
  {
    id: 'wp-stripe', name: 'Жолақ', kind: 'wallpaper', size: 0.53,
    draw: (g, s) => { g.fillStyle = '#efe8dc'; g.fillRect(0, 0, s, s); for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#e2d6c2' : '#d8c9b0'; g.fillRect(i * s / 4 + s / 16, 0, s / 10, s); } },
  },
  {
    id: 'wp-dots', name: 'Нүктелі өрнек', kind: 'wallpaper', size: 0.53,
    draw: (g, s) => {
      g.fillStyle = '#dfe7ee'; g.fillRect(0, 0, s, s); g.fillStyle = '#a9bccb';
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.beginPath(); g.arc((x + (y % 2 ? 0.5 : 0) + 0.25) * s / 4, (y + 0.5) * s / 4, s / 34, 0, 7); g.fill(); }
    },
  },
  {
    id: 'wp-geo', name: 'Ромб (ою-өрнек мотиві)', kind: 'wallpaper', size: 0.53,
    draw: (g, s) => {
      g.fillStyle = '#f2ece2'; g.fillRect(0, 0, s, s); g.strokeStyle = '#b68d5f'; g.lineWidth = s / 90;
      for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) {
        const cx = (k + 0.5) * s / 2, cy = (j + 0.5) * s / 2, r = s / 5;
        g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); g.closePath(); g.stroke();
        g.beginPath(); g.arc(cx, cy, r / 3.2, 0, 7); g.stroke();
      }
    },
  },
  {
    id: 'wp-leaf', name: 'Жапырақ', kind: 'wallpaper', size: 0.53,
    draw: (g, s) => {
      g.fillStyle = '#e8efe6'; g.fillRect(0, 0, s, s); const r = rnd(7);
      for (let i = 0; i < 9; i++) {
        const x = r() * s, y = r() * s, a = r() * 6;
        g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = i % 2 ? '#9db896' : '#b8cdb2';
        g.beginPath(); g.ellipse(0, 0, s / 16, s / 40, 0, 0, 7); g.fill(); g.restore();
      }
    },
  },
  {
    id: 'wp-linen', name: 'Кенеп фактурасы', kind: 'wallpaper', size: 0.53,
    draw: (g, s) => {
      g.fillStyle = '#e6e1d8'; g.fillRect(0, 0, s, s); const r = rnd(3);
      for (let i = 0; i < s; i += 2) { g.fillStyle = `rgba(120,110,95,${0.04 + r() * 0.06})`; g.fillRect(i, 0, 1, s); g.fillRect(0, i, s, 1); }
    },
  },
  {
    id: 'wt-blue', name: 'Көкшіл кафель 25×40', kind: 'walltile', size: 0.8,
    draw: (g, s) => { g.fillStyle = '#7f8a8f'; g.fillRect(0, 0, s, s); const r = rnd(41); const cw = s / 2, ch = s / 2;
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = `hsl(196, ${26 + r() * 6}%, ${74 + r() * 4}%)`; g.fillRect(x * cw + 2, y * ch + 2, cw - 4, ch - 4); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x * cw + 4, y * ch + 4, cw * 0.5, 3); } },
  },
  {
    id: 'wt-white', name: 'Ақ кафель 30×30', kind: 'walltile', size: 0.6,
    draw: (g, s) => { g.fillStyle = '#9ca3af'; g.fillRect(0, 0, s, s); for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = '#f4f5f3'; g.fillRect(x * s / 2 + 2, y * s / 2 + 2, s / 2 - 4, s / 2 - 4); } },
  },
  {
    id: 'wt-beige', name: 'Бежевый мрамор 30×60', kind: 'walltile', size: 1.2,
    draw: (g, s) => { g.fillStyle = '#8a8070'; g.fillRect(0, 0, s, s); const r = rnd(43);
      for (let y = 0; y < 2; y++) { g.fillStyle = `hsl(36, 28%, ${78 + r() * 4}%)`; g.fillRect(2, y * s / 2 + 2, s - 4, s / 2 - 4); g.strokeStyle = 'rgba(120,100,70,.25)'; g.beginPath(); g.moveTo(10, y * s / 2 + s * 0.1); g.bezierCurveTo(s * 0.3, y * s / 2 + s * 0.3, s * 0.6, y * s / 2 + s * 0.05, s - 10, y * s / 2 + s * 0.35); g.stroke(); } },
  },
  {
    id: 'fl-oak', name: 'Емен тақтай', kind: 'floor', size: 1.2,
    draw: (g, s) => {
      const r = rnd(11); const rows = 6, h = s / rows;
      for (let y = 0; y < rows; y++) {
        let x = -r() * s / 2;
        while (x < s) {
          const w = s * (0.45 + r() * 0.35);
          g.fillStyle = `hsl(32, ${38 + r() * 10}%, ${58 + r() * 8}%)`; g.fillRect(x, y * h, w, h);
          g.strokeStyle = 'rgba(80,50,20,.25)'; g.lineWidth = 1.5; g.strokeRect(x, y * h, w, h);
          for (let k = 0; k < 3; k++) { g.strokeStyle = 'rgba(90,60,30,.12)'; g.beginPath(); g.moveTo(x, y * h + h * (0.25 + k * 0.25) + r() * 3); g.lineTo(x + w, y * h + h * (0.25 + k * 0.25) + r() * 3); g.stroke(); }
          x += w;
        }
      }
    },
  },
  {
    id: 'fl-walnut', name: 'Жаңғақ тақтай', kind: 'floor', size: 1.2,
    draw: (g, s) => {
      const r = rnd(5); const rows = 6, h = s / rows;
      for (let y = 0; y < rows; y++) {
        let x = -r() * s / 2;
        while (x < s) { const w = s * (0.5 + r() * 0.3); g.fillStyle = `hsl(25, ${30 + r() * 8}%, ${30 + r() * 7}%)`; g.fillRect(x, y * h, w, h); g.strokeStyle = 'rgba(0,0,0,.3)'; g.strokeRect(x, y * h, w, h); x += w; }
      }
    },
  },
  {
    id: 'fl-tile', name: 'Сұр плитка', kind: 'floor', size: 0.6,
    draw: (g, s) => {
      g.fillStyle = '#9ca3af'; g.fillRect(0, 0, s, s); const r = rnd(9);
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = `hsl(220, 6%, ${74 + r() * 6}%)`; g.fillRect(x * s / 2 + 2, y * s / 2 + 2, s / 2 - 4, s / 2 - 4); }
    },
  },
  {
    id: 'fl-stone', name: 'Тас өрнегі', kind: 'floor', size: 0.8,
    draw: (g, s) => {
      g.fillStyle = '#d6d0c4'; g.fillRect(0, 0, s, s); const r = rnd(13);
      for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(${90 + r() * 60},${85 + r() * 50},${70 + r() * 40},.18)`; g.beginPath(); g.arc(r() * s, r() * s, 2 + r() * s / 20, 0, 7); g.fill(); }
    },
  },
];

export const TEX: Record<string, TexPreset> = Object.fromEntries(TEXTURES.map(t => [t.id, t]));

/** Сыртқы көрініске: кірпіш және шатыр жабынының текстурасы. */
export const FACADE = {
  brick: { size: 0.78, draw: (g: CanvasRenderingContext2D, s: number) => {
    g.fillStyle = '#d8d2c8'; g.fillRect(0, 0, s, s); const r = rnd(21); const rows = 12, h = s / rows, w = s / 3;
    for (let y = 0; y < rows; y++) for (let x = -1; x < 4; x++) { g.fillStyle = `hsl(14, ${45 + r() * 15}%, ${38 + r() * 9}%)`; g.fillRect(x * w + (y % 2 ? w / 2 : 0) + 1.5, y * h + 1.5, w - 3, h - 3); }
  } },
  gasblock: { size: 1.2, draw: (g: CanvasRenderingContext2D, s: number) => {
    g.fillStyle = '#b9b9b4'; g.fillRect(0, 0, s, s); const r = rnd(31); const rows = 6, h = s / rows, w = s / 2;
    for (let y = 0; y < rows; y++) for (let x = -1; x < 3; x++) {
      g.fillStyle = `hsl(45, 4%, ${82 + r() * 5}%)`; g.fillRect(x * w + (y % 2 ? w / 2 : 0) + 1, y * h + 1, w - 2, h - 2);
      for (let k = 0; k < 40; k++) { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x * w + (y % 2 ? w / 2 : 0) + r() * w, y * h + r() * h, 1.5, 1.5); }
    }
  } },
  plaster: { size: 1, draw: (g: CanvasRenderingContext2D, s: number) => {
    g.fillStyle = '#ece6da'; g.fillRect(0, 0, s, s); const r = rnd(4);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.05})`; g.fillRect(r() * s, r() * s, 2, 2); }
  } },
};

/* ---------- Текстураны dataURL ретінде алу (кэшпен) ---------- */

const cache = new Map<string, string>();
export function presetDataUrl(id: string, px = 256): string {
  const key = `${id}@${px}`;
  const hit = cache.get(key); if (hit) return hit;
  const t = TEX[id] ?? (id === 'facade-brick' ? { draw: FACADE.brick.draw } : id === 'facade-plaster' ? { draw: FACADE.plaster.draw } : null);
  if (!t || typeof document === 'undefined') return '';
  const c = document.createElement('canvas'); c.width = c.height = px;
  t.draw(c.getContext('2d')!, px);
  const url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

export interface ResolvedTex { url: string; size: number; repeat: boolean; name: string }

export function resolveTex(ref: TexRef | undefined, customs: CustomMaterial[]): ResolvedTex | null {
  if (!ref) return null;
  if (ref.kind === 'preset') { const t = TEX[ref.id]; return t ? { url: presetDataUrl(t.id), size: t.size, repeat: true, name: t.name } : null; }
  const m = customs.find(c => c.id === ref.id);
  if (!m || !m.textureOk || !m.tile) return null;
  return { url: m.tile, size: m.tileSize || 0.5, repeat: m.repeat, name: m.name };
}

/* ---------- Материалдар қай бөлікке қолданылады ---------- */

export type HousePart = 'roof' | 'walls' | 'floor' | 'foundation' | 'slab';
export const PART_NAMES: Record<HousePart, string> = { roof: 'Шатыр', walls: 'Қабырға', floor: 'Еден', foundation: 'Іргетас', slab: 'Қабат аралық жабын' };
export const PART_MATERIALS: Record<HousePart, MaterialId[]> = {
  walls: ['brick', 'insulation', 'plaster', 'wallpaper', 'paint', 'glue', 'cement', 'sand'],
  floor: ['leveler', 'linoleum', 'tile', 'plinth'],
  roof: ['roof', 'insulation'],
  foundation: ['concrete', 'cement', 'sand'],
  slab: ['concrete'],
};

export const MATERIAL_PLACE: Record<MaterialId, string> = {
  brick: 'Сыртқы қабырғаларды қалау', concrete: 'Іргетас, қабат аралық жабын', cement: 'Бетон мен қалау ерітіндісі',
  sand: 'Бетон мен ерітіндінің толтырғышы', roof: 'Шатырдың сыртқы жабыны', insulation: 'Қабырға, шатыр немесе еденнің жылу қабаты',
  wallpaper: 'Бөлменің ішкі қабырғалары', linoleum: 'Бөлменің едені', galtel: 'Төбе мен қабырға түйіскен жер',
  plinth: 'Қабырға мен еден түйіскен жер', paint: 'Қабырға мен төбе беті', glue: 'Тұсқағазды бекіту қабаты',
  plaster: 'Қабырғаны тегістеу қабаты', leveler: 'Еденді тегістеу қабаты (стяжка)', tile: 'Ванна мен асүйдің едені мен қабырғасы',
};

export const PLACE_NAMES: Record<Place, string> = { wall: 'Қабырға', floor: 'Еден', ceiling: 'Төбе', roof: 'Шатыр', foundation: 'Іргетас', other: 'Басқа' };

/** Сурет текстура ретінде тек беті көрінетін әрлеу материалдарына жарайды. */
export const TEXTURE_CATEGORIES: MaterialId[] = ['wallpaper', 'linoleum', 'tile', 'paint', 'roof', 'galtel', 'plinth'];

/** Материал макеттің қай бөлігінде көрсетіледі (үй немесе бөлме). */
export const MATERIAL_ON_MODEL: Record<MaterialId, { view: 'house' | 'room'; part: string }> = {
  brick: { view: 'house', part: 'walls' }, concrete: { view: 'house', part: 'foundation' }, cement: { view: 'house', part: 'foundation' },
  sand: { view: 'house', part: 'foundation' }, roof: { view: 'house', part: 'roof' }, insulation: { view: 'house', part: 'walls' },
  wallpaper: { view: 'room', part: 'wall' }, linoleum: { view: 'room', part: 'floor' }, galtel: { view: 'room', part: 'galtel' },
  plinth: { view: 'room', part: 'plinth' }, paint: { view: 'room', part: 'wall' }, glue: { view: 'room', part: 'wall' },
  plaster: { view: 'room', part: 'wall' }, leveler: { view: 'room', part: 'floor' }, tile: { view: 'room', part: 'floor' },
};
