/**
 * Container class for preload scripts.
 */
export class PreloadScriptStorage {
    /** Tracks all BiDi preload scripts.  */
    #scripts = new Set();
    /**
     * Finds all entries that match the given filter (OR logic).
     */
    find(filter) {
        if (!filter) {
            return [...this.#scripts];
        }
        return [...this.#scripts].filter((script) => {
            if (filter.id !== undefined && filter.id === script.id) {
                return true;
            }
            if (filter.targetId !== undefined &&
                script.targetIds.has(filter.targetId)) {
                return true;
            }
            if (filter.global !== undefined &&
                // Global scripts have no contexts
                ((filter.global && script.contexts === undefined) ||
                    // Non global scripts always have contexts
                    (!filter.global && script.contexts !== undefined))) {
                return true;
            }
            return false;
        });
    }
    add(preloadScript) {
        this.#scripts.add(preloadScript);
    }
    /** Deletes all BiDi preload script entries that match the given filter. */
    remove(filter) {
        for (const preloadScript of this.find(filter)) {
            this.#scripts.delete(preloadScript);
        }
    }
}
//# sourceMappingURL=PreloadScriptStorage.js.map