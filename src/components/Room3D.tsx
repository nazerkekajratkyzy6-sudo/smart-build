// Әмбебап бөлменің 3D макеті: 4 қабырға, еден, төбе, галтель, плинтус. Өлшемдер — таңдалған бөлменікі.
import { RotateCcw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { RoomAppearance, Surface } from '../lib/roomLook';
import { IconBtn } from './PanZoom';

export type RoomPart = 'wall' | 'floor' | 'ceiling' | 'galtel' | 'plinth';

const loader = new THREE.TextureLoader();

function material(s: Surface, w: number, h: number, side: THREE.Side = THREE.FrontSide) {
  const m = new THREE.MeshStandardMaterial({ color: s.tex ? 0xffffff : new THREE.Color(s.color), roughness: 0.92, side });
  if (s.tex) {
    const t = loader.load(s.tex.url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    if (s.tex.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / s.tex.size, h / s.tex.size); }
    m.map = t;
  }
  return m;
}

export default function Room3D({ dims, look, selected, onSelect, onFail }: {
  dims: { length: number; width: number; height: number }; look: RoomAppearance; selected: RoomPart | null; onSelect: (p: RoomPart | null) => void; onFail: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ reset: () => void; highlight: (p: RoomPart | null) => void } | null>(null);
  const sel = useRef(onSelect); sel.current = onSelect;
  const key = JSON.stringify([dims, look]);

  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch { onFail(); return; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio)); renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xf8fafc);
    const L = Math.max(1, dims.length || 4), W = Math.max(1, dims.width || 3), H = Math.max(2, dims.height || 2.7);
    const cam = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.05, 100);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd6cfc4, 1.9));
    const lamp = new THREE.PointLight(0xfff4e0, 14, 0, 1.6); lamp.position.set(0, H - 0.3, 0); scene.add(lamp);

    const parts: Record<RoomPart, THREE.Mesh[]> = { wall: [], floor: [], ceiling: [], galtel: [], plinth: [] };
    const add = (part: RoomPart, geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], rot: [number, number, number]) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); m.userData.part = part; scene.add(m); parts[part].push(m); return m;
    };
    // Қабырғалар (ішке қараған жазықтықтар)
    add('wall', new THREE.PlaneGeometry(L, H), material(look.wall, L, H), [0, H / 2, -W / 2], [0, 0, 0]);
    add('wall', new THREE.PlaneGeometry(L, H), material(look.wall, L, H), [0, H / 2, W / 2], [0, Math.PI, 0]);
    add('wall', new THREE.PlaneGeometry(W, H), material(look.wall, W, H), [-L / 2, H / 2, 0], [0, Math.PI / 2, 0]);
    add('wall', new THREE.PlaneGeometry(W, H), material(look.wall, W, H), [L / 2, H / 2, 0], [0, -Math.PI / 2, 0]);
    add('floor', new THREE.PlaneGeometry(L, W), material(look.floor, L, W), [0, 0, 0], [-Math.PI / 2, 0, 0]);
    add('ceiling', new THREE.PlaneGeometry(L, W), material(look.ceiling, L, W), [0, H, 0], [Math.PI / 2, 0, 0]);
    // Галтель мен плинтус — периметр бойымен жолақтар
    const strip = (part: RoomPart, color: string, y: number, hh: number, d: number) => {
      const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.6 });
      add(part, new THREE.BoxGeometry(L, hh, d), m, [0, y, -W / 2 + d / 2], [0, 0, 0]);
      add(part, new THREE.BoxGeometry(L, hh, d), m.clone(), [0, y, W / 2 - d / 2], [0, 0, 0]);
      add(part, new THREE.BoxGeometry(d, hh, W), m.clone(), [-L / 2 + d / 2, y, 0], [0, 0, 0]);
      add(part, new THREE.BoxGeometry(d, hh, W), m.clone(), [L / 2 - d / 2, y, 0], [0, 0, 0]);
    };
    if (look.galtel) strip('galtel', look.galtel, H - 0.04, 0.08, 0.06);
    if (look.plinth) strip('plinth', look.plinth, 0.04, 0.08, 0.025);
    (Object.values(parts) as THREE.Mesh[][]).flat().forEach(m => { m.material = (m.material as THREE.Material).clone(); });

    const controls = new OrbitControls(cam, renderer.domElement);
    controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 0.3; controls.maxDistance = Math.min(L, W) * 0.48;
    controls.minPolarAngle = 0.35; controls.maxPolarAngle = Math.PI - 0.35;
    const home = () => { controls.target.set(0, H * 0.45, 0); cam.position.set(L * 0.38, H * 0.55, W * 0.38); controls.update(); };
    home();

    const highlight = (part: RoomPart | null) => (Object.keys(parts) as RoomPart[]).forEach(k => parts[k].forEach(m => {
      const mt = m.material as THREE.MeshStandardMaterial; mt.emissive = new THREE.Color(k === part ? 0x16a34a : 0); mt.emissiveIntensity = k === part ? 0.35 : 0;
    }));
    highlight(selected);
    api.current = { reset: home, highlight };

    const ray = new THREE.Raycaster(); const v = new THREE.Vector2(); let down: { x: number; y: number } | null = null;
    const pd = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const pu = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const r = renderer.domElement.getBoundingClientRect();
      v.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(v, cam);
      // галтель/плинтус жұқа — басымдық береміз
      const hits = ray.intersectObjects((Object.values(parts) as THREE.Mesh[][]).flat());
      const strip = hits.find(h => ['galtel', 'plinth'].includes(h.object.userData.part) && h.distance - hits[0].distance < 0.15);
      sel.current(((strip ?? hits[0])?.object.userData.part as RoomPart) ?? null);
    };
    renderer.domElement.addEventListener('pointerdown', pd); renderer.domElement.addEventListener('pointerup', pu);
    let raf = 0, alive = true;
    const loop = () => { if (!alive) return; controls.update(); renderer.render(scene, cam); raf = requestAnimationFrame(loop); };
    loop();
    const ro = new ResizeObserver(() => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); });
    ro.observe(el);
    return () => {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', pd); renderer.domElement.removeEventListener('pointerup', pu);
      scene.traverse(o => { const m = o as THREE.Mesh; m.geometry?.dispose(); const mt = m.material as THREE.MeshStandardMaterial | undefined; if (mt) { mt.map?.dispose(); mt.dispose(); } });
      renderer.dispose(); el.removeChild(renderer.domElement); api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { api.current?.highlight(selected); }, [selected]);

  return (
    <div className="relative h-[340px] overflow-hidden rounded-2xl border border-slate-200" style={{ touchAction: 'none' }}>
      <div ref={host} className="h-full w-full" />
      <div className="absolute bottom-2 right-2"><IconBtn label="Бастапқы көрініс" onClick={() => api.current?.reset()}><RotateCcw size={18} /></IconBtn></div>
    </div>
  );
}
