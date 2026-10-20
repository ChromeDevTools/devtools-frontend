// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';

import * as SDK from './sdk.js';

const {SecurityOrigin} = SDK.SecurityOrigin;

describe('SourceMapCache', () => {
  let cache: SDK.SourceMapCache.SourceMapCache;

  beforeEach(() => {
    cache = SDK.SourceMapCache.SourceMapCache.createForTest('cache-for-test');
  });

  afterEach(async () => {
    await cache.disposeForTest();
  });

  it('returns null for an unknown Debug ID', async () => {
    const origin = SecurityOrigin.create('https://example.com');
    assert.isNull(await cache.get('1' as SDK.SourceMap.DebugId, origin, origin));
  });

  it('allows retrieval of a source map', async () => {
    const map: SDK.SourceMap.SourceMapV3 = {
      version: 3,
      sources: ['foo.ts', 'bar.ts'],
      mappings: '',
    };
    const origin = SecurityOrigin.create('https://example.com');
    await cache.set('1' as SDK.SourceMap.DebugId, origin, origin, map);

    assert.deepEqual(await cache.get('1' as SDK.SourceMap.DebugId, origin, origin), map);
  });

  it('allows updating of a source map', async () => {
    const map: SDK.SourceMap.SourceMapV3 = {
      version: 3,
      sources: ['foo.ts', 'bar.ts'],
      mappings: '',
    };
    const origin = SecurityOrigin.create('https://example.com');
    await cache.set('1' as SDK.SourceMap.DebugId, origin, origin, map);

    const map2 = {
      ...map,
      sourcesContent: ['foo content', 'bar content'],
    };
    await cache.set('1' as SDK.SourceMap.DebugId, origin, origin, map2);

    assert.deepEqual(await cache.get('1' as SDK.SourceMap.DebugId, origin, origin), map2);
  });

  it('isolates source maps by script origin', async () => {
    const map1: SDK.SourceMap.SourceMapV3 = {
      version: 3,
      sources: ['foo.ts'],
      mappings: '',
    };
    const map2: SDK.SourceMap.SourceMapV3 = {
      version: 3,
      sources: ['bar.ts'],
      mappings: '',
    };
    const debugId = '1' as SDK.SourceMap.DebugId;
    const scriptOrigin1 = SecurityOrigin.create('https://cdn1.example.com');
    const scriptOrigin2 = SecurityOrigin.create('https://cdn2.example.com');
    const loaderOrigin = SecurityOrigin.create('https://example.com');

    await cache.set(debugId, scriptOrigin1, loaderOrigin, map1);
    await cache.set(debugId, scriptOrigin2, loaderOrigin, map2);

    assert.deepEqual(await cache.get(debugId, scriptOrigin1, loaderOrigin), map1);
    assert.deepEqual(await cache.get(debugId, scriptOrigin2, loaderOrigin), map2);
  });

  it('isolates source maps by loader origin when debug ID and script origin match', async () => {
    const map1: SDK.SourceMap.SourceMapV3 = {
      version: 3,
      sources: ['foo.ts'],
      mappings: '',
    };
    const map2: SDK.SourceMap.SourceMapV3 = {
      version: 3,
      sources: ['bar.ts'],
      mappings: '',
    };
    const debugId = '1' as SDK.SourceMap.DebugId;
    const scriptOrigin = SecurityOrigin.create('https://victim.com');
    const loaderOrigin1 = SecurityOrigin.create('https://victim.com');
    const loaderOrigin2 = SecurityOrigin.create('https://attacker.com');

    await cache.set(debugId, scriptOrigin, loaderOrigin1, map1);
    await cache.set(debugId, scriptOrigin, loaderOrigin2, map2);

    assert.deepEqual(await cache.get(debugId, scriptOrigin, loaderOrigin1), map1);
    assert.deepEqual(await cache.get(debugId, scriptOrigin, loaderOrigin2), map2);
  });

  it('returns null if debug ID matches but script origin or loader origin does not', async () => {
    const map: SDK.SourceMap.SourceMapV3 = {
      version: 3,
      sources: ['foo.ts'],
      mappings: '',
    };
    const debugId = '1' as SDK.SourceMap.DebugId;
    const origin1 = SecurityOrigin.create('https://example.com');
    const origin2 = SecurityOrigin.create('https://malicious.com');

    await cache.set(debugId, origin1, origin1, map);

    assert.isNull(await cache.get(debugId, origin2, origin1));
    assert.isNull(await cache.get(debugId, origin1, origin2));
  });

  it('rejects opaque script or loader origins', async () => {
    const map: SDK.SourceMap.SourceMapV3 = {
      version: 3,
      sources: ['foo.ts'],
      mappings: '',
    };
    const debugId = '1' as SDK.SourceMap.DebugId;
    const validOrigin = SecurityOrigin.create('https://example.com');
    const opaqueOrigins = [
      SecurityOrigin.create(''),
      SecurityOrigin.create('null'),
      SecurityOrigin.create('file://'),
      SecurityOrigin.create('file:///'),
      SecurityOrigin.createUniqueOpaque(),
    ];

    for (const opaqueOrigin of opaqueOrigins) {
      await cache.set(debugId, opaqueOrigin, validOrigin, map);
      await cache.set(debugId, validOrigin, opaqueOrigin, map);

      assert.isNull(await cache.get(debugId, opaqueOrigin, validOrigin));
      assert.isNull(await cache.get(debugId, validOrigin, opaqueOrigin));
    }
  });
});
