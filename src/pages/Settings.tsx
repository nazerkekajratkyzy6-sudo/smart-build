import { HelpCircle, Info, ShieldAlert, Smartphone, Trash2, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as db from '../lib/db';
import { DISCLAIMER } from '../lib/report';
import { useStore } from '../store';
import { Alert, Button, Card, Collapse, H2 } from '../components/ui';

const FAQ: [string, string][] = [
  ['Тек тұсқағаз немесе линолеумды ауыстыру керек болса ше?', '«Басты бет» немесе «Есептеу» бөліміндегі «Жылдам есеп» тармағын ашыңыз. Бөлменің ұзындығын, енін және биіктігін жазып, жұмыс түрін таңдаңыз (мысалы, «Тұсқағазды ауыстыру»). Бағаны енгізсеңіз — қажетті рулон, қап немесе дана саны мен жалпы құн бірден шығады. Үй жобасын жасаудың қажеті жоқ.'],
  ['Жобаны қалай бастау керек?', '«Басты бет» немесе «Есептеу» бөлімінде «Жаңа жоба бастау» батырмасын басып, төрт үй түрінің бірін таңдаңыз. Әр кезеңде «Келесі» және «Артқа» батырмалары бар. Енгізгеніңіз автоматты сақталады.'],
  ['Үй өлшемдерін қалай енгізу керек?', 'Барлық өлшем метрмен енгізіледі: ұзындық, ен, қабырға биіктігі мен қалыңдығы. Ондық бөлшекті үтірмен де, нүктемен де жазуға болады (2,8 немесе 2.8). Күрделі пішінді үйді «Бөліктерден» режимінде тік төртбұрыштарға бөліңіз; пішіні белгісіз болса, «Қолмен» режимінде жалпы аудан мен периметрді жазыңыз. Теріс сан мен нөл қабылданбайды.'],
  ['Материал бағасын қалай енгізу керек?', '«Материалдар» кезеңінде әр материалдың «Бағасы» өрісіне бір сатып алу бірлігінің (дана, қап, м², рулон…) нақты бағасын теңгемен жазыңыз. Қосымша өз бетінше баға ойлап шығармайды. Бірнеше дүкен бағасын «Жеткізушілер» кезеңінде салыстыра аласыз.'],
  ['Есептеу нәтижесін қалай түсінуге болады?', '«Нәтижелер» бөлімінде әр материалдың мөлшері, бағасы мен құны көрсетіледі. Әр материалдың жанында суреті, қажетті мөлшері, өлшем бірлігі, бірлік бағасы және жалпы құны тұрады; барлық есептеу автоматты орындалады. «Болжамды есеп» белгісі — бастапқы сметалық бағалау екенін білдіреді. Қап, рулон, дана әрқашан жоғары дөңгелектенеді.'],
  ['Жобаны қалай сақтау керек?', 'Жоба өзгерген сайын осы құрылғыда автоматты сақталады (жоғарғы жолда «Сақталды» белгісі). Браузер деректерін тазаласаңыз, жобалар жоғалуы мүмкін, сондықтан маңызды жобаны JSON файлына экспорттап қойыңыз; кейін «Жобаларым → JSON импорт» арқылы қайта ашасыз.'],
  ['PDF қалай жүктеледі?', '«Нәтижелер» бөлімінің төменгі жағындағы «PDF» батырмасын басыңыз — файл құрылғыңызға жүктеледі (Android-та «Жүктеулер» қалтасы, iPhone-да «Файлдар» қосымшасы). Excel үшін «Excel», қағазға шығару немесе «PDF ретінде сақтау» үшін «Басып шығару» батырмасы бар.'],
];

export default function Settings() {
  const { reload, close, toast, ask } = useStore();
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [installed] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  return (
    <div className="space-y-4">
      <H2>Баптаулар</H2>

      <Card className="space-y-2">
        <p className="flex items-center gap-2 font-semibold">{online ? <Wifi size={18} className="text-green-600" /> : <WifiOff size={18} className="text-amber-600" />}{online ? 'Интернет бар' : 'Офлайн режим'}</p>
        <p className="text-sm text-slate-600">Барлық есептеулер телефонның өзінде орындалады — интернет, сервер және тіркелу қажет емес.{installed && ' Қосымша басты экранға орнатылған.'}</p>
      </Card>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-lg font-bold text-navy-800"><HelpCircle size={20} />Көмек</h3>
        {FAQ.map(([q, a]) => <Collapse key={q} title={q}><p className="leading-relaxed text-slate-700">{a}</p></Collapse>)}
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-lg font-bold text-navy-800"><Smartphone size={20} />Телефонға орнату</h3>
        <Collapse title="Android (Chrome)">
          <ol className="list-decimal space-y-1 pl-5 text-slate-700">
            <li>Қосымша сілтемесін Chrome браузерінде ашыңыз.</li>
            <li>Жоғарғы оң жақтағы ⋮ мәзірін басыңыз.</li>
            <li>«Қосымшаны орнату» немесе «Басты экранға қосу» тармағын таңдаңыз.</li>
            <li>Басты экранда SMART BUILD белгішесі пайда болады.</li>
          </ol>
        </Collapse>
        <Collapse title="iPhone (Safari)">
          <ol className="list-decimal space-y-1 pl-5 text-slate-700">
            <li>Сілтемені Safari браузерінде ашыңыз.</li>
            <li>Төмендегі «Бөлісу» (шаршы мен жоғары бағыттауыш) батырмасын басыңыз.</li>
            <li>«Басты экранға қосу» (На экран «Домой») тармағын таңдап, «Қосу» басыңыз.</li>
          </ol>
        </Collapse>
        <p className="text-xs text-slate-500">Орнату және офлайн жұмыс браузер мен операциялық жүйе қолдауына байланысты. Бұл — APK емес, телефонға орнатылатын веб-қосымша (PWA).</p>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-lg font-bold text-navy-800"><Info size={20} />Қосымша туралы</h3>
        <Card className="space-y-2">
          <p className="text-lg font-extrabold text-navy-800">SMART BUILD — Ақылды есептеу, тиімді құрылыс.</p>
          <p className="text-slate-700">Үй құрылысы мен ішкі әрлеуге қажетті 15 материалдың мөлшерін, құнын, жалпы бюджетті және үнемдеу мүмкіндігін автоматты есептейтін мобильді веб-қосымша. Пайдаланушы өлшемдер мен бағаларды енгізеді — қосымша дайын нәтижені көрсетеді.</p>
          <p className="text-sm text-slate-500">Нұсқа 1.0 · Деректер тек осы құрылғыда сақталады.</p>
          <Alert kind="warn"><span className="flex gap-2"><ShieldAlert size={18} className="shrink-0" /><b>{DISCLAIMER}</b></span></Alert>
        </Card>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-bold text-navy-800">Деректер</h3>
        <Button variant="danger" className="w-full" onClick={async () => {
          if (!(await ask('Осы құрылғыдағы барлық жоба жойылсын ба? Алдымен JSON-ға экспорттауды ұсынамыз.'))) return;
          const all = await db.listProjects();
          for (const p of all) await db.deleteProject(p.id);
          close(); await reload(); toast('Барлық жоба жойылды');
        }}><Trash2 size={18} />Барлық жобаны жою</Button>
      </section>
    </div>
  );
}
