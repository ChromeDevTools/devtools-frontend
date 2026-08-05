// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import type * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

const {urlString} = Platform.DevToolsPath;
const content = JSON.stringify({
  version: 3,
  file: '/script.js',
  mappings: '',
  sources: [
    '/original-script.js',
  ],
});

describe('SourceMapManager', () => {
  const sourceURL = urlString`http://localhost/foo.js`;
  const sourceMappingURL = `${sourceURL}.map`;

  setupRuntimeHooks();
  setupLocaleHooks();

  function createUniverse(sourceMapContent: string = content) {
    return new TestUniverse({
      pageResourceLoaderOptions: {
        loadOverride: async () => ({
          success: true,
          content: sourceMapContent,
          errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
        }),
      },
    });
  }

  it('uses url for a worker\'s source maps from frame', async () => {
    const universe = createUniverse();
    const frameUrl = urlString`https://frame-host/index.html`;
    const scriptUrl = urlString`https://script-host/script.js`;
    const sourceUrl = urlString`script.js`;
    const sourceMapUrl = urlString`script.js.map`;

    const mainTarget =
        universe.createTarget({id: 'main' as Protocol.Target.TargetID, name: 'main', type: SDK.Target.Type.FRAME});
    mainTarget.setInspectedURL(frameUrl);

    const workerTarget = universe.createTarget({
      id: 'worker' as Protocol.Target.TargetID,
      name: 'worker',
      type: SDK.Target.Type.Worker,
      parentTarget: mainTarget,
    });

    const debuggerModel = workerTarget.model(SDK.DebuggerModel.DebuggerModel);
    assert.isNotNull(debuggerModel);
    const sourceMapManager = debuggerModel.sourceMapManager();

    const script = new SDK.Script.Script(
        debuggerModel, '1' as Protocol.Runtime.ScriptId, scriptUrl, 0, 0, 0, 0, 0, '', false, false, sourceMapUrl,
        false, 0, null, null, null, null, null, null, null);

    sourceMapManager.attachSourceMap(script, sourceUrl, sourceMapUrl);

    const sourceMap = await sourceMapManager.sourceMapForClientPromise(script);
    // Check that the URLs are resolved relative to the frame.
    assert.strictEqual(sourceMap?.url(), urlString`https://frame-host/script.js.map`);
    assert.deepEqual(sourceMap?.sourceURLs(), [urlString`https://frame-host/original-script.js`]);
  });

  it('can handle source maps in a data URL frame', async () => {
    const universe = createUniverse();
    const sourceUrl = urlString`script.js`;
    const sourceMapUrl = urlString`${`data:test/html;base64,${btoa(content)}`}`;
    const frameSource =
        '<script>0\n//# sourceURL=' + sourceUrl + '\n//# sourceMappingURL=' + sourceMapUrl + '</script>';
    const frameUrl = urlString`${`data:test/html;base64,${btoa(frameSource)}`}`;
    const scriptUrl = urlString`https://script-host/script.js`;

    const mainTarget =
        universe.createTarget({id: 'main' as Protocol.Target.TargetID, name: 'main', type: SDK.Target.Type.FRAME});
    mainTarget.setInspectedURL(frameUrl);

    const debuggerModel = mainTarget.model(SDK.DebuggerModel.DebuggerModel);
    assert.isNotNull(debuggerModel);
    const sourceMapManager = debuggerModel.sourceMapManager();

    const script = new SDK.Script.Script(
        debuggerModel, '1' as Protocol.Runtime.ScriptId, scriptUrl, 0, 0, 0, 0, 0, '', false, false, sourceMapUrl,
        false, 0, null, null, null, null, null, null, null);

    sourceMapManager.attachSourceMap(script, sourceUrl, sourceMapUrl);

    const sourceMap = await sourceMapManager.sourceMapForClientPromise(script);
    assert.deepEqual(sourceMap?.sourceURLs(), [urlString`/original-script.js`]);
  });

  class MockClient implements SDK.FrameAssociated.FrameAssociated {
    constructor(
        private target: SDK.Target.Target, private debugIdInternal: SDK.SourceMap.DebugId|null = null,
        private initiatorUrl: Platform.DevToolsPath.UrlString|null = null) {
    }

    createPageResourceLoadInitiator(): SDK.PageResourceLoader.PageResourceLoadInitiator {
      return {target: this.target, frameId: null, initiatorUrl: this.initiatorUrl};
    }

    debugId(): SDK.SourceMap.DebugId|null {
      return this.debugIdInternal;
    }
  }

  describe('attachSourceMap', () => {
    it('catches attempts to attach twice for the same client', async () => {
      const universe = createUniverse();
      const target = universe.createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      assert.throws(() => sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL));
      await sourceMapManager.sourceMapForClientPromise(client);
    });

    it('triggers the correct lifecycle events when loading succeeds', async () => {
      const universe = createUniverse();
      const target = universe.createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      const sourceMapWillAttach = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapWillAttach, sourceMapWillAttach);
      const sourceMapAttached = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapAttached, sourceMapAttached);
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      assert.strictEqual(sourceMapWillAttach.callCount, 1, 'SourceMapWillAttach events');
      sinon.assert.calledWith(sourceMapWillAttach, sinon.match.hasNested('data.client', client));
      const sourceMap = await sourceMapManager.sourceMapForClientPromise(client);
      assert.strictEqual(sourceMapAttached.callCount, 1, 'SourceMapAttached events');
      sinon.assert.calledWith(sourceMapAttached, sinon.match.hasNested('data.client', client));
      sinon.assert.calledWith(sourceMapAttached, sinon.match.hasNested('data.sourceMap', sourceMap));
      assert.isTrue(sourceMapAttached.calledAfter(sourceMapWillAttach));
    });

    it('triggers the correct lifecycle events when loading fails', async () => {
      const universe = new TestUniverse({
        pageResourceLoaderOptions: {
          loadOverride: async () => ({
            success: false,
            content: '',
            errorDescription: {message: 'Error', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
          }),
        },
      });
      const target = universe.createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      const sourceMapWillAttach = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapWillAttach, sourceMapWillAttach);
      const sourceMapFailedToAttach = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapFailedToAttach, sourceMapFailedToAttach);
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      assert.strictEqual(sourceMapWillAttach.callCount, 1, 'SourceMapWillAttach events');
      sinon.assert.calledWith(sourceMapWillAttach, sinon.match.hasNested('data.client', client));
      await sourceMapManager.sourceMapForClientPromise(client);
      assert.strictEqual(sourceMapFailedToAttach.callCount, 1, 'SourceMapFailedToAttach events');
      sinon.assert.calledWith(sourceMapFailedToAttach, sinon.match.hasNested('data.client', client));
      assert.isTrue(sourceMapFailedToAttach.calledAfter(sourceMapWillAttach));
    });

    it('correctly handles the case where sourcemap reattaches immediately', async () => {
      const universe = createUniverse();
      const target = universe.createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      const sourceMapAttached = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapAttached, sourceMapAttached);
      const sourceMapFailedToAttach = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapFailedToAttach, sourceMapFailedToAttach);
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      sourceMapManager.detachSourceMap(client);
      sinon.assert.calledWith(sourceMapFailedToAttach, sinon.match.hasNested('data.client', client));
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      await sourceMapManager.sourceMapForClientPromise(client);
      assert.strictEqual(sourceMapAttached.callCount, 1, 'SourceMapAttached events');
      sinon.assert.calledWith(sourceMapAttached, sinon.match.hasNested('data.client', client));
      assert.isTrue(sourceMapAttached.calledAfter(sourceMapFailedToAttach));
    });

    it('correctly handles separate clients with same sourceURL and sourceMappingURL', async () => {
      const universe = createUniverse();
      const target = universe.createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client1 = new MockClient(target);
      const client2 = new MockClient(target);
      sourceMapManager.attachSourceMap(client1, sourceURL, sourceMappingURL);
      sourceMapManager.attachSourceMap(client2, sourceURL, sourceMappingURL);
      const [sourceMap1, sourceMap2] = await Promise.all([
        sourceMapManager.sourceMapForClientPromise(client1),
        sourceMapManager.sourceMapForClientPromise(client2),
      ]);
      assert.notStrictEqual(sourceMap1, sourceMap2);
    });

    it('defers loading sourcemaps while disabled', async () => {
      const loadResourceSpy = sinon.spy();
      const universe = new TestUniverse({
        pageResourceLoaderOptions: {
          loadOverride: async url => {
            loadResourceSpy(url);
            return {
              success: true,
              content: '',
              errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
            };
          },
        },
      });
      const target = universe.createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      sourceMapManager.setEnabled(false);
      const client = new MockClient(target);
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      assert.strictEqual(loadResourceSpy.callCount, 0, 'loadResource calls');
      assert.isUndefined(sourceMapManager.sourceMapForClient(client));
      assert.isUndefined(await sourceMapManager.sourceMapForClientPromise(client));
      sourceMapManager.setEnabled(true);
      await sourceMapManager.sourceMapForClientPromise(client);
      assert.strictEqual(loadResourceSpy.callCount, 1, 'loadResource calls');
    });

    it('does not attempt to load when attach is cancelled', async () => {
      const loadResourceSpy = sinon.spy();
      const universe = new TestUniverse({
        pageResourceLoaderOptions: {
          loadOverride: async url => {
            loadResourceSpy(url);
            return {
              success: true,
              content: '',
              errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
            };
          },
        },
      });
      const target = universe.createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapWillAttach,
          ({data: {client}}) => sourceMapManager.cancelAttachSourceMap(client));
      const sourceMapFailedToAttach = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapFailedToAttach, sourceMapFailedToAttach);
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      assert.strictEqual(loadResourceSpy.callCount, 0, 'loadResource calls');
      await sourceMapManager.sourceMapForClientPromise(client);
      assert.strictEqual(sourceMapFailedToAttach.callCount, 1, 'SourceMapFailedToAttach events');
      sinon.assert.calledWith(sourceMapFailedToAttach, sinon.match.hasNested('data.client', client));
    });
  });

  describe('detachSourceMap', () => {
    it('silently ignores unknown clients', () => {
      const universe = new TestUniverse();
      const target = universe.createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      sourceMapManager.detachSourceMap(client);
    });

    it('triggers the correct lifecycle events', async () => {
      const universe = createUniverse();
      const target = universe.createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      const sourceMapDetached = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapDetached, sourceMapDetached);
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      const sourceMap = await sourceMapManager.sourceMapForClientPromise(client);
      sourceMapManager.detachSourceMap(client);
      assert.strictEqual(sourceMapDetached.callCount, 1, 'SourceMapDetached events');
      sinon.assert.calledWith(sourceMapDetached, sinon.match.hasNested('data.client', client));
      sinon.assert.calledWith(sourceMapDetached, sinon.match.hasNested('data.sourceMap', sourceMap));
    });

    it('triggers the correct lifecycle events when disabled', async () => {
      const universe = new TestUniverse();
      const target = universe.createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      sourceMapManager.setEnabled(false);
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      const sourceMapFailedToAttach = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapFailedToAttach, sourceMapFailedToAttach);
      const sourceMapDetached = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapDetached, sourceMapDetached);

      sourceMapManager.detachSourceMap(client);

      assert.strictEqual(sourceMapFailedToAttach.callCount, 0, 'SourceMapFailedToAttach events');
      assert.strictEqual(sourceMapDetached.callCount, 0, 'SourceMapDetached events');
    });
  });

  describe('setEnabled', () => {
    it('triggers the correct lifecycle events when disabling while attaching', async () => {
      let resolveLoad: () => void = () => {};
      const universe = new TestUniverse({
        pageResourceLoaderOptions: {
          loadOverride: () => new Promise(resolve => {
            resolveLoad = () => resolve({
              success: false,
              content: '',
              errorDescription: {message: 'Cancelled', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
            });
          }),
        },
      });
      const target = universe.createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      await Promise.resolve();
      const sourceMapFailedToAttach = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapFailedToAttach, sourceMapFailedToAttach);

      sourceMapManager.setEnabled(false);

      assert.strictEqual(sourceMapFailedToAttach.callCount, 1, 'SourceMapFailedToAttach events');
      sinon.assert.calledWith(sourceMapFailedToAttach, sinon.match.hasNested('data.client', client));
      resolveLoad();
      await Promise.resolve();
    });

    it('triggers the correct lifecycle events when disabling once attached', async () => {
      const universe = createUniverse();
      const target = universe.createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      const sourceMap = await sourceMapManager.sourceMapForClientPromise(client);
      const sourceMapDetached = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapDetached, sourceMapDetached);

      sourceMapManager.setEnabled(false);

      assert.strictEqual(sourceMapDetached.callCount, 1, 'SourceMapDetached events');
      sinon.assert.calledWith(sourceMapDetached, sinon.match.hasNested('data.client', client));
      sinon.assert.calledWith(sourceMapDetached, sinon.match.hasNested('data.sourceMap', sourceMap));
    });

    it('triggers the correct lifecycle events when re-enabling', async () => {
      const universe = createUniverse();
      const target = universe.createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      await sourceMapManager.sourceMapForClientPromise(client);
      sourceMapManager.setEnabled(false);
      const sourceMapDetached = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapDetached, sourceMapDetached);
      const sourceMapWillAttach = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapWillAttach, sourceMapWillAttach);
      const sourceMapFailedToAttach = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapFailedToAttach, sourceMapFailedToAttach);
      const sourceMapAttached = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapAttached, sourceMapAttached);

      sourceMapManager.setEnabled(true);

      const sourceMap = await sourceMapManager.sourceMapForClientPromise(client);
      assert.strictEqual(sourceMapDetached.callCount, 0, 'SourceMapDetached events');
      assert.strictEqual(sourceMapFailedToAttach.callCount, 0, 'SourceMapFailedToAttach events');
      assert.strictEqual(sourceMapWillAttach.callCount, 1, 'SourceMapWillAttach events');
      sinon.assert.calledWith(sourceMapWillAttach, sinon.match.hasNested('data.client', client));
      assert.isTrue(sourceMapAttached.calledAfter(sourceMapWillAttach));
      assert.strictEqual(sourceMapAttached.callCount, 1, 'SourceMapAttached events');
      sinon.assert.calledWith(sourceMapAttached, sinon.match.hasNested('data.client', client));
      sinon.assert.calledWith(sourceMapAttached, sinon.match.hasNested('data.sourceMap', sourceMap));
    });
  });

  describe('SourceMapCache integration', () => {
    let sourceMapCache: SDK.SourceMapCache.SourceMapCache;

    beforeEach(async () => {
      sourceMapCache = SDK.SourceMapCache.SourceMapCache.create();
      await sourceMapCache.disposeForTest();
    });

    afterEach(async () => {
      await sourceMapCache.disposeForTest();
    });

    it('uses cached source map when debugId matches and origin matches', async () => {
      const loadResourceSpy = sinon.spy();
      const universe = new TestUniverse({
        pageResourceLoaderOptions: {
          loadOverride: async url => {
            loadResourceSpy(url);
            return {
              success: true,
              content: '',
              errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
            };
          },
        },
      });
      const target = universe.createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const debugId = 'test-debug-id' as SDK.SourceMap.DebugId;
      const origin = urlString`https://example.com`;
      const client = new MockClient(target, debugId, origin);

      const cachedMap: SDK.SourceMap.SourceMapV3 = {
        version: 3,
        sources: ['cached.ts'],
        mappings: '',
      };

      await sourceMapCache.set(debugId, origin, cachedMap);

      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      const sourceMap = await sourceMapManager.sourceMapForClientPromise(client);

      assert.isNotNull(sourceMap);
      assert.deepEqual(sourceMap?.sourceURLs(), [urlString`http://localhost/cached.ts`]);
      assert.strictEqual(loadResourceSpy.callCount, 0, 'loadResource should not have been called');
    });

    it('does NOT use cached source map when debugId matches but origin does NOT match', async () => {
      const debugId = 'test-debug-id' as SDK.SourceMap.DebugId;
      const cachedOrigin = urlString`https://example.com`;
      const clientOrigin = urlString`https://malicious.com`;

      const cachedMap: SDK.SourceMap.SourceMapV3 = {
        version: 3,
        sources: ['cached.ts'],
        mappings: '',
      };

      const networkMap: SDK.SourceMap.SourceMapV3 = {
        version: 3,
        sources: ['network.ts'],
        mappings: '',
        debugId,
      };

      const loadResourceSpy = sinon.spy();
      const universe = new TestUniverse({
        pageResourceLoaderOptions: {
          loadOverride: async url => {
            loadResourceSpy(url);
            return {
              success: true,
              content: JSON.stringify(networkMap),
              errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
            };
          },
        },
      });
      const target = universe.createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target, debugId, clientOrigin);

      await sourceMapCache.set(debugId, cachedOrigin, cachedMap);

      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      const sourceMap = await sourceMapManager.sourceMapForClientPromise(client);

      assert.isNotNull(sourceMap);
      assert.deepEqual(sourceMap?.sourceURLs(), [urlString`http://localhost/network.ts`]);
      assert.strictEqual(loadResourceSpy.callCount, 1, 'loadResource should have been called');

      const storedMap = await sourceMapCache.get(debugId, clientOrigin);
      assert.deepEqual(storedMap, networkMap);
    });
  });

  describe('lazy loading source maps', () => {
    it('defers loading until sourceMapForClientPromise is called when lazyLoading is enabled', async () => {
      const loadResourceSpy = sinon.spy();
      const universe = new TestUniverse({
        pageResourceLoaderOptions: {
          loadOverride: async url => {
            loadResourceSpy(url);
            return {
              success: true,
              content,
              errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
            };
          },
        },
      });
      universe.settings.resolve(SDK.SourceMapManager.lazyLoadingSettingDescriptor).set(true);
      const target = universe.createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);

      const sourceMapWillAttach = sinon.spy();
      const sourceMapAttached = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapWillAttach, sourceMapWillAttach);
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapAttached, sourceMapAttached);

      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);

      assert.strictEqual(sourceMapWillAttach.callCount, 0, 'SourceMapWillAttach should not fire on attach');
      assert.strictEqual(sourceMapAttached.callCount, 0, 'SourceMapAttached should not fire on attach');
      assert.strictEqual(loadResourceSpy.callCount, 0, 'loadResource should not be called on attach');
      assert.isUndefined(sourceMapManager.sourceMapForClient(client), 'sourceMapForClient should be undefined');

      const promise1 = sourceMapManager.sourceMapForClientPromise(client);
      const promise2 = sourceMapManager.sourceMapForClientPromise(client);
      assert.strictEqual(promise1, promise2, 'repeated calls should return the same promise');
      assert.strictEqual(sourceMapWillAttach.callCount, 1, 'SourceMapWillAttach should fire once');

      const sourceMap = await promise1;
      assert.isNotNull(sourceMap);
      assert.strictEqual(sourceMapAttached.callCount, 1, 'SourceMapAttached should fire once');
      assert.strictEqual(loadResourceSpy.callCount, 1, 'loadResource should be called once');
      assert.strictEqual(sourceMapManager.sourceMapForClient(client), sourceMap,
                         'sourceMapForClient should return loaded map');
    });

    it('reads lazyLoadingSetting dynamically via isLazyLoadEnabled', () => {
      const universe = new TestUniverse();
      const target = universe.createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);

      assert.isFalse(sourceMapManager.isLazyLoadEnabled());

      universe.settings.resolve(SDK.SourceMapManager.lazyLoadingSettingDescriptor).set(true);
      assert.isTrue(sourceMapManager.isLazyLoadEnabled());
    });
  });
});
