import { Calculator, CheckCircle2, ClipboardList, FolderOpen, Home as HomeIcon, Settings as Gear, XCircle } from 'lucide-react';
import { StoreProvider, useStore, type Tab } from './store';
import { Button, cx } from './components/ui';
import Home from './pages/Home';
import Projects from './pages/Projects';
import Wizard from './pages/Wizard';
import Results, { PrintReport } from './pages/Results';
import Settings from './pages/Settings';

const NAV: { id: Tab; label: string; icon: typeof HomeIcon }[] = [
  { id: 'home', label: 'Басты бет', icon: HomeIcon },
  { id: 'projects', label: 'Жобаларым', icon: FolderOpen },
  { id: 'calc', label: 'Есептеу', icon: Calculator },
  { id: 'results', label: 'Нәтижелер', icon: ClipboardList },
  { id: 'settings', label: 'Баптаулар', icon: Gear },
];

function Shell() {
  const { tab, setTab, toastMsg, printDoc, askState } = useStore();
  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-4 print:hidden">
        {tab === 'home' && <Home />}
        {tab === 'projects' && <Projects />}
        {tab === 'calc' && <Wizard />}
        {tab === 'results' && <Results />}
        {tab === 'settings' && <Settings />}
      </main>

      {printDoc && <div className="hidden print:block"><PrintReport report={printDoc} /></div>}

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur print:hidden" aria-label="Негізгі мәзір">
        <ul className="mx-auto grid max-w-3xl grid-cols-5">
          {NAV.map(n => {
            const active = tab === n.id; const I = n.icon;
            return (
              <li key={n.id}>
                <button type="button" onClick={() => setTab(n.id)} aria-current={active ? 'page' : undefined}
                  className={cx('flex h-16 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition', active ? 'text-navy-800' : 'text-slate-500')}>
                  <span className={cx('flex h-8 w-12 items-center justify-center rounded-full transition', active && 'bg-navy-50')}><I size={22} strokeWidth={active ? 2.4 : 2} /></span>
                  {n.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {askState && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-3 sm:items-center print:hidden" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl animate-fade">
            <p className="mb-4 text-[17px] font-semibold leading-snug text-slate-800">{askState.msg}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => askState.resolve(false)}>Болдырмау</Button>
              <Button variant="danger" className="bg-red-600 text-white hover:bg-red-700" onClick={() => askState.resolve(true)}>Иә, жою</Button>
            </div>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 print:hidden" role="status">
          <div className={cx('flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg animate-fade', toastMsg.kind === 'ok' ? 'bg-green-700' : 'bg-red-700')}>
            {toastMsg.kind === 'ok' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}{toastMsg.msg}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>;
}
