import { MATERIALS, defaultMaterialState } from './materials';
import type { Floor, HouseType, MaterialId, MaterialState, Project, Room, RoomKind } from './types';

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const HOUSE_TYPES: { id: HouseType; title: string; desc: string }[] = [
  { id: 'small', title: 'Шағын үй', desc: 'Бір қабат, 2–3 бөлме, тік төртбұрышты жоспар' },
  { id: 'family', title: 'Отбасылық үй', desc: 'Бір қабат, 4–5 бөлме, әр бөлме жеке есептеледі' },
  { id: 'twostory', title: 'Екі қабатты үй', desc: 'Әр қабат пен қабат аралық жабын жеке' },
  { id: 'custom', title: 'Өз жобам', desc: 'Қабат, бөлме, пішін — бәрін өзіңіз құрастырасыз' },
];

export const ROOM_KINDS: [RoomKind, string][] = [
  ['living', 'Қонақ бөлме'], ['bedroom', 'Жатын бөлме'], ['kids', 'Балалар бөлмесі'],
  ['kitchen', 'Асүй'], ['hall', 'Дәліз'], ['bath', 'Жуынатын бөлме'], ['other', 'Басқа бөлме'],
];
export const roomKindName = (k: RoomKind) => ROOM_KINDS.find(r => r[0] === k)?.[1] ?? 'Бөлме';

export function newFloor(n: number, length = 10, width = 8, height = 2.8): Floor {
  return { id: uid(), name: `${n}-қабат`, shape: 'rect', length, width, height, sections: [], manualArea: 0, manualPerimeter: 0 };
}

export function newRoom(floorId: string, kind: RoomKind, length: number, width: number, height = 2.7): Room {
  const wet = kind === 'bath' || kind === 'kitchen';
  return {
    id: uid(), floorId, kind, name: roomKindName(kind), length, width, height,
    wallFinish: kind === 'bath' ? 'tile' : wet ? 'paint' : 'wallpaper', paintCeiling: false,
    linoleum: kind !== 'bath', tileFloor: kind === 'bath', galtel: !wet, plinth: kind !== 'bath', plaster: true, leveler: true,
  };
}

function materials(): Record<MaterialId, MaterialState> {
  return Object.fromEntries(MATERIALS.map(d => [d.id, defaultMaterialState(d, true)])) as Record<MaterialId, MaterialState>;
}

/** Жаңа жоба. Өлшемдер — тек мысал, барлығын өзгертуге болады. Бағалар бос (0) — пайдаланушы енгізеді. */
export function createProject(type: HouseType): Project {
  const now = Date.now();
  const base: Project = {
    id: uid(), name: HOUSE_TYPES.find(h => h.id === type)!.title, houseType: type, createdAt: now, updatedAt: now,
    wallThickness: 0.38, floors: [], roomsPlanned: 3,
    foundation: { type: 'strip', stripLength: 0, stripWidth: 0.4, stripHeight: 1.2, slabThickness: 0.25, manualVolume: 0 },
    interFloorSlab: { enabled: false, thickness: 0.2 },
    roof: { type: 'gable', slope: 30, overhang: 0.5, overlap: 10, manualArea: 0 },
    concreteSource: 'ready',
    rooms: [], materials: materials(), suppliers: [], offers: [], costs: { delivery: 0 }, budget: 0,
    customLines: [], look: { roofColor: '#7f1d1d', facade: 'brick' },
  };
  if (type === 'small') {
    const f = newFloor(1, 9, 7);
    base.floors = [f];
    base.rooms = [newRoom(f.id, 'living', 4.6, 3.6), newRoom(f.id, 'bedroom', 3.6, 3.6), newRoom(f.id, 'kitchen', 3.4, 2.6)];
    base.roomsPlanned = 3;
  } else if (type === 'family') {
    const f = newFloor(1, 12, 10);
    base.floors = [f];
    base.rooms = [
      newRoom(f.id, 'living', 5.5, 4.5), newRoom(f.id, 'bedroom', 4.5, 3.8), newRoom(f.id, 'kids', 4, 3.5),
      newRoom(f.id, 'kitchen', 4, 3.5), newRoom(f.id, 'hall', 6, 1.6), newRoom(f.id, 'bath', 2.5, 2),
    ];
    base.roomsPlanned = 5;
  } else if (type === 'twostory') {
    const f1 = newFloor(1, 10, 9), f2 = newFloor(2, 10, 9);
    base.floors = [f1, f2];
    base.interFloorSlab = { enabled: true, thickness: 0.2 };
    base.rooms = [
      newRoom(f1.id, 'living', 5.5, 4.5), newRoom(f1.id, 'kitchen', 4, 3.5), newRoom(f1.id, 'hall', 5, 2), newRoom(f1.id, 'bath', 2.5, 2),
      newRoom(f2.id, 'bedroom', 4.5, 4), newRoom(f2.id, 'kids', 4, 3.5), newRoom(f2.id, 'kids', 4, 3.2),
    ];
    base.roomsPlanned = 6;
  } else {
    const f = newFloor(1, 10, 8);
    f.shape = 'sections';
    f.sections = [
      { id: uid(), x: 0, y: 0, length: 10, width: 8 },
      { id: uid(), x: 10, y: 0, length: 4, width: 5 },
    ];
    base.floors = [f];
    base.roomsPlanned = 4;
  }
  return base;
}

/** Ескі нұсқада сақталған жобаға жетіспейтін өрістерді толықтыру (болашақ жаңартулар үшін). */
export function normalizeProject(p: Project): Project {
  const fresh = createProject(p.houseType ?? 'custom');
  const mats = { ...fresh.materials };
  for (const id of Object.keys(mats) as MaterialId[]) {
    const s = p.materials?.[id];
    if (s) mats[id] = { ...mats[id], ...s, tiers: { ...mats[id].tiers, ...(s.tiers ?? {}) }, p: { ...mats[id].p, ...s.p } };
  }
  return {
    ...fresh, ...p,
    foundation: { ...fresh.foundation, ...p.foundation },
    interFloorSlab: { ...fresh.interFloorSlab, ...p.interFloorSlab },
    roof: { ...fresh.roof, ...p.roof },
    costs: { ...fresh.costs, ...p.costs },
    materials: mats,
    suppliers: p.suppliers ?? [], offers: p.offers ?? [], customLines: p.customLines ?? [], look: { ...fresh.look, ...(p.look ?? {}) }, rooms: p.rooms ?? [], floors: p.floors ?? fresh.floors,
  };
}
