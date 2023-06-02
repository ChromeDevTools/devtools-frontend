// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import * as Breakpoints from '../../../../../front_end/models/breakpoints/breakpoints.js';
import * as Common from '../../../../../front_end/core/common/common.js';
import * as Persistence from '../../../../../front_end/models/persistence/persistence.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import * as Host from '../../../../../front_end/core/host/host.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as SourceFrame from '../../../../../front_end/ui/legacy/components/source_frame/source_frame.js';
import * as Sources from '../../../../../front_end/panels/sources/sources.js';
import * as SourcesComponents from '../../../../../front_end/panels/sources/components/components.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import {
  describeWithEnvironment,
} from '../../helpers/EnvironmentHelpers.js';
import {createFileSystemUISourceCode} from '../../helpers/UISourceCodeHelpers.js';

describeWithEnvironment('SourcesView', () => {
  beforeEach(async () => {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.HEADER_OVERRIDES);
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
