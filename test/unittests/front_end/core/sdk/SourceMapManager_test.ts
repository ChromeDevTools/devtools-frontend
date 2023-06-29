// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {setupPageResourceLoaderForSourceMap} from '../../helpers/SourceMapHelpers.js';

const {assert} = chai;

const content = JSON.stringify({
  'version': 3,
  'file': '/script.js',
  'mappings': '',
  'sources': [
    '/original-script.js',
  ],
});

describeWithMockConnection('SourceMapManager', () => {
  it('uses url for a worker\'s source maps from frame', async () => {
    setupPageResourceLoaderForSourceMap(content);
    const frameUrl = 'https://frame-host/index.html' as Platform.DevToolsPath.UrlString;
    const scriptUrl = 'https://script-host/script.js' as Platform.DevToolsPath.UrlString;
    const sourceUrl = 'script.js' as Platform.DevToolsPath.UrlString;
    const sourceMapUrl = 'script.js.map' as Platform.DevToolsPath.UrlString;

    const mainTarget =
        createTarget({id: 'main' as Protocol.Target.TargetID, name: 'main', type: SDK.Target.Type.Frame});
    mainTarget.setInspectedURL(frameUrl);

    const workerTarget = createTarget({
      id: 'worker' as Protocol.Target.TargetID,
      name: 'worker',
      type: SDK.Target.Type.Worker,
      parentTarget: mainTarget,
    });

    const debuggerModel = workerTarget.model(SDK.DebuggerModel.DebuggerModel);
    assert.isNotNull(debuggerModel);
    if (debuggerModel === null) {
      return;
    }

    const sourceMapManager = debuggerModel.sourceMapManager();

    const script = new SDK.Script.Script(
        debuggerModel, '1' as Protocol.Runtime.ScriptId, scriptUrl, 0, 0, 0, 0, 0, '', false, false, sourceMapUrl,
        false, 0, null, null, null, null, null, null);

    sourceMapManager.attachSourceMap(script, sourceUrl, sourceMapUrl);

    const sourceMap = await sourceMapManager.sourceMapForClientPromise(script);
    // Check that the URLs are resolved relative to the frame.
    assert.strictEqual(sourceMap?.url(), 'https://frame-host/script.js.map' as Platform.DevToolsPath.UrlString);
    assert.deepEqual(
        sourceMap?.sourceURLs(), ['https://frame-host/original-script.js' as Platform.DevToolsPath.UrlString]);
  });

  it('can handle source maps in a data URL frame', async () => {
    setupPageResourceLoaderForSourceMap(content);
    const sourceUrl = 'script.js' as Platform.DevToolsPath.UrlString;
    const sourceMapUrl = `data:test/html;base64,${btoa(content)}` as Platform.DevToolsPath.UrlString;
    const frameSource =
        '<script>0\n//# sourceURL=' + sourceUrl + '\n//# sourceMappingURL=' + sourceMapUrl + '</script>';
    const frameUrl = `data:test/html;base64,${btoa(frameSource)}` as Platform.DevToolsPath.UrlString;
    const scriptUrl = 'https://script-host/script.js' as Platform.DevToolsPath.UrlString;

    const mainTarget =
        createTarget({id: 'main' as Protocol.Target.TargetID, name: 'main', type: SDK.Target.Type.Frame});
    mainTarget.setInspectedURL(frameUrl);

    const debuggerModel = mainTarget.model(SDK.DebuggerModel.DebuggerModel);
    assert.isNotNull(debuggerModel);
    if (debuggerModel === null) {
      return;
    }

    const sourceMapManager = debuggerModel.sourceMapManager();

    const script = new SDK.Script.Script(
        debuggerModel, '1' as Protocol.Runtime.ScriptId, scriptUrl, 0, 0, 0, 0, 0, '', false, false, sourceMapUrl,
        false, 0, null, null, null, null, null, null);

    sourceMapManager.attachSourceMap(script, sourceUrl, sourceMapUrl);

    const sourceMap = await sourceMapManager.sourceMapForClientPromise(script);
    assert.deepEqual(sourceMap?.sourceURLs(), ['/original-script.js' as Platform.DevToolsPath.UrlString]);
  });
});

