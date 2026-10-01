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
    const addUISourceCodeSpy =
        sinon.spy(Sources.TabbedEditorContainer.TabbedEditorContainer.prototype, 'addUISourceCode');
    const removeUISourceCodesSpy =
        sinon.spy(Sources.TabbedEditorContainer.TabbedEditorContainer.prototype, 'removeUISourceCodes');

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

    const sourcesView = new Sources.SourcesView.SourcesView();
    renderElementIntoDOM(sourcesView);
    await sourcesView.updateComplete;
    let addedURLs = addUISourceCodeSpy.args.map(args => args[0].url());
    assert.deepEqual(addedURLs, ['http://example.com/a.js', 'http://example.com/b.js']);
    sinon.assert.notCalled(removeUISourceCodesSpy);

    addUISourceCodeSpy.resetHistory();
    target2.targetManager().setScopeTarget(target2);
    await sourcesView.updateComplete;
    addedURLs = addUISourceCodeSpy.args.map(args => args[0].url());
    assert.deepEqual(addedURLs, ['http://foo.com/script.js']);
    const removedURLs = removeUISourceCodesSpy.args.flatMap(args => args[0].map(c => c.url()));
    assert.deepEqual(removedURLs, ['http://example.com/a.js', 'http://example.com/b.js']);
    sourcesView.detach();
  });

  it('doesn\'t remove non-network UISourceCodes when changing the scope target', async () => {
    createFileSystemUISourceCode({
      url: urlString`snippet:///foo.js`,
      mimeType: 'application/javascript',
      type: Persistence.PlatformFileSystem.PlatformFileSystemType.SNIPPETS,
    });

    const sourcesView = new Sources.SourcesView.SourcesView();
    renderElementIntoDOM(sourcesView);
    await sourcesView.updateComplete;
    const removeUISourceCodesSpy =
        sinon.spy(Sources.TabbedEditorContainer.TabbedEditorContainer.prototype, 'removeUISourceCodes');
    target2.targetManager().setScopeTarget(target2);
    await sourcesView.updateComplete;
    sinon.assert.notCalled(removeUISourceCodesSpy);
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
});
