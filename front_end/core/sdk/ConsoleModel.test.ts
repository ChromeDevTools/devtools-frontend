// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import {
  createTarget,
} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
} from '../../testing/MockConnection.js';
import {
  FRAME_URL,
  getInitializedResourceTreeModel,
  getMainFrame,
  navigate,
} from '../../testing/ResourceTreeHelpers.js';
import * as Common from '../common/common.js';
import type * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

describeWithMockConnection('ConsoleMessage', () => {
  const scriptId1 = '1' as Protocol.Runtime.ScriptId;
  const scriptId2 = '2' as Protocol.Runtime.ScriptId;

  function newMessage({
    source = Common.Console.FrontendMessageSource.ConsoleAPI,
    message = 'Message',
    url,
    scriptId,
    executionContextId,
    stackTrace,
  }: {
    source?: SDK.ConsoleModel.MessageSource,
    message?: string,
    url?: Platform.DevToolsPath.UrlString,
    scriptId?: Protocol.Runtime.ScriptId,
    executionContextId?: number,
    stackTrace?: Protocol.Runtime.StackTrace,
  }) {
    return new SDK.ConsoleModel.ConsoleMessage(
        null, source, null, message, {url, executionContextId, scriptId, stackTrace});
  }

  it('compares using message', () => {
    const a = newMessage({});
    const b = newMessage({});
    const c = newMessage({message: 'DifferentMessage'});
    assert.isTrue(a.isEqual(b));
    assert.isFalse(b.isEqual(c));
    assert.isFalse(c.isEqual(a));
    assert.isTrue(c.isEqual(c));
  });

  it('compares using source', () => {
    const a = newMessage({});
    const b = newMessage({});
    const c = newMessage({source: Common.Console.FrontendMessageSource.CSS});
    assert.isTrue(a.isEqual(b));
    assert.isFalse(b.isEqual(c));
    assert.isFalse(c.isEqual(a));
  });

  it('compares using url', () => {
    const a = newMessage({});
    const b = newMessage({url: 'http://a.b/c' as Platform.DevToolsPath.UrlString});
    const c = newMessage({url: 'http://a.b/c' as Platform.DevToolsPath.UrlString});
    const d = newMessage({url: 'http://a.b/d' as Platform.DevToolsPath.UrlString});
    assert.isFalse(a.isEqual(b));
    assert.isTrue(b.isEqual(c));
    assert.isFalse(c.isEqual(d));
    assert.isFalse(d.isEqual(a));
  });

  it('compares using execution context and script id', () => {
    const a = newMessage({});
    const b = newMessage({executionContextId: 5, scriptId: scriptId1});
    const c = newMessage({executionContextId: 5, scriptId: scriptId1});
    const d = newMessage({executionContextId: 6, scriptId: scriptId1});
    const e = newMessage({executionContextId: 5, scriptId: scriptId2});
    assert.isFalse(a.isEqual(b));
    assert.isFalse(b.isEqual(a));
    assert.isTrue(b.isEqual(c));
    assert.isFalse(c.isEqual(d));
    assert.isFalse(c.isEqual(e));
  });

  it('compares using script ids in stack traces', () => {
    const functionName = 'foo';
    const url = 'http://localhost/foo.js';
    const lineNumber = 1;
    const columnNumber = 1;
    const a =
        newMessage({stackTrace: {callFrames: [{functionName, scriptId: scriptId1, url, lineNumber, columnNumber}]}});
    const b =
        newMessage({stackTrace: {callFrames: [{functionName, scriptId: scriptId2, url, lineNumber, columnNumber}]}});
    assert.isFalse(a.isEqual(b));
  });

  it('logs a message on main frame navigation', async () => {
    Common.Settings.Settings.instance().moduleSetting('preserve-console-log').set(true);
    const consoleLog = sinon.spy(Common.Console.Console.instance(), 'log');
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    const mainFrameTarget = createTarget({type: SDK.Target.Type.FRAME, parentTarget: tabTarget});
    const subframeTarget = createTarget({type: SDK.Target.Type.FRAME, parentTarget: mainFrameTarget});
    await getInitializedResourceTreeModel(subframeTarget);
    navigate(getMainFrame(subframeTarget));
    assert.isTrue(consoleLog.notCalled);

    await getInitializedResourceTreeModel(mainFrameTarget);
    navigate(getMainFrame(mainFrameTarget));
    assert.isTrue(consoleLog.calledOnce);
    assert.isTrue(consoleLog.calledOnceWith(`Navigated to ${FRAME_URL}`));
  });

  it('logs a message on main frame navigation via bfcache', async () => {
    Common.Settings.Settings.instance().moduleSetting('preserve-console-log').set(true);
    const consoleLog = sinon.spy(Common.Console.Console.instance(), 'log');
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    const mainFrameTarget = createTarget({type: SDK.Target.Type.FRAME, parentTarget: tabTarget});
    const subframeTarget = createTarget({type: SDK.Target.Type.FRAME, parentTarget: mainFrameTarget});
    await getInitializedResourceTreeModel(subframeTarget);
    navigate(getMainFrame(subframeTarget), {}, Protocol.Page.NavigationType.BackForwardCacheRestore);
    assert.isTrue(consoleLog.notCalled);

    await getInitializedResourceTreeModel(mainFrameTarget);
    navigate(getMainFrame(mainFrameTarget), {}, Protocol.Page.NavigationType.BackForwardCacheRestore);
    assert.isTrue(consoleLog.calledOnce);
    assert.isTrue(consoleLog.calledOnceWith(
        `Navigation to ${FRAME_URL} was restored from back/forward cache (see https://web.dev/bfcache/)`));
  });

  it('discards duplicate console messages with identical timestamps', async () => {
    const target = createTarget({type: SDK.Target.Type.FRAME});
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);
    const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
    assert.exists(consoleModel);
    const addMessage = sinon.spy(consoleModel, 'addMessage');
    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.CachedResourcesLoaded, resourceTreeModel);

    const consoleAPICall = {
      type: Protocol.Runtime.ConsoleAPICalledEventType.Log,
      args: [{type: Protocol.Runtime.RemoteObjectType.String, value: 'log me'}],
      executionContextId: 1,
      timestamp: 123456.789,
    };

    runtimeModel.dispatchEventToListeners(SDK.RuntimeModel.Events.ConsoleAPICalled, consoleAPICall);
    assert.isTrue(addMessage.calledOnce);
    assert.isTrue(addMessage.calledOnceWith(sinon.match({messageText: 'log me'})));

    runtimeModel.dispatchEventToListeners(SDK.RuntimeModel.Events.ConsoleAPICalled, consoleAPICall);
    assert.isTrue(addMessage.calledOnce);

    runtimeModel.dispatchEventToListeners(
        SDK.RuntimeModel.Events.ConsoleAPICalled, {...consoleAPICall, timestamp: 123457.000});
    assert.isTrue(addMessage.calledTwice);
    assert.isTrue(addMessage.secondCall.calledWith(sinon.match({messageText: 'log me'})));
  });

  it('clears when main frame global object cleared', async () => {
    Common.Settings.Settings.instance().moduleSetting('preserve-console-log').set(false);
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    const mainFrameTarget = createTarget({type: SDK.Target.Type.FRAME, parentTarget: tabTarget});
    const subframeTarget = createTarget({type: SDK.Target.Type.FRAME, parentTarget: mainFrameTarget});
    const clearGlobalObjectOnTarget = (target: SDK.Target.Target) => {
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assert.exists(resourceTreeModel);
      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.CachedResourcesLoaded, resourceTreeModel);

      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assert.exists(debuggerModel);
      debuggerModel.dispatchEventToListeners(SDK.DebuggerModel.Events.GlobalObjectCleared, debuggerModel);
    };

    let consoleClearEventsTabTarget = 0;
    let consoleClearEventsMainFrameTarget = 0;
    let consoleClearEventsSubframeTarget = 0;
    tabTarget.model(SDK.ConsoleModel.ConsoleModel)
        ?.addEventListener(SDK.ConsoleModel.Events.ConsoleCleared, () => ++consoleClearEventsTabTarget);
    mainFrameTarget.model(SDK.ConsoleModel.ConsoleModel)
        ?.addEventListener(SDK.ConsoleModel.Events.ConsoleCleared, () => ++consoleClearEventsMainFrameTarget);
    subframeTarget.model(SDK.ConsoleModel.ConsoleModel)
        ?.addEventListener(SDK.ConsoleModel.Events.ConsoleCleared, () => ++consoleClearEventsSubframeTarget);

    clearGlobalObjectOnTarget(subframeTarget);
    assert.strictEqual(consoleClearEventsTabTarget, 0);
    assert.strictEqual(consoleClearEventsMainFrameTarget, 0);
    assert.strictEqual(consoleClearEventsSubframeTarget, 0);

    clearGlobalObjectOnTarget(mainFrameTarget);
    assert.strictEqual(consoleClearEventsTabTarget, 0);
    assert.strictEqual(consoleClearEventsMainFrameTarget, 1);
    assert.strictEqual(consoleClearEventsSubframeTarget, 0);
  });
});
