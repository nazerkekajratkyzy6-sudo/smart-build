// Үйдің параметрлік 3D макеті (Three.js). Өлшемдер жобадан алынады — дайын сурет емес.
import { RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FACADE, type HousePart } from '../lib/visual';
import type { Project } from '../lib/types';
import { IconBtn } from './PanZoom';

function canvasTex(draw: (g: CanvasRenderingContext2D, s: number) => void, px = 256) {
  const c = document.createElement('canvas'); c.width = c.height = px; draw(c.getContext('2d')!, px);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export interface House3DProps { p: Project; selected: HousePart | null; onSelect: (part: HousePart | null) => void; onFail: () => void }

export default function House3D({ p, selected, onSelect, onFail }: House3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ reset: () => void; highlight: (part: HousePart | null) => void } | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const selRef = useRef(onSelect); selRef.current = onSelect;

  // Геометрияға әсер ететін параметрлер (тек олар өзгергенде сахна қайта құрылады)
  const key = JSON.stringify([p.floors, p.wallThickness, p.foundation, p.interFloorSlab, p.roof, p.look, p.materials.brick.p.type, p.materials.brick.enabled]);

  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { onFail(); return; }
    const w = el.clientWidth, h = el.clientHeight;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio)); renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(40, w / h, 0.1, 500);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb0a890, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(18, 30, 14); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30 });
    scene.add(sun);

    const parts: Record<HousePart, THREE.Mesh[]> = { roof: [], walls: [], floor: [], foundation: [], slab: [] };
    const notesOut: string[] = [];
    const t = Math.max(0.1, p.wallThickness || 0.38);
    const showMasonry = p.materials.brick.enabled && p.look?.facade !== 'plaster';
    const masonry = p.materials.brick.p.type === 'gasblock' ? FACADE.gasblock : FACADE.brick;
    const brickTex = canvasTex(showMasonry ? masonry.draw : FACADE.plaster.draw);
    const tileSize = showMasonry ? masonry.size : FACADE.plaster.size;
    const add = (part: HousePart, geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], rotY = 0) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.y = rotY; m.castShadow = m.receiveShadow = true;
      m.userData.part = part; scene.add(m); parts[part].push(m); return m;
    };
    const wallMat = (len: number, hgt: number) => { const tx = brickTex.clone(); tx.needsUpdate = true; tx.repeat.set(len / tileSize, hgt / tileSize); return new THREE.MeshStandardMaterial({ map: tx, roughness: 0.9 }); };
    const concrete = new THREE.MeshStandardMaterial({ color: 0xa8a9a4, roughness: 1 });
    const slabMat = new THREE.MeshStandardMaterial({ color: 0xbfc0bb, roughness: 1 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xc9a27a, roughness: 0.8 });

    // Әр қабатты тік төртбұрыштар тізіміне айналдыру
    const rectsOf = (f: Project['floors'][number]) =>
      f.shape === 'rect' ? (f.length > 0 && f.width > 0 ? [{ x: 0, y: 0, length: f.length, width: f.width }] : [])
        : f.shape === 'sections' ? f.sections.filter(s => s.length > 0 && s.width > 0) : [];
    const all = p.floors.flatMap(rectsOf);
    if (!all.length) { notesOut.push('Үй өлшемдері енгізілмеген немесе пішіні қолмен берілген — 3D модель құру үшін нақты геометрия жоқ.'); }
    const minX = Math.min(...all.map(r => r.x), 0), maxX = Math.max(...all.map(r => r.x + r.length), 1);
    const minY = Math.min(...all.map(r => r.y), 0), maxY = Math.max(...all.map(r => r.y + r.width), 1);
    const cx = (minX + maxX) / 2, cz = (minY + maxY) / 2;

    // Іргетас
    const f0 = p.floors[0];
    const fd = p.foundation;
    if (f0) {
      const rs = rectsOf(f0);
      for (const r of rs) {
        const x0 = r.x - cx, z0 = r.y - cz;
        if (fd.type === 'strip' && fd.stripWidth > 0 && fd.stripHeight > 0) {
          const b = fd.stripWidth, hh = fd.stripHeight;
          add('foundation', new THREE.BoxGeometry(r.length + b - t, hh, b), concrete, [x0 + r.length / 2, -hh / 2, z0 + t / 2]);
          add('foundation', new THREE.BoxGeometry(r.length + b - t, hh, b), concrete, [x0 + r.length / 2, -hh / 2, z0 + r.width - t / 2]);
          add('foundation', new THREE.BoxGeometry(b, hh, r.width - t), concrete, [x0 + t / 2, -hh / 2, z0 + r.width / 2]);
          add('foundation', new THREE.BoxGeometry(b, hh, r.width - t), concrete, [x0 + r.length - t / 2, -hh / 2, z0 + r.width / 2]);
        } else if (fd.type === 'slab' && fd.slabThickness > 0) {
          add('foundation', new THREE.BoxGeometry(r.length, fd.slabThickness, r.width), concrete, [x0 + r.length / 2, -fd.slabThickness / 2 - 0.02, z0 + r.width / 2]);
        }
      }
      if (fd.type === 'manual') notesOut.push('Іргетас көлемі қолмен енгізілген — пішіні модельде көрсетілмеді.');
    }

    // Қабаттар: қабырғалар, еден, қабат аралық жабын
    let base = 0.0;
    p.floors.forEach((f, i) => {
      const rs = rectsOf(f); const hh = f.height > 0 ? f.height : 2.8;
      if (f.shape === 'manual') notesOut.push(`${f.name}: пішіні қолмен (аудан/периметр) берілген — 3D-де көрсетілмеді.`);
      for (const r of rs) {
        const x0 = r.x - cx, z0 = r.y - cz;
        add(i === 0 ? 'floor' : 'slab', new THREE.BoxGeometry(r.length, i === 0 ? 0.06 : Math.max(0.06, p.interFloorSlab.enabled ? p.interFloorSlab.thickness : 0.08), r.width), i === 0 ? floorMat : slabMat, [x0 + r.length / 2, base + 0.03, z0 + r.width / 2]);
        add('walls', new THREE.BoxGeometry(r.length, hh, t), wallMat(r.length, hh), [x0 + r.length / 2, base + hh / 2, z0 + t / 2]);
        add('walls', new THREE.BoxGeometry(r.length, hh, t), wallMat(r.length, hh), [x0 + r.length / 2, base + hh / 2, z0 + r.width - t / 2]);
        add('walls', new THREE.BoxGeometry(t, hh, r.width - 2 * t), wallMat(r.width, hh), [x0 + t / 2, base + hh / 2, z0 + r.width / 2]);
        add('walls', new THREE.BoxGeometry(t, hh, r.width - 2 * t), wallMat(r.width, hh), [x0 + r.length - t / 2, base + hh / 2, z0 + r.width / 2]);
      }
      if (rs.length > 1) notesOut.push(`${f.name}: бөліктер жеке қораптар түрінде көрсетілді; ішкі түйіскен қабырғалар шартты.`);
      base += hh;
    });

    // Шатыр
    const top = p.floors[p.floors.length - 1];
    const roofMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(p.look?.roofColor ?? '#7f1d1d'), roughness: 0.7, side: THREE.DoubleSide });
    const o = Math.max(0, p.roof.overhang || 0);
    if (top && p.roof.type === 'gable' && top.shape === 'rect' && top.length > 0 && top.width > 0) {
      const alongX = top.length >= top.width; const span = alongX ? top.width : top.length, len = alongX ? top.length : top.width;
      const tan = Math.tan((Math.min(79, Math.max(0, p.roof.slope)) * Math.PI) / 180);
      const rise = (span / 2) * tan, drop = o * tan;
      const shape = new THREE.Shape(); shape.moveTo(-span / 2 - o, -drop); shape.lineTo(0, rise); shape.lineTo(span / 2 + o, -drop); shape.lineTo(span / 2 + o, -drop + 0.12); shape.lineTo(0, rise + 0.12); shape.lineTo(-span / 2 - o, -drop + 0.12); shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: len + 2 * o, bevelEnabled: false }); geo.translate(0, 0, -(len + 2 * o) / 2);
      add('roof', geo, roofMat, [0, base, 0], alongX ? Math.PI / 2 : 0);
      // фронтондар (қабырға үшбұрыштары)
      const gab = new THREE.Shape(); gab.moveTo(-span / 2, 0); gab.lineTo(0, rise); gab.lineTo(span / 2, 0); gab.closePath();
      const gGeo = new THREE.ExtrudeGeometry(gab, { depth: t, bevelEnabled: false });
      for (const s of [-1, 1]) {
        const g = gGeo.clone(); g.translate(0, 0, -t / 2);
        const m = add('walls', g, wallMat(span, rise), [0, base, 0], alongX ? Math.PI / 2 : 0);
        if (alongX) m.position.x = s * (len / 2 - t / 2); else m.position.z = s * (len / 2 - t / 2);
      }
    } else if (top && p.roof.type !== 'manual') {
      for (const r of rectsOf(top)) add('roof', new THREE.BoxGeometry(r.length + 2 * o, 0.15, r.width + 2 * o), roofMat, [r.x - cx + r.length / 2, base + 0.08, r.y - cz + r.width / 2]);
      if (p.roof.type === 'gable' && top.shape !== 'rect') notesOut.push('Екі еңісті шатыр тек тік төртбұрышты үй үшін модельденеді; мұнда жалпақ тақта ретінде шартты көрсетілді.');
    } else if (p.roof.type === 'manual') notesOut.push('Шатыр ауданы қолмен енгізілген — пішіні модельде көрсетілмеді.');

    // Жер беті (жартылай мөлдір — іргетас көрінеді)
    const size = Math.max(maxX - minX, maxY - minY, 6);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(size * 1.6, 48), new THREE.MeshStandardMaterial({ color: 0x9fb48a, transparent: true, opacity: 0.55, depthWrite: false }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.005; ground.receiveShadow = true; scene.add(ground);

    const controls = new OrbitControls(cam, renderer.domElement);
    controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.62; controls.minDistance = size * 0.6; controls.maxDistance = size * 5;
    const home = () => { cam.position.set(size * 1.25, size * 0.9 + base * 0.6, size * 1.45); controls.target.set(0, base / 2, 0); controls.update(); };
    home();

    const highlight = (part: HousePart | null) => {
      (Object.keys(parts) as HousePart[]).forEach(k => parts[k].forEach(m => {
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.emissive = new THREE.Color(k === part ? 0x16a34a : 0x000000); mat.emissiveIntensity = k === part ? 0.45 : 0;
      }));
    };
    // Материалдар ортақ болуы мүмкін — әр торға жеке клон береміз, ерекшелеу дұрыс жұмыс істеуі үшін
    (Object.keys(parts) as HousePart[]).forEach(k => parts[k].forEach(m => { m.material = (m.material as THREE.Material).clone(); }));
    highlight(selected);
    api.current = { reset: home, highlight };

    const ray = new THREE.Raycaster(); const ptr = new THREE.Vector2(); let down: { x: number; y: number } | null = null;
    const pd = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const pu = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const r = renderer.domElement.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, cam);
      const hit = ray.intersectObjects((Object.values(parts) as THREE.Mesh[][]).flat())[0];
      selRef.current(hit ? (hit.object.userData.part as HousePart) : null);
    };
    renderer.domElement.addEventListener('pointerdown', pd); renderer.domElement.addEventListener('pointerup', pu);

    let raf = 0; let alive = true;
    const loop = () => { if (!alive) return; controls.update(); renderer.render(scene, cam); raf = requestAnimationFrame(loop); };
    loop();
    const ro = new ResizeObserver(() => { const W = el.clientWidth, H = el.clientHeight; if (!W || !H) return; renderer.setSize(W, H); cam.aspect = W / H; cam.updateProjectionMatrix(); });
    ro.observe(el);
    setNotes(notesOut);

    return () => {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', pd); renderer.domElement.removeEventListener('pointerup', pu);
      scene.traverse(obj => { const m = obj as THREE.Mesh; if (m.geometry) m.geometry.dispose(); const mt = m.material as THREE.MeshStandardMaterial | undefined; if (mt) { mt.map?.dispose(); mt.dispose(); } });
      renderer.dispose(); el.removeChild(renderer.domElement); api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { api.current?.highlight(selected); }, [selected]);

  return (
    <div>
      <div className="relative h-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-sky-50 to-white" style={{ touchAction: 'none' }}>
        <div ref={host} className="h-full w-full" />
        <div className="absolute bottom-2 right-2"><IconBtn label="Бастапқы көрініс" onClick={() => api.current?.reset()}><RotateCcw size={18} /></IconBtn></div>
        <p className="pointer-events-none absolute left-3 top-2 text-xs text-slate-500">Бір саусақ — айналдыру · екі саусақ — үлкейту/жылжыту · басу — бөлікті таңдау</p>
      </div>
      {notes.map(n => <p key={n} className="mt-1 text-xs text-amber-700">{n}</p>)}
    </div>
  );
}
