import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { computeProject, roomGeometry } from '../../lib/engine';
import { newRoom, ROOM_KINDS } from '../../lib/defaults';
import { fmt, fmtMoney } from '../../lib/math';
import type { RoomKind, WallFinish } from '../../lib/types';
import { useStore } from '../../store';
import { Alert, Button, Card, Collapse, H2, NumField, Select, TextField, Toggle } from '../../components/ui';

export default function StepRooms() {
  const { current: p, update, ask } = useStore();
  const [kind, setKind] = useState<RoomKind>('bedroom');
  const res = useMemo(() => (p ? computeProject(p) : null), [p]);
  if (!p || !res) return null;

  return (
    <div className="space-y-4">
      <H2 sub="Әр бөлменің өлшемі мен әрлеу материалдары жеке беріледі. Бөлмелердің ішкі қабырғалары үйдің сыртқы қабырғаларынан бөлек есептеледі.">Бөлмелер</H2>
      {res.warnings.filter(w => w.includes('бөлмелер')).map(w => <Alert key={w} kind="warn">{w}</Alert>)}
      {p.rooms.length !== p.roomsPlanned && p.rooms.length > 0 && (
        <Alert>Жоспарланған бөлмелер саны: {p.roomsPlanned}, енгізілгені: {p.rooms.length} (дәліз, асүй, жуынатын бөлме де бөлме ретінде қосылуы мүмкін).</Alert>
      )}

      {p.floors.map(f => {
        const rooms = p.rooms.filter(r => r.floorId === f.id);
        return (
          <section key={f.id} className="space-y-2">
            {p.floors.length > 1 && <h3 className="text-lg font-bold text-navy-800">{f.name}</h3>}
            {!rooms.length && <p className="text-sm text-slate-500">Бұл қабатта бөлме жоқ.</p>}
            {rooms.map(r => {
              const g = roomGeometry(r);
              const rg = res.rooms.find(x => x.id === r.id);
              const set = (fn: (x: typeof r) => void) => update(d => { const x = d.rooms.find(y => y.id === r.id); if (x) fn(x); });
              return (
                <Collapse key={r.id} defaultOpen={rooms.length <= 2}
                  title={<span><span className="block">{r.name}</span><span className="num text-xs font-normal text-slate-500">{g.error ? 'Өлшемді дұрыс енгізіңіз' : `${fmt(g.floorArea)} м² · P ${fmt(g.perimeter)} м`}{rg && rg.finishT > 0 ? ` · ${fmtMoney(rg.finishT)}` : ''}</span></span>}>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <TextField label="Атауы" value={r.name} onChange={v => set(x => { x.name = v; })} />
                      <Select<RoomKind> label="Түрі" value={r.kind} onChange={v => set(x => { x.kind = v; })} options={ROOM_KINDS} />
                      <NumField label="Ұзындығы" unit="м" value={r.length} onChange={v => set(x => { x.length = v; })} />
                      <NumField label="Ені" unit="м" value={r.width} onChange={v => set(x => { x.width = v; })} />
                      <NumField label="Биіктігі" unit="м" value={r.height} onChange={v => set(x => { x.height = v; })} />
                      {p.floors.length > 1 && <Select label="Қабат" value={r.floorId} onChange={v => set(x => { x.floorId = v; })} options={p.floors.map(fl => [fl.id, fl.name] as [string, string])} />}
                    </div>
                    {g.error ? <Alert kind="error">{g.error}</Alert> : (
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <Stat l="Еден ауданы" v={`${fmt(g.floorArea)} м²`} />
                        <Stat l="Қабырға ауданы" v={`${fmt(g.wallArea)} м²`} />
                        <Stat l="Периметрі" v={`${fmt(g.perimeter)} м`} />
                      </div>
                    )}
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="mb-2 text-sm font-semibold text-slate-700">Әрлеу материалдары</p>
                      <Select<WallFinish> label="Қабырғаны әрлеу" value={r.wallFinish} onChange={v => set(x => { x.wallFinish = v; })}
                        options={[['none', 'Жоқ'], ['wallpaper', 'Тұсқағаз (+ желім)'], ['paint', 'Бояу'], ['tile', 'Кафель (плитка)'], ['both', 'Тұсқағаз да, бояу да (екеуі де есептеледі)']]}
                        help="Бір қабырғаға тұсқағаз бен бояу автоматты түрде қатар есептелмейді. Екеуі де керек болса ғана соңғы нұсқаны таңдаңыз." />
                      {r.wallFinish === 'both' && <div className="mt-2"><Alert kind="warn">Бұл бөлмеде тұсқағаз бен бояу екеуі де есептеледі.</Alert></div>}
                      <div className="mt-1 divide-y divide-slate-200">
                        <Toggle label="Төбені бояу" checked={r.paintCeiling} onChange={v => set(x => { x.paintCeiling = v; })} />
                        <Toggle label="Қабырға сылағы" checked={r.plaster} onChange={v => set(x => { x.plaster = v; })} />
                        <Toggle label="Еденді тегістейтін қоспа" checked={r.leveler} onChange={v => set(x => { x.leveler = v; })} />
                        <Toggle label="Линолеум" checked={r.linoleum} onChange={v => set(x => { x.linoleum = v; if (v) x.tileFloor = false; })} />
                        <Toggle label="Еденге кафель (плитка)" checked={!!r.tileFloor} onChange={v => set(x => { x.tileFloor = v; if (v) x.linoleum = false; })} />
                        <Toggle label="Еден плинтусы" checked={r.plinth} onChange={v => set(x => { x.plinth = v; })} />
                        <Toggle label="Төбе галтелі" checked={r.galtel} onChange={v => set(x => { x.galtel = v; })} />
                      </div>
                    </div>
                    {rg && <p className="text-sm text-slate-600">Әрлеудің жалпы құны: <b className="num">{fmtMoney(rg.finishT)}</b>{rg.finishT === 0 && ' (бағалар енгізілгенде есептеледі)'}</p>}
                    <Button variant="danger" className="w-full" onClick={async () => { if (await ask(`«${r.name}» жойылсын ба?`)) update(d => { d.rooms = d.rooms.filter(x => x.id !== r.id); }); }}><Trash2 size={18} />Бөлмені жою</Button>
                  </div>
                </Collapse>
              );
            })}
          </section>
        );
      })}

      <Card className="space-y-3">
        <p className="font-semibold">Жаңа бөлме қосу</p>
        <Select<RoomKind> label="Бөлме түрі" value={kind} onChange={setKind} options={ROOM_KINDS} />
        <div className="grid gap-2">
          {p.floors.map(f => (
            <Button key={f.id} variant="ghost" onClick={() => update(d => { d.rooms.push(newRoom(f.id, kind, 4, 3.5, Math.max(2.5, (f.height || 2.8) - 0.1))); })}>
              <Plus size={18} />{p.floors.length > 1 ? `${f.name}: бөлме қосу` : 'Бөлме қосу'}
            </Button>
          ))}
        </div>
      </Card>

      <p className="num text-center text-sm text-slate-500">Бөлмелер ауданының қосындысы: <b>{fmt(res.roomsArea)} м²</b> · Үйдің жалпы ауданы: <b>{fmt(res.totalArea)} м²</b></p>
    </div>
  );
}

function Stat({ l, v }: { l: string; v: string }) {
  return <div className="rounded-xl bg-green-50 p-2"><p className="text-[11px] text-green-800">{l}</p><p className="num font-bold text-green-900">{v}</p></div>;
}
