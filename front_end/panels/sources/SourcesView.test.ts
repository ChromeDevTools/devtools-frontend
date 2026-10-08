// Copyright 2022 The Chromium Authors
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
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {
  createContentProviderUISourceCodes,
  createFileSystemUISourceCode,
} from '../../testing/UISourceCodeHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Sources from './sources.js';

const {urlString} = Platform.DevToolsPath;

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
});
