import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('CONSOLE: ' + m.text());
});

await page.goto('http://127.0.0.1:4173/playground', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const playgroundLoaded = await page.evaluate(
  () => !!document.querySelector('main, [role="main"], canvas, svg')
);
console.log('playground mounted:', playgroundLoaded);

await page.goto('http://127.0.0.1:4173/benchmark', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const benchState = await page.evaluate(() => {
  const host = document.querySelector('[data-render-mode]');
  return host
    ? { mounted: true, mode: host.dataset.renderMode, seatPx: host.dataset.seatPx }
    : { mounted: false };
});
console.log('benchmark mounted:', JSON.stringify(benchState));

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const landingLoaded = await page.evaluate(() => document.body.innerText.length > 100);
console.log('landing mounted:', landingLoaded);

console.log('errors:', errors.length ? errors.join('\n  ') : 'none');
await browser.close();
