// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../../front_end/core/common/common.js';
import * as Host from '../../../../../front_end/core/host/host.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Platform from '../../../../../front_end/core/platform/platform.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import {describeWithEnvironment, describeWithLocale} from '../../helpers/EnvironmentHelpers.js';

interface LoadResult {
  success: boolean;
  content: string;
  errorDescription: Host.ResourceLoader.LoadErrorDescription;
}

const initiator = {
  target: null,
  frameId: '123' as Protocol.Page.FrameId,
  initiatorUrl: Platform.DevToolsPath.EmptyUrlString,
};

describeWithLocale('PageResourceLoader', () => {
  const foo1Url = 'foo1' as Platform.DevToolsPath.UrlString;
  const foo2Url = 'foo2' as Platform.DevToolsPath.UrlString;
  const foo3Url = 'foo3' as Platform.DevToolsPath.UrlString;
  const loads: Array<{url: string, resolve?: {(_: LoadResult|PromiseLike<LoadResult>): void}}> = [];
  const load = async(url: string): Promise<LoadResult> => {
    loads.push({url});

    return {
      success: true,
      content: `${url} - content`,
      errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
    };
  };

  beforeEach(() => {
    loads.length = 0;
  });

  it('loads resources correctly', async () => {
    const loader = SDK.PageResourceLoader.PageResourceLoader.instance(
        {forceNew: true, loadOverride: load, maxConcurrentLoads: 500, loadTimeout: 30000});
    const loading = [
      loader.loadResource(foo1Url, initiator),
      loader.loadResource(foo2Url, initiator),
      loader.loadResource(foo3Url, initiator),
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
    const loader = SDK.PageResourceLoader.PageResourceLoader.instance(
        {forceNew: true, loadOverride: load, maxConcurrentLoads: 1, loadTimeout: 30000});
    const loading = [
      loader.loadResource(foo1Url, initiator).catch(e => e.message),
      loader.loadResource(foo2Url, initiator).catch(e => e.message),
      loader.loadResource(foo3Url, initiator).catch(e => e.message),
    ];
    assert.deepEqual(loader.getNumberOfResources(), {loading: 3, queued: 2, resources: 3});

    loader.onMainFrameNavigated({
      data: {
        isTopFrame() {
          return true;
        },
      } as SDK.ResourceTreeModel.ResourceTreeFrame,
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
      return new Promise(resolve => loads.push({url, resolve}));
    };

    const loader = SDK.PageResourceLoader.PageResourceLoader.instance(
        {forceNew: true, loadOverride: load, maxConcurrentLoads: 2, loadTimeout: 30});
    const loading = [
      loader.loadResource(foo1Url, initiator).catch(e => e.message),
      loader.loadResource(foo2Url, initiator).catch(e => e.message),
      loader.loadResource(foo3Url, initiator).catch(e => e.message),
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
    loads.forEach(l => l.resolve && l.resolve({} as LoadResult));
  });

  it('respects the max concurrent loads', async () => {
    const loader = SDK.PageResourceLoader.PageResourceLoader.instance(
        {forceNew: true, loadOverride: load, maxConcurrentLoads: 2, loadTimeout: 30});
    const loading = [
      loader.loadResource(foo1Url, initiator),
      loader.loadResource(foo2Url, initiator),
      loader.loadResource(foo3Url, initiator),
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

// Loading via host bindings requires the settings infra to be booted.
describeWithEnvironment('PageResourceLoader', () => {
  it('blocks UNC file paths with the default setting', async () => {
    if (!Host.Platform.isWin()) {
      return;
    }

    const loader = SDK.PageResourceLoader.PageResourceLoader.instance(
        {forceNew: true, loadOverride: null, maxConcurrentLoads: 1, loadTimeout: 30_000});

    const message =
        await loader
            .loadResource('file:////127.0.0.1/share/source-map.js.map' as Platform.DevToolsPath.UrlString, initiator)
            .catch(e => e.message);

    assert.include(message, 'remote file');
  });

  it('blocks remote file paths with the default setting', async () => {
    const loader = SDK.PageResourceLoader.PageResourceLoader.instance(
        {forceNew: true, loadOverride: null, maxConcurrentLoads: 1, loadTimeout: 30_000});

    const message =
        await loader.loadResource('file://host/source-map.js.map' as Platform.DevToolsPath.UrlString, initiator)
            .catch(e => e.message);

    assert.include(message, 'remote file');
  });

  it('blocks UNC file paths with a backslash on Windows with the default setting', async () => {
    if (!Host.Platform.isWin()) {
      return;
    }

    const loader = SDK.PageResourceLoader.PageResourceLoader.instance(
        {forceNew: true, loadOverride: null, maxConcurrentLoads: 1, loadTimeout: 30_000});

    const message =
        await loader
            .loadResource('file:///\\127.0.0.1/share/source-map.js.map' as Platform.DevToolsPath.UrlString, initiator)
            .catch(e => e.message);

    assert.include(message, 'remote file');
  });

  it('allows remote file paths with the setting enabled', async () => {
    const loader = SDK.PageResourceLoader.PageResourceLoader.instance(
        {forceNew: true, loadOverride: null, maxConcurrentLoads: 1, loadTimeout: 30_000});
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'loadNetworkResource')
        .callsFake((_url, _headers, streamId, callback) => {
          Host.ResourceLoader.streamWrite(streamId, 'content of the source map');
          callback({statusCode: 200});
        });

    Common.Settings.Settings.instance().moduleSetting('network.enable-remote-file-loading').set(true);
    const response =
        await loader.loadResource('file://host/source-map.js.map' as Platform.DevToolsPath.UrlString, initiator);

    assert.strictEqual(response.content, 'content of the source map');
  });

  it('allows UNC paths on Windows with the setting enabled', async () => {
    if (!Host.Platform.isWin()) {
      return;
    }

    const loader = SDK.PageResourceLoader.PageResourceLoader.instance(
        {forceNew: true, loadOverride: null, maxConcurrentLoads: 1, loadTimeout: 30_000});
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'loadNetworkResource')
        .callsFake((_url, _headers, streamId, callback) => {
          Host.ResourceLoader.streamWrite(streamId, 'content of the source map');
          callback({statusCode: 200});
        });

    Common.Settings.Settings.instance().moduleSetting('network.enable-remote-file-loading').set(true);
    const response = await loader.loadResource(
        'file:////127.0.0.1/share/source-map.js.map' as Platform.DevToolsPath.UrlString, initiator);

    assert.strictEqual(response.content, 'content of the source map');
  });
});
