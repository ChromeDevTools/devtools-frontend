// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {getAxeViolations} from '../../testing/AxeHelpers.js';
import {assertScreenshot, renderElementIntoDOM, setTestUniverseForWidgets} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment, registerActions} from '../../testing/EnvironmentHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {
  createContentProviderUISourceCodes,
  createFileSystemUISourceCode,
} from '../../testing/UISourceCodeHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Snippets from '../snippets/snippets.js';

import * as Sources from './sources.js';

const {EmptyEncodedPathString, urlString} = Platform.DevToolsPath;

describeWithEnvironment('SourcesView', () => {
  beforeEach(async () => {
    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
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
    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance({forceNew: true, workspace});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
  });

  afterEach(() => {
    UI.ActionRegistry.ActionRegistry.removeInstance();
    UI.ShortcutRegistry.ShortcutRegistry.removeInstance();
    Workspace.IgnoreListManager.IgnoreListManager.removeInstance();
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.removeInstance();
    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.removeInstance();
    Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.removeInstance();
  });

  it('renders the placeholder correctly', async () => {
    const sourcesView = new Sources.SourcesView.SourcesView();
    renderElementIntoDOM(sourcesView, {includeCommonStyles: true});
    await sourcesView.updateComplete;
    await assertScreenshot('sources/sources-view-placeholder.png');
    sourcesView.detach();
  });
});

