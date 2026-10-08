// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {
  describeWithEnvironment,
  registerActions,
  registerNoopActions,
} from '../../testing/EnvironmentHelpers.js';
import {
  createContentProviderUISourceCode,
  createFileSystemUISourceCode,
} from '../../testing/UISourceCodeHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as SettingsUI from '../../ui/settings/settings.js';

import * as Sources from './sources.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('SourcesPanel', () => {
  function setUpEnvironment() {
    registerNoopActions([
      'debugger.toggle-pause',
      'debugger.step-over',
      'debugger.step-into',
      'debugger.step-out',
      'debugger.step',
      'debugger.toggle-breakpoints-active',
    ]);
    const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      targetManager: SDK.TargetManager.TargetManager.instance(),
      resourceMapping:
          new Bindings.ResourceMapping.ResourceMapping(SDK.TargetManager.TargetManager.instance(), workspace),
      ignoreListManager: Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true}),
      workspace,
    });
    const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance({
      forceNew: true,
      targetManager: SDK.TargetManager.TargetManager.instance(),
      workspace,
      debuggerWorkspaceBinding,
      settings: Common.Settings.Settings.instance(),
    });
    Persistence.Persistence.PersistenceImpl.instance({forceNew: true, workspace, breakpointManager});
    const networkPersistenceManager =
        sinon.createStubInstance(Persistence.NetworkPersistenceManager.NetworkPersistenceManager);
    sinon.stub(Persistence.NetworkPersistenceManager.NetworkPersistenceManager, 'instance')
        .returns(networkPersistenceManager);
    sinon.stub(UI.ViewManager.ViewManager.instance(), 'view')
        .callsFake(() => sinon.createStubInstance(UI.View.SimpleView));
  }

  function createStubUISourceCode() {
    const uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
    uiSourceCode.contentType.returns(Common.ResourceType.resourceTypes.Script);
    const stubProject = sinon.createStubInstance(Bindings.ContentProviderBasedProject.ContentProviderBasedProject);
    uiSourceCode.project.returns(stubProject);
    stubProject.isServiceProject.returns(true);
    return uiSourceCode;
  }

  it('Shows Debug with Ai menu and submenu items', () => {
    registerActions([{
      actionId: 'drjones.sources-panel-context',
      title: () => 'Debug with AI' as Platform.UIString.LocalizedString,
      category: UI.ActionRegistration.ActionCategory.GLOBAL,
    }]);

    setUpEnvironment();

    const sources = new Sources.SourcesPanel.SourcesPanel();

    const event = new Event('contextmenu');
    sinon.stub(event, 'target').value(document);
    const contextMenu = new UI.ContextMenu.ContextMenu(event);

    const uiSourceCode = createStubUISourceCode();
    sources.appendApplicableItems(event, contextMenu, uiSourceCode);

    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(
        debugWithAiItem.subItems?.map(item => item.label),
        ['Start a chat', 'Assess performance', 'Explain this script', 'Explain input handling']);
  });

  it('notifies ViewManager when debugger sidebar is toggled', () => {
    setUpEnvironment();
    const sources = new Sources.SourcesPanel.SourcesPanel();
    const viewManager = UI.ViewManager.ViewManager.instance();
    const visibilitySpy = sinon.spy();
    viewManager.addEventListener(UI.ViewManager.Events.VIEW_VISIBILITY_CHANGED, visibilitySpy);

    sources.toggleDebuggerSidebar();

    sinon.assert.calledWith(
        visibilitySpy,
        sinon.match({data: sinon.match({location: sinon.match.string, revealedViewId: sinon.match.any})}));

    sources.toggleDebuggerSidebar();

    sinon.assert.calledWith(
        visibilitySpy, sinon.match({data: sinon.match({location: sinon.match.string, hiddenViewId: sinon.match.any})}));
  });
  it('clears the UISourceCode flavor when the editor for it is closed', () => {
    setUpEnvironment();
    const sources = new Sources.SourcesPanel.SourcesPanel();
    const context = UI.Context.Context.instance();
    const uiSourceCode = createStubUISourceCode();
    context.setFlavor(Workspace.UISourceCode.UISourceCode, uiSourceCode);

    sources.sourcesView().dispatchEventToListeners(Sources.SourcesView.Events.EDITOR_CLOSED,
                                                   {uiSourceCode, wasSelected: true});

    assert.isNull(context.flavor(Workspace.UISourceCode.UISourceCode));
  });

  it('keeps the UISourceCode flavor when the editor for another file is closed', () => {
    setUpEnvironment();
    const sources = new Sources.SourcesPanel.SourcesPanel();
    const context = UI.Context.Context.instance();
    const uiSourceCode = createStubUISourceCode();
    context.setFlavor(Workspace.UISourceCode.UISourceCode, uiSourceCode);

    sources.sourcesView().dispatchEventToListeners(Sources.SourcesView.Events.EDITOR_CLOSED,
                                                   {uiSourceCode: createStubUISourceCode(), wasSelected: false});

    assert.strictEqual(context.flavor(Workspace.UISourceCode.UISourceCode), uiSourceCode);
  });

  it('reveals UISourceCode in navigator when editor is selected and auto-reveal is enabled', () => {
    setUpEnvironment();
    const sources = new Sources.SourcesPanel.SourcesPanel();
    const revealStub = sinon.stub(sources, 'revealInNavigator');
    const uiSourceCode = createStubUISourceCode();

    Common.Settings.Settings.instance()
        .resolve(SettingsUI.SourcesSettings.autoRevealInNavigatorSettingDescriptor)
        .set(true);

    sources.sourcesView().dispatchEventToListeners(Sources.SourcesView.Events.EDITOR_SELECTED, uiSourceCode);

    sinon.assert.calledOnceWithExactly(revealStub, uiSourceCode, true);
  });

  it('does not reveal UISourceCode in navigator when editor is selected and auto-reveal is disabled', () => {
    setUpEnvironment();
    const sources = new Sources.SourcesPanel.SourcesPanel();
    const revealStub = sinon.stub(sources, 'revealInNavigator');
    const uiSourceCode = createStubUISourceCode();

    Common.Settings.Settings.instance()
        .resolve(SettingsUI.SourcesSettings.autoRevealInNavigatorSettingDescriptor)
        .set(false);

    sources.sourcesView().dispatchEventToListeners(Sources.SourcesView.Events.EDITOR_SELECTED, uiSourceCode);

    sinon.assert.notCalled(revealStub);
  });

  it('announces navigator and debugger sidebar toggles', () => {
    setUpEnvironment();
    const sources = new Sources.SourcesPanel.SourcesPanel();
    const alertSpy = sinon.spy(UI.ARIAUtils.LiveAnnouncer, 'alert');

    sources.toggleNavigatorSidebar();
    sources.toggleNavigatorSidebar();
    sources.toggleDebuggerSidebar();
    sources.toggleDebuggerSidebar();

    assert.deepEqual(alertSpy.args.map(args => args[0]), [
      'Navigator sidebar hidden',
      'Navigator sidebar shown',
      'Debugger sidebar hidden',
      'Debugger sidebar shown',
    ]);
    alertSpy.restore();
  });

  describe('handleBeforeUnload', () => {
    function createBeforeUnloadEvent(returnValue = false): Event {
      const event = new Event('beforeunload');
      Object.defineProperty(event, 'returnValue', {value: returnValue, writable: true});
      return event;
    }

    it('sets returnValue and reveals dirty FileSystem source codes', () => {
      setUpEnvironment();
      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      const dirtyFileSystemCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
      dirtyFileSystemCode.isDirty.returns(true);
      const cleanFileSystemCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
      cleanFileSystemCode.isDirty.returns(false);
      sinon.stub(workspace, 'uiSourceCodesForProjectType')
          .withArgs(Workspace.Workspace.projectTypes.FileSystem)
          .returns([dirtyFileSystemCode, cleanFileSystemCode]);

      const showViewStub = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();
      const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal').resolves();

      const sources = new Sources.SourcesPanel.SourcesPanel();
      const event = createBeforeUnloadEvent();
      sources.handleBeforeUnload(event);

      assert.isTrue(event.returnValue);
      sinon.assert.calledWith(showViewStub, 'sources');
      sinon.assert.calledOnceWithExactly(revealStub, dirtyFileSystemCode, false);
    });

    it('ignores dirty source codes from other project types and clean FileSystem source codes', () => {
      setUpEnvironment();
      const {uiSourceCode: dirtyNetworkCode} = createContentProviderUISourceCode({
        url: urlString`https://example.com/script.js`,
        mimeType: 'text/javascript',
        projectType: Workspace.Workspace.projectTypes.Network,
      });
      dirtyNetworkCode.setWorkingCopy('modified');
      assert.isTrue(dirtyNetworkCode.isDirty());

      const {uiSourceCode: cleanFileSystemCode} = createFileSystemUISourceCode({
        url: urlString`file:///path/to/clean.js`,
        mimeType: 'text/javascript',
      });
      assert.isFalse(cleanFileSystemCode.isDirty());

      const showViewStub = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();
      const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal').resolves();

      const sources = new Sources.SourcesPanel.SourcesPanel();
      const event = createBeforeUnloadEvent();
      sources.handleBeforeUnload(event);

      assert.isFalse(event.returnValue);
      sinon.assert.notCalled(showViewStub);
      sinon.assert.notCalled(revealStub);
    });

    it('does nothing if another handler already set returnValue', () => {
      setUpEnvironment();
      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      const uiSourceCodesSpy = sinon.spy(workspace, 'uiSourceCodesForProjectType');

      const sources = new Sources.SourcesPanel.SourcesPanel();
      const event = createBeforeUnloadEvent(true);
      sources.handleBeforeUnload(event);

      sinon.assert.notCalled(uiSourceCodesSpy);
    });
  });
});
