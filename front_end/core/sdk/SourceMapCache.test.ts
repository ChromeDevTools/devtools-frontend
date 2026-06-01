// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

const {urlString} = Platform.DevToolsPath;

describe('SourceMapCache', () => {
  let cache: SDK.SourceMapCache.SourceMapCache;

  beforeEach(() => {
    cache = SDK.SourceMapCache.SourceMapCache.createForTest('cache-for-test');
  });

  afterEach(async () => {
    await cache.disposeForTest();
  });

  it('returns null for an unknown Debug ID', async () => {
    assert.isNull(await cache.get('1' as SDK.SourceMap.DebugId, Platform.DevToolsPath.EmptyUrlString));
  });

  it('allows retrieval of a source map', async () => {
    const map: SDK.SourceMap.SourceMapV3 = {
      version: 3,
      sources: ['foo.ts', 'bar.ts'],
      mappings: '',
    };
    await cache.set('1' as SDK.SourceMap.DebugId, urlString`https://example.com`, map);

    assert.deepEqual(await cache.get('1' as SDK.SourceMap.DebugId, urlString`https://example.com`), map);
  });

  it('allows updating of a source map', async () => {
    const map: SDK.SourceMap.SourceMapV3 = {
      version: 3,
      sources: ['foo.ts', 'bar.ts'],
      mappings: '',
    };
    await cache.set('1' as SDK.SourceMap.DebugId, urlString`https://example.com`, map);

    const map2 = {
      ...map,
      sourcesContent: ['foo content', 'bar content'],
    };
    await cache.set('1' as SDK.SourceMap.DebugId, urlString`https://example.com`, map2);

    assert.deepEqual(await cache.get('1' as SDK.SourceMap.DebugId, urlString`https://example.com`), map2);
  });

  it('isolates source maps by security origin', async () => {
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
    const origin1 = urlString`https://example.com`;
    const origin2 = urlString`https://malicious.com`;

    await cache.set(debugId, origin1, map1);
    await cache.set(debugId, origin2, map2);

    assert.deepEqual(await cache.get(debugId, origin1), map1);
    assert.deepEqual(await cache.get(debugId, origin2), map2);
  });

  it('returns null if debug ID matches but origin does not', async () => {
    const map: SDK.SourceMap.SourceMapV3 = {
      version: 3,
      sources: ['foo.ts'],
      mappings: '',
    };
    const debugId = '1' as SDK.SourceMap.DebugId;
    const origin1 = urlString`https://example.com`;
    const origin2 = urlString`https://malicious.com`;

    await cache.set(debugId, origin1, map);

    assert.isNull(await cache.get(debugId, origin2));
  });

  it('supports empty security origin', async () => {
    const map: SDK.SourceMap.SourceMapV3 = {
      version: 3,
      sources: ['foo.ts'],
      mappings: '',
    };
    const debugId = '1' as SDK.SourceMap.DebugId;
    await cache.set(debugId, Platform.DevToolsPath.EmptyUrlString, map);

    assert.deepEqual(await cache.get(debugId, Platform.DevToolsPath.EmptyUrlString), map);
  });
});
