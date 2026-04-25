# Workspace Indexing System

## Overview

KaizerIDE includes a powerful workspace indexing system that builds a searchable in-memory database of your entire codebase. This enables the AI assistant to instantly find files, symbols, and code without repeatedly reading every file.

## Why Indexing?

**Without Indexing:**
- AI must read files on-demand (slow)
- Repeated file reads for similar queries
- Higher latency for code navigation
- More API calls and processing time

**With Indexing:**
- Instant file and symbol lookups
- Fast fuzzy search across codebase
- Real-time updates on file changes
- AI has full context awareness
- 100% local (no data leaves your machine)

## How It Works

### 1. Initial Indexing

When you open a workspace, KaizerIDE:

1. **Checks Cache** - Looks for a cached index in localStorage (valid for 1 hour)
2. **Loads or Builds** - Either loads from cache (instant) or starts fresh indexing
3. **Walks Directory** - Recursively scans your workspace
4. **Filters Files** - Only indexes supported file types (JS, TS, Python, C/C++, Go, Rust, etc.)
5. **Extracts Symbols** - Finds functions, classes, methods, structs, defines
6. **Stores Preview** - Keeps first ~50 lines of each file for quick context
7. **Saves Cache** - Stores index in localStorage for next session

### 2. What Gets Indexed

For each file, the system stores:

- **Path** - Relative path from workspace root
- **Extension** - File type (.js, .py, .c, etc.)
- **Line Count** - Total lines in file
- **Symbols** - Extracted code symbols with line numbers:
  - Functions, classes, methods
  - Structs, typedefs, enums (C/C++)
  - Defines and macros
- **Preview** - First ~50 lines of code
- **Headings** - Markdown headings (for documentation)

### 3. Real-Time Updates

The **FileWatcher** monitors your workspace for changes:

- **File Created** → Automatically indexed
- **File Modified** → Re-indexed incrementally
- **File Deleted** → Removed from index
- **Debounced** → Changes batched (300ms) to avoid thrashing

### 4. Search Capabilities

#### Fuzzy Search (`search_index`)
Searches across:
- Filenames and paths
- Symbol names (functions, classes, etc.)
- Code content (preview)

Returns ranked results with code snippets showing context.

#### Line-Level Search (`grep_index`)
Fast text search:
- Case-insensitive literal matching
- Returns file path, line number, and content
- Results grouped by file

## AI Integration

The AI assistant uses indexing through specialized tools:

### `search_index`
Find files by name, symbol, or content
```
AI: "Find the authentication function"
→ Searches index for "authentication"
→ Returns: auth.js, login.ts, etc. with snippets
```

### `grep_index`
Fast line-level text search
```
AI: "Where is API_KEY used?"
→ Searches all indexed files
→ Returns: config.js:12, api.js:45, etc.
```

### `get_symbol_definition`
Locate where a symbol is defined
```
AI: "Find the User class definition"
→ Searches symbols in index
→ Returns: models/User.js:15 with context
```

### `find_references`
Find all usages of a symbol
```
AI: "Where is validateEmail called?"
→ Searches index for references
→ Returns all files and lines using it
```

## Performance

### Typical Workspace (1000 files)
- **Indexing Time**: 2-5 seconds
- **Memory Usage**: 5-10 MB
- **Cache Size**: 2-5 MB in localStorage
- **Cache Duration**: 1 hour

### Optimizations
- **Batch Processing** - 50 files at a time, yields to UI
- **Smart Caching** - Saves index for 1 hour
- **Incremental Updates** - Only re-indexes changed files
- **Preview Limits** - Only first 50 lines stored per file
- **Ignore Patterns** - Skips node_modules, .git, dist, etc.

## Supported Languages

The indexer extracts symbols from:

- **JavaScript/TypeScript** - Functions, classes, methods, arrow functions
- **Python** - Functions, classes, methods
- **C/C++** - Functions, structs, typedefs, defines, macros
- **Go** - Functions, types, methods
- **Rust** - Functions, structs, impls, traits
- **Assembly** - Labels, procedures, macros

## Configuration

### Enable/Disable Indexing

1. Open **Settings** (Ctrl+,)
2. Go to **Indexer** tab
3. Toggle "Enable workspace indexing"

When disabled, the AI uses on-demand file reading instead.

### What Gets Ignored

By default, the indexer skips:
- `node_modules/`
- `.git/`
- `dist/`, `build/`, `release/`
- `__pycache__/`
- `.vscode/`, `.idea/`
- Files matching `.gitignore` patterns

### Supported File Extensions

**JavaScript/TypeScript**: `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`  
**Python**: `.py`  
**C/C++**: `.c`, `.h`, `.cpp`, `.hpp`, `.cc`, `.cxx`  
**Go**: `.go`  
**Rust**: `.rs`  
**Assembly**: `.asm`, `.s`  
**Markdown**: `.md`  
**Config**: `.json`, `.yaml`, `.yml`, `.toml`

## Privacy & Security

- **100% Local** - All indexing happens on your machine
- **No Cloud** - Index never leaves your computer
- **No Telemetry** - No data sent to external servers
- **localStorage Only** - Cache stored in browser storage
- **User Control** - Can be disabled anytime

## Troubleshooting

### Index Not Loading
1. Check if indexing is enabled in Settings
2. Try clearing the cache: Settings → Indexer → Clear Index
3. Restart the application

### Slow Indexing
- Large workspaces (10,000+ files) may take longer
- Check if you're indexing unnecessary directories
- Consider adding patterns to `.gitignore`

### Missing Symbols
- Ensure file extension is supported
- Check if file is in an ignored directory
- Try re-indexing: Settings → Indexer → Re-index Workspace

### High Memory Usage
- Index size scales with workspace size
- Consider excluding large generated directories
- Clear cache if not actively using indexing

## Architecture

The indexing system is modular with 7 subsystems:

1. **Core** - StateManager, IndexStore, IndexingEngine
2. **Filesystem** - FileCollector, FileReader
3. **Extraction** - SymbolExtractor, HeadingExtractor
4. **Search** - SearchEngine, Scorer, Ranker
5. **Persistence** - LocalStorageAdapter, CacheValidator
6. **Observer** - FileWatcher, IndexerEvents
7. **Context** - SummaryGenerator, ContextBuilder

For technical details, see the source code in `src/lib/indexer/`.

## Future Enhancements

Planned improvements:
- Semantic search using embeddings
- Cross-file reference tracking
- Call hierarchy visualization
- Symbol rename refactoring
- Import/export analysis
- Dependency graph generation

---

**Need Help?** Check out the [main documentation](../README.md) or open an issue on GitHub.
