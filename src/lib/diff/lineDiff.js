/**
 * Minimal line-level diff for in-chat inline previews.
 *
 * We don't need character-level precision — the FilesChangedCard only
 * shows a short 10-20 line inline preview of what changed in an agent's
 * write_file. A LCS-based line diff is plenty and keeps the output
 * predictable.
 *
 * Output is an array of hunks:
 *   { kind: 'equal' | 'add' | 'remove', line: string, oldNum?, newNum? }
 *
 * Note: this implementation is O(n*m) in lines. For files bigger than a
 * few thousand lines, callers should truncate before calling or use a
 * proper Myers diff.
 */

const MAX_DIFFABLE_LINES = 4000;

export function computeLineDiff(oldText = '', newText = '') {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  if (oldLines.length > MAX_DIFFABLE_LINES || newLines.length > MAX_DIFFABLE_LINES) {
    // Too big for O(n*m) — fall back to a trivial replace-all view.
    return [
      ...oldLines.map((line, i) => ({ kind: 'remove', line, oldNum: i + 1 })),
      ...newLines.map((line, i) => ({ kind: 'add', line, newNum: i + 1 })),
    ];
  }

  const lcs = buildLcsTable(oldLines, newLines);
  return backtrack(lcs, oldLines, newLines);
}

/**
 * Compact the diff into only the hunks with changes, padded with up to
 * `context` equal lines on each side. Useful for the collapsed preview
 * that should show changes with a little context, not the whole file.
 */
export function summarizeDiff(hunks, { context = 2, maxLines = 20 } = {}) {
  // Find indexes of changed hunks.
  const changedIdx = [];
  hunks.forEach((h, i) => {
    if (h.kind !== 'equal') changedIdx.push(i);
  });
  if (changedIdx.length === 0) return [];

  // Build ranges of [from,to] inclusive around each change cluster.
  const ranges = [];
  for (const i of changedIdx) {
    const from = Math.max(0, i - context);
    const to = Math.min(hunks.length - 1, i + context);
    const last = ranges[ranges.length - 1];
    if (last && from <= last.to + 1) {
      last.to = Math.max(last.to, to);
    } else {
      ranges.push({ from, to });
    }
  }

  const out = [];
  for (const { from, to } of ranges) {
    for (let i = from; i <= to; i++) {
      out.push(hunks[i]);
      if (out.length >= maxLines) return out;
    }
    // Separator between non-contiguous ranges.
    if (to < hunks.length - 1 && out.length < maxLines) {
      out.push({ kind: 'sep', line: '' });
    }
  }
  return out;
}

function buildLcsTable(a, b) {
  const n = a.length;
  const m = b.length;
  const table = new Array(n + 1);
  for (let i = 0; i <= n; i++) {
    table[i] = new Int32Array(m + 1);
  }
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        table[i][j] = table[i + 1][j + 1] + 1;
      } else {
        table[i][j] = Math.max(table[i + 1][j], table[i][j + 1]);
      }
    }
  }
  return table;
}

function backtrack(table, a, b) {
  const out = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: 'equal', line: a[i], oldNum: i + 1, newNum: j + 1 });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      out.push({ kind: 'remove', line: a[i], oldNum: i + 1 });
      i++;
    } else {
      out.push({ kind: 'add', line: b[j], newNum: j + 1 });
      j++;
    }
  }
  while (i < a.length) {
    out.push({ kind: 'remove', line: a[i], oldNum: i + 1 });
    i++;
  }
  while (j < b.length) {
    out.push({ kind: 'add', line: b[j], newNum: j + 1 });
    j++;
  }
  return out;
}
