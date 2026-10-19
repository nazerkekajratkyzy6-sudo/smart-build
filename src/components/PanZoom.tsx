import { Minus, Plus, RotateCcw } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';

/** 2D көрініс: саусақпен жылжыту, екі саусақпен үлкейту/кішірейту, дөңгелекпен масштаб, бастапқы көрініске қайту. */
export function PanZoom({ children, height = 320 }: { children: ReactNode; height?: number }) {
  const [t, setT] = useState({ x: 0, y: 0, k: 1 });
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const moved = useRef(0);

  const clampK = (k: number) => Math.min(6, Math.max(0.5, k));
  const zoomAt = (factor: number, cx: number, cy: number) =>
    setT(o => { const k = clampK(o.k * factor); const f = k / o.k; return { k, x: cx - (cx - o.x) * f, y: cy - (cy - o.y) * f }; });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50" style={{ height, touchAction: 'none' }}
      onWheel={e => { const r = e.currentTarget.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); }}
      onPointerDown={e => { pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved.current = 0; }}
      onPointerMove={e => {
        const prev = pts.current.get(e.pointerId); if (!prev) return;
        const r = e.currentTarget.getBoundingClientRect();
        if (pts.current.size === 1) {
          const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
          moved.current += Math.abs(dx) + Math.abs(dy);
          if (moved.current > 4) { if (!e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId); setT(o => ({ ...o, x: o.x + dx, y: o.y + dy })); }
        }
        pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.current.size === 2) {
          const [a, b] = [...pts.current.values()];
          const dist = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2 - r.left, cy = (a.y + b.y) / 2 - r.top;
          if (last.current) zoomAt(dist / last.current.dist, cx, cy);
          last.current = { dist, cx, cy }; moved.current = 99;
        }
      }}
      onPointerUp={e => { pts.current.delete(e.pointerId); if (pts.current.size < 2) last.current = null; }}
      onPointerCancel={e => { pts.current.delete(e.pointerId); last.current = null; }}
      onClickCapture={e => { if (moved.current > 4) { e.stopPropagation(); e.preventDefault(); } }}>
      <div className="h-full w-full origin-top-left" style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})` }}>{children}</div>
      <div className="absolute bottom-2 right-2 flex gap-1">
        <IconBtn label="Үлкейту" onClick={() => zoomAt(1.25, 160, height / 2)}><Plus size={18} /></IconBtn>
        <IconBtn label="Кішірейту" onClick={() => zoomAt(0.8, 160, height / 2)}><Minus size={18} /></IconBtn>
        <IconBtn label="Бастапқы көрініс" onClick={() => setT({ x: 0, y: 0, k: 1 })}><RotateCcw size={18} /></IconBtn>
      </div>
    </div>
  );
}

export function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 text-slate-700 shadow ring-1 ring-slate-200 active:scale-95">{children}</button>;
}
