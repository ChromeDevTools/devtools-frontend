// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from './sdk.js';

describe('SourceMapCache', () => {
  let cache: SDK.SourceMapCache.SourceMapCache;

  beforeEach(() => {
    cache = SDK.SourceMapCache.SourceMapCache.createForTest('cache-for-test');
  });

  afterEach(async () => {
    await cache.disposeForTest();
  });

  it('returns null for an unknown Debug ID', async () => {
    assert.isNull(await cache.get('1' as SDK.SourceMap.DebugId));
  });

  it('allows retrieval of a source map', async () => {
    const map: SDK.SourceMap.SourceMapV3 = {
      version: 3,
      sources: ['foo.ts', 'bar.ts'],
      mappings: '',
    };
    await cache.set('1' as SDK.SourceMap.DebugId, map);

    assert.deepEqual(await cache.get('1' as SDK.SourceMap.DebugId), map);
  });

  it('allows updating of a source map', async () => {
    const map: SDK.SourceMap.SourceMapV3 = {
      version: 3,
      sources: ['foo.ts', 'bar.ts'],
      mappings: '',
    };
    await cache.set('1' as SDK.SourceMap.DebugId, map);

    const map2 = {
      ...map,
      sourcesContent: ['foo content', 'bar content'],
    };
    await cache.set('1' as SDK.SourceMap.DebugId, map2);

    assert.deepEqual(await cache.get('1' as SDK.SourceMap.DebugId), map2);
  });
});
