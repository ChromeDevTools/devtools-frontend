// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Logs from '../../models/logs/logs.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Console from './console.js';

const CONSOLE_ACTIONS = ['console.clear', 'console.clear.history', 'console.create-pin'];

describe('ConsolePanel', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let consoleView: Console.ConsoleView.ConsoleView;
  let inspectorView: sinon.SinonStubbedInstance<UI.InspectorView.InspectorView>;
  let panel: Console.ConsolePanel.ConsolePanel|undefined;
  let wrapper: Console.ConsolePanel.WrapperView|undefined;

  beforeEach(() => {
    const universe = new TestUniverse();
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
    sinon.stub(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, 'instance').returns(universe.cssWorkspaceBinding);
    sinon.stub(Workspace.IgnoreListManager.IgnoreListManager, 'instance').returns(universe.ignoreListManager);
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);
    sinon.stub(IssuesManager.IssuesManager.IssuesManager, 'instance').returns(universe.issuesManager);
    sinon.stub(Common.Settings.Settings, 'instance').returns(universe.settings);
    sinon.stub(Workspace.Workspace.WorkspaceImpl, 'instance').returns(universe.workspace);
    sinon.stub(Logs.NetworkLog.NetworkLog, 'instance').returns(universe.networkLog);
    UI.ZoomManager.ZoomManager.instance(
        {forceNew: true, win: window, frontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance});

    for (const actionId of CONSOLE_ACTIONS) {
      UI.ActionRegistration.maybeRemoveActionExtension(actionId);
      UI.ActionRegistration.registerActionExtension({
        actionId,
        category: UI.ActionRegistration.ActionCategory.NONE,
        title: () => Platform.UIString.LocalizedEmptyString,
      });
    }
    const actionRegistry = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry});

    consoleView = Console.ConsoleView.ConsoleView.instance({forceNew: true, viewportThrottlerTimeout: 0});
    inspectorView = sinon.createStubInstance(UI.InspectorView.InspectorView);
    inspectorView.isDrawerMinimized.returns(false);
    sinon.stub(UI.InspectorView.InspectorView, 'instance').returns(inspectorView);
  });

  afterEach(() => {
    panel?.detach();
    panel = undefined;
    wrapper?.detach();
    wrapper = undefined;
    Console.ConsolePanel.ConsolePanel.removeInstance();
    Console.ConsolePanel.WrapperView.removeInstance();
    consoleView?.dispose();
    Console.ConsoleView.ConsoleView.clearConsoleViewInstanceForTest();
    consoleView?.detach();
    UI.Context.Context.instance().setFlavor(Console.ConsoleView.ConsoleView, null);
    UI.ZoomManager.ZoomManager.removeInstance();
    UI.ShortcutRegistry.ShortcutRegistry.removeInstance();
    UI.ActionRegistry.ActionRegistry.reset();
    for (const actionId of CONSOLE_ACTIONS) {
      UI.ActionRegistration.maybeRemoveActionExtension(actionId);
    }
  });

  describe('DEFAULT_VIEW', () => {
    it('mounts ConsoleView with panel jslog when showConsoleView is true', () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);

      Console.ConsolePanel.DEFAULT_VIEW({showConsoleView: true}, undefined, target);

      assert.strictEqual(target.getAttribute('jslog'), 'Panel; context: console; track: resize');
      assert.isTrue(target.contains(consoleView.element));

      Console.ConsolePanel.DEFAULT_VIEW({showConsoleView: false}, undefined, target);
    });

    it('detaches ConsoleView when showConsoleView becomes false', () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);

      Console.ConsolePanel.DEFAULT_VIEW({showConsoleView: true}, undefined, target);
      Console.ConsolePanel.DEFAULT_VIEW({showConsoleView: false}, undefined, target);

      assert.strictEqual(target.getAttribute('jslog'), 'Panel; context: console; track: resize');
      assert.isFalse(target.contains(consoleView.element));
    });
  });

  it('transfers ConsoleView from WrapperView to ConsolePanel when panel is shown', () => {
    const wrapperView = createViewFunctionStub(Console.ConsolePanel.WrapperView);
    wrapper = Console.ConsolePanel.WrapperView.instance({forceNew: true, view: wrapperView});
    const panelView = createViewFunctionStub(Console.ConsolePanel.ConsolePanel);
    panel = Console.ConsolePanel.ConsolePanel.instance({forceNew: true, view: panelView});

    renderElementIntoDOM(wrapper);
    assert.deepEqual(wrapperView.input, {showConsoleView: true});

    renderElementIntoDOM(panel, {allowMultipleChildren: true});
    assert.deepEqual(wrapperView.input, {showConsoleView: false});
    assert.deepEqual(panelView.input, {showConsoleView: true});
    sinon.assert.calledOnceWithExactly(inspectorView.setDrawerMinimized, true);
  });

  it('restores ConsoleView to WrapperView with prior minimized drawer state when panel hides', () => {
    inspectorView.isDrawerMinimized.returns(true);
    const wrapperView = createViewFunctionStub(Console.ConsolePanel.WrapperView);
    wrapper = Console.ConsolePanel.WrapperView.instance({forceNew: true, view: wrapperView});
    const panelView = createViewFunctionStub(Console.ConsolePanel.ConsolePanel);
    panel = Console.ConsolePanel.ConsolePanel.instance({forceNew: true, view: panelView});

    renderElementIntoDOM(wrapper);
    renderElementIntoDOM(panel, {allowMultipleChildren: true});
    inspectorView.setDrawerMinimized.resetHistory();

    panel.detach();

    assert.deepEqual(panelView.input, {showConsoleView: false});
    assert.deepEqual(wrapperView.input, {showConsoleView: true});
    assert.deepEqual(inspectorView.setDrawerMinimized.args, [[false], [true]]);
  });

  it('keeps drawer unminimized when panel hides if drawer started unminimized', () => {
    inspectorView.isDrawerMinimized.returns(false);
    const wrapperView = createViewFunctionStub(Console.ConsolePanel.WrapperView);
    wrapper = Console.ConsolePanel.WrapperView.instance({forceNew: true, view: wrapperView});
    const panelView = createViewFunctionStub(Console.ConsolePanel.ConsolePanel);
    panel = Console.ConsolePanel.ConsolePanel.instance({forceNew: true, view: panelView});

    renderElementIntoDOM(wrapper);
    renderElementIntoDOM(panel, {allowMultipleChildren: true});
    inspectorView.setDrawerMinimized.resetHistory();

    panel.detach();

    assert.deepEqual(inspectorView.setDrawerMinimized.args, [[false]]);
  });

  it('minimizes drawer without claiming ConsoleView when WrapperView opens while panel is showing', () => {
    const panelView = createViewFunctionStub(Console.ConsolePanel.ConsolePanel);
    panel = Console.ConsolePanel.ConsolePanel.instance({forceNew: true, view: panelView});
    renderElementIntoDOM(panel);
    inspectorView.setDrawerMinimized.resetHistory();

    const wrapperView = createViewFunctionStub(Console.ConsolePanel.WrapperView);
    wrapper = Console.ConsolePanel.WrapperView.instance({forceNew: true, view: wrapperView});
    renderElementIntoDOM(wrapper, {allowMultipleChildren: true});

    assert.deepEqual(wrapperView.input, {showConsoleView: false});
    sinon.assert.calledOnceWithExactly(inspectorView.setDrawerMinimized, true);
  });

  it('reparents ConsoleView DOM element between WrapperView and ConsolePanel', () => {
    wrapper = Console.ConsolePanel.WrapperView.instance({forceNew: true});
    panel = Console.ConsolePanel.ConsolePanel.instance({forceNew: true});

    renderElementIntoDOM(wrapper);
    assert.isTrue(wrapper.contentElement.contains(consoleView.element));

    renderElementIntoDOM(panel, {allowMultipleChildren: true});
    assert.isFalse(wrapper.contentElement.contains(consoleView.element));
    assert.isTrue(panel.contentElement.contains(consoleView.element));

    panel.detach();
    assert.isFalse(panel.contentElement.contains(consoleView.element));
    assert.isTrue(wrapper.contentElement.contains(consoleView.element));
  });

  it('updates ConsoleView context flavor on show and hide', () => {
    panel = Console.ConsolePanel.ConsolePanel.instance({forceNew: true});

    renderElementIntoDOM(panel);
    assert.strictEqual(UI.Context.Context.instance().flavor(Console.ConsoleView.ConsoleView), consoleView);

    panel.detach();
    assert.isNull(UI.Context.Context.instance().flavor(Console.ConsoleView.ConsoleView));
  });

  it('delegates searchableView to ConsoleView', () => {
    panel = Console.ConsolePanel.ConsolePanel.instance({forceNew: true});
    assert.strictEqual(panel.searchableView(), consoleView.searchableView());
  });

  it('delegates WrapperView.insertIntoPrompt to ConsoleView', () => {
    const insertStub = sinon.stub(consoleView, 'insertIntoPrompt');
    wrapper = Console.ConsolePanel.WrapperView.instance({forceNew: true});

    wrapper.insertIntoPrompt('console.log(42)');

    sinon.assert.calledOnceWithExactly(insertStub, 'console.log(42)');
  });

  describe('ConsoleRevealer', () => {
    it('focuses ConsoleView directly when already showing', async () => {
      sinon.stub(consoleView, 'isShowing').returns(true);
      const focusStub = sinon.stub(consoleView, 'focus');
      const viewManager = sinon.createStubInstance(UI.ViewManager.ViewManager);
      sinon.stub(UI.ViewManager.ViewManager, 'instance').returns(viewManager);

      const revealer = new Console.ConsolePanel.ConsoleRevealer();
      await revealer.reveal(Common.Console.Console.instance());

      sinon.assert.calledOnce(focusStub);
      sinon.assert.notCalled(viewManager.showView);
    });

    it('opens console-view via ViewManager when ConsoleView is hidden', async () => {
      sinon.stub(consoleView, 'isShowing').returns(false);
      const viewManager = sinon.createStubInstance(UI.ViewManager.ViewManager);
      viewManager.showView.resolves();
      sinon.stub(UI.ViewManager.ViewManager, 'instance').returns(viewManager);

      const revealer = new Console.ConsolePanel.ConsoleRevealer();
      await revealer.reveal(Common.Console.Console.instance());

      sinon.assert.calledOnceWithExactly(viewManager.showView, 'console-view');
    });
  });
});
