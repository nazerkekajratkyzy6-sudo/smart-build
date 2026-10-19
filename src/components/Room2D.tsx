// Бөлменің жеңіл 2D (бір нүктелі перспектива) көрінісі — 3D қолжетімсіз немесе баяу құрылғылар үшін.
import type { RoomAppearance, Surface } from '../lib/roomLook';
import type { RoomPart } from './Room3D';

export default function Room2D({ dims, look, selected, onSelect, idp = 'r' }: {
  dims: { length: number; width: number; height: number }; look: RoomAppearance; selected: RoomPart | null; onSelect: (p: RoomPart) => void; idp?: string;
}) {
  const L = Math.max(1, dims.length || 4), W = Math.max(1, dims.width || 3), H = Math.max(2, dims.height || 2.7);
  const VW = 340, VH = 260;
  const FW = 330, FH = Math.min(250, (FW * H) / W);
  const fx = (VW - FW) / 2, fy = (VH - FH) / 2;
  const s = Math.min(0.62, Math.max(0.3, 0.7 - 0.08 * (L / W)));
  const bw = FW * s, bh = FH * s, bx = VW / 2 - bw / 2, by = fy + FH * 0.56 - bh * 0.56;
  const pxPerM = bw / W;
  const P = (pts: number[][]) => pts.map(p => p.join(',')).join(' ');
  const back = [[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh]];
  const left = [[fx, fy], [bx, by], [bx, by + bh], [fx, fy + FH]];
  const right = [[fx + FW, fy], [bx + bw, by], [bx + bw, by + bh], [fx + FW, fy + FH]];
  const floor = [[fx, fy + FH], [bx, by + bh], [bx + bw, by + bh], [fx + FW, fy + FH]];
  const ceil = [[fx, fy], [bx, by], [bx + bw, by], [fx + FW, fy]];
  const hl = (part: RoomPart) => (selected === part ? { stroke: '#16a34a', strokeWidth: 3 } : { stroke: '#64748b', strokeWidth: 0.6 });
  const fill = (srf: Surface, id: string) => (srf.tex ? `url(#${idp}-${id})` : srf.color);
  const pat = (srf: Surface, id: string, scale = 1) => srf.tex && (
    <pattern id={`${idp}-${id}`} patternUnits="userSpaceOnUse" width={srf.tex.repeat ? srf.tex.size * pxPerM * scale : VW} height={srf.tex.repeat ? srf.tex.size * pxPerM * scale : VH}>
      <image href={srf.tex.url} width={srf.tex.repeat ? srf.tex.size * pxPerM * scale : VW} height={srf.tex.repeat ? srf.tex.size * pxPerM * scale : VH} preserveAspectRatio="none" />
    </pattern>
  );
  // Жиек жолақтары (галтель/плинтус): артқы қабырға мен бүйір қабырғалардың жоғарғы/төменгі шеттері бойымен
  const band = (top: boolean, color: string, part: RoomPart) => {
    const t = 0.08 * pxPerM;
    const y1 = top ? by : by + bh - t, y2 = top ? by + t : by + bh;
    const ly1 = top ? fy : fy + FH - t / s, ly2 = top ? fy + t / s : fy + FH;
    return (
      <g onClick={() => onSelect(part)} className="cursor-pointer">
        <polygon points={P([[bx, y1], [bx + bw, y1], [bx + bw, y2], [bx, y2]])} fill={color} {...hl(part)} />
        <polygon points={P([[fx, ly1], [bx, y1], [bx, y2], [fx, ly2]])} fill={color} {...hl(part)} />
        <polygon points={P([[fx + FW, ly1], [bx + bw, y1], [bx + bw, y2], [fx + FW, ly2]])} fill={color} {...hl(part)} />
      </g>
    );
  };
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="h-full w-full" role="img" aria-label="Бөлме макеті">
      <defs>
        {pat(look.wall, 'wall')}{pat(look.floor, 'floor', 1.6)}
        <linearGradient id={`${idp}-shL`} x1="0" x2="1"><stop offset="0" stopColor="#000" stopOpacity=".18" /><stop offset="1" stopColor="#000" stopOpacity=".04" /></linearGradient>
        <linearGradient id={`${idp}-shR`} x1="1" x2="0"><stop offset="0" stopColor="#000" stopOpacity=".18" /><stop offset="1" stopColor="#000" stopOpacity=".04" /></linearGradient>
        <linearGradient id={`${idp}-shF`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#000" stopOpacity=".05" /><stop offset="1" stopColor="#000" stopOpacity=".2" /></linearGradient>
      </defs>
      <g onClick={() => onSelect('ceiling')} className="cursor-pointer"><polygon points={P(ceil)} fill={look.ceiling.color} {...hl('ceiling')} /></g>
      <g onClick={() => onSelect('floor')} className="cursor-pointer"><polygon points={P(floor)} fill={fill(look.floor, 'floor')} {...hl('floor')} /><polygon points={P(floor)} fill={`url(#${idp}-shF)`} pointerEvents="none" /></g>
      <g onClick={() => onSelect('wall')} className="cursor-pointer">
        <polygon points={P(left)} fill={fill(look.wall, 'wall')} {...hl('wall')} /><polygon points={P(left)} fill={`url(#${idp}-shL)`} pointerEvents="none" />
        <polygon points={P(right)} fill={fill(look.wall, 'wall')} {...hl('wall')} /><polygon points={P(right)} fill={`url(#${idp}-shR)`} pointerEvents="none" />
        <polygon points={P(back)} fill={fill(look.wall, 'wall')} {...hl('wall')} />
      </g>
      {look.galtel && band(true, look.galtel, 'galtel')}
      {look.plinth && band(false, look.plinth, 'plinth')}
    </svg>
  );
}
