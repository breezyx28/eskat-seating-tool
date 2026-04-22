/**
 * Best-effort sanitiser for user-provided SVG markup that will be inlined via
 * `dangerouslySetInnerHTML`. Drops <script> elements, any `on*` event handlers,
 * `javascript:` URLs and external `xlink:href` references. Also guarantees a
 * viewBox so the renderer can scale the icon to arbitrary seat sizes.
 *
 * We deliberately keep this light (no dependencies) — the tool runs in the
 * designer only, and the exported component re-embeds already-sanitised
 * strings verbatim.
 */
export function sanitizeSvg(raw: string): string {
  if (!raw) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, 'image/svg+xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) return '';
  const svg = doc.querySelector('svg');
  if (!svg) return '';

  // Remove dangerous nodes and attributes.
  svg.querySelectorAll('script, foreignObject').forEach((n) => n.remove());
  const walker = doc.createTreeWalker(svg, NodeFilter.SHOW_ELEMENT);
  const nodes: Element[] = [svg];
  for (let n = walker.nextNode() as Element | null; n; n = walker.nextNode() as Element | null) {
    nodes.push(n);
  }
  for (const el of nodes) {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      else if ((name === 'href' || name === 'xlink:href') && value.startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      } else if ((name === 'href' || name === 'xlink:href') && !value.startsWith('#') && !value.startsWith('data:')) {
        // Disallow remote references; keep internal (#foo) and inline data URIs only.
        el.removeAttribute(attr.name);
      }
    }
  }

  // Ensure a viewBox. If missing, derive it from width/height or default to 24.
  if (!svg.getAttribute('viewBox')) {
    const w = Number(svg.getAttribute('width')) || 24;
    const h = Number(svg.getAttribute('height')) || 24;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
  // Strip explicit width/height so the icon scales with its container.
  svg.removeAttribute('width');
  svg.removeAttribute('height');

  return new XMLSerializer().serializeToString(svg);
}

/**
 * Wraps a raster data URL (e.g. a PNG the user uploaded) in a small SVG so the
 * custom-seat-icon renderer can treat everything as SVG.
 */
export function dataUrlToSvg(dataUrl: string, size = 24): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet"><image href="${dataUrl}" x="0" y="0" width="${size}" height="${size}" /></svg>`;
}
