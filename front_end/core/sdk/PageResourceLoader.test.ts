// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import {
  createTarget,
} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {mockResourceTree} from '../../testing/ResourceTreeHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {createSettingsForTest, setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';

import * as SDK from './sdk.js';

const {urlString} = Platform.DevToolsPath;

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

/** Creates a PageResourceLoader, TargetManager and Settings instance without installing them as globals */
function setup({loadOverride, maxConcurrentLoads}: {
  loadOverride?: ((arg0: string) => Promise<{
                    success: boolean,
                    content: string,
                    errorDescription: Host.ResourceLoader.LoadErrorDescription,
                  }>),
  maxConcurrentLoads?: number,
} = {}) {
  const targetManager = new SDK.TargetManager.TargetManager(new Root.DevToolsContext.DevToolsContext());
  const settings = createSettingsForTest();
  const loader =
      new SDK.PageResourceLoader.PageResourceLoader(targetManager, settings, loadOverride ?? null, maxConcurrentLoads);
  return {loader, settings, targetManager};
}

describe('PageResourceLoader', () => {
  const foo1Url = urlString`foo1`;
  const foo2Url = urlString`foo2`;
  const foo3Url = urlString`foo3`;
  const loads: Array<{url: string, resolve?: {(_: LoadResult|PromiseLike<LoadResult>): void}}> = [];
  const load = async (url: string) => {
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

  setupLocaleHooks();

  it('registers extension loads', async () => {
    const {loader} = setup({loadOverride: load});
    const initiator: SDK.PageResourceLoader.ExtensionInitiator = {
      extensionId: '123',
      initiatorUrl: urlString`www.test.com/main.wasm.dwp`,
      target: null,
      frameId: null,
    };
    const extensionResource: SDK.PageResourceLoader.PageResource = {
      url: urlString`main.wasm.dwp`,
      success: true,
      initiator,
      size: null,
      duration: null,
    };

    loader.resourceLoadedThroughExtension(extensionResource);
    assert.deepEqual(loader.getScopedNumberOfResources(), {loading: 0, resources: 1});
    assert.deepEqual(loader.getNumberOfResources(), {loading: 0, queued: 0, resources: 1});

    const resources = Array.from(loader.getResourcesLoaded().values());

    assert.lengthOf(resources, 1);
    assert.isTrue(resources[0].success);
    assert.deepEqual(resources[0].initiator, initiator);
  });

  it('loads resources correctly', async () => {
    const {loader} = setup({loadOverride: load});
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
    const {loader} = setup({loadOverride: load, maxConcurrentLoads: 1});
    const loading = [
      loader.loadResource(foo1Url, initiator).catch(e => e.message),
      loader.loadResource(foo2Url, initiator).catch(e => e.message),
      loader.loadResource(foo3Url, initiator).catch(e => e.message),
    ];
    assert.deepEqual(loader.getNumberOfResources(), {loading: 3, queued: 2, resources: 3});

    loader.onPrimaryPageChanged({
      data: {
        frame: {
          isOutermostFrame() {
            return true;
          },
          resourceTreeModel() {
            return {
              target() {
                return null;
              },
            };
          },
        } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame,
        type: SDK.ResourceTreeModel.PrimaryPageChangeType.NAVIGATION,
      },
    });
    assert.deepEqual(loader.getNumberOfResources(), {loading: 3, queued: 0, resources: 0});

    const results = await Promise.all(loading);
    assert.deepEqual(loads.map(x => x.url), ['foo1']);
    assert.deepEqual(results[0].content, 'foo1 - content');
    assert.deepEqual(results[1], 'Load canceled due to reload of inspected page');
    assert.deepEqual(results[2], 'Load canceled due to reload of inspected page');
  });

  it('respects the max concurrent loads', async () => {
    const {loader} = setup({loadOverride: load, maxConcurrentLoads: 2});
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
describe('PageResourceLoader', () => {
  setupSettingsHooks();

  it('blocks UNC file paths with the default setting', async () => {
    if (!Host.Platform.isWin()) {
      return;
    }

    const {loader} = setup({maxConcurrentLoads: 1});

    const message = await loader.loadResource(urlString`file:////127.0.0.1/share/source-map.js.map`, initiator)
                        .catch(e => e.message);

    assert.include(message, 'remote file');
  });

  it('blocks remote file paths with the default setting', async () => {
    const {loader} = setup({maxConcurrentLoads: 1});

    const message =
        await loader.loadResource(urlString`file://host/source-map.js.map`, initiator).catch(e => e.message);

    assert.include(message, 'remote file');
  });

  it('blocks UNC file paths with a backslash on Windows with the default setting', async () => {
    if (!Host.Platform.isWin()) {
      return;
    }

    const {loader} = setup({maxConcurrentLoads: 1});

    const message = await loader.loadResource(urlString`file:///\\127.0.0.1/share/source-map.js.map`, initiator)
                        .catch(e => e.message);

    assert.include(message, 'remote file');
  });

  it('allows remote file paths with the setting enabled', async () => {
    const {loader} = setup({maxConcurrentLoads: 1});
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'loadNetworkResource')
        .callsFake((_url, _headers, streamId, callback) => {
          Host.ResourceLoader.streamWrite(streamId, 'content of the source map');
          callback({statusCode: 200});
        });

    // TODO(crbug.com/458180550): Use 'settings' once NetworkManager no longer uses global settings instance.
    Common.Settings.Settings.instance().moduleSetting('network.enable-remote-file-loading').set(true);
    const response = await loader.loadResource(urlString`file://host/source-map.js.map`, initiator);

    assert.strictEqual(response.content, 'content of the source map');
  });

  it('allows UNC paths on Windows with the setting enabled', async () => {
    if (!Host.Platform.isWin()) {
      return;
    }

    const {loader} = setup({maxConcurrentLoads: 1});
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'loadNetworkResource')
        .callsFake((_url, _headers, streamId, callback) => {
          Host.ResourceLoader.streamWrite(streamId, 'content of the source map');
          callback({statusCode: 200});
        });

    // TODO(crbug.com/458180550): Use 'settings' once NetworkManager no longer uses global settings instance.
    Common.Settings.Settings.instance().moduleSetting('network.enable-remote-file-loading').set(true);
    const response = await loader.loadResource(urlString`file:////127.0.0.1/share/source-map.js.map`, initiator);

    assert.strictEqual(response.content, 'content of the source map');
  });
});

describe('PageResourceLoader', () => {
  setupRuntimeHooks();

  describe('loadResource', () => {
    const stream = 'STREAM_ID' as Protocol.IO.StreamHandle;
    const initiatorUrl = urlString`htp://example.com`;
    const url = urlString`${`${initiatorUrl}/test.txt`}`;

    function setupLoadingSourceMapsAsNetworkResource(connection: MockCDPConnection):
        Promise<Protocol.Network.LoadNetworkResourceRequest> {
      return new Promise(resolve => {
        let contentToRead: string|null = 'foo';
        connection.setHandler('IO.read', () => {
          const data = contentToRead;
          contentToRead = null;
          return {result: {data} as Protocol.IO.ReadResponse};
        });
        connection.setHandler('IO.close', () => ({result: {}}));
        connection.setHandler('Network.loadNetworkResource', request => {
          resolve(request);
          return {result: {resource: {success: true, stream, statusCode: 200}}};
        });
      });
    }

    for (const disableCache of [true, false]) {
      it(`loads with ${disableCache ? 'disabled' : 'enabled'} cache based on the setting`, async () => {
        const {loader, settings, targetManager} = setup();
        settings.moduleSetting('cache-disabled').set(disableCache);
        const connection = new MockCDPConnection();
        const target = createTarget({connection, targetManager});
        const initiator = {target, frameId: null, initiatorUrl};
        const [{options}, {content}] = await Promise.all([
          setupLoadingSourceMapsAsNetworkResource(connection),
          loader.loadResource(url, initiator),
        ]);
        // Check that we loaded the resources with appropriately enabled caching.
        assert.strictEqual(options.disableCache, disableCache);
        // Sanity check on the content.
        assert.deepEqual(content, 'foo');
      });
    }
  });
});

describe('PageResourceLoader', () => {
  const initiatorUrl = urlString`htp://example.com`;
  const foo1Url = urlString`foo1`;
  const foo2Url = urlString`foo2`;
  const foo3Url = urlString`foo3`;

  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  it('handles scoped resources', async () => {
    const load = async () => {
      await new Promise(() => {});
      return {
        success: true,
        content: 'content',
        errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
      };
    };
    const {targetManager, loader} = setup({loadOverride: load});
    const connection = new MockCDPConnection();
    mockResourceTree(connection);
    const target = createTarget({id: 'main' as Protocol.Target.TargetID, connection, targetManager});
    const prerenderTarget = createTarget({id: 'prerender' as Protocol.Target.TargetID, connection, targetManager});
    const initiator = {target, frameId: null, initiatorUrl};
    const prerenderInitiator = {target: prerenderTarget, frameId: null, initiatorUrl};

    void loader.loadResource(foo1Url, initiator);
    void loader.loadResource(foo2Url, initiator);
    void loader.loadResource(foo3Url, prerenderInitiator);

    assert.deepEqual(loader.getNumberOfResources(), {loading: 3, queued: 0, resources: 3});
    assert.deepEqual(loader.getScopedNumberOfResources(), {loading: 2, resources: 2});

    let resources = loader.getScopedResourcesLoaded();
    let resourceUrls = [...resources.values()].map(x => x.url);
    assert.deepEqual(resourceUrls, [foo1Url, foo2Url]);

    targetManager.setScopeTarget(prerenderTarget);
    assert.deepEqual(loader.getScopedNumberOfResources(), {loading: 1, resources: 1});

    resources = loader.getScopedResourcesLoaded();
    resourceUrls = [...resources.values()].map(x => x.url);
    assert.deepEqual(resourceUrls, [foo3Url]);
  });

  it('handles prerender activation', async () => {
    const load = async (url: string) => {
      return {
        success: true,
        content: `${url} - content`,
        errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
      };
    };
    const {targetManager, loader} = setup({loadOverride: load});
    const connection = new MockCDPConnection();
    mockResourceTree(connection);
    const target = createTarget({id: 'main' as Protocol.Target.TargetID, connection, targetManager});
    const prerenderTarget = createTarget({id: 'prerender' as Protocol.Target.TargetID, connection, targetManager});
    const initiator = {target, frameId: null, initiatorUrl};
    const prerenderInitiator = {target: prerenderTarget, frameId: null, initiatorUrl};

    await Promise.all([
      loader.loadResource(foo1Url, initiator),
      loader.loadResource(foo2Url, initiator),
      loader.loadResource(foo3Url, prerenderInitiator),
    ]);

    assert.deepEqual(loader.getNumberOfResources(), {loading: 0, queued: 0, resources: 3});
    assert.deepEqual(loader.getScopedNumberOfResources(), {loading: 0, resources: 2});

    let resources = loader.getScopedResourcesLoaded();
    let resourceUrls = [...resources.values()].map(x => x.url);
    assert.deepEqual(resourceUrls, [foo1Url, foo2Url]);

    loader.onPrimaryPageChanged({
      data: {
        frame: {
          isOutermostFrame() {
            return true;
          },
          resourceTreeModel() {
            return {
              target() {
                return prerenderTarget;
              },
            };
          },
        } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame,
        type: SDK.ResourceTreeModel.PrimaryPageChangeType.ACTIVATION,
      },
    });
    assert.deepEqual(loader.getNumberOfResources(), {loading: 0, queued: 0, resources: 1});

    targetManager.setScopeTarget(prerenderTarget);
    assert.deepEqual(loader.getScopedNumberOfResources(), {loading: 0, resources: 1});

    resources = loader.getScopedResourcesLoaded();
    resourceUrls = [...resources.values()].map(x => x.url);
    assert.deepEqual(resourceUrls, [foo3Url]);
  });
});
