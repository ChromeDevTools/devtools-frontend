// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';

import type * as LighthouseModule from './lighthouse.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('LighthouseProtocolService', () => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let Lighthouse: typeof LighthouseModule;
  let primaryTarget: SDK.Target.Target;
  let rootTarget: SDK.Target.Target;
  let suspendAllTargets: sinon.SinonStub;
  let resumeAllTargets: sinon.SinonStub;
  let connection: MockCDPConnection;

  beforeEach(async () => {
    Lighthouse = await import('./lighthouse.js');
    connection = new MockCDPConnection();
    rootTarget = createTarget({type: SDK.Target.Type.TAB, connection});
    createTarget({parentTarget: rootTarget, subtype: 'prerender'});
    primaryTarget = createTarget({parentTarget: rootTarget});

    const targetManager = SDK.TargetManager.TargetManager.instance();

    suspendAllTargets = sinon.stub(targetManager, 'suspendAllTargets').resolves();
    resumeAllTargets = sinon.stub(targetManager, 'resumeAllTargets').resolves();
    SDK.ChildTargetManager.ChildTargetManager.install();
    const childTargetManager = primaryTarget.model(SDK.ChildTargetManager.ChildTargetManager);
    assert.exists(childTargetManager);

    sinon.stub(childTargetManager, 'getParentTargetId').resolves(primaryTarget.targetInfo()?.targetId);
    if (rootTarget !== primaryTarget) {
      const rootChildTargetManager = rootTarget.model(SDK.ChildTargetManager.ChildTargetManager);
      assert.exists(rootChildTargetManager);
      sinon.stub(rootChildTargetManager, 'getParentTargetId').resolves(rootTarget.targetInfo()?.targetId);
    }
  });

  afterEach(() => {
    for (const target of SDK.TargetManager.TargetManager.instance().targets()) {
      target.dispose('test');
    }
  });

  it('suspends all targets', async () => {
    const service = new Lighthouse.LighthouseProtocolService.ProtocolService();
    await service.attach(urlString`https://example.com/page`);
    sinon.assert.calledOnce(suspendAllTargets);
  });

  it('attaches to to the root target', async () => {
    const attachedToTargetStub = sinon.stub().returns({});
    connection.setSuccessHandler('Target.attachToTarget', attachedToTargetStub);
    const service = new Lighthouse.LighthouseProtocolService.ProtocolService();

    await service.attach(urlString`https://example.com/page`);

    sinon.assert.calledOnce(attachedToTargetStub);
    sinon.assert.calledWith(attachedToTargetStub, {targetId: rootTarget.targetInfo()?.targetId, flatten: true});
  });

  it('resumes all targets', async () => {
    const service = new Lighthouse.LighthouseProtocolService.ProtocolService();
    await service.attach(urlString`https://example.com/page`);
    await service.detach();
    sinon.assert.calledOnce(resumeAllTargets);
  });

  it('rejects pending requests when detached', async () => {
    // Mock Worker to avoid starting a real Lighthouse worker.
    const mockWorker = new EventTarget() as unknown as Worker;
    mockWorker.postMessage = sinon.stub() as unknown as typeof mockWorker.postMessage;
    mockWorker.terminate = sinon.stub() as unknown as typeof mockWorker.terminate;
    const workerStub = sinon.stub(globalThis, 'Worker').returns(mockWorker);

    try {
      connection.setSuccessHandler('Target.attachToTarget',
                                   () => ({sessionId: 'mock-session-id' as Protocol.Target.SessionID}));
      const service = new Lighthouse.LighthouseProtocolService.ProtocolService();
      await service.attach(urlString`https://example.com/page`);

      // Start a request. It will wait for the worker to be ready.
      const requestPromise = service.startTimespan({
        inspectedURL: urlString`https://example.com`,
        categoryIDs: ['performance'],
        flags: {formFactor: 'mobile', mode: 'timespan'},
      });

      // Simulate worker becoming ready.
      mockWorker.dispatchEvent(new MessageEvent('message', {data: 'workerReady'}));
      await service.ensureWorkerExists();
      // Now the request is sent to the worker and waiting for a
      // response.
      // We detach the service before the worker responds.
      await service.detach();

      // The request should be rejected with CancelledError.
      let error: Error|undefined;
      try {
        await requestPromise;
      } catch (err) {
        error = err as Error;
      }

      assert.exists(error);
      assert.instanceOf(error, Lighthouse.LighthouseProtocolService.CancelledError);
      assert.strictEqual(error.message, 'Lighthouse run cancelled');
    } finally {
      workerStub.restore();
    }
  });

  it('auto-accepts same-origin dialogs and blocks cross-origin dialogs', async () => {
    sinon.stub(primaryTarget, 'inspectedURL').returns(urlString`https://example.com/page`);
    const service = new Lighthouse.LighthouseProtocolService.ProtocolService();
    await service.attach(urlString`https://example.com/page`);

    const resourceTreeModel = primaryTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);

    const pageAgent = primaryTarget.pageAgent();
    const handleDialogStub = sinon.stub(pageAgent, 'invoke_handleJavaScriptDialog');

    // Same origin
    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.JavaScriptDialogOpening, {
      url: urlString`https://example.com/another-page`,
      message: 'test',
      type: 'alert',
      hasBrowserHandler: true,
    } as unknown as Protocol.Page.JavascriptDialogOpeningEvent);

    sinon.assert.calledOnce(handleDialogStub);

    // Cross origin
    handleDialogStub.resetHistory();
    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.JavaScriptDialogOpening, {
      url: urlString`https://attacker.com/page`,
      message: 'test',
      type: 'alert',
      hasBrowserHandler: true,
    } as unknown as Protocol.Page.JavascriptDialogOpeningEvent);

    sinon.assert.notCalled(handleDialogStub);
  });
});
