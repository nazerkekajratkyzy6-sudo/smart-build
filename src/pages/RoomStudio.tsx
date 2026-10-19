import { lazy, Suspense, useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { computeProject, roomGeometry } from '../lib/engine';
import { newRoom } from '../lib/defaults';
import { fmt, fmtMoney } from '../lib/math';
import { roomAppearance } from '../lib/roomLook';
import { PAINT_COLORS, TEXTURES, TRIM_COLORS, presetDataUrl } from '../lib/visual';
import type { CustomMaterial, MaterialId, Room, RoomLook, TexRef, WallFinish } from '../lib/types';
import { useStore } from '../store';
import { Alert, Button, Card, cx, H2, Segmented, Select, Toggle } from '../components/ui';
import { MaterialRow } from '../components/MaterialRow';
import Room2D from '../components/Room2D';
import type { RoomPart } from '../components/Room3D';
import { Swatch } from './HouseView';

const Room3D = lazy(() => import('../components/Room3D'));

const PART_LABEL: Record<RoomPart, string> = { wall: 'Қабырға', floor: 'Еден', ceiling: 'Төбе', galtel: 'Төбе галтелі', plinth: 'Еден плинтусы' };
const PART_MATS: Record<RoomPart, MaterialId[]> = { wall: ['plaster', 'wallpaper', 'glue', 'paint', 'tile'], floor: ['leveler', 'linoleum', 'tile'], ceiling: ['paint'], galtel: ['galtel'], plinth: ['plinth'] };

export default function RoomStudio() {
  const { current: p, update, customs, focusPart } = useStore();
  const [roomId, setRoomId] = useState<string>('');
  const [mode, setMode] = useState<'3d' | '2d'>('3d');
  const [phase, setPhase] = useState<'after' | 'before'>('after');
  const [part, setPart] = useState<RoomPart | null>(focusPart && focusPart in PART_LABEL ? (focusPart as RoomPart) : 'wall');
  const room = p?.rooms.find(r => r.id === roomId) ?? p?.rooms[0];
  // Тек осы бөлменің есебі (басқа бөлмелерсіз) — бөлме бойынша нақты мөлшер мен құн
  const roomRes = useMemo(() => (p && room ? computeProject({ ...p, rooms: [room], customLines: [] }) : null), [p, room]);
  if (!p) return null;

  if (!room) {
    return (
      <div className="space-y-3">
        <H2>Бөлме макеті</H2>
        <Alert>Жобада бөлме жоқ. Макетте сынап көру үшін бөлме қосыңыз — оның өлшемдері есептеуге де қолданылады.</Alert>
        <Button onClick={() => update(d => { d.rooms.push(newRoom(d.floors[0].id, 'living', 4.5, 4, 2.7)); })}><Plus size={18} />Қонақ бөлме қосу (4,5 × 4 м)</Button>
      </div>
    );
  }
  const setRoom = (fn: (r: Room) => void) => update(d => { const r = d.rooms.find(x => x.id === room.id); if (r) fn(r); });
  const setLook = (patch: Partial<RoomLook>) => setRoom(r => { r.look = { ...(r.look ?? {}), ...patch }; });
  const look = roomAppearance(room, customs, phase === 'before');
  const g = roomGeometry(room);
  const dims = { length: room.length, width: room.width, height: room.height };
  const finishRes = roomRes?.materials.filter(m => m.category === 'finish') ?? [];
  // Таңдалған бетке негізгі материал — оның өлшемдері мен бағасы бірден ашық тұрады
  const primary: MaterialId | null = part === 'wall' ? (room.wallFinish === 'wallpaper' || room.wallFinish === 'both' ? 'wallpaper' : room.wallFinish === 'paint' ? 'paint' : room.wallFinish === 'tile' ? 'tile' : 'plaster')
    : part === 'floor' ? (room.tileFloor ? 'tile' : room.linoleum ? 'linoleum' : 'leveler') : part === 'ceiling' ? 'paint' : part;

  return (
    <div className="space-y-4">
      <H2 sub="Бөлменің бетін басыңыз — сол бетке арналған материалдар ашылады. Көрініс шамамен: нақты өнімнің түсі мен фактурасы өзгеше болуы мүмкін.">Бөлме макеті</H2>
      <Select label="Бөлме" value={room.id} onChange={setRoomId} options={p.rooms.map(r => [r.id, `${r.name} · ${fmt(r.length)}×${fmt(r.width)} м`] as [string, string])} />
      <div className="grid grid-cols-2 gap-2">
        <Segmented value={mode} onChange={setMode} options={[['3d', '3D'], ['2d', '2D (жеңіл)']]} />
        <Segmented value={phase} onChange={setPhase} options={[['before', 'Бұрын'], ['after', 'Кейін']]} />
      </div>

      {mode === '3d'
        ? <Suspense fallback={<div className="flex h-[340px] items-center justify-center rounded-2xl border text-slate-500"><Loader2 className="mr-2 animate-spin" />Жүктелуде…</div>}>
            <Room3D dims={dims} look={look} selected={part} onSelect={setPart} onFail={() => setMode('2d')} />
          </Suspense>
        : <div className="h-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-white"><Room2D dims={dims} look={look} selected={part} onSelect={setPart} /></div>}
      <p className="text-xs text-slate-500">{phase === 'before' ? 'Әрлеуге дейінгі күй.' : [look.wall.label, look.floor.label, ...look.notes].join(' · ')}</p>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(PART_LABEL) as RoomPart[]).map(k => (
          <button key={k} type="button" onClick={() => setPart(k)} className={cx('min-h-[40px] rounded-full px-4 text-sm font-semibold', part === k ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-700')}>{PART_LABEL[k]}</button>
        ))}
      </div>

      {part && (
        <Card className="space-y-3">
          <h3 className="text-lg font-bold text-navy-800">{PART_LABEL[part]}</h3>
          {phase === 'before' && <Alert>«Бұрын» режимі тек көрсетеді. Материал таңдау үшін «Кейін» режиміне ауысыңыз.</Alert>}
          {phase === 'after' && <PartOptions part={part} room={room} customs={customs} setRoom={setRoom} setLook={setLook} />}
        </Card>
      )}

      <Card className="space-y-3">
        <h3 className="text-lg font-bold text-navy-800">«{room.name}» бойынша есеп</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[['Қабырға ауданы', `${fmt(g.wallArea)} м²`], ['Еден ауданы', `${fmt(g.floorArea)} м²`], ['Периметр', `${fmt(g.perimeter)} м`]].map(([k, v]) => <div key={k} className="rounded-xl bg-green-50 p-2"><p className="text-[11px] text-green-800">{k}</p><p className="num font-bold text-green-900">{v}</p></div>)}
        </div>
        <p className="text-sm text-slate-500">Төмендегі мөлшер — тек осы бөлмеге. Жоба бойынша жалпы мөлшер «Нәтижелер» бөлімінде (бөлмелер қосылып, бүтін бірлікке бір рет дөңгелектенеді).</p>
        <div className="space-y-2">
          {(part ? PART_MATS[part] : (['plaster', 'wallpaper', 'glue', 'paint', 'tile', 'leveler', 'linoleum', 'galtel', 'plinth'] as MaterialId[])).map(id => {
            const r = finishRes.find(m => m.id === id);
            return <MaterialRow key={`${room.id}-${id}`} id={id} r={r} defaultOpen={id === primary} />;
          })}
        </div>
        {roomRes && <p className="num text-right text-[15px]">Бөлменің әрлеу құны: <b>{fmtMoney(roomRes.finishT)}</b></p>}
      </Card>
    </div>
  );
}

