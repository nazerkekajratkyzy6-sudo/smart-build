// Суреттерді өңдеу: кішірейту, текстура плиткасын қиып алу, орташа түс.

export function readFile(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error('Файлды оқу мүмкін болмады'));
    r.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Сурет ашылмады. JPG немесе PNG файлын таңдаңыз.'));
    img.src = src;
  });
}

/** Сақтау үшін суретті кішірейту (ең үлкен жағы maxSide px, JPEG). */
export async function downscale(src: string, maxSide = 1024, quality = 0.85): Promise<string> {
  const img = await loadImage(src);
  const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.naturalWidth * k));
  c.height = Math.max(1, Math.round(img.naturalHeight * k));
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}

export interface Crop { x: number; y: number; size: number } // үлестермен (0..1), шаршы

/** Суреттен шаршы бөлікті қиып, текстура плиткасын жасау. */
export async function cropTile(src: string, crop: Crop, out = 512): Promise<string> {
  const img = await loadImage(src);
  const side = Math.min(img.naturalWidth, img.naturalHeight) * crop.size;
  const sx = (img.naturalWidth - side) * crop.x;
  const sy = (img.naturalHeight - side) * crop.y;
  const c = document.createElement('canvas');
  c.width = c.height = out;
  c.getContext('2d')!.drawImage(img, sx, sy, side, side, 0, 0, out, out);
  return c.toDataURL('image/jpeg', 0.85);
}

/** Суреттің орташа түсі (бояу үлгісі үшін). */
export async function averageColor(src: string): Promise<string> {
  const img = await loadImage(src);
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0, 16, 16);
  const d = g.getImageData(0, 0, 16, 16).data;
  let r = 0, gg = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4;
  const h = (v: number) => Math.round(v / n).toString(16).padStart(2, '0');
  return `#${h(r)}${h(gg)}${h(b)}`;
}
