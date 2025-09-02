// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {DebugId, SourceMapV3} from './SourceMap.js';

/** A thin wrapper around the Cache API to store source map JSONs keyed on Debug IDs */
export class SourceMapCache {
  static readonly #INSTANCE = new SourceMapCache('devtools-source-map-cache');

  static instance(): SourceMapCache {
    return this.#INSTANCE;
  }

  static createForTest(name: string): SourceMapCache {
    return new SourceMapCache(name);
  }

  readonly #name: string;
  #cachePromise?: Promise<Cache>;

  private constructor(name: string) {
    this.#name = name;
  }

  async set(debugId: DebugId, sourceMap: SourceMapV3): Promise<void> {
    const cache = await this.#cache();
    await cache.put(SourceMapCache.#urlForDebugId(debugId), new Response(JSON.stringify(sourceMap)));
  }

  async get(debugId: DebugId): Promise<SourceMapV3|null> {
    const cache = await this.#cache();
    const response = await cache.match(SourceMapCache.#urlForDebugId(debugId));
    return await response?.json() ?? null;
  }

  async #cache(): Promise<Cache> {
    if (this.#cachePromise) {
      return await this.#cachePromise;
    }

    this.#cachePromise = window.caches.open(this.#name);
    return await this.#cachePromise;
  }

  /** The Cache API only allows URL as keys, so we construct a simple one. Given that we have our own cache, we have no risk of conflicting URLs */
  static #urlForDebugId(debugId: DebugId): string {
    return 'http://debug.id/' + encodeURIComponent(debugId);
  }

  async disposeForTest(): Promise<void> {
    await window.caches.delete(this.#name);
  }
}