function TexGrid({ items, value, onPick }: { items: { ref: TexRef; name: string; url: string }[]; value?: TexRef; onPick: (r: TexRef) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map(it => {
        const active = value?.kind === it.ref.kind && value.id === it.ref.id;
        return (
          <button key={it.ref.kind + it.ref.id} type="button" onClick={() => onPick(it.ref)} className={cx('overflow-hidden rounded-xl border-2 text-left', active ? 'border-green-600' : 'border-transparent')}>
            <span className="block aspect-square bg-cover" style={{ backgroundImage: `url(${it.url})` }} />
            <span className="block truncate px-1 py-0.5 text-[11px]">{it.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function ColorRow({ colors, value, onPick, custom }: { colors: [string, string][]; value?: string; onPick: (c: string) => void; custom?: CustomMaterial[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {colors.map(([c, n]) => <Swatch key={c} color={c} name={n} active={value === c} onClick={() => onPick(c)} />)}
      {custom?.filter(m => m.color).map(m => <Swatch key={m.id} color={m.color!} name={m.name} active={value === m.color} onClick={() => onPick(m.color!)} />)}
      <label className="flex h-9 items-center gap-1 rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600">Өз түсім
        <input type="color" value={value ?? '#ffffff'} onChange={e => onPick(e.target.value)} className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0" aria-label="Өз түсімді таңдау" />
      </label>
    </div>
  );
}

function PartOptions({ part, room, customs, setRoom, setLook }: { part: RoomPart; room: Room; customs: CustomMaterial[]; setRoom: (fn: (r: Room) => void) => void; setLook: (l: Partial<RoomLook>) => void }) {
  const texItems = (kind: 'wallpaper' | 'floor' | 'walltile', cat: MaterialId) => [
    ...TEXTURES.filter(t => t.kind === kind).map(t => ({ ref: { kind: 'preset', id: t.id } as TexRef, name: t.name, url: presetDataUrl(t.id, 128) })),
    ...customs.filter(c => c.category === cat && c.textureOk && c.tile).map(c => ({ ref: { kind: 'custom', id: c.id } as TexRef, name: c.name, url: c.tile! })),
  ];
  const customNoTex = (cat: MaterialId) => customs.filter(c => c.category === cat && !c.textureOk);
  if (part === 'wall') return (
    <div className="space-y-3">
      <Segmented<WallFinish> value={room.wallFinish} onChange={v => setRoom(r => { r.wallFinish = v; })} options={[['none', 'Жоқ'], ['wallpaper', 'Тұсқағаз'], ['paint', 'Бояу'], ['tile', 'Кафель'], ['both', 'Екеуі']]} />
      {room.wallFinish === 'both' && <Alert kind="warn">Екі материал да есептеледі (арнайы таңдалды).</Alert>}
      <Toggle label="Қабырға сылағы" checked={room.plaster} onChange={v => setRoom(r => { r.plaster = v; })} />
      {(room.wallFinish === 'wallpaper' || room.wallFinish === 'both') && <><p className="text-sm font-semibold">Тұсқағаз үлгісі</p><TexGrid items={texItems('wallpaper', 'wallpaper')} value={room.look?.wallpaper ?? { kind: 'preset', id: 'wp-dots' }} onPick={v => setLook({ wallpaper: v })} /></>}
      {room.wallFinish === 'tile' && <><p className="text-sm font-semibold">Қабырға кафелінің үлгісі</p><TexGrid items={texItems('walltile', 'tile')} value={room.look?.tileWall ?? { kind: 'preset', id: 'wt-blue' }} onPick={v => setLook({ tileWall: v })} /></>}
      {(room.wallFinish === 'paint') && <><p className="text-sm font-semibold">Бояу түсі</p><ColorRow colors={PAINT_COLORS} value={room.look?.wallColor} onPick={c => setLook({ wallColor: c })} custom={customs.filter(c => c.category === 'paint')} /></>}
      {customNoTex('wallpaper').length > 0 && <p className="text-xs text-slate-500">Текстураға жарамсыз деп белгіленген тұсқағаздарыңыз ({customNoTex('wallpaper').map(c => c.name).join(', ')}) тек каталогта көрсетіледі.</p>}
      <p className="text-xs text-slate-500">Түс пен үлгі есепке әсер етпейді; қабырға әрлеуінің түрі (тұсқағаз/бояу) ғана тиісті материал есебін қосады.</p>
    </div>
  );
  if (part === 'floor') return (
    <div className="space-y-3">
      <Toggle label="Линолеум" checked={room.linoleum} onChange={v => setRoom(r => { r.linoleum = v; if (v) r.tileFloor = false; })} />
      <Toggle label="Кафель (плитка)" checked={!!room.tileFloor} onChange={v => setRoom(r => { r.tileFloor = v; if (v) r.linoleum = false; })} />
      <Toggle label="Еденді тегістейтін қоспа" checked={room.leveler} onChange={v => setRoom(r => { r.leveler = v; })} />
      {room.tileFloor && <><p className="text-sm font-semibold">Еден кафелінің үлгісі</p><TexGrid items={[...texItems('floor', 'tile').filter(t => t.ref.kind === 'custom' || ['fl-tile', 'fl-stone'].includes(t.ref.id)), ...texItems('walltile', 'tile').filter(t => t.ref.kind === 'preset')]} value={room.look?.tileFloor ?? { kind: 'preset', id: 'fl-tile' }} onPick={v => setLook({ tileFloor: v })} /></>}
      {room.linoleum && !room.tileFloor && <><p className="text-sm font-semibold">Линолеум үлгісі</p><TexGrid items={texItems('floor', 'linoleum')} value={room.look?.floor ?? { kind: 'preset', id: 'fl-oak' }} onPick={v => setLook({ floor: v })} /></>}
    </div>
  );
  if (part === 'ceiling') return (
    <div className="space-y-3">
      <Toggle label="Төбені бояу" checked={room.paintCeiling} onChange={v => setRoom(r => { r.paintCeiling = v; })} />
      {room.paintCeiling && <ColorRow colors={[['#ffffff', 'Ақ'], ...PAINT_COLORS.slice(0, 5)]} value={room.look?.ceilingColor} onPick={c => setLook({ ceilingColor: c })} />}
    </div>
  );
  if (part === 'galtel') return (
    <div className="space-y-3">
      <Toggle label="Төбе галтелін орнату" checked={room.galtel} onChange={v => setRoom(r => { r.galtel = v; })} />
      {room.galtel && <ColorRow colors={TRIM_COLORS} value={room.look?.galtelColor} onPick={c => setLook({ galtelColor: c })} custom={customs.filter(c => c.category === 'galtel')} />}
    </div>
  );
  return (
    <div className="space-y-3">
      <Toggle label="Еден плинтусын орнату" checked={room.plinth} onChange={v => setRoom(r => { r.plinth = v; })} />
      {room.plinth && <ColorRow colors={TRIM_COLORS} value={room.look?.plinthColor} onPick={c => setLook({ plinthColor: c })} custom={customs.filter(c => c.category === 'plinth')} />}
    </div>
  );
}