describeWithEnvironment('SourcesView', () => {
  let target1: SDK.Target.Target;
  let target2: SDK.Target.Target;

  beforeEach(() => {
    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
    target1 = createTarget();
    target2 = createTarget();
    const targetManager = target1.targetManager();
    targetManager.setScopeTarget(target1);
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();

    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance({forceNew: true, resourceMapping, targetManager});
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
    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance({forceNew: true, workspace});
  });

  afterEach(() => {
    UI.ActionRegistry.ActionRegistry.removeInstance();
    UI.ShortcutRegistry.ShortcutRegistry.removeInstance();
    Workspace.IgnoreListManager.IgnoreListManager.removeInstance();
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.removeInstance();
    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.removeInstance();
    Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.removeInstance();
  });

  it('creates editor tabs only for in-scope uiSourceCodes', async () => {
    createContentProviderUISourceCodes({
      items: [
        {url: urlString`http://example.com/a.js`, mimeType: 'application/javascript'},
        {url: urlString`http://example.com/b.js`, mimeType: 'application/javascript'},
      ],
      projectId: 'projectId1',
      projectType: Workspace.Workspace.projectTypes.Network,
      target: target1,
    });

    createContentProviderUISourceCodes({
      items: [
        {url: urlString`http://foo.com/script.js`, mimeType: 'application/javascript'},
      ],
      projectId: 'projectId2',
      projectType: Workspace.Workspace.projectTypes.Network,
      target: target2,
    });

    const view = createViewFunctionStub(Sources.SourcesView.SourcesView);
    const sourcesView = new Sources.SourcesView.SourcesView(undefined, view);
    renderElementIntoDOM(sourcesView);
    await sourcesView.updateComplete;
    let urls = [...view.input.uiSourceCodes].map(c => c.url());
    assert.deepEqual(urls, ['http://example.com/a.js', 'http://example.com/b.js']);

    target2.targetManager().setScopeTarget(target2);
    await sourcesView.updateComplete;
    urls = [...view.input.uiSourceCodes].map(c => c.url());
    assert.deepEqual(urls, ['http://foo.com/script.js']);
    sourcesView.detach();
  });

  it('doesn\'t remove non-network UISourceCodes when changing the scope target', async () => {
    createFileSystemUISourceCode({
      url: urlString`snippet:///foo.js`,
      mimeType: 'application/javascript',
      type: Persistence.PlatformFileSystem.PlatformFileSystemType.SNIPPETS,
    });

    const view = createViewFunctionStub(Sources.SourcesView.SourcesView);
    const sourcesView = new Sources.SourcesView.SourcesView(undefined, view);
    renderElementIntoDOM(sourcesView);
    await sourcesView.updateComplete;
    target2.targetManager().setScopeTarget(target2);
    await sourcesView.updateComplete;
    const urls = [...view.input.uiSourceCodes].map(c => c.url());
    assert.deepEqual(urls, ['snippet:///foo.js']);
    sourcesView.detach();
  });

  it('does not re-create uiSourceCodes Set on unrelated view updates', async () => {
    createFileSystemUISourceCode({
      url: urlString`snippet:///foo.js`,
      mimeType: 'application/javascript',
      type: Persistence.PlatformFileSystem.PlatformFileSystemType.SNIPPETS,
    });

    const view = createViewFunctionStub(Sources.SourcesView.SourcesView);
    const sourcesView = new Sources.SourcesView.SourcesView(undefined, view);
    renderElementIntoDOM(sourcesView);
    await sourcesView.updateComplete;

    const initialSet = view.input.uiSourceCodes;

    sourcesView.isNavigatorSidebarOpen = !sourcesView.isNavigatorSidebarOpen;
    await sourcesView.updateComplete;

    assert.strictEqual(view.input.uiSourceCodes, initialSet);
    sourcesView.detach();
  });

  it('does not schedule TabbedEditorContainer update on unrelated SourcesView updates', async () => {
    const sourcesView = new Sources.SourcesView.SourcesView();
    sourcesView.setLayoutMode(true, false);
    renderElementIntoDOM(sourcesView);
    await sourcesView.updateComplete;

    const requestUpdateSpy = sinon.spy(Sources.TabbedEditorContainer.TabbedEditorContainer.prototype, 'requestUpdate');

    sourcesView.toggleBreakpointsActiveState(false);
    await sourcesView.updateComplete;

    sinon.assert.notCalled(requestUpdateSpy);
    requestUpdateSpy.restore();
    sourcesView.detach();
  });

  it('passes sourceLocation and updates active editor state via view input callbacks', async () => {
    const {uiSourceCode} = createFileSystemUISourceCode({
      url: urlString`file:///path/to/file.js`,
      mimeType: 'application/javascript',
    });

    const view = createViewFunctionStub(Sources.SourcesView.SourcesView);
    const sourcesView = new Sources.SourcesView.SourcesView(undefined, view);
    renderElementIntoDOM(sourcesView);
    await sourcesView.updateComplete;

    await sourcesView.showSourceLocation(uiSourceCode, {lineNumber: 5, columnNumber: 2}, true, false);
    assert.deepEqual(view.input.sourceLocation, {
      uiSourceCode,
      location: {lineNumber: 5, columnNumber: 2},
      omitFocus: true,
      omitHighlight: false,
    });

    const sourceFrame = new Sources.UISourceCodeFrame.UISourceCodeFrame(uiSourceCode);
    sinon.stub(sourceFrame, 'canEditSource').returns(true);
    view.input.onEditorSelected({
      currentFile: uiSourceCode,
      currentView: sourceFrame,
      previousView: null,
      userGesture: true,
    });
    await sourcesView.updateComplete;
    assert.strictEqual(sourcesView.currentUISourceCode(), uiSourceCode);
    assert.strictEqual(sourcesView.currentSourceFrame(), sourceFrame);
    assert.isTrue(view.input.isSearchReplaceable);
    assert.strictEqual(view.input.searchTarget, sourceFrame);

    view.input.onEditorClosed(uiSourceCode);
    await sourcesView.updateComplete;
    assert.isNull(sourcesView.currentUISourceCode());
    assert.isNull(sourcesView.visibleView());
    assert.isNull(view.input.searchTarget);
    sourcesView.detach();
  });

  it('updates layout mode and breakpoints active state in view input', async () => {
    const view = createViewFunctionStub(Sources.SourcesView.SourcesView);
    const sourcesView = new Sources.SourcesView.SourcesView(undefined, view);
    renderElementIntoDOM(sourcesView);
    await sourcesView.updateComplete;

    assert.isTrue(view.input.breakpointsActive);
    assert.isFalse(view.input.isVertical);
    assert.isTrue(view.input.isInWrapper);

    sourcesView.setLayoutMode(true, false);
    sourcesView.toggleBreakpointsActiveState(false);
    await sourcesView.updateComplete;

    assert.isFalse(view.input.breakpointsActive);
    assert.isTrue(view.input.isVertical);
    assert.isFalse(view.input.isInWrapper);
    sourcesView.detach();
  });

  it('returns the searchableView populated by the view output', async () => {
    const dummySearchableView = {} as UI.SearchableView.SearchableView;
    const view: Sources.SourcesView.View = (_input, output) => {
      output.searchableView = dummySearchableView;
    };
    const sourcesView = new Sources.SourcesView.SourcesView(undefined, view);
    renderElementIntoDOM(sourcesView);
    await sourcesView.updateComplete;

    assert.strictEqual(sourcesView.searchableView(), dummySearchableView);
    sourcesView.detach();
  });

  it('reveals and focuses the source location synchronously', async () => {
    const {uiSourceCode} = createFileSystemUISourceCode({
      url: urlString`snippet:///foo.js`,
      mimeType: 'application/javascript',
      type: Persistence.PlatformFileSystem.PlatformFileSystemType.SNIPPETS,
    });

    const sourcesView = new Sources.SourcesView.SourcesView();
    renderElementIntoDOM(sourcesView);
    await sourcesView.updateComplete;
    const showSourceLocationSpy =
        sinon.spy(Sources.TabbedEditorContainer.TabbedEditorContainer.prototype, 'showSourceLocation');

    // Input that immediately follows the reveal (e.g. typing after committing
    // a new snippet name) must go to the editor, so the editor has to be
    // revealed and focused before `showSourceLocation` yields.
    const revealed = sourcesView.showSourceLocation(uiSourceCode);
    sinon.assert.calledOnceWithExactly(showSourceLocationSpy, uiSourceCode, undefined, undefined, undefined);
    assert.strictEqual(sourcesView.currentUISourceCode(), uiSourceCode);
    await revealed;
    sourcesView.detach();
  });

  it('clears current UISourceCode and visibleView when closed tab has a duplicate script selected', async () => {
    createContentProviderUISourceCodes({
      items: [
        {url: urlString`http://example.com/a.js`, mimeType: 'application/javascript'},
      ],
      projectId: 'projectId1',
      projectType: Workspace.Workspace.projectTypes.Network,
      target: target1,
    });

    createContentProviderUISourceCodes({
      items: [
        {url: urlString`http://example.com/a.js`, mimeType: 'application/javascript'},
      ],
      projectId: 'projectId2',
      projectType: Workspace.Workspace.projectTypes.Network,
      target: target2,
    });

    const sourcesView = new Sources.SourcesView.SourcesView();
    renderElementIntoDOM(sourcesView);
    await sourcesView.updateComplete;

    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const uiSourceCodeA = workspace.uiSourceCodes().find(code => code.url() === urlString`http://example.com/a.js` &&
                                                             code.project().id() === 'projectId1')!;
    const uiSourceCodeB = workspace.uiSourceCodes().find(code => code.url() === urlString`http://example.com/a.js` &&
                                                             code.project().id() === 'projectId2')!;
    assert.isDefined(uiSourceCodeA);
    assert.isDefined(uiSourceCodeB);
    assert.notStrictEqual(uiSourceCodeA, uiSourceCodeB);

    await sourcesView.showSourceLocation(uiSourceCodeA);
    await sourcesView.showSourceLocation(uiSourceCodeB);
    assert.strictEqual(sourcesView.currentUISourceCode(), uiSourceCodeB);
    const sourceFrameB = sourcesView.currentSourceFrame();
    assert.isNotNull(sourceFrameB);
    assert.isTrue(sourceFrameB.isShowing());
    const disposeSpy = sinon.spy(sourceFrameB, 'dispose');
    const editorClosedSpy = sinon.spy();
    sourcesView.addEventListener(Sources.SourcesView.Events.EDITOR_CLOSED, editorClosedSpy);

    const tabbedEditorContainer =
        UI.Context.Context.instance().flavor(Sources.TabbedEditorContainer.TabbedEditorContainer);
    assert.isNotNull(tabbedEditorContainer);
    tabbedEditorContainer.closeFile(uiSourceCodeA);

    assert.isNull(sourcesView.currentUISourceCode());
    assert.isNull(sourcesView.visibleView());
    sinon.assert.calledOnce(disposeSpy);
    sinon.assert.calledOnce(editorClosedSpy);
    assert.isTrue(editorClosedSpy.firstCall.args[0].data.wasSelected);
    sourcesView.detach();
  });

  it('retains the toolbar listener of the active editor when a background editor is closed', async () => {
    const {uiSourceCode: uiSourceCodeA} = createFileSystemUISourceCode({
      url: urlString`file:///path/to/a.js`,
      mimeType: 'application/javascript',
    });
    const {uiSourceCode: uiSourceCodeB} = createFileSystemUISourceCode({
      url: urlString`file:///path/to/b.js`,
      mimeType: 'application/javascript',
    });

    const view = createViewFunctionStub(Sources.SourcesView.SourcesView);
    const sourcesView = new Sources.SourcesView.SourcesView(undefined, view);
    renderElementIntoDOM(sourcesView);
    await sourcesView.updateComplete;

    const sourceFrameA = new Sources.UISourceCodeFrame.UISourceCodeFrame(uiSourceCodeA);
    view.input.onEditorSelected({
      currentFile: uiSourceCodeA,
      currentView: sourceFrameA,
      previousView: null,
      userGesture: true,
    });
    await sourcesView.updateComplete;

    assert.isTrue(sourceFrameA.hasEventListeners(Sources.UISourceCodeFrame.Events.TOOLBAR_ITEMS_CHANGED));

    view.input.onEditorClosed(uiSourceCodeB);
    assert.isTrue(sourceFrameA.hasEventListeners(Sources.UISourceCodeFrame.Events.TOOLBAR_ITEMS_CHANGED));

    view.input.onEditorClosed(uiSourceCodeA);
    assert.isFalse(sourceFrameA.hasEventListeners(Sources.UISourceCodeFrame.Events.TOOLBAR_ITEMS_CHANGED));

    sourceFrameA.dispose();
    sourcesView.detach();
  });

  it('has no aXe violations in the editor pane with open snippet tabs', async () => {
    const NO_REQUIRED_CHILDREN_RULESET = {
      'aria-required-children': {
        enabled: false,
        selector: ':not(.tabbed-pane-header-tabs)',
      },
      'aria-allowed-attr': {
        enabled: false,
        selector: '.cm-content',
      },
    };

    registerActions([
      {
        actionId: 'debugger.toggle-pause',
        category: UI.ActionRegistration.ActionCategory.DEBUGGER,
        title: i18n.i18n.lockedLazyString('Pause script execution'),
      },
      {
        actionId: 'debugger.step-over',
        category: UI.ActionRegistration.ActionCategory.DEBUGGER,
        title: i18n.i18n.lockedLazyString('Step over next function call'),
      },
      {
        actionId: 'debugger.step-into',
        category: UI.ActionRegistration.ActionCategory.DEBUGGER,
        title: i18n.i18n.lockedLazyString('Step into next function call'),
      },
      {
        actionId: 'debugger.step-out',
        category: UI.ActionRegistration.ActionCategory.DEBUGGER,
        title: i18n.i18n.lockedLazyString('Step out of current function'),
      },
      {
        actionId: 'debugger.step',
        category: UI.ActionRegistration.ActionCategory.DEBUGGER,
        title: i18n.i18n.lockedLazyString('Step'),
      },
      {
        actionId: 'debugger.toggle-breakpoints-active',
        category: UI.ActionRegistration.ActionCategory.DEBUGGER,
        title: i18n.i18n.lockedLazyString('Deactivate breakpoints'),
      },
      {
        actionId: 'debugger.run-snippet',
        category: UI.ActionRegistration.ActionCategory.DEBUGGER,
        title: i18n.i18n.lockedLazyString('Run snippet'),
      },
    ]);

    for (const {id, title} of [{id: 'sources.watch', title: 'Watch'},
                               {id: 'sources.js-breakpoints', title: 'Breakpoints'},
                               {id: 'sources.scope-chain', title: 'Scope'},
                               {id: 'sources.threads', title: 'Threads'},
    ] as const) {
      UI.ViewManager.registerViewExtension({
        id,
        title: i18n.i18n.lockedLazyString(title),
        commandPrompt: i18n.i18n.lockedLazyString(`Show ${title}`),
        persistence: UI.ViewManager.ViewPersistence.PERMANENT,
        async loadView() {
          return new UI.View.SimpleView({
            title: i18n.i18n.lockedString(title),
            viewId: id,
          });
        },
      });
    }

    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const isolatedFileSystemManager = Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance({
      forceNew: true,
    });
    const fileSystemWorkspaceBinding =
        new Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding(isolatedFileSystemManager, workspace);
    isolatedFileSystemManager.addPlatformFileSystem(urlString`snippet://`,
                                                    new Snippets.ScriptSnippetFileSystem.SnippetFileSystem());

    // eslint-disable-next-line prefer-const
    let sourcesPanel: Sources.SourcesPanel.SourcesPanel|undefined;
    UI.ViewManager.registerLocationResolver({
      name: UI.ViewManager.ViewLocationValues.PANEL,
      category: UI.ViewManager.ViewLocationCategory.PANEL,
      async loadResolver() {
        return UI.InspectorView.InspectorView.instance();
      },
    });
    UI.ViewManager.registerViewExtension({
      location: UI.ViewManager.ViewLocationValues.PANEL,
      id: 'sources',
      title: i18n.i18n.lockedLazyString('Sources'),
      commandPrompt: i18n.i18n.lockedLazyString('Show Sources'),
      async loadView() {
        assert.exists(sourcesPanel);
        return sourcesPanel;
      },
    });
    const universe = new TestUniverse();
    setTestUniverseForWidgets(universe);
    UI.ViewManager.ViewManager.instance({forceNew: true, universe});

    sourcesPanel = new Sources.SourcesPanel.SourcesPanel();
    sinon.stub(Sources.SourcesPanel.SourcesPanel, 'instance').returns(sourcesPanel);
    Common.Revealer.registerRevealer({
      contextTypes: () => [Workspace.UISourceCode.UISourceCode],
      destination: Common.Revealer.RevealerDestination.SOURCES_PANEL,
      async loadRevealer() {
        return new Sources.SourcesPanel.UISourceCodeRevealer();
      },
    });

    try {
      await sourcesPanel.sourcesView().updateComplete;
      const inspectorView = UI.InspectorView.InspectorView.instance();
      renderElementIntoDOM(inspectorView, {width: 800, height: 600, includeCommonStyles: true});
      UI.Context.Context.instance().setFlavor(SDK.Target.Target, target1);

      await UI.ViewManager.ViewManager.instance().showView('sources');
      await UI.Widget.Widget.allUpdatesComplete;

      const projects = workspace.projectsForType(Workspace.Workspace.projectTypes.FileSystem);
      const snippetsProject =
          projects.find(project => Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(
                                       project) === Persistence.PlatformFileSystem.PlatformFileSystemType.SNIPPETS);
      assert.exists(snippetsProject);

      const uiSourceCode1 = await snippetsProject.createFile(EmptyEncodedPathString, null, '');
      assert.exists(uiSourceCode1);
      await Common.Revealer.reveal(uiSourceCode1);
      const uiSourceCode2 = await snippetsProject.createFile(EmptyEncodedPathString, null, '');
      assert.exists(uiSourceCode2);
      await Common.Revealer.reveal(uiSourceCode2);

      const sourcesView = sourcesPanel.sourcesView();
      await UI.Widget.Widget.allUpdatesComplete;

      const tabbedPane = sourcesView.contentElement.querySelector('devtools-tabbed-pane');
      assert.exists(tabbedPane);
      assert.deepEqual(tabbedPane.tabs.map(tab => tab.title), ['Script snippet #1', 'Script snippet #2']);

      await UI.ViewManager.ViewManager.instance().showView('sources');
      await UI.Widget.Widget.allUpdatesComplete;
      assert.isAbove(sourcesView.contentElement.getBoundingClientRect().width, 0);
      assert.isAbove(sourcesView.contentElement.getBoundingClientRect().height, 0);
      assert.isEmpty(await getAxeViolations(sourcesView.contentElement, NO_REQUIRED_CHILDREN_RULESET));
    } finally {
      UI.Context.Context.instance().flavor(Sources.TabbedEditorContainer.TabbedEditorContainer)?.closeAllFiles();
      window.removeEventListener('beforeunload', sourcesPanel.handleBeforeUnload, true);
      sourcesPanel.detach();
      fileSystemWorkspaceBinding.dispose();
      Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.removeInstance();
      UI.Context.Context.instance().setFlavor(SDK.Target.Target, null);
    }
  });
});
