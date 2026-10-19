// 15 материалдың иллюстрациялары мен қима сызбалары (қолдан салынған SVG — интернетсіз, лицензиясыз ашылады).
import { fmt } from '../lib/math';
import type { MaterialId, Project } from '../lib/types';

const C = { brick: '#b5532f', brickD: '#8f3f22', mortar: '#d9d3c7', concrete: '#a8a9a4', concreteD: '#8a8b86', sand: '#e3c98f', sandD: '#c9ad6e', soil: '#8b6b4a', ins: '#f4c542', insD: '#d9a91e', plaster: '#e8e2d6', wall: '#cfc6b8', paper: '#dfe7ee', glue: '#9ad3e8', wood: '#a0764e', ink: '#334155', roof: '#7f1d1d' };

function Label({ x, y, text, anchor = 'start' }: { x: number; y: number; text: string; anchor?: 'start' | 'end' | 'middle' }) {
  return <text x={x} y={y} fontSize="11" fill={C.ink} textAnchor={anchor} fontFamily="Inter, system-ui, sans-serif">{text}</text>;
}
function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.ink} strokeWidth="1" markerEnd="url(#ar)" />;
}
const Defs = () => <defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill={C.ink} /></marker></defs>;

/**
 * Материалдың қолданылу үлгісі: қабырға қалауы, іргетас қимасы, қабаттар т.б.
 * Белгілердегі сандар жобаның нақты параметрлерінен алынады.
 */
