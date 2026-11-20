// Screenshot a thumbnail still page. If the page exposes window.__mask (thumbkit), also shoot the focus mask.
// node scripts/shoot_thumb.cjs <url> <beauty.png> [mask.png]
const { chromium } = require('playwright');
(async () => {
  const [url, beauty, mask] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  p.on('console', m => console.log('console:', m.text()));
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto(url);
  await p.waitForFunction(() => window.__done === true, null, { timeout: 180000 });
  await p.waitForTimeout(500);
  await p.screenshot({ path: beauty });
  if (mask && await p.evaluate(() => typeof window.__mask === 'function')) {
    await p.evaluate(() => window.__mask());
    await p.waitForFunction(() => window.__maskDone === true, null, { timeout: 60000 });
    await p.screenshot({ path: mask });
  }
  await b.close();
})();
