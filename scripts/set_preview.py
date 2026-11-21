"""Shoot a 3D set (film kit) at a few camera shots without a script or HyperFrames — fast iteration for set-builder.

    python3 scripts/set_preview.py episodes/<ep> <module> <factory> '<opts JSON>' <out.png> [t1,t2,...]

    python3 scripts/set_preview.py episodes/ep02-matsubase house createHouse \\
      '{"mode":"victim","camera":[{"t":0,"pos":[2,1.2,3],"look":[0,0.6,0],"fov":40}]}' /tmp/house.png 0

Writes a temporary page in the episode folder (removed afterwards), serves the folder, waits for the set's
window.__hf.buildReady promise, renders each time t and saves one PNG per t (out-<t>.png) plus a contact sheet (out.png).
Same SwiftShader WebGL as the render, so what you see is what renders. A frame that differs here differs in the render too.
"""
import http.server
import json
import pathlib
import socketserver
import subprocess
import sys
import threading

PAGE = """<!doctype html><html><head><meta charset="utf-8"><style>html,body{{margin:0;background:#000}}</style></head><body>
<div id="stage" style="position:absolute;left:0;top:0;width:1920px;height:1080px"></div>
<script type="module">
import {{ {factory} }} from "./assets/lib/{module}.js";
const render = {factory}(document.getElementById("stage"), {opts});
window.__shoot = async (t) => {{
  await Promise.all(Object.values((window.__hf || {{}}).buildReady || {{}}));
  render(t);
  return true;
}};
window.__ready = true;
</script></body></html>"""

SHOOT = """
const { chromium } = require('playwright');
(async () => {
  const [url, out, times] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
  await p.goto(url);
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  for (const t of times.split(',')) {
    await p.evaluate((t) => window.__shoot(parseFloat(t)), t);
    await p.waitForTimeout(150);
    await p.screenshot({ path: out.replace(/\\.png$/, `-${t}.png`) });
  }
  await b.close();
})();
"""


def main():
    a = sys.argv[1:]
    if len(a) < 5:
        raise SystemExit(__doc__)
    ep, module, factory, opts, out = pathlib.Path(a[0]).resolve(), a[1], a[2], a[3], pathlib.Path(a[4]).resolve()
    times = a[5] if len(a) > 5 else "0"
    json.loads(opts)
    page = ep / "_set_preview.html"
    page.write_text(PAGE.format(module=module, factory=factory, opts=opts), encoding="utf-8")
    handler = lambda *x, **k: http.server.SimpleHTTPRequestHandler(*x, directory=str(ep), **k)  # noqa: E731
    http.server.SimpleHTTPRequestHandler.log_message = lambda *x: None
    srv = socketserver.TCPServer(("127.0.0.1", 0), handler)
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    js = ep / "_set_preview_shoot.cjs"
    js.write_text(SHOOT, encoding="utf-8")
    try:
        out.parent.mkdir(parents=True, exist_ok=True)
        r = subprocess.run(["node", str(js), f"http://127.0.0.1:{port}/_set_preview.html", str(out), times],
                           env={**__import__("os").environ, "NODE_PATH": subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()},
                           capture_output=True, text=True, timeout=600)
        if r.stdout.strip() or r.stderr.strip():
            print((r.stdout + r.stderr).strip()[-2000:])
    finally:
        srv.shutdown()
        page.unlink(missing_ok=True)
        js.unlink(missing_ok=True)
    shots = [out.with_name(f"{out.stem}-{t}.png") for t in times.split(",")]
    shots = [s for s in shots if s.exists()]
    if not shots:
        sys.exit("촬영 실패")
    from PIL import Image
    w, h = 640, 360
    cols = min(3, len(shots))
    sheet = Image.new("RGB", (cols * w, ((len(shots) + cols - 1) // cols) * h))
    for i, s in enumerate(shots):
        sheet.paste(Image.open(s).convert("RGB").resize((w, h)), ((i % cols) * w, (i // cols) * h))
    sheet.save(out)
    print(f"{out} ({len(shots)}장)")


if __name__ == "__main__":
    main()