export function MaterialSection({ id, p }: { id: MaterialId; p?: Project }) {
  const m = p?.materials;
  const W = 320, H = 200;
  const wrap = (children: React.ReactNode) => <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"><Defs /><rect width={W} height={H} fill="#f8fafc" />{children}</svg>;
  switch (id) {
    case 'brick': {
      const j = Number(m?.brick.p.joint ?? 10), L = Number(m?.brick.p.L ?? 250), Hh = Number(m?.brick.p.H ?? 65);
      if (m?.brick.p.type === 'gasblock') return wrap(<g>
        <rect x="10" y="20" width="290" height="150" fill="#9ca3af" />
        {[...Array(4)].map((_, r) => [...Array(4)].map((__, c) => <rect key={`${r}-${c}`} x={10 + c * 96 - (r % 2 ? 48 : 0)} y={20 + r * 37.5} width="94" height="36" fill={(r + c) % 3 ? '#dedcd6' : '#d3d1cb'} />))}
        <rect x="0" y="0" width="10" height={H} fill="#f8fafc" /><rect x="300" y="0" width="20" height={H} fill="#f8fafc" />
        <rect x="0" y="172" width={W} height="28" fill="#f8fafc" /><Label x={160} y={190} anchor="middle" text={`Газоблок ${L}×${Hh} мм · желім жігі ${j} мм`} />
      </g>);
      return wrap(<g>
        {[...Array(7)].map((_, r) => [...Array(6)].map((__, c) => <rect key={`${r}-${c}`} x={10 + c * 52 - (r % 2 ? 26 : 0)} y={20 + r * 22} width="48" height="18" fill={(r * 3 + c) % 4 ? C.brick : C.brickD} />))}
        <rect x="0" y="0" width="10" height={H} fill="#f8fafc" /><rect x="300" y="0" width="20" height={H} fill="#f8fafc" />
        <rect x="0" y="172" width={W} height="28" fill="#f8fafc" /><Label x={160} y={190} anchor="middle" text={`Кірпіш ${L}×${Hh} мм · ерітінді жігі ${j} мм`} />
      </g>);
    }
    case 'concrete': {
      const f = p?.foundation;
      return wrap(<g>
        <rect x="0" y="70" width={W} height="130" fill={C.soil} opacity=".35" />
        <rect x="110" y="20" width="100" height="50" fill={C.brick} /><Label x={220} y={48} text="қабырға" />
        <rect x="95" y="70" width="130" height="100" fill={C.concrete} />{[...Array(20)].map((_, i) => <circle key={i} cx={100 + (i * 37) % 120} cy={78 + (i * 23) % 88} r="3" fill={C.concreteD} />)}
        <rect x="85" y="170" width="150" height="12" fill={C.sand} /><Label x={240} y={180} text="құм жастық" />
        <Label x={12} y={120} text="таспалы" /><Label x={12} y={134} text="іргетас" />
        {f && f.type === 'strip' && <><Label x={160} y={196} anchor="middle" text={`Ені ${fmt(f.stripWidth)} м, биіктігі ${fmt(f.stripHeight)} м`} /></>}
        {f && f.type !== 'strip' && <Label x={160} y={196} anchor="middle" text={f.type === 'slab' ? `Плиталық іргетас: қалыңдығы ${fmt(f.slabThickness)} м` : 'Көлем қолмен енгізілген'} />}
      </g>);
    }
    case 'cement': return wrap(<g>
      <path d="M30 40h70l7 110H23z" fill="#d6d3cd" stroke="#9c968c" strokeWidth="2" /><Label x={65} y={170} anchor="middle" text={`Қап ${fmt(Number(m?.cement.p.bagKg ?? 50))} кг`} />
      <path d="M120 95h30" stroke={C.ink} markerEnd="url(#ar)" />
      {[0, 1, 2].map(r => [0, 1].map(c => <rect key={`${r}${c}`} x={170 + c * 64 - (r % 2 ? 32 : 0)} y={50 + r * 34} width="58" height="26" fill={C.brick} />))}
      <rect x="166" y="50" width="4" height="96" fill="#f8fafc" />
      <Label x={240} y={170} anchor="middle" text="Цемент-құм ерітіндісі — кірпіш жігінде" />
    </g>);
    case 'sand': return wrap(<g>
      <rect x="0" y="40" width={W} height="40" fill={C.concrete} /><Label x={10} y={64} text="бетон / стяжка" />
      <rect x="0" y="80" width={W} height="40" fill={C.sand} />{[...Array(60)].map((_, i) => <circle key={i} cx={(i * 53) % W} cy={84 + (i * 7) % 32} r="1.5" fill={C.sandD} />)}<Label x={10} y={104} text="құм қабаты" />
      <rect x="0" y="120" width={W} height="60" fill={C.soil} opacity=".45" /><Label x={10} y={154} text="топырақ" />
      <Label x={160} y={196} anchor="middle" text="Құм бетон мен ерітіндіге толтырғыш ретінде де қосылады" />
    </g>);
    case 'roof': {
      const a = p?.roof.slope ?? 30, rad = (a * Math.PI) / 180, half = 120, h = Math.min(120, half * Math.tan(rad));
      return wrap(<g>
        <rect x="70" y={170 - 50} width="180" height="50" fill={C.wall} />
        <path d={`M${160 - half - 10} ${120} L160 ${120 - h} L${160 + half + 10} 120`} fill={C.roof} stroke="#5f1414" strokeWidth="3" />
        <path d={`M40 120 H120`} stroke={C.ink} strokeDasharray="3 3" />
        <Label x={95} y={114} text={`еңісі ${fmt(a)}°`} />
        <Label x={160} y={192} anchor="middle" text={`Шығыңқы бөлігі ${fmt(p?.roof.overhang ?? 0.5)} м, қабаттасу қоры ${fmt(p?.roof.overlap ?? 10)} %`} />
      </g>);
    }
    case 'insulation': return wrap(<g>
      <rect x="40" y="20" width="70" height="150" fill={C.brick} /><Label x={75} y={185} anchor="middle" text="кірпіш" />
      <rect x="110" y="20" width="50" height="150" fill={C.ins} />{[...Array(8)].map((_, i) => <path key={i} d={`M114 ${32 + i * 18} q10 -6 20 0 t20 0`} stroke={C.insD} strokeWidth="2" fill="none" />)}
      <Label x={135} y={185} anchor="middle" text={`оқшаулағыш ${fmt(Number(m?.insulation.p.thickness ?? 50))} мм`} />
      <rect x="160" y="20" width="14" height="150" fill={C.plaster} /><Label x={215} y={100} text="сыртқы әрлеу" />
      <Label x={10} y={14} text="ішкі жақ" /><Label x={310} y={14} anchor="end" text="сыртқы жақ" />
    </g>);
    case 'glue': return wrap(<g>
      <rect x="60" y="20" width="60" height="150" fill={C.wall} /><Label x={90} y={185} anchor="middle" text="қабырға" />
      <rect x="120" y="20" width="8" height="150" fill={C.glue} /><Arrow x1={210} y1={60} x2={130} y2={60} /><Label x={214} y={64} text={`желім ${fmt(Number(m?.glue.p.norm ?? 8))} г/м²`} />
      <rect x="128" y="20" width="6" height="150" fill={C.paper} stroke="#a9bccb" /><Arrow x1={210} y1={120} x2={136} y2={120} /><Label x={214} y={124} text="тұсқағаз" />
    </g>);
    case 'plaster': return wrap(<g>
      <rect x="40" y="20" width="90" height="150" fill={C.brick} /><Label x={85} y={185} anchor="middle" text="кірпіш" />
      <rect x="130" y="20" width="30" height="150" fill={C.plaster} stroke="#c9bfae" /><Label x={145} y={185} anchor="middle" text={`${fmt(Number(m?.plaster.p.thickness ?? 10))} мм`} />
      <rect x="160" y="20" width="6" height="150" fill="#8fa8b8" /><Arrow x1={230} y1={60} x2={150} y2={60} /><Label x={234} y={64} text="қабырға сылағы" /><Arrow x1={230} y1={110} x2={166} y2={110} /><Label x={234} y={114} text="бояу / тұсқағаз" />
    </g>);
    case 'leveler': return wrap(<g>
      <rect x="20" y="40" width="280" height="10" fill="#c79a66" /><Label x={300} y={34} anchor="end" text="линолеум" />
      <rect x="20" y="50" width="280" height="30" fill="#d6d3d1" /><Label x={300} y={98} anchor="end" text={`тегістеуші қоспа ${fmt(Number(m?.leveler.p.thickness ?? 10))} мм`} />
      <rect x="20" y="80" width="280" height="60" fill={C.concrete} /><Label x={30} y={115} text="бетон негіз" />
      <rect x="20" y="140" width="280" height="30" fill={C.sand} /><Label x={30} y={160} text="құм" />
    </g>);
    case 'tile': {
      const L = Number(m?.tile.p.L ?? 300), Wt = Number(m?.tile.p.W ?? 300), j = Number(m?.tile.p.joint ?? 2);
      const cw = 52, ch = Math.max(20, Math.min(80, cw * Wt / L));
      return wrap(<g>
        <rect x="20" y="20" width="280" height="150" fill="#6f6c66" />
        {[...Array(Math.ceil(150 / (ch + 3)))].map((_, r) => [...Array(6)].map((__, c) => <rect key={`${r}-${c}`} x={22 + c * (cw - 2 + 3)} y={22 + r * (ch + 3)} width={cw - 2} height={ch} fill={(r + c) % 2 ? '#d8d2c6' : '#cfc8bb'} />))}
        <rect x="0" y="170" width={W} height="30" fill="#f8fafc" /><rect x="300" y="0" width="20" height="170" fill="#f8fafc" />
        <Label x={160} y={190} anchor="middle" text={`Кафель ${L}×${Wt} мм · жік ${j} мм`} />
      </g>);
    }
    case 'galtel': case 'plinth': case 'wallpaper': case 'paint': case 'linoleum': return wrap(<g>
      <rect x="0" y="0" width={W} height={H} fill="#f8fafc" />
      <rect x="40" y="20" width="240" height="150" fill={id === 'wallpaper' ? C.paper : id === 'paint' ? '#8fa8b8' : C.wall} />
      <path d="M40 20h240v10c-60 0-90 10-120 14H40z" fill={id === 'galtel' ? '#fff' : '#eef2f7'} stroke={id === 'galtel' ? '#1e3a8a' : 'none'} strokeWidth="2" />
      <rect x="40" y="156" width="240" height="14" fill={id === 'plinth' ? C.wood : '#d6cfc4'} stroke={id === 'plinth' ? '#1e3a8a' : 'none'} strokeWidth="2" />
      <path d="M0 170h320v30H0z" fill={id === 'linoleum' ? '#c79a66' : '#e2e8f0'} stroke={id === 'linoleum' ? '#1e3a8a' : 'none'} strokeWidth="2" />
      <Label x={160} y={100} anchor="middle" text={({ galtel: 'Төбе галтелі — төбе жиегінде', plinth: 'Еден плинтусы — еден жиегінде', wallpaper: 'Тұсқағаз — қабырға бетінде', paint: 'Бояу — қабырға/төбе бетінде', linoleum: 'Линолеум — еденде' } as Record<string, string>)[id]} />
    </g>);
  }
}
