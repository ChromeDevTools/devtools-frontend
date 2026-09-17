// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../platform/platform.js';

import type {DebugId, SourceMapV3} from './SourceMap.js';

/** A thin wrapper around the Cache API to store source map JSONs keyed on Debug IDs */
export class SourceMapCache {
  static create(): SourceMapCache {
    if (!Platform.HostRuntime.HOST_RUNTIME.getCacheStorage()) {
      return IN_MEMORY_INSTANCE as unknown as
          SourceMapCache;  // TS doesn't like that our in-memory class doesn't have the same private fields.
    }
    return new SourceMapCache('devtools-source-map-cache');
  }

  static createForTest(name: string): SourceMapCache {
    return new SourceMapCache(name);
  }

  readonly #name: string;
  #cachePromise?: Promise<Platform.HostRuntime.CacheEntry>;

  private constructor(name: string) {
    this.#name = name;
  }

  async set(debugId: DebugId, securityOrigin: Platform.DevToolsPath.UrlString, sourceMap: SourceMapV3): Promise<void> {
    const cache = await this.#cache();
    await cache?.put(SourceMapCache.#urlForDebugId(debugId, securityOrigin), new Response(JSON.stringify(sourceMap)));
  }

  async get(debugId: DebugId, securityOrigin: Platform.DevToolsPath.UrlString): Promise<SourceMapV3|null> {
    const cache = await this.#cache();
    const response = await cache?.match(SourceMapCache.#urlForDebugId(debugId, securityOrigin));
    return (await response?.json() as SourceMapV3 | undefined) ?? null;
  }

  async #cache(): Promise<Platform.HostRuntime.CacheEntry|undefined> {
    if (this.#cachePromise) {
      return await this.#cachePromise;
    }

    const cacheStorage = Platform.HostRuntime.HOST_RUNTIME.getCacheStorage();
    if (!cacheStorage) {
      return undefined;
    }
    this.#cachePromise = cacheStorage.open(this.#name);
    return await this.#cachePromise;
  }

  /** The Cache API only allows URL as keys, so we construct a simple one. Given that we have our own cache, we have no risk of conflicting URLs */
  static #urlForDebugId(debugId: DebugId, securityOrigin: Platform.DevToolsPath.UrlString): string {
    return `http://debug.id/${encodeURIComponent(debugId)}?origin=${encodeURIComponent(securityOrigin)}`;
  }

  async disposeForTest(): Promise<void> {
    await Platform.HostRuntime.HOST_RUNTIME.getCacheStorage()?.delete(this.#name);
  }
}

const IN_MEMORY_INSTANCE = new (class implements Pick<SourceMapCache, 'get'|'set'|'disposeForTest'> {
  readonly #cache = new Map<string, SourceMapV3>();

  async set(debugId: DebugId, securityOrigin: Platform.DevToolsPath.UrlString, sourceMap: SourceMapV3): Promise<void> {
    this.#cache.set(`${debugId}|${securityOrigin}`, sourceMap);
  }

  async get(debugId: DebugId, securityOrigin: Platform.DevToolsPath.UrlString): Promise<SourceMapV3|null> {
    return this.#cache.get(`${debugId}|${securityOrigin}`) ?? null;
  }

  async disposeForTest(): Promise<void> {
    // Do nothing.
  }
})();
