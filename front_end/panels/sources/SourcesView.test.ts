// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
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
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as SourcesComponents from './components/components.js';
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
    await assertScreenshot('sources/sources-view-placeholder.png');
    sourcesView.detach();
  });

  it('triggers addFileSystem when select folder button is clicked', async () => {
    const sourcesView = new Sources.SourcesView.SourcesView();
    renderElementIntoDOM(sourcesView, {includeCommonStyles: true});
    const addFileSystemStub =
        sinon.stub(Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance(), 'addFileSystem')
            .resolves(null);

    // Wait for widget rendering/updates
    await sourcesView.editorContainer?.view.updateComplete;

    // Find the TabbedPane element
    const tabbedPane = sourcesView.element.querySelector('.tabbed-pane');
    assert.isNotNull(tabbedPane, 'TabbedPane element not found');

    // Find the button in placeholder inside TabbedPane's shadow root
    const button = tabbedPane!.shadowRoot!.querySelector('.workspace button');
    assert.instanceOf(button, HTMLButtonElement);
    (button as HTMLButtonElement).click();

    // Wait for async handler
    await new Promise(resolve => setTimeout(resolve, 0));

    sinon.assert.calledOnce(addFileSystemStub);
    sourcesView.detach();
  });

  it('creates new source view of updated type when renamed file requires a different viewer', async () => {
    const sourcesView = new Sources.SourcesView.SourcesView();
    renderElementIntoDOM(sourcesView);
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const {uiSourceCode, project} = createFileSystemUISourceCode({
      url: urlString`file:///path/to/overrides/example.html`,
      mimeType: 'text/html',
    });
    project.canSetFileContent = () => true;
    project.rename =
        (_uiSourceCode: Workspace.UISourceCode.UISourceCode, newName: string,
         callback: (
             arg0: boolean, arg1?: string, arg2?: Platform.DevToolsPath.UrlString,
             arg3?: Common.ResourceType.ResourceType) => void) => {
          const newURL = urlString`${'file:///path/to/overrides/' + newName}`;
          let newContentType = Common.ResourceType.resourceTypes.Document;
          if (newName.endsWith('.jpg')) {
            newContentType = Common.ResourceType.resourceTypes.Image;
          } else if (newName.endsWith('.woff')) {
            newContentType = Common.ResourceType.resourceTypes.Font;
          }
          callback(true, newName, newURL, newContentType);
        };

    sourcesView.viewForFile(uiSourceCode);

    assert.instanceOf(sourcesView.getSourceView(uiSourceCode), Sources.UISourceCodeFrame.UISourceCodeFrame);

    // Rename, but contentType stays the same
    await uiSourceCode.rename('newName.html' as Platform.DevToolsPath.RawPathString);
    assert.instanceOf(sourcesView.getSourceView(uiSourceCode), Sources.UISourceCodeFrame.UISourceCodeFrame);

    // Rename which changes contentType
    await uiSourceCode.rename('image.jpg' as Platform.DevToolsPath.RawPathString);
    await sourcesView.updateComplete;
    assert.instanceOf(sourcesView.getSourceView(uiSourceCode), SourceFrame.ImageView.ImageView);

    // Rename which changes contentType
    await uiSourceCode.rename('font.woff' as Platform.DevToolsPath.RawPathString);
    await sourcesView.updateComplete;
    assert.instanceOf(sourcesView.getSourceView(uiSourceCode), SourceFrame.FontView.FontView);
    workspace.removeProject(project);
    sourcesView.detach();
  });

  it('creates a HeadersView when the filename is \'.headers\'', async () => {
    const sourcesView = new Sources.SourcesView.SourcesView();
    const uiSourceCode = new Workspace.UISourceCode.UISourceCode(
        {} as Persistence.FileSystemWorkspaceBinding.FileSystem,
        urlString`file:///path/to/overrides/www.example.com/.headers`, Common.ResourceType.resourceTypes.Document);
    sinon.stub(uiSourceCode, 'mimeType').returns('text/plain');
    sourcesView.viewForFile(uiSourceCode);
    assert.instanceOf(sourcesView.getSourceView(uiSourceCode), SourcesComponents.HeadersView.HeadersView);
  });

  describe('viewForFile', () => {
    it('records the correct media type in the DevTools.SourcesPanelFileOpened metric', async () => {
      const sourcesView = new Sources.SourcesView.SourcesView();
      const {uiSourceCode} = createFileSystemUISourceCode({
        url: urlString`file:///path/to/project/example.ts`,
        mimeType: 'text/typescript',
        content: 'export class Foo {}',
      });
      const sourcesPanelFileOpenedSpy = sinon.spy(Host.userMetrics, 'sourcesPanelFileOpened');
      const contentLoadedPromise = new Promise(res => window.addEventListener('source-file-loaded', res));
      const widget = sourcesView.viewForFile(uiSourceCode);
      assert.instanceOf(widget, Sources.UISourceCodeFrame.UISourceCodeFrame);
      const uiSourceCodeFrame = widget;

      // Skip creating the DebuggerPlugin, which times out and simulate DOM attach/showing.
      sinon.stub(uiSourceCodeFrame, 'loadPlugins' as keyof typeof uiSourceCodeFrame);
      uiSourceCodeFrame.wasShown();

      await contentLoadedPromise;

      sinon.assert.calledWithExactly(sourcesPanelFileOpenedSpy, 'text/typescript');
    });
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
    await new Promise(resolve => setTimeout(resolve, 0));
    let addedURLs = addUISourceCodeSpy.args.map(args => args[0].url());
    assert.deepEqual(addedURLs, ['http://example.com/a.js', 'http://example.com/b.js']);
    sinon.assert.notCalled(removeUISourceCodesSpy);

    addUISourceCodeSpy.resetHistory();
    target2.targetManager().setScopeTarget(target2);
    addedURLs = addUISourceCodeSpy.args.map(args => args[0].url());
    assert.deepEqual(addedURLs, ['http://foo.com/script.js']);
    const removedURLs = removeUISourceCodesSpy.args.map(args => args[0][0].url());
    assert.deepEqual(removedURLs, ['http://example.com/a.js', 'http://example.com/b.js']);
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
    sinon.assert.notCalled(removeUISourceCodesSpy);
  });
});
