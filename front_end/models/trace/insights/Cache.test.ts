// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../../generated/protocol.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError, processTrace} from '../../../testing/InsightHelpers.js';
import type * as Trace from '../trace.js';

import * as Cache from './Cache.js';

describeWithEnvironment('Cache', function() {
  describe('isCacheable', () => {
    it('should return true for cacheable requests', () => {
      const cacheableRequest = {
        args: {
          data: {
            protocol: 'https',
            resourceType: Protocol.Network.ResourceType.Script,
            statusCode: 200,
          },
        },
      } as unknown as Trace.Types.Events.SyntheticNetworkRequest;
      assert.isTrue(Cache.isCacheable(cacheableRequest));
    });

    it('should return false for non-network scheme: file', () => {
      const nonNetworkRequest = {
        args: {
          data: {
            protocol: 'file',
            resourceType: Protocol.Network.ResourceType.Script,
            statusCode: 200,
          },
        },
      } as unknown as Trace.Types.Events.SyntheticNetworkRequest;
      assert.isFalse(Cache.isCacheable(nonNetworkRequest));
    });

    it('should return false for non-cacheable status codes', () => {
      const nonCacheableRequest = {
        args: {
          data: {
            protocol: 'https',
            resourceType: Protocol.Network.ResourceType.Script,
            statusCode: 404,
          },
        },
      } as unknown as Trace.Types.Events.SyntheticNetworkRequest;
      assert.isFalse(Cache.isCacheable(nonCacheableRequest));
    });

    it('should return false for non-static resource types', () => {
      const nonCacheableRequest = {
        args: {
          data: {
            protocol: 'https',
            resourceType: Protocol.Network.ResourceType.XHR,
            statusCode: 200,
          },
        },
      } as unknown as Trace.Types.Events.SyntheticNetworkRequest;
      assert.isFalse(Cache.isCacheable(nonCacheableRequest));
    });
  });

  describe('computeCacheLifetimeInSeconds', () => {
    it('should return max-age if defined', () => {
      const headers = [{name: 'cache-control', value: 'max-age=3600'}];
      const cacheControl = {
        'max-age': 3600,
      };
      assert.strictEqual(Cache.computeCacheLifetimeInSeconds(headers, cacheControl), 3600);
    });

    it('should return expires header if defined and max-age is not defined', () => {
      const now = Date.now();
      const future = new Date(now + 5000).toUTCString();
      const headers = [{name: 'expires', value: future}];
      const cacheControl = null;
      assert.strictEqual(Cache.computeCacheLifetimeInSeconds(headers, cacheControl), 5);
    });

    it('should handle negative max-age', () => {
      const past = new Date(Date.now() - 5000).toUTCString();
      const headers = [{name: 'expires', value: past}];
      const cacheControl = null;
      assert.strictEqual(Cache.computeCacheLifetimeInSeconds(headers, cacheControl), -5);
    });

    it('should return null if neither max-age nor expires is defined', () => {
      const headers: Array<{name: string, value: string}> = [];
      const cacheControl = null;
      assert.isNull(Cache.computeCacheLifetimeInSeconds(headers, cacheControl));
    });

    it('should return 0 if expires is invalid', () => {
      const headers = [{name: 'expires', value: 'invalid date'}];
      const cacheControl = null;
      assert.strictEqual(Cache.computeCacheLifetimeInSeconds(headers, cacheControl), 0);
    });
  });

  describe('cachingDisabled', () => {
    it('should return true if cache-control contains no-cache', () => {
      const headers = new Map([['cache-control', 'no-cache']]);
      const parsedCacheControl = {
        'no-cache': true,
      };
      assert.isTrue(Cache.cachingDisabled(headers, parsedCacheControl));
    });

    it('should return true if cache-control contains no-store', () => {
      const headers = new Map([['cache-control', 'no-store']]);
      const parsedCacheControl = {
        'no-store': true,
      };
      assert.isTrue(Cache.cachingDisabled(headers, parsedCacheControl));
    });

    it('should return true if cache-control contains must-revalidate', () => {
      const headers = new Map([['cache-control', 'must-revalidate']]);
      const parsedCacheControl = {
        'must-revalidate': true,
      };
      assert.isTrue(Cache.cachingDisabled(headers, parsedCacheControl));
    });

    it('should return true if cache-control contains private', () => {
      const headers = new Map([['cache-control', 'private']]);

      const parsedCacheControl = {
        private: true,
      };
      assert.isTrue(Cache.cachingDisabled(headers, parsedCacheControl));
    });

    it('should return true if pragma contains no-cache and no cache-control', () => {
      const headers = new Map([['pragma', 'no-cache']]);
      const parsedCacheControl = null;
      assert.isTrue(Cache.cachingDisabled(headers, parsedCacheControl));
    });

    it('should return false if no disabling headers are present', () => {
      const headers = new Map([['cache-control', 'max-age=3600']]);
      const parsedCacheControl = {
        'max-age': 3600,
      };
      assert.isFalse(Cache.cachingDisabled(headers, parsedCacheControl));
    });

    it('should return false if pragma contains no-cache but cache-control is present', () => {
      const headers = new Map([['cache-control', 'max-age=3600'], ['pragma', 'no-cache']]);
      const parsedCacheControl = {
        'max-age': 3600,
      };
      assert.isFalse(Cache.cachingDisabled(headers, parsedCacheControl));
    });
  });
  describe('getHeaders', () => {
    it('should handle multiple headers with the same name', () => {
      const responseHeaders = [
        {name: 'cache-control', value: 'max-age=3600'},
        {name: 'cache-control', value: 'public'},
        {name: 'content-type', value: 'text/css'},
      ];
      const headers = Cache.getCombinedHeaders(responseHeaders);
      assert.strictEqual(headers.get('cache-control'), 'max-age=3600, public');
      assert.strictEqual(headers.get('content-type'), 'text/css');
    });
  });

  describe('generateInsight', () => {
    it('generateInsight - no cacheable requests', async () => {
      const {data, insights} = await processTrace(this, 'load-simple.json.gz');
      const insight =
          getInsightOrError('Cache', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));

      const relatedEvents = insight.relatedEvents as Trace.Types.Events.SyntheticNetworkRequest[];
      assert.strictEqual(insight.insightKey, 'Cache');
      assert.strictEqual(insight.state, 'pass');
      assert.deepEqual(insight.strings, Cache.UIStrings);
      assert.strictEqual(insight.requests?.length, 0);
      assert.deepEqual(insight.wastedBytes, 0);
      assert.strictEqual(relatedEvents?.length, 0);
    });

    it('generateInsight - cacheable requests', async () => {
      /**
       * Contains 4 network requests:
       * (1) page html request: not cacheable, Document resource type
       * (2) stylesheet Google Fonts css2: caching is disabled
       * (3) stylesheet app.css: ~ should recommend caching ~
       * (4) via.placeholder img jpg: maxAgeInHours 8766, has high enough cache probability
       * (5) via.placeholder img jpeg: maxAgeInHours 8766, has high enough cache probability
       */
      const {data, insights} = await processTrace(this, 'lcp-images.json.gz');
      const insight =
          getInsightOrError('Cache', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));

      const relatedEvents = insight.relatedEvents as Trace.Types.Events.SyntheticNetworkRequest[] ?? [];
      assert.strictEqual(insight.insightKey, 'Cache');
      assert.strictEqual(insight.state, 'fail');
      assert.deepEqual(insight.strings, Cache.UIStrings);

      const gotCacheable = insight.requests;
      // Should have the 1 cacheable request.
      assert.deepEqual(gotCacheable?.length, 1);
      assert.deepEqual(
          gotCacheable[0].request.args.data.url,
          'https://chromedevtools.github.io/performance-stories/lcp-large-image/app.css');
      // 10min
      assert.deepEqual(gotCacheable[0].ttl, 600);
      // request's transfer size is 0.
      assert.deepEqual(gotCacheable[0].wastedBytes, 0);

      assert.deepEqual(relatedEvents?.length, 1);
      assert.deepEqual(insight.wastedBytes, 0);
    });
  });
});
