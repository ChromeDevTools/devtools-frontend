// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import type * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {addChildFrame, getMainFrame} from '../../testing/ResourceTreeHelpers.js';
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

    const script = new SDK.Script.Script(debuggerModel, '1' as Protocol.Runtime.ScriptId, scriptUrl, 0, 0, 0, 0, 0, '',
                                         false, sourceMapUrl, false, 0, null, null, null, null, null, null, null);

    sourceMapManager.attachSourceMap(script, sourceUrl, sourceMapUrl, SDK.SourceMap.SourceMapProvenance.CDP);

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

    const script = new SDK.Script.Script(debuggerModel, '1' as Protocol.Runtime.ScriptId, scriptUrl, 0, 0, 0, 0, 0, '',
                                         false, sourceMapUrl, false, 0, null, null, null, null, null, null, null);

    sourceMapManager.attachSourceMap(script, sourceUrl, sourceMapUrl, SDK.SourceMap.SourceMapProvenance.CDP);

    const sourceMap = await sourceMapManager.sourceMapForClientPromise(script);
    assert.deepEqual(sourceMap?.sourceURLs(), [urlString`/original-script.js`]);
  });

  class MockClient implements SDK.FrameAssociated.FrameAssociated {
    constructor(private target: SDK.Target.Target, private debugIdInternal: SDK.SourceMap.DebugId|null = null,
                private initiatorUrl: Platform.DevToolsPath.UrlString|null = null,
                private frameId: Protocol.Page.FrameId|null = null) {
    }

    createPageResourceLoadInitiator(): SDK.PageResourceLoader.PageResourceLoadInitiator {
      return {target: this.target, frameId: this.frameId, initiatorUrl: this.initiatorUrl};
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
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL, SDK.SourceMap.SourceMapProvenance.CDP);
      assert.throws(() => sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL,
                                                           SDK.SourceMap.SourceMapProvenance.CDP));
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
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL, SDK.SourceMap.SourceMapProvenance.CDP);
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
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL, SDK.SourceMap.SourceMapProvenance.CDP);
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
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL, SDK.SourceMap.SourceMapProvenance.CDP);
      sourceMapManager.detachSourceMap(client);
      sinon.assert.calledWith(sourceMapFailedToAttach, sinon.match.hasNested('data.client', client));
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL, SDK.SourceMap.SourceMapProvenance.CDP);
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
      sourceMapManager.attachSourceMap(client1, sourceURL, sourceMappingURL, SDK.SourceMap.SourceMapProvenance.CDP);
      sourceMapManager.attachSourceMap(client2, sourceURL, sourceMappingURL, SDK.SourceMap.SourceMapProvenance.CDP);
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
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL, SDK.SourceMap.SourceMapProvenance.CDP);
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
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL, SDK.SourceMap.SourceMapProvenance.CDP);
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
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL, SDK.SourceMap.SourceMapProvenance.CDP);
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
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL, SDK.SourceMap.SourceMapProvenance.CDP);
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
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL, SDK.SourceMap.SourceMapProvenance.CDP);
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
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL, SDK.SourceMap.SourceMapProvenance.CDP);
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
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL, SDK.SourceMap.SourceMapProvenance.CDP);
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
    const {SecurityOrigin} = SDK.SecurityOrigin;
    let sourceMapCache: SDK.SourceMapCache.SourceMapCache;

    beforeEach(async () => {
      sourceMapCache = SDK.SourceMapCache.SourceMapCache.create();
      await sourceMapCache.disposeForTest();
    });

    afterEach(async () => {
      await sourceMapCache.disposeForTest();
    });

    it('uses cached source map when debugId, scriptOrigin, and loaderOrigin match', async () => {
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
      const originUrl = urlString`https://example.com`;
      const origin = SecurityOrigin.create(originUrl);
      const target = universe.createTarget({url: originUrl});
      const mainFrame = getMainFrame(target, {
        url: urlString`https://example.com/index.html`,
        securityOrigin: originUrl,
      });
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const debugId = 'test-debug-id' as SDK.SourceMap.DebugId;
      const client = new MockClient(target, debugId, originUrl, mainFrame.id);

      const cachedMap: SDK.SourceMap.SourceMapV3 = {
        version: 3,
        sources: ['cached.ts'],
        mappings: '',
      };

      await sourceMapCache.set(debugId, origin, origin, cachedMap);

      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL, SDK.SourceMap.SourceMapProvenance.CDP);
      const sourceMap = await sourceMapManager.sourceMapForClientPromise(client);

      assert.isNotNull(sourceMap);
      assert.deepEqual(sourceMap?.sourceURLs(), [urlString`http://localhost/cached.ts`]);
      assert.strictEqual(loadResourceSpy.callCount, 0, 'loadResource should not have been called');
    });

    it('does NOT use cached source map when debugId matches but scriptOrigin does NOT match', async () => {
      const debugId = 'test-debug-id' as SDK.SourceMap.DebugId;
      const cachedOriginUrl = urlString`https://example.com`;
      const clientOriginUrl = urlString`https://malicious.com`;
      const cachedOrigin = SecurityOrigin.create(cachedOriginUrl);
      const clientOrigin = SecurityOrigin.create(clientOriginUrl);

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
      const target = universe.createTarget({url: cachedOriginUrl});
      const mainFrame = getMainFrame(target, {
        url: urlString`https://example.com/index.html`,
        securityOrigin: cachedOriginUrl,
      });
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target, debugId, clientOriginUrl, mainFrame.id);

      await sourceMapCache.set(debugId, cachedOrigin, cachedOrigin, cachedMap);

      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL, SDK.SourceMap.SourceMapProvenance.CDP);
      const sourceMap = await sourceMapManager.sourceMapForClientPromise(client);

      assert.isNotNull(sourceMap);
      assert.deepEqual(sourceMap?.sourceURLs(), [urlString`http://localhost/network.ts`]);
      assert.strictEqual(loadResourceSpy.callCount, 1, 'loadResource should have been called');

      const storedMap = await sourceMapCache.get(debugId, clientOrigin, cachedOrigin);
      assert.deepEqual(storedMap, networkMap);
    });

    it('does NOT use cached source map when debugId and scriptOrigin match but loaderOrigin does NOT match',
       async () => {
         const debugId = 'test-debug-id' as SDK.SourceMap.DebugId;
         const scriptUrl = urlString`https://victim.com/app.js`;

         const poisonedMap: SDK.SourceMap.SourceMapV3 = {
           version: 3,
           sources: ['forged.ts'],
           mappings: '',
           debugId,
         };

         const genuineMap: SDK.SourceMap.SourceMapV3 = {
           version: 3,
           sources: ['genuine.ts'],
           mappings: '',
           debugId,
         };

         let callCount = 0;
         const universe = new TestUniverse({
           pageResourceLoaderOptions: {
             loadOverride: async () => {
               callCount++;
               return {
                 success: true,
                 content: JSON.stringify(callCount === 1 ? poisonedMap : genuineMap),
                 errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
               };
             },
           },
         });

         const attackerTarget = universe.createTarget({
           id: 'attacker' as Protocol.Target.TargetID,
           url: 'https://attacker.com/index.html',
         });
         const attackerFrame = getMainFrame(attackerTarget, {
           url: urlString`https://attacker.com/index.html`,
           securityOrigin: 'https://attacker.com',
         });
         const attackerManager = new SDK.SourceMapManager.SourceMapManager(attackerTarget);
         const attackerClient = new MockClient(attackerTarget, debugId, scriptUrl, attackerFrame.id);
         attackerManager.attachSourceMap(attackerClient, sourceURL, sourceMappingURL,
                                         SDK.SourceMap.SourceMapProvenance.CDP);
         const attackerSourceMap = await attackerManager.sourceMapForClientPromise(attackerClient);
         assert.deepEqual(attackerSourceMap?.sourceURLs(), [urlString`http://localhost/forged.ts`]);
         assert.strictEqual(callCount, 1);

         const victimTarget = universe.createTarget({
           id: 'victim' as Protocol.Target.TargetID,
           url: 'https://victim.com/index.html',
         });
         const victimFrame = getMainFrame(victimTarget, {
           url: urlString`https://victim.com/index.html`,
           securityOrigin: 'https://victim.com',
         });
         const victimManager = new SDK.SourceMapManager.SourceMapManager(victimTarget);
         const victimClient = new MockClient(victimTarget, debugId, scriptUrl, victimFrame.id);
         victimManager.attachSourceMap(victimClient, sourceURL, sourceMappingURL,
                                       SDK.SourceMap.SourceMapProvenance.CDP);
         const victimSourceMap = await victimManager.sourceMapForClientPromise(victimClient);
         assert.deepEqual(victimSourceMap?.sourceURLs(), [urlString`http://localhost/genuine.ts`]);
         assert.strictEqual(callCount, 2,
                            'loadResource should be called for victim target despite matching scriptOrigin');

         assert.deepEqual(await sourceMapCache.get(debugId, SecurityOrigin.create('https://victim.com'),
                                                   SecurityOrigin.create('https://attacker.com')),
                          poisonedMap);
         assert.deepEqual(await sourceMapCache.get(debugId, SecurityOrigin.create('https://victim.com'),
                                                   SecurityOrigin.create('https://victim.com')),
                          genuineMap);
       });

    it('isolates cached source maps across different frames with different security origins', async () => {
      const debugId = 'test-debug-id' as SDK.SourceMap.DebugId;
      const scriptUrl = urlString`https://victim.com/app.js`;

      const poisonedMap: SDK.SourceMap.SourceMapV3 = {
        version: 3,
        sources: ['forged.ts'],
        mappings: '',
        debugId,
      };

      const genuineMap: SDK.SourceMap.SourceMapV3 = {
        version: 3,
        sources: ['genuine.ts'],
        mappings: '',
        debugId,
      };

      let callCount = 0;
      const universe = new TestUniverse({
        pageResourceLoaderOptions: {
          loadOverride: async () => {
            callCount++;
            return {
              success: true,
              content: JSON.stringify(callCount === 1 ? poisonedMap : genuineMap),
              errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
            };
          },
        },
      });

      const target = universe.createTarget({url: 'https://victim.com/index.html'});
      const mainFrame = getMainFrame(target, {
        url: urlString`https://victim.com/index.html`,
        securityOrigin: 'https://victim.com',
      });
      const childFrame = await addChildFrame(target, {
        url: urlString`https://attacker.com/iframe.html`,
        securityOrigin: 'https://attacker.com',
      });

      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);

      const childClient = new MockClient(target, debugId, scriptUrl, childFrame.id);
      sourceMapManager.attachSourceMap(childClient, sourceURL, sourceMappingURL, SDK.SourceMap.SourceMapProvenance.CDP);
      const childSourceMap = await sourceMapManager.sourceMapForClientPromise(childClient);
      assert.deepEqual(childSourceMap?.sourceURLs(), [urlString`http://localhost/forged.ts`]);
      assert.strictEqual(callCount, 1);

      const mainClient = new MockClient(target, debugId, scriptUrl, mainFrame.id);
      sourceMapManager.attachSourceMap(mainClient, sourceURL, sourceMappingURL, SDK.SourceMap.SourceMapProvenance.CDP);
      const mainSourceMap = await sourceMapManager.sourceMapForClientPromise(mainClient);
      assert.deepEqual(mainSourceMap?.sourceURLs(), [urlString`http://localhost/genuine.ts`]);
      assert.strictEqual(callCount, 2, 'main frame must not reuse cache entry from cross-origin child frame');
    });

    it('skips caching on a page target when frameId is missing, detached, or belongs to an opaque frame', async () => {
      const debugId = 'test-debug-id' as SDK.SourceMap.DebugId;
      const scriptUrl = urlString`https://victim.com/app.js`;
      const victimOrigin = SecurityOrigin.create('https://victim.com');
      const map: SDK.SourceMap.SourceMapV3 = {
        version: 3,
        sources: ['script.ts'],
        mappings: '',
        debugId,
      };

      let callCount = 0;
      const universe = new TestUniverse({
        pageResourceLoaderOptions: {
          loadOverride: async () => {
            callCount++;
            return {
              success: true,
              content: JSON.stringify(map),
              errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
            };
          },
        },
      });

      const target = universe.createTarget({url: 'https://victim.com/index.html'});
      getMainFrame(target, {
        url: urlString`https://victim.com/index.html`,
        securityOrigin: 'https://victim.com',
      });
      const opaqueFrame = await addChildFrame(target, {
        url: urlString`https://victim.com/sandboxed.html`,
        securityOrigin: 'null',
      });

      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);

      const missingFrameClient = new MockClient(target, debugId, scriptUrl, null);
      sourceMapManager.attachSourceMap(missingFrameClient, sourceURL, sourceMappingURL,
                                       SDK.SourceMap.SourceMapProvenance.CDP);
      await sourceMapManager.sourceMapForClientPromise(missingFrameClient);
      assert.strictEqual(callCount, 1);
      assert.isNull(await sourceMapCache.get(debugId, victimOrigin, victimOrigin));

      const detachedClient = new MockClient(target, debugId, scriptUrl, 'detached-frame' as Protocol.Page.FrameId);
      sourceMapManager.attachSourceMap(detachedClient, sourceURL, sourceMappingURL,
                                       SDK.SourceMap.SourceMapProvenance.CDP);
      await sourceMapManager.sourceMapForClientPromise(detachedClient);
      assert.strictEqual(callCount, 2);
      assert.isNull(await sourceMapCache.get(debugId, victimOrigin, victimOrigin));

      const opaqueClient = new MockClient(target, debugId, scriptUrl, opaqueFrame.id);
      sourceMapManager.attachSourceMap(opaqueClient, sourceURL, sourceMappingURL,
                                       SDK.SourceMap.SourceMapProvenance.CDP);
      await sourceMapManager.sourceMapForClientPromise(opaqueClient);
      assert.strictEqual(callCount, 3);
      assert.isNull(await sourceMapCache.get(debugId, victimOrigin, victimOrigin));
    });

    it('falls back to target URL for non-frame targets without ResourceTreeModel (e.g. workers)', async () => {
      const debugId = 'test-debug-id' as SDK.SourceMap.DebugId;
      const scriptUrl = urlString`https://victim.com/worker-chunk.js`;

      const poisonedMap: SDK.SourceMap.SourceMapV3 = {
        version: 3,
        sources: ['forged.ts'],
        mappings: '',
        debugId,
      };

      const genuineMap: SDK.SourceMap.SourceMapV3 = {
        version: 3,
        sources: ['genuine.ts'],
        mappings: '',
        debugId,
      };

      let callCount = 0;
      const universe = new TestUniverse({
        pageResourceLoaderOptions: {
          loadOverride: async () => {
            callCount++;
            return {
              success: true,
              content: JSON.stringify(callCount === 1 ? poisonedMap : genuineMap),
              errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
            };
          },
        },
      });

      const parentTarget = universe.createTarget();
      const attackerWorker = universe.createTarget({
        id: 'attacker-worker' as Protocol.Target.TargetID,
        type: SDK.Target.Type.Worker,
        parentTarget,
        url: 'https://attacker.com/worker.js',
      });
      const attackerManager = new SDK.SourceMapManager.SourceMapManager(attackerWorker);
      const attackerClient = new MockClient(attackerWorker, debugId, scriptUrl, null);
      attackerManager.attachSourceMap(attackerClient, sourceURL, sourceMappingURL,
                                      SDK.SourceMap.SourceMapProvenance.CDP);
      const attackerSourceMap = await attackerManager.sourceMapForClientPromise(attackerClient);
      assert.deepEqual(attackerSourceMap?.sourceURLs(), [urlString`http://localhost/forged.ts`]);
      assert.strictEqual(callCount, 1);

      const victimWorker = universe.createTarget({
        id: 'victim-worker' as Protocol.Target.TargetID,
        type: SDK.Target.Type.Worker,
        parentTarget,
        url: 'https://victim.com/worker.js',
      });
      const victimManager = new SDK.SourceMapManager.SourceMapManager(victimWorker);
      const victimClient = new MockClient(victimWorker, debugId, scriptUrl, null);
      victimManager.attachSourceMap(victimClient, sourceURL, sourceMappingURL, SDK.SourceMap.SourceMapProvenance.CDP);
      const victimSourceMap = await victimManager.sourceMapForClientPromise(victimClient);
      assert.deepEqual(victimSourceMap?.sourceURLs(), [urlString`http://localhost/genuine.ts`]);
      assert.strictEqual(callCount, 2, 'worker targets with different origins must not share a cache entry');
    });

    it('isolates cached source maps across different file:// URLs', async () => {
      const debugId = 'test-debug-id' as SDK.SourceMap.DebugId;
      const attackerFileUrl = urlString`file:///tmp/attacker/poison.js`;
      const victimFileUrl = urlString`file:///tmp/victim/dist/app.js`;
      const victimFrameUrl = urlString`file:///tmp/victim/index.html`;
      const attackerOrigin = SecurityOrigin.create(attackerFileUrl);
      const victimScriptOrigin = SecurityOrigin.create(victimFileUrl);
      const victimFrameOrigin = SecurityOrigin.create(victimFrameUrl);

      const poisonedMap: SDK.SourceMap.SourceMapV3 = {
        version: 3,
        sources: ['forged.ts'],
        mappings: '',
        debugId,
      };

      const genuineMap: SDK.SourceMap.SourceMapV3 = {
        version: 3,
        sources: ['genuine.ts'],
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
              content: JSON.stringify(genuineMap),
              errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
            };
          },
        },
      });
      const target = universe.createTarget({url: victimFrameUrl});
      const mainFrame = getMainFrame(target, {
        url: victimFrameUrl,
        securityOrigin: victimFrameUrl,
      });
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);

      await sourceMapCache.set(debugId, attackerOrigin, victimFrameOrigin, poisonedMap);

      const victimClient = new MockClient(target, debugId, victimFileUrl, mainFrame.id);
      sourceMapManager.attachSourceMap(victimClient, sourceURL, sourceMappingURL,
                                       SDK.SourceMap.SourceMapProvenance.CDP);
      const victimSourceMap = await sourceMapManager.sourceMapForClientPromise(victimClient);

      assert.isNotNull(victimSourceMap);
      assert.deepEqual(victimSourceMap?.sourceURLs(), [urlString`http://localhost/genuine.ts`]);
      assert.strictEqual(loadResourceSpy.callCount, 1,
                         'loadResource should have been called for a different file:// path');

      const storedVictimMap = await sourceMapCache.get(debugId, victimScriptOrigin, victimFrameOrigin);
      assert.deepEqual(storedVictimMap, genuineMap);

      // Same file:// script and frame path should hit the cache without re-fetching.
      const sameVictimClient = new MockClient(target, debugId, victimFileUrl, mainFrame.id);
      sourceMapManager.attachSourceMap(sameVictimClient, sourceURL, sourceMappingURL,
                                       SDK.SourceMap.SourceMapProvenance.CDP);
      const cachedVictimSourceMap = await sourceMapManager.sourceMapForClientPromise(sameVictimClient);
      assert.isNotNull(cachedVictimSourceMap);
      assert.deepEqual(cachedVictimSourceMap?.sourceURLs(), [urlString`http://localhost/genuine.ts`]);
      assert.strictEqual(loadResourceSpy.callCount, 1,
                         'loadResource should not be called again for the same file:// path');
    });

    it('skips caching for scripts with no initiator URL or opaque initiator URLs', async () => {
      const debugId = 'test-debug-id' as SDK.SourceMap.DebugId;
      const map1: SDK.SourceMap.SourceMapV3 = {
        version: 3,
        sources: ['eval1.ts'],
        mappings: '',
        debugId,
      };
      const map2: SDK.SourceMap.SourceMapV3 = {
        version: 3,
        sources: ['eval2.ts'],
        mappings: '',
        debugId,
      };

      let callCount = 0;
      const universe = new TestUniverse({
        pageResourceLoaderOptions: {
          loadOverride: async () => {
            callCount++;
            return {
              success: true,
              content: JSON.stringify(callCount === 1 ? map1 : map2),
              errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
            };
          },
        },
      });
      const target = universe.createTarget();
      const mainFrame = getMainFrame(target, {
        url: urlString`https://example.com/index.html`,
        securityOrigin: 'https://example.com',
      });
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);

      const anonymousClient1 = new MockClient(target, debugId, null, mainFrame.id);
      sourceMapManager.attachSourceMap(anonymousClient1, sourceURL, sourceMappingURL,
                                       SDK.SourceMap.SourceMapProvenance.CDP);
      const sourceMap1 = await sourceMapManager.sourceMapForClientPromise(anonymousClient1);
      assert.deepEqual(sourceMap1?.sourceURLs(), [urlString`http://localhost/eval1.ts`]);

      const anonymousClient2 = new MockClient(target, debugId, Platform.DevToolsPath.EmptyUrlString, mainFrame.id);
      sourceMapManager.attachSourceMap(anonymousClient2, sourceURL, sourceMappingURL,
                                       SDK.SourceMap.SourceMapProvenance.CDP);
      const sourceMap2 = await sourceMapManager.sourceMapForClientPromise(anonymousClient2);
      assert.deepEqual(sourceMap2?.sourceURLs(), [urlString`http://localhost/eval2.ts`]);
      assert.strictEqual(callCount, 2, 'anonymous scripts must not share a cache entry');
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

      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL, SDK.SourceMap.SourceMapProvenance.CDP);

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
