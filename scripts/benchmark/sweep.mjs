import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));
  page.on('console', (msg) => {
    const t = msg.type();
    if (t === 'error') console.log(`[browser ${t}]`, msg.text());
  });
  await page.goto('http://127.0.0.1:4173/benchmark', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  async function readHud() {
    return page.evaluate(() => {
      const out = {};
      const rows = document.querySelectorAll('.pointer-events-none .flex.justify-between');
      rows.forEach((r) => {
        const spans = r.querySelectorAll('span');
        if (spans.length >= 2) out[spans[0].textContent.trim()] = spans[1].textContent.trim();
      });
      return out;
    });
  }

  const steps = [1000, 2500, 5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000];
  const results = [];

  for (const n of steps) {
    await page.fill('input[type="number"]', String(n));
    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(4000);
    const hud = await readHud();
    console.log(`[sweep ${n}]`, JSON.stringify(hud));
    results.push({ seats: n, ...hud });
  }

  // Click test at 30k.
  await page.fill('input[type="number"]', '30000');
  await page.click('button:has-text("Apply")');
  await page.waitForTimeout(3500);
  const seatPos = await page.evaluate(() => {
    const s = document.querySelector('[data-seat-id][data-interactable="1"]');
    if (!s) return null;
    const r = s.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  let clickHud = null;
  if (seatPos) {
    await page.mouse.click(seatPos.x, seatPos.y);
    await page.waitForTimeout(500);
    clickHud = await readHud();
    console.log(`[click@30k]`, JSON.stringify(clickHud));
  }

  // Marquee at 30k: simulate drag from empty area.
  await page.evaluate(() => {
    const vp = document.querySelector('[role="application"]');
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    const startX = r.left + 4;
    const startY = r.top + 4;
    vp.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: startX, clientY: startY, button: 0 }));
  });
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    const vp = document.querySelector('[role="application"]');
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    const endX = r.left + r.width - 4;
    const endY = r.top + r.height - 4;
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: endX, clientY: endY, button: 0 }));
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: endX, clientY: endY, button: 0 }));
  });
  await page.waitForTimeout(1500);
  const marqueeHud = await readHud();
  console.log('[marquee@30k]', JSON.stringify(marqueeHud));

  // Pan FPS measurement at 30k.
  const panStats = await page.evaluate(async () => {
    const vp = document.querySelector('[role="application"]');
    if (!vp) return null;
    const r = vp.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const frames = [];
    let last = performance.now();
    let raf;
    const tick = (now) => {
      frames.push(now - last);
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    vp.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: cx, clientY: cy, button: 2 }));
    for (let i = 0; i < 60; i++) {
      window.dispatchEvent(
        new MouseEvent('mousemove', { clientX: cx + i * 3, clientY: cy + (i % 5) * 2, button: 2 })
      );
      await new Promise((rz) => setTimeout(rz, 16));
    }
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: cx + 180, clientY: cy, button: 2 }));
    cancelAnimationFrame(raf);
    const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
    const worst = Math.max(...frames);
    return {
      framesSampled: frames.length,
      avgFps: (1000 / avg).toFixed(1),
      minFps: (1000 / worst).toFixed(1),
      avgMs: avg.toFixed(2),
      worstMs: worst.toFixed(2),
    };
  });
  console.log('[pan@30k]', JSON.stringify(panStats));

  console.log('\n=== SWEEP JSON ===');
  console.log(JSON.stringify({ results, clickHud, marqueeHud, panStats }, null, 2));

  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
