import { GASBLOCK_PHOTO, PHOTOS } from '../lib/photos';
import { MAT } from '../lib/materials';
import type { MaterialId } from '../lib/types';
import { useStore } from '../store';
import { cx } from './ui';

/** Материалдың суреті: барлық жерде бірдей 4:3 пропорция. Кірпіш үшін ашық жобадағы түрі (қызыл кірпіш / газоблок) ескеріледі. */
export function MaterialPhoto({ id, className, src, alt, variant }: { id?: MaterialId; className?: string; src?: string; alt?: string; variant?: 'red' | 'gasblock' }) {
  const { current } = useStore();
  const brickType = variant ?? (current?.materials.brick.p.type as 'red' | 'gasblock' | undefined);
  const url = src ?? (id === 'brick' && brickType === 'gasblock' ? GASBLOCK_PHOTO : id ? PHOTOS[id] : '');
  const label = alt ?? (id === 'brick' ? (brickType === 'gasblock' ? 'Газоблок' : 'Қызыл кірпіш') : id ? MAT[id].name : '');
  return (
    <span className={cx('block overflow-hidden rounded-xl bg-slate-100', className)}>
      {url && <img src={url} alt={label} loading="lazy" decoding="async" className="aspect-[4/3] h-full w-full object-cover" />}
    </span>
  );
}
