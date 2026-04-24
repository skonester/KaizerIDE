import { MAX_SYMBOLS_PER_FILE } from '../config/constants';

/**
 * Deduplicates and limits symbols.
 *
 * Accepts either legacy string symbols (`"foo"`) or the new object shape
 * (`{ name: 'foo', line: 12 }`). Dedup is by name; the earliest line wins.
 */
export class SymbolDeduplicator {
  deduplicate(symbols) {
    const seen = new Map();
    for (const s of symbols) {
      const name = typeof s === 'string' ? s : s && s.name;
      if (!name) continue;
      if (!seen.has(name)) {
        seen.set(name, typeof s === 'string' ? { name, line: 0 } : s);
      }
    }
    return Array.from(seen.values()).slice(0, MAX_SYMBOLS_PER_FILE);
  }

  isValidSymbol(symbol) {
    const name = typeof symbol === 'string' ? symbol : symbol && symbol.name;
    return !!name &&
      typeof name === 'string' &&
      name.length > 0 &&
      name.length < 100 &&
      /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
  }

  filter(symbols) {
    return symbols.filter((s) => this.isValidSymbol(s));
  }
}
