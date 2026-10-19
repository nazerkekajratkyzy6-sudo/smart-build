// Бөлменің визуалды көрінісін анықтау: таңдалған әрлеу материалдары → беттердің түсі мен текстурасы.
import { resolveTex, type ResolvedTex } from './visual';
import type { CustomMaterial, Room } from './types';

export interface Surface { color: string; tex?: ResolvedTex | null; label: string }
export interface RoomAppearance {
  wall: Surface; floor: Surface; ceiling: Surface;
  galtel: string | null; plinth: string | null;
  notes: string[];
}

export const BARE = { wall: '#c9c4bb', plastered: '#e4ded3', floor: '#b8b8b2', leveled: '#cfcfc9', ceiling: '#ededea' };

/** before = true — әрлеуге дейінгі күй (бұрын/кейін салыстыру үшін). */
export function roomAppearance(r: Room, customs: CustomMaterial[], before = false): RoomAppearance {
  const notes: string[] = [];
  const look = r.look ?? {};
  if (before) {
    return {
      wall: { color: BARE.wall, label: 'Әрленбеген қабырға' }, floor: { color: BARE.floor, label: 'Бетон еден' },
      ceiling: { color: BARE.ceiling, label: 'Төбе' }, galtel: null, plinth: null, notes: ['Әрлеуге дейінгі күй'],
    };
  }
  let wall: Surface = { color: r.plaster ? BARE.plastered : BARE.wall, label: r.plaster ? 'Сыланған қабырға' : 'Әрленбеген қабырға' };
  if (r.wallFinish === 'paint') wall = { color: look.wallColor ?? '#f8f6f1', label: 'Боялған қабырға' };
  if (r.wallFinish === 'wallpaper' || r.wallFinish === 'both') {
    const tex = resolveTex(look.wallpaper ?? { kind: 'preset', id: 'wp-dots' }, customs);
    wall = { color: '#e5e7eb', tex, label: tex ? `Тұсқағаз: ${tex.name}` : 'Тұсқағаз' };
    if (r.wallFinish === 'both') notes.push('Тұсқағаз бен бояу екеуі де таңдалған: макетте тұсқағаз көрсетілді, есептеуде екеуі де бар.');
  }
  if (r.wallFinish === 'tile') { const tex = resolveTex(look.tileWall ?? { kind: 'preset', id: 'wt-blue' }, customs); wall = { color: '#dbe7ec', tex, label: tex ? `Қабырға кафелі: ${tex.name}` : 'Қабырға кафелі' }; }
  let floor: Surface = { color: r.leveler ? BARE.leveled : BARE.floor, label: r.leveler ? 'Тегістелген еден' : 'Бетон еден' };
  if (r.tileFloor) { const tex = resolveTex(look.tileFloor ?? { kind: 'preset', id: 'fl-tile' }, customs); floor = { color: '#c9c3b8', tex, label: tex ? `Еден кафелі: ${tex.name}` : 'Еден кафелі' }; }
  if (r.linoleum && !r.tileFloor) { const tex = resolveTex(look.floor ?? { kind: 'preset', id: 'fl-oak' }, customs); floor = { color: '#c79a66', tex, label: tex ? `Линолеум: ${tex.name}` : 'Линолеум' }; }
  const ceiling: Surface = { color: r.paintCeiling ? look.ceilingColor ?? '#ffffff' : BARE.ceiling, label: r.paintCeiling ? 'Боялған төбе' : 'Төбе' };
  return { wall, floor, ceiling, galtel: r.galtel ? look.galtelColor ?? '#ffffff' : null, plinth: r.plinth ? look.plinthColor ?? '#a0764e' : null, notes };
}
