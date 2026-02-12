// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {dispatchClickEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {
  createTarget,
  describeWithEnvironment,
} from '../../testing/EnvironmentHelpers.js';
import {debuggerCallFrame, protocolCallFrame} from '../../testing/StackTraceHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Sources from './sources.js';

function getPausedDetails() {
  const target = createTarget();
  const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
  assert.exists(debuggerModel);
  const scriptId = 'scriptId' as Protocol.Runtime.ScriptId;
  const url = Platform.DevToolsPath.urlString`http://example.com/script.js`;

  const script = debuggerModel.parsedScriptSource(
      scriptId, url, 0, 0, 0, 0, 0, '', undefined, false, undefined, false, false, 0, null, null, null, null, null,
      null, null);

  const syncCallFrame = debuggerCallFrame(`${url}:${scriptId}:testFunction:0:0`);
  const asyncCallFrame = protocolCallFrame(`${url}:${scriptId}:asyncParent:5:2`);
  const details = new SDK.DebuggerModel.DebuggerPausedDetails(
      debuggerModel, [syncCallFrame], Protocol.Debugger.PausedEventReason.Other, {}, [],
      {description: 'setTimeout', callFrames: [asyncCallFrame]});
  return {details, debuggerModel, script};
}

describeWithEnvironment('CallStackSidebarPane', () => {
  beforeEach(() => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
      ignoreListManager,
      workspace,
    });
  });

  it('updates call stack sidebar pane and activates item when SourceMapAttached event fires and SourcesPanel is active',
     async () => {
       const {details, debuggerModel, script} = getPausedDetails();
       const callStackSidebarPane = Sources.CallStackSidebarPane.CallStackSidebarPane.instance({forceNew: true});
       await callStackSidebarPane.flavorChanged(details);

       const setSelectedCallFrameSpy = sinon.spy(debuggerModel, 'setSelectedCallFrame');

       UI.Context.Context.instance().setFlavor(
           Sources.SourcesPanel.SourcesPanel, sinon.createStubInstance(Sources.SourcesPanel.SourcesPanel));
       UI.Context.Context.instance().setFlavor(Sources.SourcesPanel.QuickSourceView, null);

       const mockSourceMap = sinon.createStubInstance(SDK.SourceMap.SourceMap);
       mockSourceMap.sourceURLs.returns([]);

       debuggerModel.sourceMapManager().dispatchEventToListeners(SDK.SourceMapManager.Events.SourceMapAttached, {
         client: script,
         sourceMap: mockSourceMap,
       });

       await callStackSidebarPane.updateComplete;

       sinon.assert.called(setSelectedCallFrameSpy);
     });

  it('updates call stack sidebar pane and activates item when SourceMapAttached event fires and QuickSourceView is active',
     async () => {
       const {details, debuggerModel, script} = getPausedDetails();
       const callStackSidebarPane = Sources.CallStackSidebarPane.CallStackSidebarPane.instance({forceNew: true});

       await callStackSidebarPane.flavorChanged(details);

       const setSelectedCallFrameSpy = sinon.spy(debuggerModel, 'setSelectedCallFrame');

       UI.Context.Context.instance().setFlavor(Sources.SourcesPanel.SourcesPanel, null);
       UI.Context.Context.instance().setFlavor(
           Sources.SourcesPanel.QuickSourceView, sinon.createStubInstance(Sources.SourcesPanel.QuickSourceView));

       const mockSourceMap = sinon.createStubInstance(SDK.SourceMap.SourceMap);
       mockSourceMap.sourceURLs.returns([]);

       debuggerModel.sourceMapManager().dispatchEventToListeners(SDK.SourceMapManager.Events.SourceMapAttached, {
         client: script,
         sourceMap: mockSourceMap,
       });

       await callStackSidebarPane.updateComplete;

       sinon.assert.called(setSelectedCallFrameSpy);
     });

  it('does not activate item when SourceMapAttached event fires and no view is active', async () => {
    const {details, debuggerModel, script} = getPausedDetails();
    const callStackSidebarPane = Sources.CallStackSidebarPane.CallStackSidebarPane.instance({forceNew: true});
    await callStackSidebarPane.flavorChanged(details);

    const setSelectedCallFrameSpy = sinon.spy(debuggerModel, 'setSelectedCallFrame');

    UI.Context.Context.instance().setFlavor(Sources.SourcesPanel.SourcesPanel, null);
    UI.Context.Context.instance().setFlavor(Sources.SourcesPanel.QuickSourceView, null);

    const mockSourceMap = sinon.createStubInstance(SDK.SourceMap.SourceMap);
    mockSourceMap.sourceURLs.returns([]);

    debuggerModel.sourceMapManager().dispatchEventToListeners(SDK.SourceMapManager.Events.SourceMapAttached, {
      client: script,
      sourceMap: mockSourceMap,
    });

    await callStackSidebarPane.updateComplete;

    sinon.assert.notCalled(setSelectedCallFrameSpy);
  });

  it('reveals UILocation for frames in async fragments', async () => {
    const {details} = getPausedDetails();
    const callStackSidebarPane = Sources.CallStackSidebarPane.CallStackSidebarPane.instance({forceNew: true});
    renderElementIntoDOM(callStackSidebarPane);

    await callStackSidebarPane.flavorChanged(details);
    await callStackSidebarPane.updateComplete;

    const items = callStackSidebarPane.contentElement.querySelectorAll('.call-frame-item');
    assert.lengthOf(items, 3);  // sync frame, async description, async frame

    const revealSpy = sinon.spy(Common.Revealer.RevealerRegistry.instance(), 'reveal');

    dispatchClickEvent(items[2], {bubbles: true});

    sinon.assert.calledOnceWithMatch(revealSpy, (location: unknown) => {
      return location instanceof Workspace.UISourceCode.UILocation && location.lineNumber === 5 &&
          location.columnNumber === 2;
    });

    callStackSidebarPane.detach();
  });
});
