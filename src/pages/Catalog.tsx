import { Check, Eye, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import * as db from '../lib/db';
import { uid } from '../lib/defaults';
import { averageColor, cropTile, downscale, readFile, type Crop } from '../lib/image';
import { BRICK_TYPES, MAT, MATERIAL_INFO, MATERIALS, matName } from '../lib/materials';
import { fmt } from '../lib/math';
import { roomAppearance } from '../lib/roomLook';
import { MATERIAL_ON_MODEL, MATERIAL_PLACE, PLACE_NAMES, TEXTURE_CATEGORIES } from '../lib/visual';
import type { CustomCategory, CustomMaterial, CustomTarget, MaterialId, Place } from '../lib/types';
import { useStore } from '../store';
import { Alert, Button, Card, cx, H2, Help, NumField, Segmented, Select, TextField, Toggle } from '../components/ui';
import { MaterialPhoto } from '../components/MaterialPhoto';
import { MaterialSection } from '../components/Illustrations';
import Room2D from '../components/Room2D';
import { newRoom } from '../lib/defaults';

const DEFAULT_PLACE: Record<MaterialId, Place> = {
  brick: 'wall', concrete: 'foundation', cement: 'foundation', sand: 'foundation', roof: 'roof', insulation: 'wall',
  wallpaper: 'wall', linoleum: 'floor', galtel: 'ceiling', plinth: 'floor', paint: 'wall', glue: 'wall', plaster: 'wall', leveler: 'floor', tile: 'floor',
};
const PLACE_TARGET: Record<Place, CustomTarget> = { wall: 'room-walls', floor: 'room-floor', ceiling: 'room-ceiling', roof: 'roof', foundation: 'ground', other: 'manual' };

export default function Catalog() {
  const [tab, setTab] = useState<'ready' | 'mine'>('ready');
  return (
    <div className="space-y-4">
      <H2 sub="Материалдың қай жерде қолданылатынын көріп, бір басумен есептеуге қосыңыз.">Материалдар каталогы</H2>
      <Segmented value={tab} onChange={setTab} options={[['ready', 'Дайын материалдар'], ['mine', 'Менің материалдарым']]} />
      {tab === 'ready' ? <Ready /> : <Mine />}
    </div>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-slate-900/40 sm:items-center" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 pb-8 shadow-xl animate-fade sm:rounded-3xl" onClick={e => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="mb-3 flex items-start justify-between gap-2"><h3 className="text-lg font-bold text-navy-800">{title}</h3><button type="button" aria-label="Жабу" onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100"><X size={22} /></button></div>
        {children}
      </div>
    </div>
  );
}

function Ready() {
  const { current: p, update, toast, showOnModel } = useStore();
  const [show, setShow] = useState<MaterialId | null>(null);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {!p && <Alert>Бағаны енгізу және есептеуге қосу үшін алдымен жоба бастаңыз немесе ашыңыз.</Alert>}
      {MATERIALS.map(d => {
        const on = !!p?.materials[d.id].enabled;
        const s = p?.materials[d.id];
        const unit = s ? d.unitLabel(s) : d.unitLabel({ p: d.params } as never);
        return (
          <Card key={d.id} className="flex flex-col gap-2 p-3">
            <button type="button" onClick={() => setShow(d.id)} className="block text-left" aria-label={`${d.name}: үлгісін көру`}>
              <MaterialPhoto id={d.id} className="w-full" />
            </button>
            <div className="min-w-0">
              <p className="flex items-start font-bold leading-tight">{d.no}. {d.id === 'brick' ? 'Кірпіш: қызыл кірпіш / газоблок' : d.name}<Help title={d.name} text={MATERIAL_INFO[d.id]} /></p>
              <p className="text-sm text-slate-500">{MATERIAL_PLACE[d.id]}</p>
              <p className="text-xs text-slate-400">Өлшем бірлігі: {unit}</p>
            </div>
            {p && s && d.id === 'brick' && (
              <Segmented value={String(s.p.type) as 'red' | 'gasblock'} onChange={v => update(x => { Object.assign(x.materials.brick.p, BRICK_TYPES[v], { type: v, unit: 'piece' }); })}
                options={[['red', 'Қызыл кірпіш'], ['gasblock', 'Газоблок']]} />
            )}
            {p && s && <NumField label={`Бағасы (1 ${unit})`} unit="₸" optional allowZero value={s.price} onChange={v => update(x => { x.materials[d.id].price = v; })} placeholder="Енгізіңіз" />}
            <div className="mt-auto grid grid-cols-2 gap-2">
              <Button variant="outline" className="text-sm" onClick={() => setShow(d.id)}><Eye size={16} />Үлгісін көру</Button>
              <Button variant={on ? 'ghost' : 'green'} className="text-sm" disabled={!p}
                onClick={() => { update(x => { x.materials[d.id].enabled = !on; }); toast(on ? `${d.name} есептеуден алынды` : `${d.name} есептеуге қосылды`); }}>
                {on ? <><Check size={16} />Таңдалды</> : <><Plus size={16} />Таңдау</>}
              </Button>
            </div>
          </Card>
        );
      })}
      {show && (
        <Sheet title={show === 'brick' && p ? matName('brick', p.materials.brick) : MAT[show].name} onClose={() => setShow(null)}>
          <div className="space-y-3">
            <MaterialPhoto id={show} className="w-full" />
            <p className="text-sm text-slate-700">{MATERIAL_INFO[show]}</p>
            <p className="text-sm text-slate-700"><b>Қолданылатын орны:</b> {MATERIAL_PLACE[show]}</p>
            <div className="overflow-hidden rounded-2xl border border-slate-200"><MaterialSection id={show} p={p ?? undefined} /></div>
            {['cement', 'sand', 'plaster', 'leveler', 'glue'].includes(show) && <Alert>Сурет пен сызба шамамен көрсетеді — олар қоспаның техникалық сипаттамасын алмастырмайды. Қабат қалыңдығы мен шығын нормасы «Материалдар» кезеңінде бөлек енгізіледі.</Alert>}
            {p && <Button className="w-full" onClick={() => { const m = MATERIAL_ON_MODEL[show]; setShow(null); showOnModel(m.part, m.view); }}>{MATERIAL_ON_MODEL[show].view === 'house' ? 'Үй макетінде көру' : 'Бөлме макетінде сынап көру'}</Button>}
          </div>
        </Sheet>
      )}
    </div>
  );
}

function Mine() {
  const { customs, reloadCustoms, current: p, update, toast, ask } = useStore();
  const [edit, setEdit] = useState<CustomMaterial | 'new' | null>(null);
  const [show, setShow] = useState<CustomMaterial | null>(null);

  const addToCalc = (m: CustomMaterial) => {
    if (!p) return;
    if (m.category === 'other') {
      update(d => { d.customLines.push({ id: uid(), customId: m.id, name: m.name, unit: m.unit, price: m.price, norm: m.norm, waste: 5, target: PLACE_TARGET[m.place], roomIds: [], manualArea: 0, mode: m.norm > 0 ? 'auto' : 'manual', manualQty: 0, enabled: true }); });
      toast('Жеке материал есептеуге қосылды («Материалдар» кезеңінде баптаңыз)');
    } else {
      const id = m.category;
      update(d => { const s = d.materials[id]; s.enabled = true; s.customId = m.id; s.displayName = m.name; if (m.price > 0) s.price = m.price; });
      toast(`«${m.name}» — ${MAT[id].name} материалының нақты өнімі ретінде қосылды`);
    }
  };
  const inCalc = (m: CustomMaterial) => !!p && (m.category === 'other' ? p.customLines.some(l => l.customId === m.id) : p.materials[m.category].customId === m.id);

  return (
    <div className="space-y-3">
      <Button variant="green" className="w-full" onClick={() => setEdit('new')}><ImagePlus size={18} />Өз материалымды қосу</Button>
      {!customs.length && <Alert>Мұнда дүкеннен түсірген материалдарыңыздың суреті, атауы мен бағасы сақталады. Олар тек осы телефонда (жергілікті дерекқорда) тұрады және жобамен бірге JSON-ға экспортталады.</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        {customs.map(m => (
          <Card key={m.id} className="space-y-2 p-3">
            <MaterialPhoto src={m.photo} alt={m.name} className="w-full" />
            <div>
              <p className="font-bold leading-tight">{m.name}</p>
              <p className="text-sm text-slate-500">{m.category === 'other' ? 'Басқа материал' : MAT[m.category].name} · {PLACE_NAMES[m.place]}</p>
              <p className="num text-sm">{m.price > 0 ? `${fmt(m.price)} ₸ / ${m.unit}` : `Бағасы енгізілмеген · ${m.unit}`}{m.norm > 0 ? ` · ${fmt(m.norm)} ${m.unit}/м²` : ''}</p>
              <p className={cx('text-xs', m.textureOk ? 'text-green-700' : 'text-slate-400')}>{m.textureOk ? 'Макетке текстура ретінде қолданылады' : 'Тек карточкада көрсетіледі'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="text-sm" onClick={() => setShow(m)}><Eye size={16} />Үлгісін көру</Button>
              <Button variant={inCalc(m) ? 'ghost' : 'green'} className="text-sm" disabled={!p || inCalc(m)} onClick={() => addToCalc(m)}>{inCalc(m) ? <><Check size={16} />Есептеуде</> : <><Plus size={16} />Есептеуге қосу</>}</Button>
              <Button variant="ghost" className="text-sm" onClick={() => setEdit(m)}><Pencil size={16} />Өңдеу</Button>
              <Button variant="danger" className="text-sm" onClick={async () => {
                if (!(await ask(`«${m.name}» материалы жойылсын ба?`))) return;
                await db.deleteCustom(m.id);
                if (p) update(d => {
                  (Object.keys(d.materials) as MaterialId[]).forEach(k => { if (d.materials[k].customId === m.id) { delete d.materials[k].customId; delete d.materials[k].displayName; if (k === 'insulation') d.materials[k].displayName = 'Теплород'; } });
                  d.customLines = d.customLines.filter(l => l.customId !== m.id);
                  d.rooms.forEach(r => { if (r.look?.wallpaper?.kind === 'custom' && r.look.wallpaper.id === m.id) delete r.look.wallpaper; if (r.look?.floor?.kind === 'custom' && r.look.floor.id === m.id) delete r.look.floor; });
                });
                await reloadCustoms(); toast('Материал жойылды');
              }}><Trash2 size={16} />Жою</Button>
            </div>
          </Card>
        ))}
      </div>
      {edit && <CustomEditor initial={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      {show && <CustomPreview m={show} onClose={() => setShow(null)} />}
    </div>
  );
}

function CustomPreview({ m, onClose }: { m: CustomMaterial; onClose: () => void }) {
  const { current: p, customs } = useStore();
  const demoRoom = useMemo(() => {
    const base = p?.rooms[0] ?? newRoom('demo', 'living', 4.5, 4, 2.7);
    const r = { ...base, look: { ...(base.look ?? {}) } };
    if (m.category === 'wallpaper') { r.wallFinish = 'wallpaper'; r.look.wallpaper = { kind: 'custom', id: m.id }; }
    if (m.category === 'linoleum') { r.linoleum = true; r.tileFloor = false; r.look.floor = { kind: 'custom', id: m.id }; }
    if (m.category === 'tile') { r.tileFloor = true; r.linoleum = false; r.look.tileFloor = { kind: 'custom', id: m.id }; }
    if (m.category === 'paint' && m.color) { r.wallFinish = 'paint'; r.look.wallColor = m.color; }
    if (m.category === 'galtel' && m.color) { r.galtel = true; r.look.galtelColor = m.color; }
    if (m.category === 'plinth' && m.color) { r.plinth = true; r.look.plinthColor = m.color; }
    return r;
  }, [m, p]);
  const canShow = ['wallpaper', 'linoleum', 'tile'].includes(m.category) ? m.textureOk : ['paint', 'galtel', 'plinth'].includes(m.category) && !!m.color;
  return (
    <Sheet title={m.name} onClose={onClose}>
      <div className="space-y-3">
        <img src={m.photo} alt={m.name} className="w-full rounded-2xl" />
        {canShow ? (
          <>
            <p className="text-sm font-semibold">Бөлмедегі шамамен көрінісі</p>
            <div className="h-[240px] overflow-hidden rounded-2xl border"><Room2D dims={demoRoom} look={roomAppearance(demoRoom, customs)} selected={null} onSelect={() => {}} idp="pv" /></div>
            <p className="text-xs text-slate-500">Визуализация шамамен: нақты өнімнің түсі, фактурасы және сапасы суреттен өзгеше болуы мүмкін.</p>
          </>
        ) : <Alert>Бұл материалдың суреті макетке қолданылмайды: {m.category === 'other' || !TEXTURE_CATEGORIES.includes(m.category as MaterialId) ? 'құрылыс қоспалары мен көрінбейтін материалдар текстураға айналдырылмайды' : 'текстура ретінде жарамсыз деп белгіленген'}. Материалдың қолданылатын орны: {PLACE_NAMES[m.place]}.</Alert>}
      </div>
    </Sheet>
  );
}

function CustomEditor({ initial, onClose }: { initial: CustomMaterial | null; onClose: () => void }) {
  const { reloadCustoms, toast, current: p, update } = useStore();
  const [m, setM] = useState<CustomMaterial>(() => initial ?? { id: uid(), name: '', category: 'wallpaper', place: 'wall', unit: 'рулон', price: 0, norm: 0, photo: '', tileSize: 0.53, repeat: true, textureOk: true, createdAt: Date.now() });
  const [crop, setCrop] = useState<Crop>({ x: 0.5, y: 0.5, size: 0.6 });
  const [tilePreview, setTilePreview] = useState<string>(initial?.tile ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const texAllowed = m.category !== 'other' && TEXTURE_CATEGORIES.includes(m.category);
  const tiled = texAllowed && ['wallpaper', 'linoleum', 'tile'].includes(m.category);

  useEffect(() => {
    if (!m.photo || !tiled || !m.textureOk) return;
    let alive = true;
    cropTile(m.photo, crop, 256).then(t => { if (alive) setTilePreview(t); }).catch(() => {});
    return () => { alive = false; };
  }, [m.photo, crop, tiled, m.textureOk]);

  const setCat = (c: CustomCategory) => setM(o => ({
    ...o, category: c,
    place: c === 'other' ? o.place : DEFAULT_PLACE[c],
    unit: c === 'other' ? o.unit || 'дана' : MAT[c].unitLabel(p?.materials[c] ?? { p: MAT[c].params } as never),
    textureOk: c !== 'other' && TEXTURE_CATEGORIES.includes(c),
    tileSize: c === 'linoleum' ? 1 : c === 'tile' ? 0.3 : 0.53,
  }));

  const save = async () => {
    if (!m.name.trim()) { setErr('Материалдың атауын енгізіңіз'); return; }
    if (!m.photo) { setErr('Фотосурет жүктеңіз'); return; }
    if (!(m.unit || '').trim()) { setErr('Өлшем бірлігін енгізіңіз'); return; }
    if (m.price < 0 || !Number.isFinite(m.price) || m.norm < 0 || !Number.isFinite(m.norm)) { setErr('Өлшемді дұрыс енгізіңіз'); return; }
    setBusy(true);
    try {
      const out: CustomMaterial = { ...m, name: m.name.trim(), textureOk: texAllowed && m.textureOk };
      if (out.textureOk && tiled) out.tile = await cropTile(m.photo, crop, 512); else delete out.tile;
      if (texAllowed) out.color = await averageColor(out.tile ?? m.photo); else delete out.color;
      await db.saveCustom(out);
      // Жобадағы байланысқан жолдарды жаңарту (атауы мен бағасы)
      if (p && initial) update(d => {
        d.customLines.forEach(l => { if (l.customId === out.id) { l.name = out.name; l.unit = out.unit; l.price = out.price; l.norm = out.norm; } });
        (Object.keys(d.materials) as MaterialId[]).forEach(k => { if (d.materials[k].customId === out.id) { d.materials[k].displayName = out.name; if (out.price > 0) d.materials[k].price = out.price; } });
      });
      await reloadCustoms(); toast('Материал сақталды'); onClose();
    } catch (e) { setErr((e as Error).message || 'Сақтау мүмкін болмады'); } finally { setBusy(false); }
  };

  return (
    <Sheet title={initial ? 'Материалды өңдеу' : 'Өз материалымды қосу'} onClose={onClose}>
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Фотосурет (галереядан немесе камерадан)</span>
          <span className="flex min-h-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
            {m.photo ? <img src={m.photo} alt="" className="max-h-56 w-full object-contain" /> : <span className="flex items-center gap-2 text-slate-500"><ImagePlus />Суретті таңдау</span>}
          </span>
          <input type="file" accept="image/*" className="sr-only" onChange={async e => {
            const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
            try { setBusy(true); const raw = await readFile(f); setM(o => ({ ...o, photo: '' })); const small = await downscale(raw); setM(o => ({ ...o, photo: small })); setErr(''); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
          }} />
        </label>
        <TextField label="Материалдың атауы" value={m.name} onChange={v => setM(o => ({ ...o, name: v }))} placeholder="Мысалы: «Нұр» флизелин тұсқағазы" />
        <Select<string> label="Санаты" value={m.category} onChange={v => setCat(v as CustomCategory)} options={[...MATERIALS.map(d => [d.id, d.name] as [string, string]), ['other', 'Басқа материал']]}
          help="15 материалдың біріне жатса, мөлшері сол материалдың есептеу тәсілімен автоматты табылады, ал сіздің өнімнің атауы мен бағасы қолданылады. «Басқа» — 1 м²-ге шығын нормасы бойынша жеке есептеледі." />
        <Select<Place> label="Қолданылатын орны" value={m.place} onChange={v => setM(o => ({ ...o, place: v }))} options={Object.entries(PLACE_NAMES) as [Place, string][]} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Өлшем бірлігі" value={m.unit} onChange={v => setM(o => ({ ...o, unit: v }))} placeholder="рулон, қап, м²…" />
          <NumField label="Бірлік бағасы" unit="₸" optional allowZero value={m.price} onChange={v => setM(o => ({ ...o, price: v }))} />
        </div>
        {m.category === 'other' && <NumField label="1 м² бетке кететін мөлшер (шығын нормасы)" unit={m.unit || 'бірлік'} optional allowZero value={m.norm} onChange={v => setM(o => ({ ...o, norm: v }))} help="Мысалы, 1 м² бетке 0,2 қаптама кетсе — 0,2 деп жазыңыз. Белгісіз болса бос қалдырып, мөлшерді кейін «Материалдар» кезеңінде қолмен енгізесіз." />}
        {m.category === 'other' && !(m.norm > 0) && <Alert kind="warn">Шығын нормасы енгізілмесе, есептеуге қосқаннан кейін мөлшерді қолмен жазу сұралады.</Alert>}
        {m.category !== 'other' && <p className="text-xs text-slate-500">Мөлшері «{MAT[m.category].name}» материалының өлшемдері бойынша автоматты есептеледі; бағасы мен атауы осы өнімнен алынады.</p>}

        {texAllowed ? (
          <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
            <Toggle label="Суретті макетте қолдану" checked={m.textureOk} onChange={v => setM(o => ({ ...o, textureOk: v }))} hint={tiled ? 'Қабырғаға/еденге текстура ретінде' : 'Суреттің орташа түсі қолданылады'} />
            {m.textureOk && tiled && m.photo && (
              <>
                <p className="text-sm font-semibold">Қиып алу және масштаб</p>
                <div className="relative overflow-hidden rounded-xl">
                  <img src={m.photo} alt="" className="w-full" />
                  <CropFrame crop={crop} src={m.photo} />
                </div>
                <Range label="Көлденең орны" value={crop.x} onChange={x => setCrop(c => ({ ...c, x }))} />
                <Range label="Тік орны" value={crop.y} onChange={y => setCrop(c => ({ ...c, y }))} />
                <Range label="Қию өлшемі" min={0.15} value={crop.size} onChange={size => setCrop(c => ({ ...c, size }))} />
                <NumField label="Бір плитканың нақты өлшемі" unit="м" value={m.tileSize} onChange={v => setM(o => ({ ...o, tileSize: v }))} help="Қиылған шаршы шын мәнінде қанша метрге тең. Тұсқағаз үшін әдетте рулон ені (0,53 м)." />
                <Toggle label="Қайталау (плиткамен)" checked={m.repeat} onChange={v => setM(o => ({ ...o, repeat: v }))} hint="Өшірілсе, сурет бүкіл бетке созылады" />
                {tilePreview && <div className="h-24 rounded-xl border" style={{ backgroundImage: `url(${tilePreview})`, backgroundSize: m.repeat ? '48px 48px' : 'cover' }} aria-label="Текстура алдын ала көрінісі" />}
                <p className="text-xs text-slate-500">Егер сурет біркелкі өрнек емес (мысалы, дүкен сөресі түсірілсе), «Суретті макетте қолдану» ауыстырғышын өшіріңіз — сурет тек карточкада көрсетіледі.</p>
              </>
            )}
          </div>
        ) : <Alert>Цемент, құм, бетон және басқа құрылыс қоспаларының суреттері қабырға немесе еден текстурасына айналдырылмайды — сурет тек карточкада көрсетіледі.</Alert>}

        {err && <Alert kind="error">{err}</Alert>}
        <Button className="w-full" onClick={save} disabled={busy}>{busy ? 'Өңделуде…' : 'Сақтау'}</Button>
      </div>
    </Sheet>
  );
}

function CropFrame({ crop, src }: { crop: Crop; src: string }) {
  const [ratio, setRatio] = useState(1);
  useEffect(() => { const i = new Image(); i.onload = () => setRatio(i.naturalWidth / i.naturalHeight); i.src = src; }, [src]);
  // шаршы жағы = min(W,H)·size; пайызбен орналастыру
  const sw = ratio >= 1 ? crop.size / ratio : crop.size, sh = ratio >= 1 ? crop.size : crop.size * ratio;
  return <div className="pointer-events-none absolute border-2 border-white shadow-[0_0_0_9999px_rgba(15,23,42,.45)]" style={{ left: `${(1 - sw) * crop.x * 100}%`, top: `${(1 - sh) * crop.y * 100}%`, width: `${sw * 100}%`, height: `${sh * 100}%` }} />;
}

function Range({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <label className="block text-sm text-slate-600">{label}
      <input type="range" min={min} max={1} step={0.01} value={value} onChange={e => onChange(Number(e.target.value))} className="mt-1 w-full accent-green-600" />
    </label>
  );
}

