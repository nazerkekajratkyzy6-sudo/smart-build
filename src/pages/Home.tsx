import { BadgePercent, Box, Calculator, FolderOpen, Hammer, Info, PaintRoller, Plus, Ruler, Save, Truck, Zap } from 'lucide-react';
import { MaterialPhoto } from '../components/MaterialPhoto';
import { useStore } from '../store';
import { Button, Card } from '../components/ui';

const FEATURES = [
  { icon: Zap, title: 'Жылдам есеп', text: 'Жеке жөндеу жұмыстары: кафель, тұсқағаз, линолеум, бояу, сылақ, плинтус.' },
  { icon: Ruler, title: 'Үй өлшемдерін есептеу', text: 'Аудан, периметр, қабырға ауданы мен көлемі.' },
  { icon: Hammer, title: 'Құрылыс материалдарын жоспарлау', text: 'Кірпіш, бетон, цемент, құм, шатыр, жылу оқшаулағыш.' },
  { icon: PaintRoller, title: 'Ішкі әрлеу шығындарын есептеу', text: 'Әр бөлме бойынша тұсқағаз, бояу, линолеум, кафель және т.б.' },
  { icon: Truck, title: 'Жеткізушілер бағаларын салыстыру', text: 'Жеткізу мен ең аз тапсырысты ескереді.' },
  { icon: BadgePercent, title: 'Бюджетті оңтайландыру', text: 'Үнемді, стандарт және жоғары сценарийлер.' },
  { icon: Box, title: 'Интерактивті визуализация', text: '3D үй макеті, бөлмеде материалдарды сынау, өз материалыңыздың суреті.' },
  { icon: Save, title: 'Нәтижелерді сақтау', text: 'Телефонда сақталады; PDF, Excel, JSON экспорты.' },
];

export default function Home() {
  const { setTab, setStep, current, setView } = useStore();
  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-navy-800 px-5 pb-6 pt-7 text-white">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><Calculator size={26} /></div>
        <h1 className="text-3xl font-extrabold tracking-tight">SMART BUILD</h1>
        <p className="mt-1 text-lg font-semibold text-green-300">Ақылды есептеу — тиімді құрылыс</p>
        <p className="mt-3 leading-relaxed text-navy-100">
          Үй салу мен ішкі әрлеуге қажетті материалдардың мөлшерін, құнын, жалпы бюджетті және үнемдеу мүмкіндігін математикалық жолмен есептейтін қосымша.
        </p>
        <div className="mt-5 grid gap-2">
          <Button variant="green" className="w-full text-base" onClick={() => { setStep(0); setView('steps'); }}><Plus size={20} />Жаңа жоба бастау</Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" className="bg-white/10 text-white hover:bg-white/20" onClick={() => setTab('projects')}><FolderOpen size={18} />Менің жобаларым</Button>
            <Button variant="ghost" className="bg-white/10 text-white hover:bg-white/20" onClick={() => setTab('settings')}><Info size={18} />Қосымша туралы</Button>
          </div>
        </div>
      </section>

      <button type="button" onClick={() => setView('quick')} className="block w-full text-left">
        <Card className="flex items-center gap-3 border-green-200 bg-green-50/60 transition hover:border-green-500">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-600 text-white"><Zap size={24} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold leading-tight text-slate-900">Жылдам есеп</span>
            <span className="block text-sm text-slate-600">Үй салмай-ақ: ваннаға кафель, тұсқағаз, линолеум, бояу — бір бөлмеге материал мен құн</span>
          </span>
          <span className="hidden shrink-0 gap-1 sm:flex"><MaterialPhoto id="wallpaper" className="h-10 w-12" /><MaterialPhoto id="linoleum" className="h-10 w-12" /><MaterialPhoto id="paint" className="h-10 w-12" /></span>
        </Card>
      </button>

      {current && (
        <Card className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Ашық жоба</p>
            <p className="truncate font-semibold">{current.name}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" onClick={() => setView('house')}><Box size={18} />Макет</Button>
            <Button variant="outline" onClick={() => { setStep(1); setView('steps'); }}>Жалғастыру</Button>
          </div>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-navy-800">Мүмкіндіктер</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURES.map(f => (
            <Card key={f.title} className="flex gap-3 p-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700"><f.icon size={22} /></span>
              <div>
                <p className="font-semibold leading-tight">{f.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">{f.text}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
