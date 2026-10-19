// 15 материалдың суреттері (scripts/render-materials арқылы жасалған физикалық негізделген рендерлер).
// Суреттер жобаның ішінде сақталады, интернетсіз ашылады; авторлық құқық жобаға тиесілі.
import brick from '../assets/materials/brick.jpg';
import gasblock from '../assets/materials/gasblock.jpg';
import concrete from '../assets/materials/concrete.jpg';
import cement from '../assets/materials/cement.jpg';
import sand from '../assets/materials/sand.jpg';
import roof from '../assets/materials/roof.jpg';
import insulation from '../assets/materials/insulation.jpg';
import wallpaper from '../assets/materials/wallpaper.jpg';
import linoleum from '../assets/materials/linoleum.jpg';
import galtel from '../assets/materials/galtel.jpg';
import plinth from '../assets/materials/plinth.jpg';
import paint from '../assets/materials/paint.jpg';
import glue from '../assets/materials/glue.jpg';
import plaster from '../assets/materials/plaster.jpg';
import leveler from '../assets/materials/leveler.jpg';
import tile from '../assets/materials/tile.jpg';
import type { MaterialId } from './types';

export const GASBLOCK_PHOTO = gasblock;

export const PHOTOS: Record<MaterialId, string> = {
  brick, concrete, cement, sand, roof, insulation, wallpaper, linoleum, galtel, plinth, paint, glue, plaster, leveler, tile,
};
