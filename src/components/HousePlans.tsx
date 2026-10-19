// Үйдің 2D жоспары мен қасбеті (SVG). Өлшемдер жобадан алынады — өзгергенде сызба бірден жаңарады.
import { Building, LayoutGrid } from 'lucide-react';
import { floorGeometry, roomGeometry } from '../lib/engine';
import { fmt } from '../lib/math';
import type { HousePart } from '../lib/visual';
import type { Project } from '../lib/types';

/* ---------- 2D жоспар ---------- */

export function Plan({ p, fi, part, onPart }: { p: Project; fi: number; part?: HousePart | null; onPart?: (x: HousePart) => void }) {
  const f = p.floors[fi];
  const g = floorGeometry(f, p.wallThickness);
  const rects = f.shape === 'rect' ? [{ x: 0, y: 0, length: f.length, width: f.width }] : f.shape === 'sections' ? f.sections : [];
  const ok = !g.error && rects.length > 0 && rects.every(r => r.length > 0 && r.width > 0);
  if (!ok) return <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500"><span><LayoutGrid className="mx-auto mb-2" />{f.shape === 'manual' ? 'Пішін қолмен (аудан мен периметр) берілген — нақты контур жоқ, сондықтан жоспар сызылмайды.' : g.error ?? 'Өлшемдерді енгізіңіз'}</span></div>;
  const minX = Math.min(...rects.map(r => r.x)), maxX = Math.max(...rects.map(r => r.x + r.length));
  const minY = Math.min(...rects.map(r => r.y)), maxY = Math.max(...rects.map(r => r.y + r.width));
  const VW = 340, VH = 340, pad = 34;
  const k = Math.min((VW - 2 * pad) / (maxX - minX), (VH - 2 * pad - 20) / (maxY - minY));
  const X = (x: number) => pad + (x - minX) * k, Y = (y: number) => pad + (maxY - y) * k; // y жоғары қарай
  const t = Math.max(0.05, p.wallThickness || 0.38) * k;
  const wallSel = part === 'walls', floorSel = part === 'floor';

  // Бөлмелерді шартты орналастыру (сөре әдісі) — тек бірінші тік төртбұрыштың ішіне
  const host = rects.reduce((a, r) => (r.length * r.width > a.length * a.width ? r : a));
  const innerW = host.length - 2 * (p.wallThickness || 0.38), innerH = host.width - 2 * (p.wallThickness || 0.38);
  const rooms = p.rooms.filter(r => r.floorId === f.id).map(r => ({ r, g: roomGeometry(r) })).filter(x => !x.g.error);
  // Бірнеше ретпен және екі бағытта сынап, ең көп бөлме сыятын шартты орналасуды таңдаймыз
  type Pl = { name: string; x: number; y: number; w: number; h: number; area: number };
  const T = p.wallThickness || 0.38;
  const tryPack = (order: typeof rooms) => {
    const out: Pl[] = []; const miss: string[] = [];
    let cx = 0, cy = 0, rowH = 0;
    for (const { r, g: rg } of order) {
      const opts = [[r.length, r.width], [r.width, r.length]].filter(([w, h]) => w <= innerW + 1e-6 && h <= innerH + 1e-6);
      let pick = opts.filter(([w, h]) => cx + w <= innerW + 1e-6 && cy + h <= innerH + 1e-6).sort((a2, b2) => Math.max(rowH, a2[1]) - Math.max(rowH, b2[1]))[0];
      if (!pick) { const ny = cy + rowH; pick = opts.filter(([, h]) => ny + h <= innerH + 1e-6).sort((a2, b2) => a2[1] - b2[1])[0]; if (pick) { cx = 0; cy = ny; rowH = 0; } }
      if (!pick) { miss.push(r.name); continue; }
      const [w, h] = pick;
      out.push({ name: r.name, x: host.x + T + cx, y: host.y + host.width - T - cy - h, w, h, area: rg.floorArea });
      cx += w; rowH = Math.max(rowH, h);
    }
    return { out, miss };
  };
  const orders = [rooms, [...rooms].sort((a2, b2) => b2.g.floorArea - a2.g.floorArea), [...rooms].sort((a2, b2) => Math.max(b2.r.length, b2.r.width) - Math.max(a2.r.length, a2.r.width)), [...rooms].sort((a2, b2) => Math.min(b2.r.length, b2.r.width) - Math.min(a2.r.length, a2.r.width))];
  const best = orders.map(tryPack).sort((a2, b2) => a2.miss.length - b2.miss.length)[0];
  const placed = best.out, over = best.miss;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="h-full w-full" role="img" aria-label={`${f.name} жоспары`}>
      {rects.map((r, i) => <rect key={`o${i}`} x={X(r.x)} y={Y(r.y + r.width)} width={r.length * k} height={r.width * k} fill={wallSel ? '#16a34a' : '#475569'} onClick={() => onPart?.('walls')} className="cursor-pointer" />)}
      {rects.map((r, i) => <rect key={`i${i}`} x={X(r.x) + t} y={Y(r.y + r.width) + t} width={Math.max(0, r.length * k - 2 * t)} height={Math.max(0, r.width * k - 2 * t)} fill={floorSel ? '#bbf7d0' : '#f5efe6'} onClick={() => onPart?.('floor')} className="cursor-pointer" />)}
      {placed.map(pl => (
        <g key={pl.name + pl.x} pointerEvents="none">
          <rect x={X(pl.x)} y={Y(pl.y + pl.h)} width={pl.w * k} height={pl.h * k} fill="none" stroke="#1e3a8a" strokeDasharray="4 3" strokeWidth="1" />
          <text x={X(pl.x + pl.w / 2)} y={Y(pl.y + pl.h / 2) - 2} fontSize="9" textAnchor="middle" fill="#1e3a8a" fontWeight="600">{pl.name}</text>
          <text x={X(pl.x + pl.w / 2)} y={Y(pl.y + pl.h / 2) + 9} fontSize="8" textAnchor="middle" fill="#334155">{fmt(pl.w)}×{fmt(pl.h)} · {fmt(pl.area)} м²</text>
        </g>
      ))}
      {rects.map((r, i) => (
        <g key={`d${i}`} fontSize="9" fill="#0f172a" pointerEvents="none">
          <text x={X(r.x + r.length / 2)} y={Y(r.y + r.width) - 5} textAnchor="middle">{fmt(r.length)} м</text>
          <text x={X(r.x) - 5} y={Y(r.y + r.width / 2)} textAnchor="end" dominantBaseline="middle">{fmt(r.width)}</text>
        </g>
      ))}
      <text x={VW / 2} y={VH - 8} fontSize="10" textAnchor="middle" fill="#334155">{f.name}: ауданы {fmt(g.area)} м², периметрі {fmt(g.perimeter)} м</text>
      {over.length > 0 && <text x={VW / 2} y={VH - 22} fontSize="9" textAnchor="middle" fill="#b45309">Жоспарға сыймаған бөлмелер: {over.join(', ')} (өлшемдерін тексеріңіз)</text>}
    </svg>
  );
}

