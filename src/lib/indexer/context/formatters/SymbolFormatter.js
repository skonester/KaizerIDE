import { MAX_SYMBOLS_IN_SUMMARY } from '../../config/constants';

/**
 * Formats symbol lists for display in the workspace summary.
 * Accepts both the legacy string symbols and the new `{name,line}` objects.
 */
export class SymbolFormatter {
  format(indexStore, maxSymbols = MAX_SYMBOLS_IN_SUMMARY) {
    const names = new Set();
    for (const f of indexStore.getAll()) {
      if (!f || !f.symbols) continue;
      for (const s of f.symbols) {
        const name = typeof s === 'string' ? s : s && s.name;
        if (name) names.add(name);
      }
    }
    return [...names].slice(0, maxSymbols).join(', ');
  }
}
