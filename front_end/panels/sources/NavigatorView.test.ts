// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
  setMockConnectionResponseHandler,
} from '../../testing/MockConnection.js';
import {addChildFrame, createResource, getMainFrame, setMockResourceTree} from '../../testing/ResourceTreeHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Sources from './sources.js';

describeWithMockConnection('NavigatorView', () => {
  let target: SDK.Target.Target;
  let workspace: Workspace.Workspace.WorkspaceImpl;

  beforeEach(() => {
    Root.Runtime.experiments.register(Root.Runtime.ExperimentName.AUTHORED_DEPLOYED_GROUPING, '');
    Root.Runtime.experiments.register(Root.Runtime.ExperimentName.JUST_MY_CODE, '');

    setMockResourceTree(false);
    setMockConnectionResponseHandler('Page.getResourceTree', async () => {
      return {
        frameTree: null,
      };
    });

    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
    target = createTarget();
    const targetManager = target.targetManager();
    targetManager.setScopeTarget(target);
    workspace = Workspace.Workspace.WorkspaceImpl.instance();
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

  function addResourceAndUISourceCode(
      url: Platform.DevToolsPath.UrlString, frame: SDK.ResourceTreeModel.ResourceTreeFrame, content: string,
      mimeType: string) {
    createResource(frame, url, 'text/html', content);
    const uiSourceCode = workspace.uiSourceCodeForURL(url) as Workspace.UISourceCode.UISourceCode;

    const projectType = Workspace.Workspace.projectTypes.Network;
    const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
        workspace, 'PROJECT_ID', projectType, 'Test project', false /* isServiceProject*/);
    Bindings.NetworkProject.NetworkProject.setTargetForProject(project, target);
    const contentProvider = TextUtils.StaticContentProvider.StaticContentProvider.fromString(
        url, Common.ResourceType.ResourceType.fromMimeType(mimeType), content);
    const metadata = new Workspace.UISourceCode.UISourceCodeMetadata(null, null);
    project.addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata, mimeType);
    return {project};
  }

  it('can discard multiple childless frames', async () => {
    const url = 'http://example.com/index.html' as Platform.DevToolsPath.UrlString;

    const childFrame = await addChildFrame(target);
    const {project} = addResourceAndUISourceCode(url, childFrame, '', 'text/html');

    const navigatorView = Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true});
    const children = navigatorView.scriptsTree.rootElement().children();
    assert.strictEqual(children.length, 1, 'The NavigatorView root node should have 1 child before node removal');
    assert.strictEqual(children[0].title, 'top');

    // Remove leaf node and assert that node removal propagates up to the root node.
    project.removeUISourceCode(url);
    assert.strictEqual(
        navigatorView.scriptsTree.rootElement().children().length, 0,
        'The NavigarorView root node should not have any children after node removal');
  });

  describe('domain node display name', () => {
    it('should use the project origin if the url matches the default context', async () => {
      const mainFrame = await getMainFrame(target);

      const url = 'http://example.com/index.html' as Platform.DevToolsPath.UrlString;
      addResourceAndUISourceCode(url, mainFrame, '', 'text/html');

      dispatchEvent(target, 'Runtime.executionContextCreated', {
        context: {
          id: 1,
          origin: 'http://example.com',
          name: 'Main Context',
          uniqueId: 'main_context',
          auxData: {
            isDefault: true,
            type: 'default',
            frameId: mainFrame.id,
          },
        },
      });
      dispatchEvent(target, 'Runtime.executionContextCreated', {
        context: {
          id: 2,
          origin: 'chrome-extension://ahfhijdlegdabablpippeagghigmibma',
          name: 'Extension Context',
          uniqueId: 'extension_context',
          auxData: {
            isDefault: false,
            type: 'isolated',
            frameId: mainFrame.id,
          },
        },
      });

      const navigatorView = Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true});
      const topChildren = navigatorView.scriptsTree.rootElement().children();
      assert.lengthOf(topChildren, 1);
      assert.strictEqual(topChildren[0].title, 'top');

      const children = topChildren[0].children();
      assert.lengthOf(children, 1);
      assert.strictEqual(children[0].title, 'example.com');
    });

    it('should use a matching context name if the url does not match the default context', async () => {
      const mainFrame = await getMainFrame(target);

      const url = 'chrome-extension://ahfhijdlegdabablpippeagghigmibma/script.js' as Platform.DevToolsPath.UrlString;
      addResourceAndUISourceCode(url, mainFrame, '', 'text/html');

      dispatchEvent(target, 'Runtime.executionContextCreated', {
        context: {
          id: 1,
          origin: 'http://example.com',
          name: 'Main Context',
          uniqueId: 'main_context',
          auxData: {
            isDefault: true,
            type: 'default',
            frameId: mainFrame.id,
          },
        },
      });
      dispatchEvent(target, 'Runtime.executionContextCreated', {
        context: {
          id: 2,
          origin: 'chrome-extension://ahfhijdlegdabablpippeagghigmibma',
          name: 'Extension Context',
          uniqueId: 'extension_context',
          auxData: {
            isDefault: false,
            type: 'isolated',
            frameId: mainFrame.id,
          },
        },
      });

      const navigatorView = Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true});
      const topChildren = navigatorView.scriptsTree.rootElement().children();
      assert.lengthOf(topChildren, 1);
      assert.strictEqual(topChildren[0].title, 'top');

      const children = topChildren[0].children();
      assert.lengthOf(children, 1);
      assert.strictEqual(children[0].title, 'Extension Context');
    });

    it('should prioritize the default context', async () => {
      const mainFrame = await getMainFrame(target);

      const url = 'http://example.com/index.html' as Platform.DevToolsPath.UrlString;
      addResourceAndUISourceCode(url, mainFrame, '', 'text/html');

      dispatchEvent(target, 'Runtime.executionContextCreated', {
        context: {
          id: 1,
          origin: 'http://example.com',
          name: 'Other Context',
          uniqueId: 'other_context',
          auxData: {
            isDefault: false,
            type: 'isolated',
            frameId: mainFrame.id,
          },
        },
      });

      // Default context comes last, but this should still indicate that the
      // project origin should be used as the display name.
      dispatchEvent(target, 'Runtime.executionContextCreated', {
        context: {
          id: 2,
          origin: 'http://example.com',
          name: 'Main Context',
          uniqueId: 'main_context',
          auxData: {
            isDefault: true,
            type: 'default',
            frameId: mainFrame.id,
          },
        },
      });

      const navigatorView = Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true});
      const topChildren = navigatorView.scriptsTree.rootElement().children();
      assert.lengthOf(topChildren, 1);
      assert.strictEqual(topChildren[0].title, 'top');

      const children = topChildren[0].children();
      assert.lengthOf(children, 1);
      assert.strictEqual(children[0].title, 'example.com');
    });

    it('should ignore contexts with no name', async () => {
      const mainFrame = await getMainFrame(target);

      const url = 'http://example.com/index.html' as Platform.DevToolsPath.UrlString;
      addResourceAndUISourceCode(url, mainFrame, '', 'text/html');

      dispatchEvent(target, 'Runtime.executionContextCreated', {
        context: {
          id: 1,
          origin: 'http://example.com',
          name: '',
          uniqueId: 'no_name_context',
          auxData: {
            isDefault: false,
            type: 'isolated',
            frameId: mainFrame.id,
          },
        },
      });

      const navigatorView = Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true});
      const topChildren = navigatorView.scriptsTree.rootElement().children();
      assert.lengthOf(topChildren, 1);
      assert.strictEqual(topChildren[0].title, 'top');

      const children = topChildren[0].children();
      assert.lengthOf(children, 1);
      assert.strictEqual(children[0].title, 'example.com');
    });

    it('should indicate if a display name cannot be found', async () => {
      const mainFrame = await getMainFrame(target);

      const url = '*bad url*' as Platform.DevToolsPath.UrlString;
      addResourceAndUISourceCode(url, mainFrame, '', 'text/html');

      const navigatorView = Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true});
      const topChildren = navigatorView.scriptsTree.rootElement().children();
      assert.lengthOf(topChildren, 1);
      assert.strictEqual(topChildren[0].title, 'top');

      const children = topChildren[0].children();
      assert.lengthOf(children, 1);
      assert.strictEqual(children[0].title, '(no domain)');
    });
  });
});
