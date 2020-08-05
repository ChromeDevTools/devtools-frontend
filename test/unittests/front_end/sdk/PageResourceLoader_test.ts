// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {LoadErrorDescription} from '../../../../front_end/host/ResourceLoader.js';
import {PageResourceLoader} from '../../../../front_end/sdk/PageResourceLoader.js';

interface LoadResult {
  success: boolean;
  content: string;
  errorDescription: LoadErrorDescription;
}

describe('PageResourceLoader', () => {
  const loads: Array<{url: string}> = [];
  const load = (url: string): Promise<LoadResult> => {
    loads.push({url});

    return Promise.resolve({
      success: true,
      content: `${url} - content`,
      errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
    });
  };

  const initiator = {target: null, frameId: '123', initiatorUrl: ''};

  beforeEach(() => {
    loads.length = 0;
  });

  it('loads resources correctly', async () => {
    const loader =
        PageResourceLoader.instance({forceNew: true, loadOverride: load, maxConcurrentLoads: 500, loadTimeout: 30000});
    const loading = [
      loader.loadResource('foo1', initiator),
      loader.loadResource('foo2', initiator),
      loader.loadResource('foo3', initiator),
    ];

    assert.deepEqual(loader.getNumberOfResources(), {loading: 3, queued: 0, resources: 3});

    const results = await Promise.all(loading);
    assert.deepEqual(loads.map(x => x.url), ['foo1', 'foo2', 'foo3']);
    assert.deepEqual(results.map(x => x.content), ['foo1 - content', 'foo2 - content', 'foo3 - content']);
    assert.deepEqual(loader.getNumberOfResources(), {loading: 0, queued: 0, resources: 3});
    const resources = Array.from(loader.getResourcesLoaded().values());
    assert.isTrue(resources.every(x => x.success));
  });

  it('deals with page reloads correctly', async () => {
    const loader =
        PageResourceLoader.instance({forceNew: true, loadOverride: load, maxConcurrentLoads: 1, loadTimeout: 30000});
    const loading = [
      loader.loadResource('foo1', initiator).catch(e => e.message),
      loader.loadResource('foo2', initiator).catch(e => e.message),
      loader.loadResource('foo3', initiator).catch(e => e.message),
    ];
    assert.deepEqual(loader.getNumberOfResources(), {loading: 3, queued: 2, resources: 3});

    loader._onMainFrameNavigated({
      data: {
        isTopFrame() {
          return true;
        },
      },
    });
    assert.deepEqual(loader.getNumberOfResources(), {loading: 3, queued: 0, resources: 0});

    const results = await Promise.all(loading);
    assert.deepEqual(loads.map(x => x.url), ['foo1']);
    assert.deepEqual(results[0].content, 'foo1 - content');
    assert.deepEqual(results[1], 'Load canceled due to reload of inspected page');
    assert.deepEqual(results[2], 'Load canceled due to reload of inspected page');
  });

  it('handles the load timeout correctly', async () => {
    const load = (url: string): Promise<LoadResult> => {
      loads.push({url});
      return new Promise(() => {});
    };

    const loader =
        PageResourceLoader.instance({forceNew: true, loadOverride: load, maxConcurrentLoads: 2, loadTimeout: 30});
    const loading = [
      loader.loadResource('foo1', initiator).catch(e => e.message),
      loader.loadResource('foo2', initiator).catch(e => e.message),
      loader.loadResource('foo3', initiator).catch(e => e.message),
    ];
    assert.deepEqual(loader.getNumberOfResources(), {loading: 3, queued: 1, resources: 3});

    const results = await Promise.all(loading);
    assert.deepEqual(loads.map(x => x.url), ['foo1', 'foo2', 'foo3']);
    const resources = Array.from(loader.getResourcesLoaded().values());
    assert.isTrue(resources.every(x => !x.success), 'All resources should have failed to load');
    assert.isTrue(
        results.every(x => x === 'Load canceled due to load timeout'),
        'All loads should have a exceeded the load timeout');
    assert.deepEqual(loader.getNumberOfResources(), {loading: 0, queued: 0, resources: 3});
  });

  it('respects the max concurrent loads', async () => {
    const loader =
        PageResourceLoader.instance({forceNew: true, loadOverride: load, maxConcurrentLoads: 2, loadTimeout: 30});
    const loading = [
      loader.loadResource('foo1', initiator),
      loader.loadResource('foo2', initiator),
      loader.loadResource('foo3', initiator),
    ];
    assert.deepEqual(loader.getNumberOfResources(), {loading: 3, queued: 1, resources: 3});

    const results = await Promise.all(loading);
    assert.deepEqual(loads.map(x => x.url), ['foo1', 'foo2', 'foo3']);
    assert.deepEqual(results.map(x => x.content), ['foo1 - content', 'foo2 - content', 'foo3 - content']);
    assert.deepEqual(loader.getNumberOfResources(), {loading: 0, queued: 0, resources: 3});
    const resources = Array.from(loader.getResourcesLoaded().values());
    assert.isTrue(resources.every(x => x.success));
  });
});
