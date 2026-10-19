import { ChevronDown, Info, X } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { ERR_SIZE } from '../lib/math';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export function Card({ children, className, ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-2xl border border-slate-200 bg-white p-4 shadow-sm animate-fade', className)} {...rest}>{children}</div>;
}

type BtnVariant = 'primary' | 'green' | 'ghost' | 'outline' | 'danger';
export function Button({ variant = 'primary', className, children, ...rest }: { variant?: BtnVariant } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-navy-800 text-white hover:bg-navy-700 active:bg-navy-900',
    green: 'bg-green-600 text-white hover:bg-green-700',
    ghost: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100',
  };
  return (
    <button
      type="button"
      className={cx('inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold transition active:scale-[.98] disabled:opacity-40', v[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Ақпарат белгішесі: басқанда түсіндірме ашылады. */
export function Help({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-label={title} onClick={() => setOpen(true)} className="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-navy-700 hover:bg-navy-50">
        <Info size={17} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 sm:items-center" onClick={() => setOpen(false)}>
          <div role="dialog" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl animate-fade" onClick={e => e.stopPropagation()}>
            <div className="mb-2 flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-navy-800">{title}</h3>
              <button type="button" aria-label="Жабу" onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <p className="leading-relaxed text-slate-700">{text}</p>
          </div>
        </div>
      )}
    </>
  );
}

function parseNum(s: string): number {
  const t = s.replace(/\s| /g, '').replace(',', '.');
  if (t === '') return NaN;
  if (!/^-?\d*\.?\d*$/.test(t)) return NaN;
  return Number(t);
}

/**
 * Сан енгізу өрісі: өлшем бірлігі көрсетіледі, үтір мен нүкте қабылданады,
 * теріс сан мен (қажет болса) нөл қабылданбайды — «Өлшемді дұрыс енгізіңіз».
 */
export function NumField({ label, value, onChange, unit, help, allowZero = false, optional = false, integer = false, placeholder, className }: {
  label: string; value: number; onChange: (v: number) => void; unit?: string; help?: string;
  allowZero?: boolean; optional?: boolean; integer?: boolean; placeholder?: string; className?: string;
}) {
  const id = useId();
  const show = (v: number) => (Number.isFinite(v) && !(optional && v === 0) ? String(v).replace('.', ',') : '');
  const [text, setText] = useState(show(value));
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (parseNum(text) !== value && !(Number.isNaN(parseNum(text)) && Number.isNaN(value))) setText(show(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const n = parseNum(text);
  let err = '';
  if (text.trim() === '') { if (!optional) err = ERR_SIZE; }
  else if (Number.isNaN(n) || n < 0 || (!allowZero && n === 0) || (integer && !Number.isInteger(n))) err = ERR_SIZE;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 flex items-center text-sm font-medium text-slate-600">
        {label}{help && <Help title={label} text={help} />}
      </label>
      <div className={cx('flex items-center rounded-xl border bg-white focus-within:ring-2', err && touched ? 'border-red-400 focus-within:ring-red-200' : 'border-slate-300 focus-within:ring-navy-100')}>
        <input
          id={id} inputMode="decimal" autoComplete="off" placeholder={placeholder}
          className="num min-w-0 flex-1 rounded-xl bg-transparent px-3 py-3 text-base outline-none"
          value={text}
          onChange={e => {
            setText(e.target.value); setTouched(true);
            const v = parseNum(e.target.value);
            onChange(e.target.value.trim() === '' ? (optional ? 0 : NaN) : v);
          }}
          onBlur={() => setTouched(true)}
        />
        {unit && <span className="shrink-0 pr-3 text-sm text-slate-500">{unit}</span>}
      </div>
      {err && touched && <p className="mt-1 text-sm text-red-600">{err}</p>}
    </div>
  );
}

export function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-600">{label}</label>
      <input id={id} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:ring-2 focus:ring-navy-100" />
    </div>
  );
}

export function Select<T extends string>({ label, value, onChange, options, help }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][]; help?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 flex items-center text-sm font-medium text-slate-600">{label}{help && <Help title={label} text={help} />}</label>
      <div className="relative">
        <select id={id} value={value} onChange={e => onChange(e.target.value as T)} className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-3 pr-9 outline-none focus:ring-2 focus:ring-navy-100">
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 py-1">
      <span className="text-[15px] text-slate-700">{label}{hint && <span className="block text-xs text-slate-500">{hint}</span>}</span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-green-600" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex rounded-xl bg-slate-100 p-1">
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)} className={cx('min-h-[40px] flex-1 rounded-lg px-2 text-sm font-semibold transition', value === v ? 'bg-white text-navy-800 shadow' : 'text-slate-500')}>{l}</button>
      ))}
    </div>
  );
}

export function Collapse({ title, children, defaultOpen = false, right }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean; right?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200">
      <button type="button" onClick={() => setOpen(!open)} className="flex min-h-[48px] w-full items-center justify-between gap-2 px-3 text-left font-semibold text-slate-700">
        <span className="min-w-0 flex-1">{title}</span>
        {right}
        <ChevronDown size={18} className={cx('shrink-0 transition', open && 'rotate-180')} />
      </button>
      {open && <div className="border-t border-slate-100 p-3 animate-fade">{children}</div>}
    </div>
  );
}

export function Alert({ kind = 'info', children }: { kind?: 'info' | 'warn' | 'error' | 'ok'; children: ReactNode }) {
  const c = { info: 'bg-navy-50 text-navy-900 border-navy-100', warn: 'bg-amber-50 text-amber-900 border-amber-200', error: 'bg-red-50 text-red-800 border-red-200', ok: 'bg-green-50 text-green-800 border-green-200' }[kind];
  return <div className={cx('rounded-xl border px-3 py-2 text-sm leading-relaxed', c)}>{children}</div>;
}

export function H2({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-xl font-bold text-navy-800">{children}</h2>
      {sub && <p className="text-sm text-slate-500">{sub}</p>}
    </div>
  );
}
