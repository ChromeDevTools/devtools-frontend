// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {
  createTarget,
  describeWithEnvironment,
} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {
  createContentProviderUISourceCodes,
  createFileSystemUISourceCode,
} from '../../testing/UISourceCodeHelpers.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as SourcesComponents from './components/components.js';
import * as Sources from './sources.js';

describeWithEnvironment('SourcesView', () => {
  beforeEach(async () => {
    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });
    const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance(
        {forceNew: true, targetManager, workspace, debuggerWorkspaceBinding});
    Persistence.Persistence.PersistenceImpl.instance({forceNew: true, workspace, breakpointManager});
    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance({forceNew: true, workspace});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
  });

  it('creates new source view of updated type when renamed file requires a different viewer', async () => {
    const sourcesView = new Sources.SourcesView.SourcesView();
    sourcesView.markAsRoot();
    sourcesView.show(document.body);
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const {uiSourceCode, project} = createFileSystemUISourceCode({
      url: 'file:///path/to/overrides/example.html' as Platform.DevToolsPath.UrlString,
      mimeType: 'text/html',
    });
    project.canSetFileContent = () => true;
    project.rename =
        (uiSourceCode: Workspace.UISourceCode.UISourceCode, newName: string,
         callback: (
             arg0: boolean, arg1?: string, arg2?: Platform.DevToolsPath.UrlString,
             arg3?: Common.ResourceType.ResourceType) => void) => {
          const newURL = ('file:///path/to/overrides/' + newName) as Platform.DevToolsPath.UrlString;
          let newContentType = Common.ResourceType.resourceTypes.Document;
          if (newName.endsWith('.jpg')) {
            newContentType = Common.ResourceType.resourceTypes.Image;
          } else if (newName.endsWith('.woff')) {
            newContentType = Common.ResourceType.resourceTypes.Font;
          }
          callback(true, newName, newURL, newContentType);
        };

    sourcesView.viewForFile(uiSourceCode);

    assert.isTrue(sourcesView.getSourceView(uiSourceCode) instanceof Sources.UISourceCodeFrame.UISourceCodeFrame);

    // Rename, but contentType stays the same
    await uiSourceCode.rename('newName.html' as Platform.DevToolsPath.RawPathString);
    assert.isTrue(sourcesView.getSourceView(uiSourceCode) instanceof Sources.UISourceCodeFrame.UISourceCodeFrame);

    // Rename which changes contentType
    await uiSourceCode.rename('image.jpg' as Platform.DevToolsPath.RawPathString);
    assert.isTrue(sourcesView.getSourceView(uiSourceCode) instanceof SourceFrame.ImageView.ImageView);

    // Rename which changes contentType
    await uiSourceCode.rename('font.woff' as Platform.DevToolsPath.RawPathString);
    assert.isTrue(sourcesView.getSourceView(uiSourceCode) instanceof SourceFrame.FontView.FontView);
    workspace.removeProject(project);
    sourcesView.detach();
  });

  it('creates a HeadersView when the filename is \'.headers\'', async () => {
    const sourcesView = new Sources.SourcesView.SourcesView();
    const uiSourceCode = new Workspace.UISourceCode.UISourceCode(
        {} as Persistence.FileSystemWorkspaceBinding.FileSystem,
        'file:///path/to/overrides/www.example.com/.headers' as Platform.DevToolsPath.UrlString,
        Common.ResourceType.resourceTypes.Document);
    sourcesView.viewForFile(uiSourceCode);
    assert.isTrue(sourcesView.getSourceView(uiSourceCode) instanceof SourcesComponents.HeadersView.HeadersView);
  });

  describe('viewForFile', () => {
    it('records the correct media type in the DevTools.SourcesPanelFileOpened metric', async () => {
      const sourcesView = new Sources.SourcesView.SourcesView();
      const {uiSourceCode} = createFileSystemUISourceCode({
        url: 'file:///path/to/project/example.ts' as Platform.DevToolsPath.UrlString,
        mimeType: 'text/typescript',
        content: 'export class Foo {}',
      });
      const sourcesPanelFileOpenedSpy = sinon.spy(Host.userMetrics, 'sourcesPanelFileOpened');
      const contentLoadedPromise = new Promise(res => window.addEventListener('source-file-loaded', res));
      const widget = sourcesView.viewForFile(uiSourceCode);
      assert.instanceOf(widget, Sources.UISourceCodeFrame.UISourceCodeFrame);
      const uiSourceCodeFrame = widget as Sources.UISourceCodeFrame.UISourceCodeFrame;

      // Skip creating the DebuggerPlugin, which times out and simulate DOM attach/showing.
      sinon.stub(uiSourceCodeFrame, 'loadPlugins' as keyof typeof uiSourceCodeFrame).callsFake(() => {});
      uiSourceCodeFrame.wasShown();

      await contentLoadedPromise;

      assert.isTrue(sourcesPanelFileOpenedSpy.calledWithExactly('text/typescript'));
    });
  });
});

