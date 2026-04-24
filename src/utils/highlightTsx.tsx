import { type ReactNode } from 'react';

/**
 * Lightweight, dependency-free TSX syntax highlighter. Approximates VSCode's
 * Dark+ palette well enough for code previews (export dialog, landing page
 * callouts). Not a full parser: it scans tokens linearly, prioritising
 * comments and strings over identifiers and punctuation.
 */

const COLOR = {
  comment: '#6a9955',
  string: '#ce9178',
  keyword: '#c586c0',
  type: '#4fc1ff',
  ident: '#9cdcfe',
  number: '#b5cea8',
  punct: '#d4d4d4',
  plain: 'var(--text-primary)',
} as const;

const KEYWORDS = new Set([
  'import',
  'from',
  'export',
  'default',
  'function',
  'return',
  'const',
  'let',
  'var',
  'if',
  'else',
  'for',
  'while',
  'new',
  'as',
  'typeof',
  'interface',
  'type',
  'true',
  'false',
  'null',
  'undefined',
  'class',
  'extends',
  'implements',
  'this',
  'super',
  'in',
  'of',
  'async',
  'await',
  'break',
  'case',
  'catch',
  'continue',
  'do',
  'finally',
  'switch',
  'throw',
  'try',
  'void',
  'yield',
  'static',
  'public',
  'private',
  'protected',
  'readonly',
  'enum',
  'namespace',
  'satisfies',
  'keyof',
  'infer',
  'is',
]);

const PUNCT_RE = /^[{}()[\]<>/=.,;:!?&|+\-*%^~]$/;
const ID_START = /[A-Za-z_$]/;
const ID_PART = /[A-Za-z0-9_$]/;
const DIGIT = /[0-9]/;
const NUMBER_PART = /[0-9._xXa-fA-F]/;
const WS = /\s/;

interface Tok {
  text: string;
  color: string;
}

export function highlightTsx(code: string): ReactNode {
  const tokens = tokenize(code);
  return tokens.map((t, i) => (
    <span key={i} style={{ color: t.color }}>
      {t.text}
    </span>
  ));
}

function tokenize(code: string): Tok[] {
  const out: Tok[] = [];
  const n = code.length;
  let i = 0;

  const push = (text: string, color: string): void => {
    if (!text) return;
    const prev = out[out.length - 1];
    if (prev && prev.color === color) {
      prev.text += text;
    } else {
      out.push({ text, color });
    }
  };

  while (i < n) {
    const c = code[i];
    const next = code[i + 1];

    // Block comment /* … */ — may span multiple lines.
    if (c === '/' && next === '*') {
      const end = code.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      push(code.slice(i, stop), COLOR.comment);
      i = stop;
      continue;
    }

    // Line comment // … to end of line.
    if (c === '/' && next === '/') {
      const nl = code.indexOf('\n', i);
      const stop = nl === -1 ? n : nl;
      push(code.slice(i, stop), COLOR.comment);
      i = stop;
      continue;
    }

    // Template string — backticks, may span multiple lines. We colour the
    // whole literal as a string; nested ${…} expressions inherit that colour.
    if (c === '`') {
      let j = i + 1;
      while (j < n) {
        if (code[j] === '\\') {
          j += 2;
          continue;
        }
        if (code[j] === '`') {
          j++;
          break;
        }
        j++;
      }
      push(code.slice(i, j), COLOR.string);
      i = j;
      continue;
    }

    // Single / double quoted strings — bail at newline for resilience.
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < n) {
        if (code[j] === '\\') {
          j += 2;
          continue;
        }
        if (code[j] === quote) {
          j++;
          break;
        }
        if (code[j] === '\n') break;
        j++;
      }
      push(code.slice(i, j), COLOR.string);
      i = j;
      continue;
    }

    // Whitespace runs — no colouring needed, keeps the output compact.
    if (WS.test(c)) {
      let j = i;
      while (j < n && WS.test(code[j])) j++;
      push(code.slice(i, j), COLOR.plain);
      i = j;
      continue;
    }

    // Numbers (ints, floats, hex).
    if (DIGIT.test(c)) {
      let j = i;
      while (j < n && NUMBER_PART.test(code[j])) j++;
      push(code.slice(i, j), COLOR.number);
      i = j;
      continue;
    }

    // Identifiers → keyword / type / plain identifier.
    if (ID_START.test(c)) {
      let j = i;
      while (j < n && ID_PART.test(code[j])) j++;
      const word = code.slice(i, j);
      let color: string = COLOR.ident;
      if (KEYWORDS.has(word)) color = COLOR.keyword;
      else if (/^[A-Z]/.test(word)) color = COLOR.type;
      push(word, color);
      i = j;
      continue;
    }

    // Single-character punctuation.
    if (PUNCT_RE.test(c)) {
      push(c, COLOR.punct);
      i++;
      continue;
    }

    // Fallback — unknown character passes through unstyled.
    push(c, COLOR.plain);
    i++;
  }

  return out;
}
