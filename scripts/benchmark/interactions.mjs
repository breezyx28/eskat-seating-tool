import { chromium } from 'playwright';

async function zoomToDomMode(page) {
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

async function panFps(page, frames = 90) {
  return page.evaluate(async (MAX) => {
    const vp = document.querySelector('[role="application"]');
    if (!vp) return null;
    const r = vp.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    vp.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: cx, clientY: cy, button: 2 }));

    const deltas = [];
    let last = performance.now();
    let step = 0;
    let i = 0;
    await new Promise((resolve) => {
      const loop = (now) => {
        deltas.push(now - last);
        last = now;
        i++;
        step += 3;
        window.dispatchEvent(
          new MouseEvent('mousemove', {
            clientX: cx + step,
            clientY: cy + ((step * 0.4) | 0),
            button: 2,
          })
        );
        if (i < MAX) requestAnimationFrame(loop);
        else resolve();
      };
      requestAnimationFrame(loop);
    });
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: cx + step, clientY: cy, button: 2 }));

    const samples = deltas.slice(2);
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const worst = Math.max(...samples);
    return {
      renderMode: vp.dataset.renderMode,
      seatPx: vp.dataset.seatPx,
      frames: samples.length,
      avgFps: (1000 / avg).toFixed(1),
      minFps: (1000 / worst).toFixed(1),
      avgMs: avg.toFixed(2),
      worstMs: worst.toFixed(2),
    };
  }, frames);
}

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto('http://127.0.0.1:4173/benchmark', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // 30k seats
  await page.fill('input[type="number"]', '30000');
  await page.click('button:has-text("Apply")');
  await page.waitForTimeout(4500);

  // ── Canvas-mode (fit) pan FPS ─────────────────────────────────
  const canvasPan = await panFps(page);
  console.log('pan@30k (fit/canvas):', JSON.stringify(canvasPan));

  // ── Canvas-mode click latency (grid hit-test path) ───────────
  const canvasClickLatency = await page.evaluate(async () => {
    const vp = document.querySelector('[role="application"]');
    if (!vp) return null;
    const r = vp.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const t0 = performance.now();
    vp.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: cx, clientY: cy, button: 0 }));
    vp.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: cx, clientY: cy, button: 0 }));
    vp.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: cx, clientY: cy, button: 0 }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return performance.now() - t0;
  });
  console.log('click latency @30k canvas-mode:', canvasClickLatency?.toFixed(2), 'ms');

  // ── Zoom into DOM mode and re-measure ────────────────────────
  await zoomToDomMode(page);
  const domPan = await panFps(page);
  console.log('pan@30k (zoomed/dom):', JSON.stringify(domPan));

  // DOM-mode click latency — find a real seat and click it.
  const targetPos = await page.evaluate(() => {
    const seats = document.querySelectorAll('[data-seat-id][data-interactable="1"]');
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    let best = null;
    let bestD = Infinity;
    for (const s of seats) {
      const r = s.getBoundingClientRect();
      const mx = r.left + r.width / 2;
      const my = r.top + r.height / 2;
      const d = (mx - cx) ** 2 + (my - cy) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { x: mx, y: my, id: s.getAttribute('data-seat-id') };
      }
    }
    return best;
  });
  console.log('target dom seat:', targetPos);
  const domClickLatencyMs = targetPos
    ? await page.evaluate(async (pos) => {
        const seat = document.querySelector(`[data-seat-id="${pos.id}"]`);
        if (!seat) return null;
        const t0 = performance.now();
        seat.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: pos.x, clientY: pos.y, button: 0 }));
        seat.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: pos.x, clientY: pos.y, button: 0 }));
        seat.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: pos.x, clientY: pos.y, button: 0 }));
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return performance.now() - t0;
      }, targetPos)
    : null;
  console.log('click latency @30k dom-mode:', domClickLatencyMs?.toFixed(2), 'ms');

  // ── Marquee big selection in DOM mode (worst case) ───────────
  const marqueeResult = await page.evaluate(async () => {
    const vp = document.querySelector('[role="application"]');
    if (!vp) return null;
    const r = vp.getBoundingClientRect();
    const x0 = r.left + 5;
    const y0 = r.top + 5;
    const x1 = r.left + r.width - 5;
    const y1 = r.top + r.height - 5;
    const t0 = performance.now();
    vp.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: x0, clientY: y0, button: 0 }));
    await new Promise((r) => requestAnimationFrame(r));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: x1, clientY: y1, button: 0 }));
    await new Promise((r) => requestAnimationFrame(r));
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: x1, clientY: y1, button: 0 }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const ms = performance.now() - t0;
    return { totalMs: ms.toFixed(1) };
  });
  console.log('marquee@30k all visible:', JSON.stringify(marqueeResult));

  const finalHud = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('.pointer-events-none .flex.justify-between').forEach((r) => {
      const spans = r.querySelectorAll('span');
      if (spans.length >= 2) out[spans[0].textContent.trim()] = spans[1].textContent.trim();
    });
    return out;
  });
  console.log('after marquee HUD:', JSON.stringify(finalHud));

  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
