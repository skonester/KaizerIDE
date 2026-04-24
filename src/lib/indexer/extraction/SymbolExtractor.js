import { getPatternsForExtension } from './patterns/index';
import { SymbolDeduplicator } from './SymbolDeduplicator';

/**
 * Extracts symbols (functions, classes, exports) from source code.
 *
 * Each returned symbol is `{ name, line }` — the 1-indexed line in the
 * original file where the symbol was declared. Callers can use the line
 * number to feed `read_file(path, fromLine, toLine)` precisely instead of
 * reading whole files.
 */
export class SymbolExtractor {
  constructor() {
    this.deduplicator = new SymbolDeduplicator();
  }

  extract(content, ext) {
    const patterns = getPatternsForExtension(ext);
    const symbols = [];

    // Precompute newline offsets so we can turn match.index into a 1-indexed
    // line number without scanning the string for every symbol.
    const newlineOffsets = buildNewlineOffsets(content);

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(content)) !== null) {
        const name = match[1] || match[2];
        if (name) {
          symbols.push({
            name,
            line: offsetToLine(newlineOffsets, match.index),
          });
        }

        // Prevent infinite loops on zero-width matches
        if (match.index === pattern.lastIndex) {
          pattern.lastIndex++;
        }

        if (symbols.length > 100) break;
      }
    }

    const valid = this.deduplicator.filter(symbols);
    return this.deduplicator.deduplicate(valid);
  }
}

/**
 * Build a sorted array of character offsets at which each newline starts.
 * Line number for offset O = 1 + (index of last newlineOffset <= O).
 */
function buildNewlineOffsets(content) {
  const offsets = [];
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 10) offsets.push(i);
  }
  return offsets;
}

function offsetToLine(newlineOffsets, offset) {
  // Binary search for the largest newline offset <= offset.
  let lo = 0;
  let hi = newlineOffsets.length - 1;
  let line = 1; // before any newline we're on line 1

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (newlineOffsets[mid] < offset) {
      line = mid + 2; // we're on the line AFTER this newline
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return line;
}
