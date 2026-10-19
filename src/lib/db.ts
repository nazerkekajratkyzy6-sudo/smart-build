// Жергілікті сақтау: IndexedDB (idb-keyval арқылы). Сервер мен тіркелу қажет емес.
import { createStore, del, entries, get, set } from 'idb-keyval';
import { normalizeProject, uid } from './defaults';
import type { CustomMaterial, Project } from './types';
import type { QuickCalc } from './quick';

const store = createStore('smart-build-db', 'projects');
const customStore = createStore('smart-build-custom', 'materials');
const quickStore = createStore('smart-build-quick', 'estimates');

/* ---------- Жылдам есептер ---------- */
export async function listQuick(): Promise<QuickCalc[]> {
  const all = await entries<string, QuickCalc>(quickStore);
  return all.map(([, q]) => q).sort((a, b) => b.updatedAt - a.updatedAt);
}
export async function saveQuick(q: QuickCalc): Promise<void> { await set(q.id, JSON.parse(JSON.stringify(q)), quickStore); }
export async function deleteQuick(id: string): Promise<void> { await del(id, quickStore); }

/* ---------- Менің материалдарым ---------- */

export async function listCustom(): Promise<CustomMaterial[]> {
  const all = await entries<string, CustomMaterial>(customStore);
  return all.map(([, m]) => m).sort((a, b) => b.createdAt - a.createdAt);
}
export async function saveCustom(m: CustomMaterial): Promise<void> { await set(m.id, m, customStore); }
export async function deleteCustom(id: string): Promise<void> { await del(id, customStore); }

/** Жобада сілтеме жасалған жеке материалдардың id-лері */
export function customRefs(p: Project): string[] {
  const ids = new Set<string>();
  Object.values(p.materials).forEach(m => m.customId && ids.add(m.customId));
  (p.customLines ?? []).forEach(l => ids.add(l.customId));
  p.rooms.forEach(r => [r.look?.wallpaper, r.look?.floor].forEach(t => t?.kind === 'custom' && ids.add(t.id)));
  return [...ids];
}

export async function listProjects(): Promise<Project[]> {
  const all = await entries<string, Project>(store);
  return all.map(([, p]) => normalizeProject(p)).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProject(id: string): Promise<Project | undefined> {
  const p = await get<Project>(id, store);
  return p ? normalizeProject(p) : undefined;
}

export async function saveProject(p: Project): Promise<void> {
  await set(p.id, JSON.parse(JSON.stringify(p)), store);
}

export async function deleteProject(id: string): Promise<void> {
  await del(id, store);
}

export function duplicateProject(p: Project, name?: string): Project {
  const now = Date.now();
  const copy: Project = JSON.parse(JSON.stringify(p));
  return { ...copy, id: uid(), name: name ?? `${p.name} (көшірме)`, createdAt: now, updatedAt: now };
}

/* ---------- JSON экспорт / импорт ---------- */

export interface Backup { app: 'SMART BUILD'; version: 1; exportedAt: string; projects: Project[]; customMaterials?: CustomMaterial[] }

/** Жобалар мен олар қолданатын жеке материалдар (суреттерімен) бір JSON файлында. */
export async function toBackupWithCustom(projects: Project[]): Promise<Backup> {
  const need = new Set(projects.flatMap(customRefs));
  let customMaterials: CustomMaterial[] = [];
  try { customMaterials = (await listCustom()).filter(m => need.has(m.id)); } catch { /* жоқ болса — бос */ }
  return { app: 'SMART BUILD', version: 1, exportedAt: new Date().toISOString(), projects, customMaterials };
}

export function toBackup(projects: Project[]): Backup {
  return { app: 'SMART BUILD', version: 1, exportedAt: new Date().toISOString(), projects };
}

export function parseCustomFromBackup(text: string): CustomMaterial[] {
  try {
    const d = JSON.parse(text) as Backup;
    return Array.isArray(d?.customMaterials) ? d.customMaterials.filter(m => m && typeof m.id === 'string' && typeof m.name === 'string') : [];
  } catch { return []; }
}

/** JSON файлын тексеріп, жобаларды қайтарады. Қате болса түсінікті хабарлама лақтырады. */
export function parseBackup(text: string): Project[] {
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('Файл JSON пішімінде емес'); }
  const raw = (data as Backup)?.app === 'SMART BUILD' ? (data as Backup).projects : (data as Project)?.floors ? [data as Project] : null;
  if (!Array.isArray(raw) || !raw.length) throw new Error('Бұл файлда SMART BUILD жобасы табылмады');
  return raw.map(p => {
    if (!p || typeof p !== 'object' || !Array.isArray(p.floors)) throw new Error('Жоба деректері бүлінген');
    return normalizeProject({ ...p, id: uid(), updatedAt: Date.now() });
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function safeFileName(s: string): string {
  return (s || 'smart-build').replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 60) || 'smart-build';
}
