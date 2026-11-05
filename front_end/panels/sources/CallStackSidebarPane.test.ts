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
import {html} from '../../ui/lit/lit.js';

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

  describe('DEFAULT_VIEW', () => {
    it('renders not paused message when not paused', () => {
      const container = document.createElement('div');
      const input: Sources.CallStackSidebarPane.ViewInput = {
        showIgnoreListMessage: false,
        showIgnoreListedChecked: false,
        onIgnoreListCheckboxChange: sinon.stub(),
        notPaused: true,
        warnings: undefined,
        list: html`<div class="test-list"></div>`,
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
        list: html`<div class="test-list"></div>`,
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
        list: html`<div class="test-list"></div>`,
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
        list: html`<div class="test-list"></div>`,
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
  });

  describe('DEFAULT_ITEM_VIEW', () => {
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

    it('renders standard call frame item correctly', async () => {
      const item = await createTestItem();

      const fragment = document.createDocumentFragment();
      Sources.CallStackSidebarPane.DEFAULT_ITEM_VIEW(
          {
            item,
            isSelected: false,
            isFocused: false,
            showIgnoreListed: false,
          },
          undefined,
          fragment,
      );

      const element = fragment.firstElementChild;
      assert.instanceOf(element, HTMLElement);
      assert.isTrue(element.classList.contains('call-frame-item'));
      assert.isFalse(element.classList.contains('selected'));
      assert.isFalse(element.classList.contains('async-header'));
      assert.strictEqual(element.tabIndex, -1);
      assert.strictEqual(element.getAttribute('aria-selected'), 'false');

      const titleText = element.querySelector('.call-frame-title-text');
      assert.exists(titleText);
      assert.strictEqual(titleText.textContent, item.title);
      assert.strictEqual(titleText.getAttribute('title'), item.title);

      const location = element.querySelector('.call-frame-location');
      assert.exists(location);
      assert.strictEqual(location.getAttribute('title'), item.linkText);
    });

    it('renders selected and focused call frame item', async () => {
      const item = await createTestItem();

      const fragment = document.createDocumentFragment();
      Sources.CallStackSidebarPane.DEFAULT_ITEM_VIEW(
          {
            item,
            isSelected: true,
            isFocused: true,
            showIgnoreListed: false,
          },
          undefined,
          fragment,
      );

      const element = fragment.firstElementChild;
      assert.instanceOf(element, HTMLElement);
      assert.isTrue(element.classList.contains('selected'));
      assert.strictEqual(element.tabIndex, 0);
      assert.strictEqual(element.getAttribute('aria-selected'), 'true');
    });

    it('renders ignore listed call frame hidden when showIgnoreListed is false', async () => {
      const item = await createTestItem({isIgnoreListed: true});

      const fragment = document.createDocumentFragment();
      Sources.CallStackSidebarPane.DEFAULT_ITEM_VIEW(
          {
            item,
            isSelected: false,
            isFocused: false,
            showIgnoreListed: false,
          },
          undefined,
          fragment,
      );

      const element = fragment.firstElementChild;
      assert.instanceOf(element, HTMLElement);
      assert.isTrue(element.classList.contains('ignore-listed-call-frame'));
      assert.isTrue(element.hasAttribute('hidden'));
      assert.strictEqual(element.getAttribute('aria-description'), 'on ignore list');
    });

    it('renders ignore listed call frame visible when showIgnoreListed is true', async () => {
      const item = await createTestItem({isIgnoreListed: true});

      const fragment = document.createDocumentFragment();
      Sources.CallStackSidebarPane.DEFAULT_ITEM_VIEW(
          {
            item,
            isSelected: false,
            isFocused: false,
            showIgnoreListed: true,
          },
          undefined,
          fragment,
      );

      const element = fragment.firstElementChild;
      assert.instanceOf(element, HTMLElement);
      assert.isTrue(element.classList.contains('ignore-listed-call-frame'));
      assert.isFalse(element.hasAttribute('hidden'));
    });

    it('renders async header item without location', () => {
      const stackTrace = StubStackTrace.create([], [{description: 'setTimeout', frames: []}]);
      const item = Sources.CallStackSidebarPane.Item.createForAsyncHeader(
          stackTrace,
          stackTrace.asyncFragments[0],
      );

      const fragment = document.createDocumentFragment();
      Sources.CallStackSidebarPane.DEFAULT_ITEM_VIEW(
          {
            item,
            isSelected: false,
            isFocused: false,
            showIgnoreListed: false,
          },
          undefined,
          fragment,
      );

      const element = fragment.firstElementChild;
      assert.instanceOf(element, HTMLElement);
      assert.isTrue(element.classList.contains('async-header'));
      assert.isNull(element.querySelector('.call-frame-location'));
      const titleText = element.querySelector('.call-frame-title-text');
      assert.exists(titleText);
      assert.isFalse(titleText.hasAttribute('title'));
    });

    it('renders warning icon when frame has missing debug info', async () => {
      const item = await createTestItem({
        missingDebugInfo: {
          type: StackTrace.StackTrace.MissingDebugInfoType.NO_INFO,
        },
      });

      const fragment = document.createDocumentFragment();
      Sources.CallStackSidebarPane.DEFAULT_ITEM_VIEW(
          {
            item,
            isSelected: false,
            isFocused: false,
            showIgnoreListed: false,
          },
          undefined,
          fragment,
      );

      const element = fragment.firstElementChild;
      assert.instanceOf(element, HTMLElement);
      const warningIcon = element.querySelector('.call-frame-warning-icon');
      assert.exists(warningIcon);
      assert.include(warningIcon.getAttribute('title') ?? '', 'No debug information');
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

      const {details} = getPausedDetails();
      await pane.flavorChanged(details);
      await pane.updateComplete;

      assert.isFalse(view.input.notPaused);
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