describeWithMockConnection('SourcesView', () => {
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
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });
    Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew: true, debuggerWorkspaceBinding});
    const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance(
        {forceNew: true, targetManager, workspace, debuggerWorkspaceBinding});
    Persistence.Persistence.PersistenceImpl.instance({forceNew: true, workspace, breakpointManager});
    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance({forceNew: true, workspace});
  });

  it('creates editor tabs only for in-scope uiSourceCodes', () => {
    const addUISourceCodeSpy =
        sinon.spy(Sources.TabbedEditorContainer.TabbedEditorContainer.prototype, 'addUISourceCode');
    const removeUISourceCodesSpy =
        sinon.spy(Sources.TabbedEditorContainer.TabbedEditorContainer.prototype, 'removeUISourceCodes');

    createContentProviderUISourceCodes({
      items: [
        {url: 'http://example.com/a.js' as Platform.DevToolsPath.UrlString, mimeType: 'application/javascript'},
        {url: 'http://example.com/b.js' as Platform.DevToolsPath.UrlString, mimeType: 'application/javascript'},
      ],
      projectId: 'projectId1',
      projectType: Workspace.Workspace.projectTypes.Network,
      target: target1,
    });

    createContentProviderUISourceCodes({
      items: [
        {url: 'http://foo.com/script.js' as Platform.DevToolsPath.UrlString, mimeType: 'application/javascript'},
      ],
      projectId: 'projectId2',
      projectType: Workspace.Workspace.projectTypes.Network,
      target: target2,
    });

    new Sources.SourcesView.SourcesView();
    let addedURLs = addUISourceCodeSpy.args.map(args => args[0].url());
    assert.deepEqual(addedURLs, ['http://example.com/a.js', 'http://example.com/b.js']);
    assert.isTrue(removeUISourceCodesSpy.notCalled);

    addUISourceCodeSpy.resetHistory();
    target2.targetManager().setScopeTarget(target2);
    addedURLs = addUISourceCodeSpy.args.map(args => args[0].url());
    assert.deepEqual(addedURLs, ['http://foo.com/script.js']);
    const removedURLs = removeUISourceCodesSpy.args.map(args => args[0][0].url());
    assert.deepEqual(removedURLs, ['http://example.com/a.js', 'http://example.com/b.js']);
  });

  it('doesn\'t remove non-network UISourceCodes when changing the scope target', () => {
    createFileSystemUISourceCode({
      url: 'snippet:///foo.js' as Platform.DevToolsPath.UrlString,
      mimeType: 'application/javascript',
      type: 'snippets',
    });

    const sourcesView = new Sources.SourcesView.SourcesView();
    const removeUISourceCodesSpy = sinon.spy(sourcesView.editorContainer, 'removeUISourceCodes');
    target2.targetManager().setScopeTarget(target2);
    assert.isTrue(removeUISourceCodesSpy.notCalled);
  });
});
