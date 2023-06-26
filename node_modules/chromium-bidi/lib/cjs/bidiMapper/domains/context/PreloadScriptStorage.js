"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreloadScriptStorage = void 0;
/**
 * Container class for preload scripts.
 */
class PreloadScriptStorage {
    /** Tracks all BiDi preload scripts.  */
    #scripts = new Set();
    /** Finds all entries that match the given filter. */
    findPreloadScripts(filter) {
        if (!filter) {
            return [...this.#scripts];
        }
        return [...this.#scripts].filter((script) => {
            if (filter.id !== undefined && filter.id !== script.id) {
                return false;
            }
            if (filter.contextId !== undefined &&
                filter.contextId !== script.contextId) {
                return false;
            }
            if (filter.contextIds !== undefined &&
                !filter.contextIds.includes(script.contextId)) {
                return false;
            }
            if (filter.targetId !== undefined &&
                !script.targetIds.has(filter.targetId)) {
                return false;
            }
            return true;
        });
    }
    addPreloadScript(preloadScript) {
        this.#scripts.add(preloadScript);
    }
    /** Deletes all BiDi preload script entries that match the given filter. */
    removeBiDiPreloadScripts(filter) {
        for (const preloadScript of this.findPreloadScripts(filter)) {
            this.#scripts.delete(preloadScript);
        }
    }
}
exports.PreloadScriptStorage = PreloadScriptStorage;
//# sourceMappingURL=PreloadScriptStorage.js.map