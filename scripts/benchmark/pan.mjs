import { chromium } from 'playwright';

async function measurePan(page, seatCount, mode /* 'canvas' | 'dom' */) {
  await page.fill('input[type="number"]', String(seatCount));
  await page.click('button:has-text("Apply")');
  await page.waitForTimeout(3500);

  if (mode === 'dom') {
    await page.evaluate(async () => {
      const vp = document.querySelector('[role="application"]');
      if (!vp) return;
      const r = vp.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      for (let i = 0; i < 60; i++) {
        if (vp.dataset.renderMode === 'dom') return;
        vp.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: -240,
            clientX: cx,
            clientY: cy,
            bubbles: true,
            cancelable: true,
          })
        );
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
    });
    await page.waitForTimeout(500);
  }

  const result = await page.evaluate(async () => {
    const vp = document.querySelector('[role="application"]');
    if (!vp) return null;
    const r = vp.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    vp.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, clientX: cx, clientY: cy, button: 2 })
    );

    const deltas = [];
    let last = performance.now();
    let frames = 0;
    const MAX = 120;
    let step = 0;

    await new Promise((resolve) => {
      const loop = (now) => {
        const d = now - last;
        last = now;
        if (frames > 2) deltas.push(d);
        frames++;
        step += 4;
        window.dispatchEvent(
          new MouseEvent('mousemove', {
            clientX: cx + step,
            clientY: cy + ((step * 0.33) | 0),
            button: 2,
          })
        );
        if (frames < MAX) requestAnimationFrame(loop);
        else resolve();
      };
      requestAnimationFrame(loop);
    });

    window.dispatchEvent(
      new MouseEvent('mouseup', { clientX: cx + step, clientY: cy, button: 2 })
    );

    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const worst = Math.max(...deltas);
    const best = Math.min(...deltas);
    return {
      renderMode: vp.dataset.renderMode,
      seatPx: vp.dataset.seatPx,
      frames: deltas.length,
      avgFps: (1000 / avg).toFixed(1),
      minFps: (1000 / worst).toFixed(1),
      maxFps: (1000 / best).toFixed(1),
      avgMs: avg.toFixed(1),
    };
  });
  return result;
}

async function run() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto('http://127.0.0.1:4173/benchmark', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  for (const n of [1000, 5000, 10000, 20000, 30000, 50000]) {
    const fit = await measurePan(page, n, 'canvas');
    console.log(`pan@${n} (fit/canvas):`, JSON.stringify(fit));
    const zoomed = await measurePan(page, n, 'dom');
    console.log(`pan@${n} (zoomed/dom):`, JSON.stringify(zoomed));
  }

  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
