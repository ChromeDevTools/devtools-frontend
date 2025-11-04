let instance = null;
/**
 * Singleton class that contains the set of active filters for the given trace
 * file.
 */
export class ActiveFilters {
    static instance(opts = { forceNew: null }) {
        const forceNew = Boolean(opts.forceNew);
        if (!instance || forceNew) {
            instance = new ActiveFilters();
        }
        return instance;
    }
    static removeInstance() {
        instance = null;
    }
    #activeFilters = [];
    activeFilters() {
        return this.#activeFilters;
    }
    setFilters(newFilters) {
        this.#activeFilters = newFilters;
    }
    isVisible(event) {
        return this.#activeFilters.every(f => f.accept(event));
    }
}
//# sourceMappingURL=ActiveFilters.js.map