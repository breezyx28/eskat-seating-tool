import DOMPurify from 'dompurify';

/**
 * Best-effort sanitiser for user-provided SVG markup that will be inlined via
 * `dangerouslySetInnerHTML`. Drops <script> elements, any `on*` event handlers,
 * `javascript:` URLs and external `href` / `xlink:href` references. Also guarantees a
 * viewBox so the renderer can scale the icon to arbitrary seat sizes.
 *
 * Animation tags (`animate`, `set`, …) are removed: they can chain-load external
 * resources via `href` / `xlink:href` in ways that are easy to miss with attribute-only rules.
 *
 * We deliberately keep this light (no dependencies) — the tool runs in the
 * designer only, and the exported component re-embeds already-sanitised
 * strings verbatim.
 */

const DANGEROUS_TAGS = 'script, foreignObject, animate, set, animateMotion, animateTransform';

function sanitizeSvgMarkup(raw: string): string {
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: true, html: false },
    FORBID_TAGS: ['script', 'foreignObject', 'animate', 'set', 'animateMotion', 'animateTransform'],
    FORBID_ATTR: ['style'],
  });
}

function containsDisallowedMarkup(raw: string): boolean {
  // Reject constructs we never need for seat icons and that can create parser/XSS ambiguity.
  return /<!DOCTYPE|<!ENTITY|<\?|<\/?(html|head|body|iframe|object|embed|meta|link)\b/i.test(raw);
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function stripDangerousSvgSubtree(root: Element): void {
  root.querySelectorAll(DANGEROUS_TAGS).forEach((n) => n.remove());

  const walker = root.ownerDocument!.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const nodes: Element[] = [root];
  for (let n = walker.nextNode() as Element | null; n; n = walker.nextNode() as Element | null) {
    nodes.push(n);
  }
  for (const el of nodes) {
    const tag = el.tagName.toLowerCase();
    // <use> with external or javascript refs is a classic SVG XSS / mixed-content vector.
    if (tag === 'use') {
      const href = (
        el.getAttribute('href') ??
        el.getAttribute('xlink:href') ??
        ''
      ).trim();
      const low = href.toLowerCase();
      if (
        !href ||
        low.startsWith('javascript:') ||
        low.startsWith('vbscript:') ||
        (!low.startsWith('#') && !low.startsWith('data:'))
      ) {
        el.remove();
        continue;
      }
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      else if (
        (name === 'href' || name === 'xlink:href') &&
        (value.startsWith('javascript:') || value.startsWith('vbscript:'))
      ) {
        el.removeAttribute(attr.name);
      } else if ((name === 'href' || name === 'xlink:href') && !value.startsWith('#') && !value.startsWith('data:')) {
        el.removeAttribute(attr.name);
      }
    }
    // Drop orphaned <use> after href stripping.
    if (tag === 'use') {
      const h = (el.getAttribute('href') ?? el.getAttribute('xlink:href') ?? '').trim();
      if (!h) el.remove();
    }
  }
}

export function sanitizeSvg(raw: string): string {
  if (!raw) return '';
  if (containsDisallowedMarkup(raw)) return '';
  const safeRaw = sanitizeSvgMarkup(raw);
  if (!safeRaw) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(safeRaw, 'image/svg+xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) return '';
  const svg = doc.querySelector('svg');
  if (!svg) return '';

  stripDangerousSvgSubtree(svg);

  // Ensure a viewBox. If missing, derive it from width/height or default to 24.
  if (!svg.getAttribute('viewBox')) {
    const w = Number(svg.getAttribute('width')) || 24;
    const h = Number(svg.getAttribute('height')) || 24;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
  svg.removeAttribute('width');
  svg.removeAttribute('height');

  return new XMLSerializer().serializeToString(svg);
}

/**
 * Sanitises a **fragment** of SVG (inner markup, not wrapped in `<svg>...</svg>`).
 * Used for pattern `customSvg` and any other inline snippet inserted under a real `<svg>` root.
 */
export function sanitizeSvgFragment(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (containsDisallowedMarkup(trimmed)) return '';
  const safeFragment = sanitizeSvgMarkup(trimmed);
  if (!safeFragment) return '';
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg">${safeFragment}</svg>`;
  const parser = new DOMParser();
  const doc = parser.parseFromString(wrapped, 'image/svg+xml');
  if (doc.querySelector('parsererror')) return '';
  const svg = doc.querySelector('svg');
  if (!svg) return '';

  stripDangerousSvgSubtree(svg);

  return Array.from(svg.childNodes)
    .map((n) => new XMLSerializer().serializeToString(n))
    .join('');
}

/**
 * Wraps a raster data URL (e.g. a PNG the user uploaded) in a small SVG so the
 * custom-seat-icon renderer can treat everything as SVG.
 */
export function dataUrlToSvg(dataUrl: string, size = 24): string {
  const d = dataUrl.trim();
  if (!d.startsWith('data:image/')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"/>`;
  }
  const safeHref = escapeXmlAttr(d);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet"><image href="${safeHref}" x="0" y="0" width="${size}" height="${size}" /></svg>`;
}
