// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {dispatchClickEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {
  createTarget,
  describeWithEnvironment,
} from '../../testing/EnvironmentHelpers.js';
import {debuggerCallFrame, protocolCallFrame, StubStackTrace} from '../../testing/StackTraceHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Sources from './sources.js';

function getPausedDetails() {
  const target = createTarget();
  const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
  assert.exists(debuggerModel);
  const scriptId = 'scriptId' as Protocol.Runtime.ScriptId;
  const url = Platform.DevToolsPath.urlString`http://example.com/script.js`;

  const script = debuggerModel.parsedScriptSource(scriptId, url, 0, 0, 0, 0, 0, '', undefined, undefined, false, false,
                                                  0, null, null, null, null, null, null, null);

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
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
      ignoreListManager,
      workspace,
    });
    const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance({
      forceNew: true,
      targetManager,
      workspace,
      debuggerWorkspaceBinding,
      settings: Common.Settings.Settings.instance(),
    });
    Persistence.Persistence.PersistenceImpl.instance({forceNew: true, workspace, breakpointManager});
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

  it('ignores stale stack traces when flavorChanged calls overlap', async () => {
    const {details: details1} = getPausedDetails();
    const {details: details2} = getPausedDetails();
    const binding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
    const stackTrace1 = await binding.createStackTraceFromDebuggerPaused(details1, details1.debuggerModel.target());
    const stackTrace2 = await binding.createStackTraceFromDebuggerPaused(details2, details2.debuggerModel.target());

    const deferred1 = Promise.withResolvers<StackTrace.StackTrace.DebuggableStackTrace>();
    const deferred2 = Promise.withResolvers<StackTrace.StackTrace.DebuggableStackTrace>();
    const createStub = sinon.stub(binding, 'createStackTraceFromDebuggerPaused');
    createStub.onFirstCall().returns(deferred1.promise);
    createStub.onSecondCall().returns(deferred2.promise);

    const callStackSidebarPane = Sources.CallStackSidebarPane.CallStackSidebarPane.instance({forceNew: true});
    const p1 = callStackSidebarPane.flavorChanged(details1);
    const p2 = callStackSidebarPane.flavorChanged(details2);

    deferred2.resolve(stackTrace2);
    await p2;
    deferred1.resolve(stackTrace1);
    await p1;

    assert.isFalse(stackTrace1.hasEventListeners(StackTrace.StackTrace.Events.UPDATED));
    assert.isTrue(stackTrace2.hasEventListeners(StackTrace.StackTrace.Events.UPDATED));

    await callStackSidebarPane.flavorChanged(null);
    assert.isFalse(stackTrace2.hasEventListeners(StackTrace.StackTrace.Events.UPDATED));
  });

  describe('Ignore listing auto-activation and visibility', () => {
    it('auto-activates sync frame when sync frames are ignore-listed and async fragment has non-ignore-listed frames',
       async () => {
         const target = createTarget();
         const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
         assert.exists(debuggerModel);

         const vendorUrl = Platform.DevToolsPath.urlString`http://example.com/vendor.js`;
         const appUrl = Platform.DevToolsPath.urlString`http://example.com/app.js`;
         const vendorScriptId = 'vendorScriptId' as Protocol.Runtime.ScriptId;
         const appScriptId = 'appScriptId' as Protocol.Runtime.ScriptId;

         debuggerModel.parsedScriptSource(vendorScriptId, vendorUrl, 0, 0, 0, 0, 0, '', undefined, undefined, false,
                                          false, 0, null, null, null, null, null, null, null);
         debuggerModel.parsedScriptSource(appScriptId, appUrl, 0, 0, 0, 0, 0, '', undefined, undefined, false, false, 0,
                                          null, null, null, null, null, null, null);

         Workspace.IgnoreListManager.IgnoreListManager.instance().ignoreListURL(vendorUrl);

         const syncCallFrame = debuggerCallFrame(`${vendorUrl}:${vendorScriptId}:vendorFunc:0:0`);
         const asyncCallFrame = protocolCallFrame(`${appUrl}:${appScriptId}:appFunc:5:2`);
         const details = new SDK.DebuggerModel.DebuggerPausedDetails(
             debuggerModel, [syncCallFrame], Protocol.Debugger.PausedEventReason.Other, {}, [],
             {description: 'setTimeout', callFrames: [asyncCallFrame]});

         UI.Context.Context.instance().setFlavor(Sources.SourcesPanel.SourcesPanel,
                                                 sinon.createStubInstance(Sources.SourcesPanel.SourcesPanel));
         UI.Context.Context.instance().setFlavor(Sources.SourcesPanel.QuickSourceView, null);

         const setSelectedCallFrameSpy = sinon.spy(debuggerModel, 'setSelectedCallFrame');

         const callStackSidebarPane = Sources.CallStackSidebarPane.CallStackSidebarPane.instance({forceNew: true});
         renderElementIntoDOM(callStackSidebarPane);

         await callStackSidebarPane.flavorChanged(details);
         await callStackSidebarPane.updateComplete;

         sinon.assert.calledOnceWithExactly(setSelectedCallFrameSpy, details.callFrames[0]);
         assert.strictEqual(
             UI.Context.Context.instance().flavor(StackTrace.StackTrace.DebuggableFrameFlavor)?.frame.sdkFrame,
             details.callFrames[0]);
         assert.strictEqual(callStackSidebarPane.activeCallFrameItem()?.frame?.sdkFrame, details.callFrames[0]);

         const items = callStackSidebarPane.contentElement.querySelectorAll<HTMLElement>('.call-frame-item');
         assert.lengthOf(items, 3);
         assert.isTrue(items[0].hasAttribute('hidden'));
         assert.isFalse(items[1].hasAttribute('hidden'));
         assert.strictEqual(items[1].tabIndex, 0);

         const message = callStackSidebarPane.contentElement.querySelector('.ignore-listed-message');
         assert.exists(message);
         assert.isFalse(message.hasAttribute('hidden'));

         callStackSidebarPane.detach();
       });

    it('treats all frames as ignore-listed and auto-activates frame when sync and async frames are ignore-listed',
       async () => {
         const {details, debuggerModel, script} = getPausedDetails();
         Workspace.IgnoreListManager.IgnoreListManager.instance().ignoreListURL(script.sourceURL);

         UI.Context.Context.instance().setFlavor(Sources.SourcesPanel.SourcesPanel,
                                                 sinon.createStubInstance(Sources.SourcesPanel.SourcesPanel));
         UI.Context.Context.instance().setFlavor(Sources.SourcesPanel.QuickSourceView, null);

         const setSelectedCallFrameSpy = sinon.spy(debuggerModel, 'setSelectedCallFrame');

         const callStackSidebarPane = Sources.CallStackSidebarPane.CallStackSidebarPane.instance({forceNew: true});
         renderElementIntoDOM(callStackSidebarPane);

         await callStackSidebarPane.flavorChanged(details);
         await callStackSidebarPane.updateComplete;

         sinon.assert.calledOnceWithExactly(setSelectedCallFrameSpy, details.callFrames[0]);

         const message = callStackSidebarPane.contentElement.querySelector('.ignore-listed-message');
         assert.exists(message);
         assert.isTrue(message.hasAttribute('hidden'));

         const items = callStackSidebarPane.contentElement.querySelectorAll<HTMLElement>('.call-frame-item');
         assert.lengthOf(items, 3);
         for (const item of items) {
           assert.isFalse(item.hasAttribute('hidden'));
         }

         callStackSidebarPane.detach();
       });

    it('marks async header as ignore-listed only when all of its frames are ignore-listed', async () => {
      const {details, script} = getPausedDetails();
      const binding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
      const stackTrace = await binding.createStackTraceFromDebuggerPaused(details, details.debuggerModel.target());
      assert.exists(stackTrace);

      const emptyFragment: StackTrace.StackTrace.AsyncFragment = {
        description: 'setTimeout',
        frames: [],
      };
      const emptyHeaderItem = Sources.CallStackSidebarPane.Item.createForAsyncHeader(stackTrace, emptyFragment);
      assert.isFalse(emptyHeaderItem.isIgnoreListed);

      const fragmentWithFrame = stackTrace.asyncFragments[0];
      assert.isFalse(
          Sources.CallStackSidebarPane.Item.createForAsyncHeader(stackTrace, fragmentWithFrame).isIgnoreListed);

      Workspace.IgnoreListManager.IgnoreListManager.instance().ignoreListURL(script.sourceURL);
      const ignoreListedHeaderItem =
          Sources.CallStackSidebarPane.Item.createForAsyncHeader(stackTrace, fragmentWithFrame);
      assert.isTrue(ignoreListedHeaderItem.isIgnoreListed);
    });
  });

  describe('DEFAULT_VIEW', () => {
    async function createTestItem(opts: {
      isIgnoreListed?: boolean,
      missingDebugInfo?: StackTrace.StackTrace.MissingDebugInfo,
    } = {}): Promise<Sources.CallStackSidebarPane.Item> {
      const {details} = getPausedDetails();
      const binding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
      const stackTrace = await binding.createStackTraceFromDebuggerPaused(details, details.debuggerModel.target());
      const frame = stackTrace.syncFragment.frames[0];
      if (opts.missingDebugInfo) {
        Object.defineProperty(frame, 'missingDebugInfo', {
          value: opts.missingDebugInfo,
          configurable: true,
        });
      }
      const item = Sources.CallStackSidebarPane.Item.createForDebuggableFrame(frame);
      if (opts.isIgnoreListed) {
        item.isIgnoreListed = true;
      }
      return item;
    }

    it('renders not paused message when not paused', () => {
      const container = document.createElement('div');
      const input: Sources.CallStackSidebarPane.ViewInput = {
        showIgnoreListMessage: false,
        showIgnoreListedChecked: false,
        onIgnoreListCheckboxChange: sinon.stub(),
        notPaused: true,
        warnings: undefined,
        items: [],
        selectedItem: null,
        focusedItem: null,
        showIgnoreListed: false,
        onItemClick: sinon.stub(),
        onItemActivate: sinon.stub(),
        onItemContextMenu: sinon.stub(),
        onItemKeyDown: sinon.stub(),
        showMore: false,
        onShowMore: sinon.stub(),
      };

      Sources.CallStackSidebarPane.DEFAULT_VIEW(input, undefined, container);

      const notPausedElement = container.querySelector('.gray-info-message');
      assert.exists(notPausedElement);
      assert.isFalse(notPausedElement.hasAttribute('hidden'));

      const warningsElement = container.querySelector('.call-frame-warnings-message');
      assert.exists(warningsElement);
      assert.isTrue(warningsElement.hasAttribute('hidden'));

      const showMoreElement = container.querySelector('.show-more-message');
      assert.exists(showMoreElement);
      assert.isTrue(showMoreElement.hasAttribute('hidden'));

      const ignoreListMessage = container.querySelector('.ignore-listed-message');
      assert.exists(ignoreListMessage);
      assert.isTrue(ignoreListMessage.hasAttribute('hidden'));
    });

    it('renders warnings when warnings are present', () => {
      const container = document.createElement('div');
      const input: Sources.CallStackSidebarPane.ViewInput = {
        showIgnoreListMessage: false,
        showIgnoreListedChecked: false,
        onIgnoreListCheckboxChange: sinon.stub(),
        notPaused: false,
        warnings: 'Warning detail',
        items: [],
        selectedItem: null,
        focusedItem: null,
        showIgnoreListed: false,
        onItemClick: sinon.stub(),
        onItemActivate: sinon.stub(),
        onItemContextMenu: sinon.stub(),
        onItemKeyDown: sinon.stub(),
        showMore: false,
        onShowMore: sinon.stub(),
      };

      Sources.CallStackSidebarPane.DEFAULT_VIEW(input, undefined, container);

      const warningsElement = container.querySelector('.call-frame-warnings-message');
      assert.exists(warningsElement);
      assert.isFalse(warningsElement.hasAttribute('hidden'));
      assert.strictEqual(warningsElement.getAttribute('title'), 'Warning detail');
    });

    it('renders show more link and invokes onShowMore callback on click', () => {
      const container = document.createElement('div');
      const onShowMore = sinon.stub();
      const input: Sources.CallStackSidebarPane.ViewInput = {
        showIgnoreListMessage: false,
        showIgnoreListedChecked: false,
        onIgnoreListCheckboxChange: sinon.stub(),
        notPaused: false,
        warnings: undefined,
        items: [],
        selectedItem: null,
        focusedItem: null,
        showIgnoreListed: false,
        onItemClick: sinon.stub(),
        onItemActivate: sinon.stub(),
        onItemContextMenu: sinon.stub(),
        onItemKeyDown: sinon.stub(),
        showMore: true,
        onShowMore,
      };

      Sources.CallStackSidebarPane.DEFAULT_VIEW(input, undefined, container);

      const showMoreElement = container.querySelector('.show-more-message');
      assert.exists(showMoreElement);
      assert.isFalse(showMoreElement.hasAttribute('hidden'));

      const showMoreButton = container.querySelector('.show-more-message button');
      assert.exists(showMoreButton);
      assert.include(showMoreButton.getAttribute('jslog') ?? '', 'show-more');
      dispatchClickEvent(showMoreButton, {bubbles: true});
      sinon.assert.calledOnce(onShowMore);
    });

    it('renders ignore list checkbox and invokes onIgnoreListCheckboxChange on change', () => {
      const container = document.createElement('div');
      const onIgnoreListCheckboxChange = sinon.stub();
      const input: Sources.CallStackSidebarPane.ViewInput = {
        showIgnoreListMessage: true,
        showIgnoreListedChecked: true,
        onIgnoreListCheckboxChange,
        notPaused: false,
        warnings: undefined,
        items: [],
        selectedItem: null,
        focusedItem: null,
        showIgnoreListed: false,
        onItemClick: sinon.stub(),
        onItemActivate: sinon.stub(),
        onItemContextMenu: sinon.stub(),
        onItemKeyDown: sinon.stub(),
        showMore: false,
        onShowMore: sinon.stub(),
      };

      Sources.CallStackSidebarPane.DEFAULT_VIEW(input, undefined, container);

      const ignoreListMessage = container.querySelector('.ignore-listed-message');
      assert.exists(ignoreListMessage);
      assert.isFalse(ignoreListMessage.hasAttribute('hidden'));

      const checkbox = container.querySelector<HTMLInputElement>('.ignore-listed-checkbox');
      assert.exists(checkbox);
      assert.isTrue(checkbox.checked);
      assert.include(checkbox.getAttribute('jslog') ?? '', 'show-ignore-listed-frames');

      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change'));
      sinon.assert.calledOnceWithMatch(onIgnoreListCheckboxChange, false);
    });

    it('renders standard call frame item correctly', async () => {
      const container = document.createElement('div');
      const item = await createTestItem();
      const input: Sources.CallStackSidebarPane.ViewInput = {
        showIgnoreListMessage: false,
        showIgnoreListedChecked: false,
        onIgnoreListCheckboxChange: sinon.stub(),
        notPaused: false,
        warnings: undefined,
        items: [item],
        selectedItem: null,
        focusedItem: null,
        showIgnoreListed: false,
        onItemClick: sinon.stub(),
        onItemActivate: sinon.stub(),
        onItemContextMenu: sinon.stub(),
        onItemKeyDown: sinon.stub(),
        showMore: false,
        onShowMore: sinon.stub(),
      };

      Sources.CallStackSidebarPane.DEFAULT_VIEW(input, undefined, container);

      const list = container.querySelector('.call-frame-list');
      assert.exists(list);
      assert.strictEqual(list.getAttribute('role'), 'listbox');
      assert.isFalse(list.hasAttribute('hidden'));

      const element = container.querySelector<HTMLElement>('.call-frame-item');
      assert.exists(element);
      assert.strictEqual(element.getAttribute('role'), 'option');
      assert.strictEqual(element.getAttribute('aria-setsize'), '1');
      assert.strictEqual(element.getAttribute('aria-posinset'), '1');
      assert.strictEqual(element.getAttribute('aria-selected'), 'false');
      assert.isFalse(element.hasAttribute('aria-disabled'));
      assert.isFalse(element.classList.contains('selected'));
      assert.isFalse(element.classList.contains('async-header'));
      assert.strictEqual(element.tabIndex, -1);
      assert.isFalse(element.hasAttribute('autofocus'));

      const titleText = element.querySelector('.call-frame-title-text');
      assert.exists(titleText);
      assert.strictEqual(titleText.textContent, item.title);
      assert.strictEqual(titleText.getAttribute('title'), item.title);

      const location = element.querySelector('.call-frame-location');
      assert.exists(location);
      assert.strictEqual(location.getAttribute('title'), item.linkText);

      assert.include(element.getAttribute('jslog') ?? '', 'Item');
    });

    it('renders selected and focused call frame item with autofocus', async () => {
      const container = document.createElement('div');
      const item = await createTestItem();
      const input: Sources.CallStackSidebarPane.ViewInput = {
        showIgnoreListMessage: false,
        showIgnoreListedChecked: false,
        onIgnoreListCheckboxChange: sinon.stub(),
        notPaused: false,
        warnings: undefined,
        items: [item],
        selectedItem: item,
        focusedItem: item,
        showIgnoreListed: false,
        onItemClick: sinon.stub(),
        onItemActivate: sinon.stub(),
        onItemContextMenu: sinon.stub(),
        onItemKeyDown: sinon.stub(),
        showMore: false,
        onShowMore: sinon.stub(),
      };

      Sources.CallStackSidebarPane.DEFAULT_VIEW(input, undefined, container);

      const element = container.querySelector<HTMLElement>('.call-frame-item');
      assert.exists(element);
      assert.isTrue(element.classList.contains('selected'));
      assert.strictEqual(element.getAttribute('aria-selected'), 'true');
      assert.strictEqual(element.tabIndex, 0);
      assert.isTrue(element.hasAttribute('autofocus'));
    });

    it('renders ignore listed call frame hidden when showIgnoreListed is false', async () => {
      const container = document.createElement('div');
      const item = await createTestItem({isIgnoreListed: true});
      const input: Sources.CallStackSidebarPane.ViewInput = {
        showIgnoreListMessage: false,
        showIgnoreListedChecked: false,
        onIgnoreListCheckboxChange: sinon.stub(),
        notPaused: false,
        warnings: undefined,
        items: [item],
        selectedItem: null,
        focusedItem: item,
        showIgnoreListed: false,
        onItemClick: sinon.stub(),
        onItemActivate: sinon.stub(),
        onItemContextMenu: sinon.stub(),
        onItemKeyDown: sinon.stub(),
        showMore: false,
        onShowMore: sinon.stub(),
      };

      Sources.CallStackSidebarPane.DEFAULT_VIEW(input, undefined, container);

      const element = container.querySelector('.call-frame-item');
      assert.exists(element);
      assert.isTrue(element.classList.contains('ignore-listed-call-frame'));
      assert.isTrue(element.hasAttribute('hidden'));
      assert.strictEqual(element.getAttribute('aria-description'), 'on ignore list');
      assert.isFalse(element.hasAttribute('autofocus'));
    });

    it('renders ignore listed call frame visible when showIgnoreListed is true', async () => {
      const container = document.createElement('div');
      const item = await createTestItem({isIgnoreListed: true});
      const input: Sources.CallStackSidebarPane.ViewInput = {
        showIgnoreListMessage: false,
        showIgnoreListedChecked: false,
        onIgnoreListCheckboxChange: sinon.stub(),
        notPaused: false,
        warnings: undefined,
        items: [item],
        selectedItem: null,
        focusedItem: null,
        showIgnoreListed: true,
        onItemClick: sinon.stub(),
        onItemActivate: sinon.stub(),
        onItemContextMenu: sinon.stub(),
        onItemKeyDown: sinon.stub(),
        showMore: false,
        onShowMore: sinon.stub(),
      };

      Sources.CallStackSidebarPane.DEFAULT_VIEW(input, undefined, container);

      const element = container.querySelector('.call-frame-item');
      assert.exists(element);
      assert.isTrue(element.classList.contains('ignore-listed-call-frame'));
      assert.isFalse(element.hasAttribute('hidden'));
    });

    it('renders async header item without location and without title tooltip', () => {
      const container = document.createElement('div');
      const stackTrace = StubStackTrace.create([], [{description: 'setTimeout', frames: []}]);
      const item = Sources.CallStackSidebarPane.Item.createForAsyncHeader(stackTrace, stackTrace.asyncFragments[0]);
      const input: Sources.CallStackSidebarPane.ViewInput = {
        showIgnoreListMessage: false,
        showIgnoreListedChecked: false,
        onIgnoreListCheckboxChange: sinon.stub(),
        notPaused: false,
        warnings: undefined,
        items: [item],
        selectedItem: null,
        focusedItem: null,
        showIgnoreListed: false,
        onItemClick: sinon.stub(),
        onItemActivate: sinon.stub(),
        onItemContextMenu: sinon.stub(),
        onItemKeyDown: sinon.stub(),
        showMore: false,
        onShowMore: sinon.stub(),
      };

      Sources.CallStackSidebarPane.DEFAULT_VIEW(input, undefined, container);

      const element = container.querySelector('.call-frame-item');
      assert.exists(element);
      assert.isTrue(element.classList.contains('async-header'));
      assert.isFalse(element.hasAttribute('aria-disabled'));
      assert.isNull(element.querySelector('.call-frame-location'));

      const titleText = element.querySelector('.call-frame-title-text');
      assert.exists(titleText);
      assert.strictEqual(titleText.textContent, 'setTimeout');
      assert.isFalse(titleText.hasAttribute('title'));
    });

    it('renders warning icon when frame has missing debug info', async () => {
      const container = document.createElement('div');
      const item = await createTestItem({
        missingDebugInfo: {
          type: StackTrace.StackTrace.MissingDebugInfoType.NO_INFO,
        },
      });
      const input: Sources.CallStackSidebarPane.ViewInput = {
        showIgnoreListMessage: false,
        showIgnoreListedChecked: false,
        onIgnoreListCheckboxChange: sinon.stub(),
        notPaused: false,
        warnings: undefined,
        items: [item],
        selectedItem: null,
        focusedItem: null,
        showIgnoreListed: false,
        onItemClick: sinon.stub(),
        onItemActivate: sinon.stub(),
        onItemContextMenu: sinon.stub(),
        onItemKeyDown: sinon.stub(),
        showMore: false,
        onShowMore: sinon.stub(),
      };

      Sources.CallStackSidebarPane.DEFAULT_VIEW(input, undefined, container);

      const warningIcon = container.querySelector('.call-frame-item .call-frame-warning-icon');
      assert.exists(warningIcon);
      assert.include(warningIcon.getAttribute('title') ?? '', 'No debug information');
    });

    it('triggers onItemClick with item on item click', async () => {
      const container = document.createElement('div');
      const onItemClick = sinon.stub();
      const item = await createTestItem();
      const input: Sources.CallStackSidebarPane.ViewInput = {
        showIgnoreListMessage: false,
        showIgnoreListedChecked: false,
        onIgnoreListCheckboxChange: sinon.stub(),
        notPaused: false,
        warnings: undefined,
        items: [item],
        selectedItem: null,
        focusedItem: null,
        showIgnoreListed: false,
        onItemClick,
        onItemActivate: sinon.stub(),
        onItemContextMenu: sinon.stub(),
        onItemKeyDown: sinon.stub(),
        showMore: false,
        onShowMore: sinon.stub(),
      };

      Sources.CallStackSidebarPane.DEFAULT_VIEW(input, undefined, container);

      const element = container.querySelector<HTMLElement>('.call-frame-item');
      assert.exists(element);
      dispatchClickEvent(element, {bubbles: true});
      sinon.assert.calledOnceWithExactly(onItemClick, item);
    });

    it('triggers onItemActivate with item on Enter and Space keydown', async () => {
      const container = document.createElement('div');
      const onItemActivate = sinon.stub();
      const item = await createTestItem();
      const input: Sources.CallStackSidebarPane.ViewInput = {
        showIgnoreListMessage: false,
        showIgnoreListedChecked: false,
        onIgnoreListCheckboxChange: sinon.stub(),
        notPaused: false,
        warnings: undefined,
        items: [item],
        selectedItem: null,
        focusedItem: null,
        showIgnoreListed: false,
        onItemClick: sinon.stub(),
        onItemActivate,
        onItemContextMenu: sinon.stub(),
        onItemKeyDown: sinon.stub(),
        showMore: false,
        onShowMore: sinon.stub(),
      };

      Sources.CallStackSidebarPane.DEFAULT_VIEW(input, undefined, container);

      const element = container.querySelector<HTMLElement>('.call-frame-item');
      assert.exists(element);

      element.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
      sinon.assert.calledOnceWithExactly(onItemActivate, item);

      element.dispatchEvent(new KeyboardEvent('keydown', {key: ' ', bubbles: true}));
      sinon.assert.calledTwice(onItemActivate);
      sinon.assert.calledWithExactly(onItemActivate.secondCall, item);
    });

    it('triggers onItemKeyDown with item on ArrowDown, ArrowUp, Home, End keydown', async () => {
      const container = document.createElement('div');
      const onItemKeyDown = sinon.stub();
      const item = await createTestItem();
      const input: Sources.CallStackSidebarPane.ViewInput = {
        showIgnoreListMessage: false,
        showIgnoreListedChecked: false,
        onIgnoreListCheckboxChange: sinon.stub(),
        notPaused: false,
        warnings: undefined,
        items: [item],
        selectedItem: null,
        focusedItem: null,
        showIgnoreListed: false,
        onItemClick: sinon.stub(),
        onItemActivate: sinon.stub(),
        onItemContextMenu: sinon.stub(),
        onItemKeyDown,
        showMore: false,
        onShowMore: sinon.stub(),
      };

      Sources.CallStackSidebarPane.DEFAULT_VIEW(input, undefined, container);

      const element = container.querySelector<HTMLElement>('.call-frame-item');
      assert.exists(element);

      element.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
      sinon.assert.calledWithExactly(onItemKeyDown, item, 'ArrowDown');

      element.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true}));
      sinon.assert.calledWithExactly(onItemKeyDown, item, 'ArrowUp');

      element.dispatchEvent(new KeyboardEvent('keydown', {key: 'Home', bubbles: true}));
      sinon.assert.calledWithExactly(onItemKeyDown, item, 'Home');

      element.dispatchEvent(new KeyboardEvent('keydown', {key: 'End', bubbles: true}));
      sinon.assert.calledWithExactly(onItemKeyDown, item, 'End');
    });

    it('triggers onItemContextMenu with item and ContextMenu and shows menu on contextmenu event', async () => {
      const container = document.createElement('div');
      const onItemContextMenu = sinon.stub();
      const showStub = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
      const item = await createTestItem();
      const input: Sources.CallStackSidebarPane.ViewInput = {
        showIgnoreListMessage: false,
        showIgnoreListedChecked: false,
        onIgnoreListCheckboxChange: sinon.stub(),
        notPaused: false,
        warnings: undefined,
        items: [item],
        selectedItem: null,
        focusedItem: null,
        showIgnoreListed: false,
        onItemClick: sinon.stub(),
        onItemActivate: sinon.stub(),
        onItemContextMenu,
        onItemKeyDown: sinon.stub(),
        showMore: false,
        onShowMore: sinon.stub(),
      };

      Sources.CallStackSidebarPane.DEFAULT_VIEW(input, undefined, container);

      const element = container.querySelector<HTMLElement>('.call-frame-item');
      assert.exists(element);
      element.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true}));
      sinon.assert.calledOnceWithMatch(onItemContextMenu, sinon.match.same(item),
                                       sinon.match.instanceOf(UI.ContextMenu.ContextMenu));
      sinon.assert.calledOnce(showStub);
    });
  });

  describe('Keyboard navigation and selection', () => {
    function getPausedDetailsWithMultipleFrames() {
      const target = createTarget();
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assert.exists(debuggerModel);

      const url1 = Platform.DevToolsPath.urlString`http://example.com/script1.js`;
      const url2 = Platform.DevToolsPath.urlString`http://example.com/script2.js`;
      const url3 = Platform.DevToolsPath.urlString`http://example.com/script3.js`;

      const scriptId1 = 'scriptId1' as Protocol.Runtime.ScriptId;
      const scriptId2 = 'scriptId2' as Protocol.Runtime.ScriptId;
      const scriptId3 = 'scriptId3' as Protocol.Runtime.ScriptId;

      debuggerModel.parsedScriptSource(scriptId1, url1, 0, 0, 0, 0, 0, '', undefined, undefined, false, false, 0, null,
                                       null, null, null, null, null, null);
      debuggerModel.parsedScriptSource(scriptId2, url2, 0, 0, 0, 0, 0, '', undefined, undefined, false, false, 0, null,
                                       null, null, null, null, null, null);
      debuggerModel.parsedScriptSource(scriptId3, url3, 0, 0, 0, 0, 0, '', undefined, undefined, false, false, 0, null,
                                       null, null, null, null, null, null);

      const frame1 = debuggerCallFrame(`${url1}:${scriptId1}:func1:0:0`);
      const frame2 = debuggerCallFrame(`${url2}:${scriptId2}:func2:0:0`);
      const frame3 = debuggerCallFrame(`${url3}:${scriptId3}:func3:0:0`);

      const details = new SDK.DebuggerModel.DebuggerPausedDetails(
          debuggerModel, [frame1, frame2, frame3], Protocol.Debugger.PausedEventReason.Other, {}, [], undefined);
      return {details, debuggerModel, url2};
    }

    it('navigates visible call frames with ArrowUp and ArrowDown skipping hidden ignore-listed frames', async () => {
      const {details, url2} = getPausedDetailsWithMultipleFrames();
      Workspace.IgnoreListManager.IgnoreListManager.instance().ignoreListURL(url2);

      const callStackSidebarPane = Sources.CallStackSidebarPane.CallStackSidebarPane.instance({forceNew: true});
      renderElementIntoDOM(callStackSidebarPane);

      await callStackSidebarPane.flavorChanged(details);
      await callStackSidebarPane.updateComplete;

      const items = callStackSidebarPane.contentElement.querySelectorAll<HTMLElement>('.call-frame-item');
      assert.lengthOf(items, 3);
      assert.strictEqual(items[0].tabIndex, 0);
      assert.isTrue(items[1].hasAttribute('hidden'));
      assert.strictEqual(items[2].tabIndex, -1);

      // Press ArrowDown on items[0] -> skips hidden items[1] and focuses items[2]
      items[0].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
      await callStackSidebarPane.updateComplete;

      const itemsAfterDown = callStackSidebarPane.contentElement.querySelectorAll<HTMLElement>('.call-frame-item');
      assert.strictEqual(itemsAfterDown[0].tabIndex, -1);
      assert.strictEqual(itemsAfterDown[2].tabIndex, 0);

      // Press ArrowDown on items[2] -> wraps around skipping items[1] and focuses items[0]
      itemsAfterDown[2].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
      await callStackSidebarPane.updateComplete;

      const itemsAfterWrap = callStackSidebarPane.contentElement.querySelectorAll<HTMLElement>('.call-frame-item');
      assert.strictEqual(itemsAfterWrap[0].tabIndex, 0);
      assert.strictEqual(itemsAfterWrap[2].tabIndex, -1);

      // Press ArrowUp on items[0] -> wraps backward skipping items[1] and focuses items[2]
      itemsAfterWrap[0].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true}));
      await callStackSidebarPane.updateComplete;

      const itemsAfterUpWrap = callStackSidebarPane.contentElement.querySelectorAll<HTMLElement>('.call-frame-item');
      assert.strictEqual(itemsAfterUpWrap[0].tabIndex, -1);
      assert.strictEqual(itemsAfterUpWrap[2].tabIndex, 0);

      callStackSidebarPane.detach();
    });

    it('navigates to first and last visible call frames with Home and End', async () => {
      const {details, url2} = getPausedDetailsWithMultipleFrames();
      Workspace.IgnoreListManager.IgnoreListManager.instance().ignoreListURL(url2);

      const callStackSidebarPane = Sources.CallStackSidebarPane.CallStackSidebarPane.instance({forceNew: true});
      renderElementIntoDOM(callStackSidebarPane);

      await callStackSidebarPane.flavorChanged(details);
      await callStackSidebarPane.updateComplete;

      const items = callStackSidebarPane.contentElement.querySelectorAll<HTMLElement>('.call-frame-item');

      // Press End on items[0] -> navigates to last visible item (items[2])
      items[0].dispatchEvent(new KeyboardEvent('keydown', {key: 'End', bubbles: true}));
      await callStackSidebarPane.updateComplete;

      const itemsAfterEnd = callStackSidebarPane.contentElement.querySelectorAll<HTMLElement>('.call-frame-item');
      assert.strictEqual(itemsAfterEnd[0].tabIndex, -1);
      assert.strictEqual(itemsAfterEnd[2].tabIndex, 0);

      // Press Home on items[2] -> navigates to first visible item (items[0])
      itemsAfterEnd[2].dispatchEvent(new KeyboardEvent('keydown', {key: 'Home', bubbles: true}));
      await callStackSidebarPane.updateComplete;

      const itemsAfterHome = callStackSidebarPane.contentElement.querySelectorAll<HTMLElement>('.call-frame-item');
      assert.strictEqual(itemsAfterHome[0].tabIndex, 0);
      assert.strictEqual(itemsAfterHome[2].tabIndex, -1);

      callStackSidebarPane.detach();
    });

    it('selectNextCallFrameOnStack and selectPreviousCallFrameOnStack activate next/previous call frame', async () => {
      UI.Context.Context.instance().setFlavor(Sources.SourcesPanel.SourcesPanel,
                                              sinon.createStubInstance(Sources.SourcesPanel.SourcesPanel));
      const {details, debuggerModel} = getPausedDetailsWithMultipleFrames();
      const callStackSidebarPane = Sources.CallStackSidebarPane.CallStackSidebarPane.instance({forceNew: true});
      renderElementIntoDOM(callStackSidebarPane);

      await callStackSidebarPane.flavorChanged(details);
      await callStackSidebarPane.updateComplete;

      const setSelectedCallFrameSpy = sinon.spy(debuggerModel, 'setSelectedCallFrame');

      callStackSidebarPane.selectNextCallFrameOnStack();
      await callStackSidebarPane.updateComplete;

      sinon.assert.calledOnce(setSelectedCallFrameSpy);
      assert.strictEqual(setSelectedCallFrameSpy.firstCall.args[0], details.callFrames[1]);

      callStackSidebarPane.selectPreviousCallFrameOnStack();
      await callStackSidebarPane.updateComplete;

      sinon.assert.calledTwice(setSelectedCallFrameSpy);
      assert.strictEqual(setSelectedCallFrameSpy.secondCall.args[0], details.callFrames[0]);

      callStackSidebarPane.detach();
    });

    it('preserves selected call frame when toggling ignore-listed frames checkbox', async () => {
      UI.Context.Context.instance().setFlavor(Sources.SourcesPanel.SourcesPanel,
                                              sinon.createStubInstance(Sources.SourcesPanel.SourcesPanel));
      UI.Context.Context.instance().setFlavor(Sources.SourcesPanel.QuickSourceView, null);

      const {details, url2} = getPausedDetailsWithMultipleFrames();
      Workspace.IgnoreListManager.IgnoreListManager.instance().ignoreListURL(url2);

      const callStackSidebarPane = Sources.CallStackSidebarPane.CallStackSidebarPane.instance({forceNew: true});
      renderElementIntoDOM(callStackSidebarPane);

      await callStackSidebarPane.flavorChanged(details);
      await callStackSidebarPane.updateComplete;

      let items = callStackSidebarPane.contentElement.querySelectorAll<HTMLElement>('.call-frame-item');
      assert.lengthOf(items, 3);
      assert.isTrue(items[1].hasAttribute('hidden'));
      assert.strictEqual(UI.Context.Context.instance()
                             .flavor(StackTrace.StackTrace.DebuggableFrameFlavor)
                             ?.frame.sdkFrame.functionName,
                         'func1');

      dispatchClickEvent(items[2], {bubbles: true});
      await callStackSidebarPane.updateComplete;

      assert.strictEqual(UI.Context.Context.instance()
                             .flavor(StackTrace.StackTrace.DebuggableFrameFlavor)
                             ?.frame.sdkFrame.functionName,
                         'func3');
      assert.strictEqual(callStackSidebarPane.activeCallFrameItem()?.title, 'func3');

      const checkbox = callStackSidebarPane.contentElement.querySelector<HTMLInputElement>('.ignore-listed-checkbox');
      assert.exists(checkbox);
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      await callStackSidebarPane.updateComplete;

      items = callStackSidebarPane.contentElement.querySelectorAll<HTMLElement>('.call-frame-item');
      assert.isFalse(items[1].hasAttribute('hidden'));
      assert.strictEqual(UI.Context.Context.instance()
                             .flavor(StackTrace.StackTrace.DebuggableFrameFlavor)
                             ?.frame.sdkFrame.functionName,
                         'func3');
      assert.strictEqual(callStackSidebarPane.activeCallFrameItem()?.title, 'func3');
      assert.isTrue(items[2].classList.contains('selected'));
      assert.strictEqual(items[2].tabIndex, 0);

      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change'));
      await callStackSidebarPane.updateComplete;

      items = callStackSidebarPane.contentElement.querySelectorAll<HTMLElement>('.call-frame-item');
      assert.isTrue(items[1].hasAttribute('hidden'));
      assert.strictEqual(UI.Context.Context.instance()
                             .flavor(StackTrace.StackTrace.DebuggableFrameFlavor)
                             ?.frame.sdkFrame.functionName,
                         'func3');
      assert.strictEqual(callStackSidebarPane.activeCallFrameItem()?.title, 'func3');
      assert.isTrue(items[2].classList.contains('selected'));
      assert.strictEqual(items[2].tabIndex, 0);

      callStackSidebarPane.detach();
    });
  });

  describe('ViewInput integration', () => {
    it('passes expected view input when not paused and when paused', async () => {
      const view = createViewFunctionStub(Sources.CallStackSidebarPane.CallStackSidebarPane);
      const pane = new Sources.CallStackSidebarPane.CallStackSidebarPane(undefined, view);
      renderElementIntoDOM(pane);

      await view.nextInput;
      assert.isTrue(view.input.notPaused);
      assert.isFalse(view.input.showMore);
      assert.isUndefined(view.input.warnings);
      assert.deepEqual(view.input.items, []);
      assert.isNull(view.input.selectedItem);
      assert.isNull(view.input.focusedItem);
      assert.isFunction(view.input.onItemClick);
      assert.isFunction(view.input.onItemActivate);
      assert.isFunction(view.input.onItemContextMenu);
      assert.isFunction(view.input.onItemKeyDown);

      const {details} = getPausedDetails();
      await pane.flavorChanged(details);
      await pane.updateComplete;

      assert.isFalse(view.input.notPaused);
      assert.lengthOf(view.input.items, 3);
      assert.strictEqual(view.input.focusedItem, view.input.items[0]);
      assert.strictEqual(view.input.items[0].title, 'testFunction');
      assert.isFalse(view.input.items[0].isAsyncHeader);
      assert.strictEqual(view.input.items[1].title, 'setTimeout');
      assert.isTrue(view.input.items[1].isAsyncHeader);
      assert.strictEqual(view.input.items[2].title, 'asyncParent');
      assert.isFalse(view.input.items[2].isAsyncHeader);

      pane.detach();
    });

    it('populates ContextMenu when onItemContextMenu is invoked', async () => {
      const view = createViewFunctionStub(Sources.CallStackSidebarPane.CallStackSidebarPane);
      const pane = new Sources.CallStackSidebarPane.CallStackSidebarPane(undefined, view);
      renderElementIntoDOM(pane);

      await view.nextInput;

      const {details} = getPausedDetails();
      await pane.flavorChanged(details);
      await pane.updateComplete;

      const contextMenu = new UI.ContextMenu.ContextMenu(new MouseEvent('contextmenu'));
      view.input.onItemContextMenu(view.input.items[0], contextMenu);

      const defaultItems =
          contextMenu.defaultSection().items.map((menuItem: UI.ContextMenu.Item) => menuItem.buildDescriptor().label);
      assert.include(defaultItems, 'Restart frame');
      assert.include(defaultItems, 'Copy stack trace');

      pane.detach();
    });

    it('passes warnings in view input when debug info is missing', async () => {
      const view = createViewFunctionStub(Sources.CallStackSidebarPane.CallStackSidebarPane);
      const pane = new Sources.CallStackSidebarPane.CallStackSidebarPane(undefined, view);
      renderElementIntoDOM(pane);

      await view.nextInput;

      const {details} = getPausedDetails();
      const binding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
      const stackTrace = await binding.createStackTraceFromDebuggerPaused(details, details.debuggerModel.target());
      const mockFrame: StackTrace.StackTrace.DebuggableFrame = {
        name: 'testFunction',
        line: 0,
        column: 0,
        missingDebugInfo: {
          type: StackTrace.StackTrace.MissingDebugInfoType.NO_INFO,
        },
        sdkFrame: details.callFrames[0],
        toUiLocation: () => null,
      };
      sinon.stub(stackTrace.syncFragment, 'frames').get(() => [mockFrame]);
      sinon.stub(binding, 'createStackTraceFromDebuggerPaused').resolves(stackTrace);

      await pane.flavorChanged(details);
      await pane.updateComplete;

      assert.exists(view.input.warnings);
      assert.include(view.input.warnings, 'No debug information');
      pane.detach();
    });
  });
});
