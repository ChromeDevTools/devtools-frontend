// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/** A thin wrapper around the Cache API to store source map JSONs keyed on Debug IDs */
export class SourceMapCache {
    static create() {
        if (typeof window === 'undefined') {
            // TODO(crbug.com/451502260): Move this behind a `HostRuntime` interface.
            return IN_MEMORY_INSTANCE; // TS doesn't like that our in-memory class doesn't have the same private fields.
        }
        return new SourceMapCache('devtools-source-map-cache');
    }
    static createForTest(name) {
        return new SourceMapCache(name);
    }
    #name;
    #cachePromise;
    constructor(name) {
        this.#name = name;
    }
    async set(debugId, securityOrigin, sourceMap) {
        const cache = await this.#cache();
        await cache.put(SourceMapCache.#urlForDebugId(debugId, securityOrigin), new Response(JSON.stringify(sourceMap)));
    }
    async get(debugId, securityOrigin) {
        const cache = await this.#cache();
        const response = await cache.match(SourceMapCache.#urlForDebugId(debugId, securityOrigin));
        return await response?.json() ?? null;
    }
    async #cache() {
        if (this.#cachePromise) {
            return await this.#cachePromise;
        }
        this.#cachePromise = window.caches.open(this.#name);
        return await this.#cachePromise;
    }
    /** The Cache API only allows URL as keys, so we construct a simple one. Given that we have our own cache, we have no risk of conflicting URLs */
    static #urlForDebugId(debugId, securityOrigin) {
        return `http://debug.id/${encodeURIComponent(debugId)}?origin=${encodeURIComponent(securityOrigin)}`;
    }
    async disposeForTest() {
        await window.caches.delete(this.#name);
    }
}
const IN_MEMORY_INSTANCE = new (class {
    #cache = new Map();
    async set(debugId, securityOrigin, sourceMap) {
        this.#cache.set(`${debugId}|${securityOrigin}`, sourceMap);
    }
    async get(debugId, securityOrigin) {
        return this.#cache.get(`${debugId}|${securityOrigin}`) ?? null;
    }
    async disposeForTest() {
        // Do nothing.
    }
})();
//# sourceMappingURL=SourceMapCache.js.map