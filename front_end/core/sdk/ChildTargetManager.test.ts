// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import {
  createTarget,
} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
} from '../../testing/MockConnection.js';

import * as SDK from './sdk.js';

const TARGET_ID = 'TARGET_ID' as Protocol.Target.TargetID;
const TITLE = 'TITLE';

let nextTargetId = 0;
function createTargetInfo(targetId?: string, type?: string, url?: string, title?: string) {
  return {
    targetId: (targetId ?? String(++nextTargetId)) as Protocol.Target.TargetID,
    type: type ?? 'page',
    title: title ?? '',
    url: url ?? 'http://example.com',
    attached: true,
    canAccessOpener: true,
  };
}

let nextSessionId = 0;
function createSessionId() {
  return ('SESSION_ID' + ++nextSessionId) as Protocol.Target.SessionID;
}

describeWithMockConnection('ChildTargetManager', () => {
  it('adds subtargets', async () => {
    const target = createTarget();
    const childTargetManager = new SDK.ChildTargetManager.ChildTargetManager(target);
    assert.strictEqual(childTargetManager.childTargets().length, 0);
    await childTargetManager.attachedToTarget(
        {sessionId: createSessionId(), targetInfo: createTargetInfo(TARGET_ID), waitingForDebugger: false});
    assert.strictEqual(childTargetManager.childTargets().length, 1);
    assert.strictEqual(childTargetManager.childTargets()[0].id(), TARGET_ID);
  });

  it('sets subtarget type', async () => {
    const target = createTarget();
    const childTargetManager = new SDK.ChildTargetManager.ChildTargetManager(target);
    assert.strictEqual(childTargetManager.childTargets().length, 0);
    for (const [protocolType, sdkType] of [
             ['iframe', SDK.Target.Type.FRAME],
             ['webview', SDK.Target.Type.FRAME],
             ['page', SDK.Target.Type.FRAME],
             ['background_page', SDK.Target.Type.FRAME],
             ['app', SDK.Target.Type.FRAME],
             ['popup_page', SDK.Target.Type.FRAME],
             ['worker', SDK.Target.Type.Worker],
             ['shared_worker', SDK.Target.Type.SHARED_WORKER],
             ['service_worker', SDK.Target.Type.ServiceWorker],
             ['auction_worklet', SDK.Target.Type.AUCTION_WORKLET],
             ['browser', SDK.Target.Type.BROWSER],
    ]) {
      await childTargetManager.attachedToTarget({
        sessionId: createSessionId(),
        targetInfo: createTargetInfo(undefined, protocolType),
        waitingForDebugger: false,
      });
      const [subtarget] = childTargetManager.childTargets().slice(-1);
      assert.strictEqual(subtarget.type(), sdkType);
    }
  });

  it('sets subtarget to frame for devtools scheme if type is other', async () => {
    const target = createTarget();
    const childTargetManager = new SDK.ChildTargetManager.ChildTargetManager(target);
    assert.strictEqual(childTargetManager.childTargets().length, 0);
    await childTargetManager.attachedToTarget({
      sessionId: createSessionId(),
      targetInfo: createTargetInfo(undefined, 'other', 'devtools://foo/bar'),
      waitingForDebugger: false,
    });
    let [subtarget] = childTargetManager.childTargets().slice(-1);
    assert.strictEqual(subtarget.type(), SDK.Target.Type.FRAME);

    await childTargetManager.attachedToTarget({
      sessionId: createSessionId(),
      targetInfo: createTargetInfo(undefined, 'worker', 'devtools://foo/bar'),
      waitingForDebugger: false,
    });
    [subtarget] = childTargetManager.childTargets().slice(-1);
    assert.strictEqual(subtarget.type(), SDK.Target.Type.Worker);
  });

  it('sets subtarget to frame for chrome://print/ if type is other', async () => {
    const target = createTarget();
    const childTargetManager = new SDK.ChildTargetManager.ChildTargetManager(target);
    assert.strictEqual(childTargetManager.childTargets().length, 0);
    await childTargetManager.attachedToTarget({
      sessionId: createSessionId(),
      targetInfo: createTargetInfo(undefined, 'other', 'chrome://print/'),
      waitingForDebugger: false,
    });
    const [subtarget] = childTargetManager.childTargets().slice(-1);
    assert.strictEqual(subtarget.type(), SDK.Target.Type.FRAME);
  });

  it('sets subtarget to frame for chrome://file-manager/ if type is other', async () => {
    const target = createTarget();
    const childTargetManager = new SDK.ChildTargetManager.ChildTargetManager(target);
    assert.strictEqual(childTargetManager.childTargets().length, 0);
    await childTargetManager.attachedToTarget({
      sessionId: createSessionId(),
      targetInfo: createTargetInfo(undefined, 'other', 'chrome://file-manager/?%7B%22allowedPaths%22:%22anyPathOrUrl'),
      waitingForDebugger: false,
    });
    const [subtarget] = childTargetManager.childTargets().slice(-1);
    assert.strictEqual(subtarget.type(), SDK.Target.Type.FRAME);
  });

  it('sets subtarget to frame for sidebar URLs if type is other', async () => {
    const target = createTarget();
    const childTargetManager = new SDK.ChildTargetManager.ChildTargetManager(target);
    assert.strictEqual(childTargetManager.childTargets().length, 0);
    await childTargetManager.attachedToTarget({
      sessionId: createSessionId(),
      targetInfo: createTargetInfo(undefined, 'other', 'chrome://read-later.top-chrome/'),
      waitingForDebugger: false,
    });
    let [subtarget] = childTargetManager.childTargets().slice(-1);
    assert.strictEqual(subtarget.type(), SDK.Target.Type.FRAME);

    await childTargetManager.attachedToTarget({
      sessionId: createSessionId(),
      targetInfo: createTargetInfo(undefined, 'other', 'chrome://booksmarks-side-panel.top-chrome/'),
      waitingForDebugger: false,
    });
    [subtarget] = childTargetManager.childTargets().slice(-1);
    assert.strictEqual(subtarget.type(), SDK.Target.Type.FRAME);
  });

  it('sets worker target name to the target title', async () => {
    const target = createTarget();
    const childTargetManager = new SDK.ChildTargetManager.ChildTargetManager(target);
    assert.strictEqual(childTargetManager.childTargets().length, 0);
    await childTargetManager.attachedToTarget({
      sessionId: createSessionId(),
      targetInfo: createTargetInfo(undefined, 'worker', 'http://example.com/worker.js', TITLE),
      waitingForDebugger: false,
    });
    assert.strictEqual(childTargetManager.childTargets()[0].name(), TITLE);
  });

  it('sets non-frame target name to the last path component if present', async () => {
    const target = createTarget();
    const childTargetManager = new SDK.ChildTargetManager.ChildTargetManager(target);
    assert.strictEqual(childTargetManager.childTargets().length, 0);
    await childTargetManager.attachedToTarget({
      sessionId: createSessionId(),
      targetInfo: createTargetInfo(undefined, 'service_worker', 'http://example.org/service_worker.html', TITLE),
      waitingForDebugger: false,
    });
    await childTargetManager.attachedToTarget({
      sessionId: createSessionId(),
      targetInfo: createTargetInfo(undefined, 'worker', 'http://example.com/worker.js'),
      waitingForDebugger: false,
    });
    assert.strictEqual(childTargetManager.childTargets()[0].name(), 'service_worker.html');
    assert.strictEqual(childTargetManager.childTargets()[1].name(), 'worker.js');
  });

  it('sets non-frame target a numbered name if it cannot use URL path', async () => {
    const target = createTarget();
    const childTargetManager = new SDK.ChildTargetManager.ChildTargetManager(target);
    assert.strictEqual(childTargetManager.childTargets().length, 0);
    await childTargetManager.attachedToTarget({
      sessionId: createSessionId(),
      targetInfo: createTargetInfo(undefined, 'page', 'data:text/html,<!doctype html>'),
      waitingForDebugger: false,
    });
    await childTargetManager.attachedToTarget({
      sessionId: createSessionId(),
      targetInfo: createTargetInfo(undefined, 'iframe', 'data:text/html,<!doctype html>'),
      waitingForDebugger: false,
    });
    await childTargetManager.attachedToTarget({
      sessionId: createSessionId(),
      targetInfo: createTargetInfo(undefined, 'webview', 'data:text/html,<!doctype html>'),
      waitingForDebugger: false,
    });
    // The targets above are frames and should not be given a numbered named
    await childTargetManager.attachedToTarget({
      sessionId: createSessionId(),
      targetInfo:
          createTargetInfo(undefined, 'service_worker', 'data:application/javascript;console.log("Service Worker")'),
      waitingForDebugger: false,
    });
    await childTargetManager.attachedToTarget({
      sessionId: createSessionId(),
      targetInfo: createTargetInfo(undefined, 'worker', 'data:application/javascript;console.log("Worker")'),
      waitingForDebugger: false,
    });
    assert.strictEqual(childTargetManager.childTargets()[3].name(), '#1');
    assert.strictEqual(childTargetManager.childTargets()[4].name(), '#2');
  });

  it('calls attach callback', async () => {
    const target = createTarget();
    const childTargetManager = new SDK.ChildTargetManager.ChildTargetManager(target);
    const attachCallback = sinon.spy();
    SDK.ChildTargetManager.ChildTargetManager.install(attachCallback);
    await childTargetManager.attachedToTarget(
        {sessionId: createSessionId(), targetInfo: createTargetInfo(TARGET_ID), waitingForDebugger: false});
    assert.isTrue(attachCallback.calledOnce);
    assert.strictEqual(attachCallback.firstCall.firstArg.target.id(), TARGET_ID);
    assert.isFalse(attachCallback.firstCall.firstArg.waitingForDebugger);

    const OTHER_TARGET_ID = 'OTHER_TARGET_ID' as Protocol.Target.TargetID;
    await childTargetManager.attachedToTarget(
        {sessionId: createSessionId(), targetInfo: createTargetInfo(OTHER_TARGET_ID), waitingForDebugger: true});
    assert.isTrue(attachCallback.calledTwice);
    assert.strictEqual(attachCallback.secondCall.firstArg.target.id(), OTHER_TARGET_ID);
    assert.isTrue(attachCallback.secondCall.firstArg.waitingForDebugger);
  });

  it('disposes of the target if it crashes', async () => {
    const parentTarget = createTarget();
    const childTargetManager = new SDK.ChildTargetManager.ChildTargetManager(parentTarget);
    await childTargetManager.attachedToTarget({
      sessionId: createSessionId(),
      targetInfo: createTargetInfo('child-target-id'),
      waitingForDebugger: false,
    });
    const target = childTargetManager.childTargets().at(0);
    assert.isDefined(target);
    assert.strictEqual(target.id(), 'child-target-id');
    const disposeSpy = sinon.spy(target, 'dispose');
    childTargetManager.targetCrashed(
        {targetId: target.id() as Protocol.Target.TargetID, status: 'crashed', errorCode: 1});

    // Ensure that the target has been disposed after it crashed.
    assert.isTrue(disposeSpy.calledOnce);
  });
});
