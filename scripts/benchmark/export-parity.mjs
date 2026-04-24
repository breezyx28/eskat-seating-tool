import { chromium } from 'playwright';
import fs from 'node:fs';

async function run() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto('http://127.0.0.1:4173/playground', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Generate an exported source via the in-page utility (import from the module).
  const src = await page.evaluate(async () => {
    // @ts-ignore - Vite dev server resolves @ alias
    const mod = await import('/src/utils/componentTemplate.ts');
    const store = await import('/src/store/canvasStore.ts');
    const data = store.useCanvasStore.getState().venueData;
    return mod.generateComponentSource(data, 'SeatMap');
  });

  if (typeof src !== 'string' || src.length < 1000) {
    console.error('unexpected export size:', src?.length);
    process.exit(1);
  }
  fs.writeFileSync('scripts/benchmark/sample-export.tsx', src);
  console.log('export size:', src.length, 'bytes');
  console.log('contains SeatMapRuntime fn:', /function SeatMapRuntime\b/.test(src));
  console.log('contains default SeatMap fn:', /export default function SeatMap\b/.test(src));
  console.log('contains VENUE_DATA const:', /const VENUE_DATA =/.test(src));
  console.log('contains SEAT_CONFIG:', /const SEAT_CONFIG =/.test(src));
  console.log('no leftover ?raw:', !src.includes('?raw'));
  console.log('no bare export on top-level decls:', !/^\s*export (const|function|type|interface) /m.test(src));

  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
