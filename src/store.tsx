import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createProject } from './lib/defaults';
import * as db from './lib/db';
import type { CustomMaterial, HouseType, Project } from './lib/types';
import type { Report } from './lib/report';

export type Tab = 'home' | 'projects' | 'calc' | 'results' | 'settings';
export type CalcView = 'quick' | 'steps' | 'house' | 'room' | 'catalog';
export type SaveState = 'saved' | 'saving' | 'dirty' | 'error';

interface Store {
  tab: Tab; setTab: (t: Tab) => void;
  step: number; setStep: (n: number) => void;
  projects: Project[]; reload: () => Promise<void>;
  current: Project | null;
  update: (fn: (p: Project) => void) => void;
  startNew: (type: HouseType) => void;
  open: (p: Project, tab?: Tab) => void;
  close: () => void;
  saveNow: () => Promise<boolean>;
  saveState: SaveState;
  toast: (msg: string, kind?: 'ok' | 'error') => void;
  toastMsg: { msg: string; kind: 'ok' | 'error' } | null;
  printDoc: Report | null;
  print: (r: Report) => void;
  ask: (msg: string) => Promise<boolean>;
  askState: { msg: string; resolve: (v: boolean) => void } | null;
  customs: CustomMaterial[]; reloadCustoms: () => Promise<void>;
  view: CalcView; setView: (v: CalcView) => void;
  focusPart: string | null; showOnModel: (part: string, view: 'house' | 'room') => void;
}

const Ctx = createContext<Store>(null as unknown as Store);
export const useStore = () => useContext(Ctx);

const LAST_KEY = 'smart-build:last';

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tab, setTabRaw] = useState<Tab>('home');
  const [step, setStep] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [current, setCurrent] = useState<Project | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [toastMsg, setToast] = useState<Store['toastMsg']>(null);
  const [printDoc, setPrintDoc] = useState<Report | null>(null);
  const [askState, setAsk] = useState<Store['askState']>(null);
  const ask = useCallback((msg: string) => new Promise<boolean>(res => setAsk({ msg, resolve: v => { setAsk(null); res(v); } })), []);
  const print = useCallback((r: Report) => { setPrintDoc(r); window.setTimeout(() => window.print(), 80); }, []);
  const [customs, setCustoms] = useState<CustomMaterial[]>([]);
  const [view, setViewRaw] = useState<CalcView>('steps');
  const [focusPart, setFocusPart] = useState<string | null>(null);
  const setView = useCallback((v: CalcView) => { setViewRaw(v); setTabRaw('calc'); window.scrollTo({ top: 0 }); }, []);
  const showOnModel = useCallback((part: string, v: 'house' | 'room') => { setFocusPart(part); setViewRaw(v); setTabRaw('calc'); window.scrollTo({ top: 0 }); }, []);
  const reloadCustoms = useCallback(async () => { try { setCustoms(await db.listCustom()); } catch { /* */ } }, []);
  useEffect(() => { reloadCustoms(); }, [reloadCustoms]);
  const timer = useRef<number>();
  const toastTimer = useRef<number>();

  const toast = useCallback((msg: string, kind: 'ok' | 'error' = 'ok') => {
    setToast({ msg, kind });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const reload = useCallback(async () => {
    try { setProjects(await db.listProjects()); } catch { toast('Жобаларды оқу мүмкін болмады', 'error'); }
  }, [toast]);

  // Іске қосылғанда: жобалар тізімі және соңғы ашылған жоба
  useEffect(() => {
    (async () => {
      await reload();
      try {
        const last = localStorage.getItem(LAST_KEY);
        if (last) { const p = await db.getProject(last); if (p) setCurrent(p); }
      } catch { /* жеке режимде localStorage болмауы мүмкін */ }
    })();
  }, [reload]);

  const persist = useCallback(async (p: Project) => {
    setSaveState('saving');
    try {
      await db.saveProject(p);
      setSaveState('saved');
      setProjects(list => [p, ...list.filter(x => x.id !== p.id)]);
      try { localStorage.setItem(LAST_KEY, p.id); } catch { /* елемейміз */ }
      return true;
    } catch {
      setSaveState('error');
      return false;
    }
  }, []);

  // Автоматты сақтау (енгізілген ақпарат кезеңдер арасында жоғалмайды)
  useEffect(() => {
    if (!current || saveState !== 'dirty') return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { persist(current); }, 500);
    return () => window.clearTimeout(timer.current);
  }, [current, saveState, persist]);

  const update = useCallback((fn: (p: Project) => void) => {
    setCurrent(prev => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      next.updatedAt = Date.now();
      return next;
    });
    setSaveState('dirty');
  }, []);

  const setTab = useCallback((t: Tab) => { setTabRaw(t); window.scrollTo({ top: 0 }); }, []);

  const startNew = useCallback((type: HouseType) => {
    const p = createProject(type);
    setCurrent(p); setStep(1); setTabRaw('calc'); setViewRaw('steps');
    persist(p);
    window.scrollTo({ top: 0 });
  }, [persist]);

  const open = useCallback((p: Project, t: Tab = 'calc') => {
    setCurrent(p); setStep(t === 'calc' ? 1 : 0); setTabRaw(t); setViewRaw('steps'); setSaveState('saved');
    try { localStorage.setItem(LAST_KEY, p.id); } catch { /* */ }
    window.scrollTo({ top: 0 });
  }, []);

  const close = useCallback(() => {
    setCurrent(null); setStep(0);
    try { localStorage.removeItem(LAST_KEY); } catch { /* */ }
  }, []);

  const saveNow = useCallback(async () => {
    if (!current) return false;
    window.clearTimeout(timer.current);
    const ok = await persist(current);
    toast(ok ? 'Жоба сақталды' : 'Жоба сақталмады. Браузер жадын тексеріңіз.', ok ? 'ok' : 'error');
    return ok;
  }, [current, persist, toast]);

  const value = useMemo<Store>(() => ({
    tab, setTab, step, setStep, projects, reload, current, update, startNew, open, close, saveNow, saveState, toast, toastMsg, printDoc, print, ask, askState, customs, reloadCustoms, view, setView, focusPart, showOnModel,
  }), [tab, setTab, step, projects, reload, current, update, startNew, open, close, saveNow, saveState, toast, toastMsg, printDoc, print, ask, askState, customs, reloadCustoms, view, setView, focusPart, showOnModel]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