/* ---------- Қасбет (бүйір көрініс) ---------- */

export function Facade({ p, part, onPart }: { p: Project; part?: HousePart | null; onPart?: (x: HousePart) => void }) {
  const geos = p.floors.map(f => floorGeometry(f, p.wallThickness));
  const top = p.floors[p.floors.length - 1];
  const widthOf = (f: Project['floors'][number]) => f.shape === 'rect' ? Math.min(f.length, f.width) : f.shape === 'sections' && f.sections.length ? Math.max(...f.sections.map(s => s.y + s.width)) - Math.min(...f.sections.map(s => s.y)) : NaN;
  const span = widthOf(p.floors[0]);
  if (!(span > 0) || geos.some(g => g.error)) return <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500"><span><Building className="mx-auto mb-2" />Қасбетті салу үшін қабаттардың нақты өлшемдері керек (қолмен берілген пішін сызылмайды).</span></div>;
  const hs = p.floors.map(f => (f.height > 0 ? f.height : 0));
  const H = hs.reduce((a, b) => a + b, 0);
  const o = Math.max(0, p.roof.overhang || 0);
  const alpha = p.roof.type === 'gable' && top.shape === 'rect' ? Math.min(79, Math.max(0, p.roof.slope)) : 0;
  const tan = Math.tan((alpha * Math.PI) / 180);
  const topSpan = widthOf(top) || span;
  const rise = (topSpan / 2) * tan;
  const fdH = p.foundation.type === 'strip' ? p.foundation.stripHeight : p.foundation.type === 'slab' ? p.foundation.slabThickness : 0.4;
  const VW = 340, VH = 340, pad = 40;
  const k = Math.min((VW - 2 * pad) / (topSpan + 2 * o), (VH - 2 * pad) / (H + rise + fdH + 0.4));
  const cx = VW / 2, gy = VH - pad - fdH * k; // жер деңгейі
  const sel = (x: HousePart) => (part === x ? '#16a34a' : undefined);
  let y = gy;
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="h-full w-full" role="img" aria-label="Үйдің қасбеті">
      <rect x="0" y={gy} width={VW} height={VH - gy} fill="#cbbfa8" opacity=".5" />
      <line x1="0" x2={VW} y1={gy} y2={gy} stroke="#6b7280" strokeDasharray="5 4" />
      <text x="6" y={gy - 4} fontSize="9" fill="#475569">жер деңгейі ±0,00</text>
      <rect x={cx - (span / 2) * k - 4} y={gy} width={span * k + 8} height={fdH * k} fill={sel('foundation') ?? '#9ca3af'} onClick={() => onPart?.('foundation')} className="cursor-pointer" />
      <text x={cx + (span / 2) * k + 8} y={gy + (fdH * k) / 2 + 3} fontSize="9" fill="#334155">{p.foundation.type === 'manual' ? 'іргетас' : `${fmt(fdH)} м`}</text>
      {p.floors.map((f, i) => {
        const w = (widthOf(f) || span) * k; const h = hs[i] * k; y -= h;
        return (
          <g key={f.id}>
            <rect x={cx - w / 2} y={y} width={w} height={h} fill={sel('walls') ?? (p.look?.facade === 'plaster' ? '#e7dfd2' : p.materials.brick.p.type === 'gasblock' ? '#cfcfca' : '#b5532f')} stroke="#7c2d12" strokeWidth=".5" onClick={() => onPart?.('walls')} className="cursor-pointer" />
            {i > 0 && <rect x={cx - w / 2 - 3} y={y + h - 3} width={w + 6} height={6} fill={sel('slab') ?? '#6b7280'} onClick={() => onPart?.('slab')} className="cursor-pointer" />}
            <text x={cx - w / 2 - 6} y={y + h / 2} fontSize="9" textAnchor="end" fill="#334155">{fmt(hs[i])} м</text>
            <text x={cx} y={y + h / 2 + 3} fontSize="10" textAnchor="middle" fill={p.look?.facade !== 'plaster' && p.materials.brick.p.type === 'gasblock' ? '#334155' : '#fff'} pointerEvents="none">{f.name}</text>
          </g>
        );
      })}
      {p.roof.type !== 'manual' && (
        <g onClick={() => onPart?.('roof')} className="cursor-pointer">
          {alpha > 0
            ? <path d={`M${cx - (topSpan / 2 + o) * k} ${y + o * tan * k} L${cx} ${y - rise * k} L${cx + (topSpan / 2 + o) * k} ${y + o * tan * k}`} fill={sel('roof') ?? p.look?.roofColor ?? '#7f1d1d'} stroke="#3f0d0d" strokeWidth="2" />
            : <rect x={cx - (topSpan / 2 + o) * k} y={y - 6} width={(topSpan + 2 * o) * k} height={6} fill={sel('roof') ?? p.look?.roofColor ?? '#7f1d1d'} />}
        </g>
      )}
      {alpha > 0 && <text x={cx + 8} y={y - rise * k + 14} fontSize="9" fill="#fff" pointerEvents="none">еңісі {fmt(alpha)}°</text>}
      <text x={cx} y={VH - 10} fontSize="10" textAnchor="middle" fill="#0f172a">Ені {fmt(topSpan)} м · қабырға биіктігі {fmt(H)} м{alpha > 0 ? ` · жотаға дейін ${fmt(H + rise)} м` : ''}</text>
    </svg>
  );
}
