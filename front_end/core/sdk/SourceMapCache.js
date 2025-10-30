// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/** A thin wrapper around the Cache API to store source map JSONs keyed on Debug IDs */
export class SourceMapCache {
    static #INSTANCE = new SourceMapCache('devtools-source-map-cache');
    static instance() {
        return this.#INSTANCE;
    }
    static createForTest(name) {
        return new SourceMapCache(name);
    }
    #name;
    #cachePromise;
    constructor(name) {
        this.#name = name;
    }
    async set(debugId, sourceMap) {
        const cache = await this.#cache();
        await cache.put(SourceMapCache.#urlForDebugId(debugId), new Response(JSON.stringify(sourceMap)));
    }
    async get(debugId) {
        const cache = await this.#cache();
        const response = await cache.match(SourceMapCache.#urlForDebugId(debugId));
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
    static #urlForDebugId(debugId) {
        return 'http://debug.id/' + encodeURIComponent(debugId);
    }
    async disposeForTest() {
        await window.caches.delete(this.#name);
    }
}
//# sourceMappingURL=SourceMapCache.js.map