describe('SourceMapManager', () => {
  const sourceURL = 'http://localhost/foo.js' as Platform.DevToolsPath.UrlString;
  const sourceMappingURL = `${sourceURL}.map`;

  beforeEach(() => {
    SDK.TargetManager.TargetManager.instance({forceNew: true});
    SDK.PageResourceLoader.PageResourceLoader.instance({forceNew: true, loadOverride: null, maxConcurrentLoads: 1});
  });

  afterEach(() => {
    SDK.PageResourceLoader.PageResourceLoader.removeInstance();
    SDK.TargetManager.TargetManager.removeInstance();
  });

  const createTarget = (): SDK.Target.Target => {
    const target = sinon.createStubInstance(SDK.Target.Target);
    target.type.returns(SDK.Target.Type.Frame);
    return target;
  };

  class MockClient implements SDK.FrameAssociated.FrameAssociated {
    constructor(private target: SDK.Target.Target) {
    }

    createPageResourceLoadInitiator(): SDK.PageResourceLoader.PageResourceLoadInitiator {
      return {target: this.target, frameId: null, initiatorUrl: null};
    }
  }

  describe('attachSourceMap', () => {
    it('catches attempts to attach twice for the same client', async () => {
      const target = createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      sinon.stub(SDK.PageResourceLoader.PageResourceLoader.instance(), 'loadResource').resolves({content});
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      assert.throws(() => sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL));
      await sourceMapManager.sourceMapForClientPromise(client);
    });

    it('triggers the correct lifecycle events when loading succeeds', async () => {
      const target = createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      const sourceMapWillAttach = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapWillAttach, sourceMapWillAttach);
      const sourceMapAttached = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapAttached, sourceMapAttached);
      sinon.stub(SDK.PageResourceLoader.PageResourceLoader.instance(), 'loadResource').resolves({content});
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      assert.strictEqual(sourceMapWillAttach.callCount, 1, 'SourceMapWillAttach events');
      assert.isTrue(sourceMapWillAttach.calledWith(sinon.match.hasNested('data.client', client)));
      const sourceMap = await sourceMapManager.sourceMapForClientPromise(client);
      assert.strictEqual(sourceMapAttached.callCount, 1, 'SourceMapAttached events');
      assert.isTrue(sourceMapAttached.calledWith(sinon.match.hasNested('data.client', client)));
      assert.isTrue(sourceMapAttached.calledWith(sinon.match.hasNested('data.sourceMap', sourceMap)));
      assert.isTrue(sourceMapAttached.calledAfter(sourceMapWillAttach));
    });

    it('triggers the correct lifecycle events when loading fails', async () => {
      const target = createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      const sourceMapWillAttach = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapWillAttach, sourceMapWillAttach);
      const sourceMapFailedToAttach = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapFailedToAttach, sourceMapFailedToAttach);
      sinon.stub(SDK.PageResourceLoader.PageResourceLoader.instance(), 'loadResource').rejects('Error');
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      assert.strictEqual(sourceMapWillAttach.callCount, 1, 'SourceMapWillAttach events');
      assert.isTrue(sourceMapWillAttach.calledWith(sinon.match.hasNested('data.client', client)));
      await sourceMapManager.sourceMapForClientPromise(client);
      assert.strictEqual(sourceMapFailedToAttach.callCount, 1, 'SourceMapFailedToAttach events');
      assert.isTrue(sourceMapFailedToAttach.calledWith(sinon.match.hasNested('data.client', client)));
      assert.isTrue(sourceMapFailedToAttach.calledAfter(sourceMapWillAttach));
    });

    it('correctly handles the case where sourcemap reattaches immediately', async () => {
      const target = createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      const sourceMapAttached = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapAttached, sourceMapAttached);
      const sourceMapFailedToAttach = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapFailedToAttach, sourceMapFailedToAttach);
      sinon.stub(SDK.PageResourceLoader.PageResourceLoader.instance(), 'loadResource').resolves({content});
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      sourceMapManager.detachSourceMap(client);
      assert.isTrue(sourceMapFailedToAttach.calledWith(sinon.match.hasNested('data.client', client)));
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      await sourceMapManager.sourceMapForClientPromise(client);
      assert.strictEqual(sourceMapAttached.callCount, 1, 'SourceMapAttached events');
      assert.isTrue(sourceMapAttached.calledWith(sinon.match.hasNested('data.client', client)));
      assert.isTrue(sourceMapAttached.calledAfter(sourceMapFailedToAttach));
    });

    it('correctly handles separate clients with same sourceURL and sourceMappingURL', async () => {
      const target = createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client1 = new MockClient(target);
      const client2 = new MockClient(target);
      sinon.stub(SDK.PageResourceLoader.PageResourceLoader.instance(), 'loadResource').resolves({content});
      sourceMapManager.attachSourceMap(client1, sourceURL, sourceMappingURL);
      sourceMapManager.attachSourceMap(client2, sourceURL, sourceMappingURL);
      const [sourceMap1, sourceMap2] = await Promise.all([
        sourceMapManager.sourceMapForClientPromise(client1),
        sourceMapManager.sourceMapForClientPromise(client2),
      ]);
      assert.notStrictEqual(sourceMap1, sourceMap2);
    });

    it('defers loading sourcemaps while disabled', async () => {
      const target = createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      sourceMapManager.setEnabled(false);
      const client = new MockClient(target);
      const loadResource = sinon.spy(SDK.PageResourceLoader.PageResourceLoader.instance(), 'loadResource');
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      assert.strictEqual(loadResource.callCount, 0, 'loadResource calls');
      assert.isUndefined(sourceMapManager.sourceMapForClient(client));
      assert.isUndefined(await sourceMapManager.sourceMapForClientPromise(client));
      sourceMapManager.setEnabled(true);
      assert.strictEqual(loadResource.callCount, 1, 'loadResource calls');
      await sourceMapManager.sourceMapForClientPromise(client);
    });

    it('does not attempt to load when attach is cancelled', async () => {
      const target = createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapWillAttach,
          ({data: {client}}) => sourceMapManager.cancelAttachSourceMap(client));
      const sourceMapFailedToAttach = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapFailedToAttach, sourceMapFailedToAttach);
      const loadResource = sinon.spy(SDK.PageResourceLoader.PageResourceLoader.instance(), 'loadResource');
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      assert.strictEqual(loadResource.callCount, 0, 'loadResource calls');
      await sourceMapManager.sourceMapForClientPromise(client);
      assert.strictEqual(sourceMapFailedToAttach.callCount, 1, 'SourceMapFailedToAttach events');
      assert.isTrue(sourceMapFailedToAttach.calledWith(sinon.match.hasNested('data.client', client)));
    });
  });

  describe('detachSourceMap', () => {
    it('silently ignores unknown clients', () => {
      const target = createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      sourceMapManager.detachSourceMap(client);
    });

    it('triggers the correct lifecycle events', async () => {
      const target = createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      const sourceMapDetached = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapDetached, sourceMapDetached);
      sinon.stub(SDK.PageResourceLoader.PageResourceLoader.instance(), 'loadResource').resolves({content});
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      const sourceMap = await sourceMapManager.sourceMapForClientPromise(client);
      sourceMapManager.detachSourceMap(client);
      assert.strictEqual(sourceMapDetached.callCount, 1, 'SourceMapDetached events');
      assert.isTrue(sourceMapDetached.calledWith(sinon.match.hasNested('data.client', client)));
      assert.isTrue(sourceMapDetached.calledWith(sinon.match.hasNested('data.sourceMap', sourceMap)));
    });

    it('triggers the correct lifecycle events when disabled', async () => {
      const target = createTarget();
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
    it('triggers the correct lifecycle events when disabling while attaching', () => {
      const target = createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      sinon.stub(SDK.PageResourceLoader.PageResourceLoader.instance(), 'loadResource').returns(new Promise(() => {}));
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      const sourceMapFailedToAttach = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapFailedToAttach, sourceMapFailedToAttach);

      sourceMapManager.setEnabled(false);

      assert.strictEqual(sourceMapFailedToAttach.callCount, 1, 'SourceMapFailedToAttach events');
      assert.isTrue(sourceMapFailedToAttach.calledWith(sinon.match.hasNested('data.client', client)));
    });

    it('triggers the correct lifecycle events when disabling once attached', async () => {
      const target = createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      sinon.stub(SDK.PageResourceLoader.PageResourceLoader.instance(), 'loadResource').resolves({content});
      sourceMapManager.attachSourceMap(client, sourceURL, sourceMappingURL);
      const sourceMap = await sourceMapManager.sourceMapForClientPromise(client);
      const sourceMapDetached = sinon.spy();
      sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapDetached, sourceMapDetached);

      sourceMapManager.setEnabled(false);

      assert.strictEqual(sourceMapDetached.callCount, 1, 'SourceMapDetached events');
      assert.isTrue(sourceMapDetached.calledWith(sinon.match.hasNested('data.client', client)));
      assert.isTrue(sourceMapDetached.calledWith(sinon.match.hasNested('data.sourceMap', sourceMap)));
    });

    it('triggers the correct lifecycle events when re-enabling', async () => {
      const target = createTarget();
      const sourceMapManager = new SDK.SourceMapManager.SourceMapManager(target);
      const client = new MockClient(target);
      sinon.stub(SDK.PageResourceLoader.PageResourceLoader.instance(), 'loadResource').resolves({content});
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
      assert.isTrue(sourceMapWillAttach.calledWith(sinon.match.hasNested('data.client', client)));
      assert.isTrue(sourceMapAttached.calledAfter(sourceMapWillAttach));
      assert.strictEqual(sourceMapAttached.callCount, 1, 'SourceMapAttached events');
      assert.isTrue(sourceMapAttached.calledWith(sinon.match.hasNested('data.client', client)));
      assert.isTrue(sourceMapAttached.calledWith(sinon.match.hasNested('data.sourceMap', sourceMap)));
    });
  });
});
