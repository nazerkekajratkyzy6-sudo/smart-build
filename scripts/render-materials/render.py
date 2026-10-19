"""SMART BUILD: 14 материалдың суреттерін рендерлеп, src/assets/materials/*.jpg ретінде сақтайды.
Қажет: pip install playwright pillow && python -m playwright install chromium
Іске қосу (жоба түбірінен): python3 scripts/render-materials/render.py
"""
import asyncio, base64, io, os, sys, threading, functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from PIL import Image, ImageFilter
from playwright.async_api import async_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'src', 'assets', 'materials')
PORT = 4180

def serve():
    h = functools.partial(SimpleHTTPRequestHandler, directory=ROOT)
    h.log_message = lambda *a, **k: None
    srv = ThreadingHTTPServer(('127.0.0.1', PORT), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

async def main():
    os.makedirs(OUT, exist_ok=True)
    srv = serve()
    async with async_playwright() as pw:
        b = await pw.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 1200, 'height': 900})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(f'http://127.0.0.1:{PORT}/scripts/render-materials/render.html')
        await pg.wait_for_function('window.renderReady === true', timeout=60000)
        shots = await pg.evaluate('window.renderAll()')
        await b.close()
    srv.shutdown()
    if errs: print('Қателер:', errs); sys.exit(1)
    for k, url in shots.items():
        im = Image.open(io.BytesIO(base64.b64decode(url.split(',', 1)[1]))).convert('RGB')
        im = im.resize((800, 600), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1, percent=40))
        path = os.path.join(OUT, f'{k}.jpg')
        im.save(path, 'JPEG', quality=80, optimize=True, progressive=True)
        print(k, os.path.getsize(path) // 1024, 'KB')

asyncio.run(main())
