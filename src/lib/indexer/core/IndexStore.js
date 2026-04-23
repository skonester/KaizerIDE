/**
 * Manages the in-memory index storage
 */
export class IndexStore {
  constructor() {
    this.index = []; // Array of IndexedFile objects
  }

  add(file) {
    this.index.push(file);
  }

  clear() {
    this.index = [];
  }

  getAll() {
    return this.index;
  }

  getCount() {
    return this.index.length;
  }

  findByPath(path) {
    return this.index.find(f => f.path === path);
  }

  filter(predicate) {
    return this.index.filter(predicate);
  }

  map(mapper) {
    return this.index.map(mapper);
  }

  forEach(callback) {
    this.index.forEach(callback);
  }

  setAll(files) {
    this.index = files;
  }

  /**
   * Update or add a file in the index
   * @param {string} path - File path
   * @param {object} fileData - IndexedFile data
   */
  updateFile(path, fileData) {
    const existingIndex = this.index.findIndex(f => f.path === path);
    
    if (existingIndex !== -1) {
      // Update existing file
      this.index[existingIndex] = fileData;
      console.log('[IndexStore] Updated file in index:', path);
    } else {
      // Add new file
      this.index.push(fileData);
      console.log('[IndexStore] Added new file to index:', path);
    }
  }

  /**
   * Remove a file from the index
   * @param {string} path - File path to remove
   * @returns {boolean} - True if file was removed, false if not found
   */
  removeFile(path) {
    const initialLength = this.index.length;
    this.index = this.index.filter(f => f.path !== path);
    const removed = this.index.length < initialLength;
    
    if (removed) {
      console.log('[IndexStore] Removed file from index:', path);
    }
    
    return removed;
  }

  /**
   * Check if a file exists in the index
   * @param {string} path - File path
   * @returns {boolean}
   */
  hasFile(path) {
    return this.index.some(f => f.path === path);
  }
}
