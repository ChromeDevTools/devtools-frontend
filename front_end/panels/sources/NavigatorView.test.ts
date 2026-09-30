// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {dispatchEvent} from '../../testing/MockConnection.js';
import {addChildFrame, createResource, getMainFrame} from '../../testing/ResourceTreeHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Sources from './sources.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('NavigatorView', () => {
  let target: SDK.Target.Target;
  let workspace: Workspace.Workspace.WorkspaceImpl;
  let networkProjectManager: Bindings.NetworkProject.NetworkProjectManager;

  beforeEach(() => {
    const connection = new MockCDPConnection();
    connection.setSuccessHandler('Page.getResourceTree', async () => {
      return {
        frameTree: null,
      } as unknown as Protocol.Page.GetResourceTreeResponse;
    });

    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
    target = createTarget({connection});
    const targetManager = target.targetManager();
    targetManager.setScopeTarget(target);
    workspace = Workspace.Workspace.WorkspaceImpl.instance();
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
    networkProjectManager = new Bindings.NetworkProject.NetworkProjectManager();
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
    const url = urlString`http://example.com/index.html`;

    const childFrame = await addChildFrame(target);
    const {project} = addResourceAndUISourceCode(url, childFrame, '', 'text/html');

    const navigatorView =
        Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true, networkProjectManager});
    const children = navigatorView.scriptsTree.rootElement().children();
    assert.lengthOf(children, 1, 'The NavigatorView root node should have 1 child before node removal');
    assert.strictEqual(children[0].title, 'top');

    // Remove leaf node and assert that node removal propagates up to the root node.
    project.removeUISourceCode(url);
    assert.lengthOf(
        navigatorView.scriptsTree.rootElement().children(), 0,
        'The NavigarorView root node should not have any children after node removal');
  });

  describe('domain node display name', () => {
    it('should use the project origin if the url matches the default context', async () => {
      const mainFrame = await getMainFrame(target);

      const url = urlString`http://example.com/index.html`;
      addResourceAndUISourceCode(url, mainFrame, '', 'text/html');

      dispatchEvent(target, 'Runtime.executionContextCreated', {
        context: {
          id: 1 as Protocol.Runtime.ExecutionContextId,
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
          id: 2 as Protocol.Runtime.ExecutionContextId,
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

      const navigatorView =
          Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true, networkProjectManager});
      const topChildren = navigatorView.scriptsTree.rootElement().children();
      assert.lengthOf(topChildren, 1);
      assert.strictEqual(topChildren[0].title, 'top');

      const children = topChildren[0].children();
      assert.lengthOf(children, 1);
      assert.strictEqual(children[0].title, 'example.com');
    });

    it('should use a matching context name if the url does not match the default context', async () => {
      const mainFrame = await getMainFrame(target);

      const url = urlString`chrome-extension://ahfhijdlegdabablpippeagghigmibma/script.js`;
      addResourceAndUISourceCode(url, mainFrame, '', 'text/html');

      dispatchEvent(target, 'Runtime.executionContextCreated', {
        context: {
          id: 1 as Protocol.Runtime.ExecutionContextId,
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
          id: 2 as Protocol.Runtime.ExecutionContextId,
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

      const navigatorView =
          Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true, networkProjectManager});
      const topChildren = navigatorView.scriptsTree.rootElement().children();
      assert.lengthOf(topChildren, 1);
      assert.strictEqual(topChildren[0].title, 'top');

      const children = topChildren[0].children();
      assert.lengthOf(children, 1);
      assert.strictEqual(children[0].title, 'Extension Context');
    });

    it('should prioritize the default context', async () => {
      const mainFrame = await getMainFrame(target);

      const url = urlString`http://example.com/index.html`;
      addResourceAndUISourceCode(url, mainFrame, '', 'text/html');

      dispatchEvent(target, 'Runtime.executionContextCreated', {
        context: {
          id: 1 as Protocol.Runtime.ExecutionContextId,
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
          id: 2 as Protocol.Runtime.ExecutionContextId,
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

      const navigatorView =
          Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true, networkProjectManager});
      const topChildren = navigatorView.scriptsTree.rootElement().children();
      assert.lengthOf(topChildren, 1);
      assert.strictEqual(topChildren[0].title, 'top');

      const children = topChildren[0].children();
      assert.lengthOf(children, 1);
      assert.strictEqual(children[0].title, 'example.com');
    });

    it('should ignore contexts with no name', async () => {
      const mainFrame = await getMainFrame(target);

      const url = urlString`http://example.com/index.html`;
      addResourceAndUISourceCode(url, mainFrame, '', 'text/html');

      dispatchEvent(target, 'Runtime.executionContextCreated', {
        context: {
          id: 1 as Protocol.Runtime.ExecutionContextId,
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

      const navigatorView =
          Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true, networkProjectManager});
      const topChildren = navigatorView.scriptsTree.rootElement().children();
      assert.lengthOf(topChildren, 1);
      assert.strictEqual(topChildren[0].title, 'top');

      const children = topChildren[0].children();
      assert.lengthOf(children, 1);
      assert.strictEqual(children[0].title, 'example.com');
    });

    it('should indicate if a display name cannot be found', async () => {
      const mainFrame = await getMainFrame(target);

      const url = urlString`*bad url*`;
      addResourceAndUISourceCode(url, mainFrame, '', 'text/html');

      const navigatorView =
          Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true, networkProjectManager});
      const topChildren = navigatorView.scriptsTree.rootElement().children();
      assert.lengthOf(topChildren, 1);
      assert.strictEqual(topChildren[0].title, 'top');

      const children = topChildren[0].children();
      assert.lengthOf(children, 1);
      assert.strictEqual(children[0].title, '(no domain)');
    });
  });

  describe('placeholder visibility', () => {
    it('toggles placeholder and tree visibility when elements are attached and detached', async () => {
      const navigatorView = new Sources.NavigatorView.NavigatorView('test', networkProjectManager);
      renderElementIntoDOM(navigatorView);
      const placeholder = new UI.EmptyWidget.EmptyWidget('No content scripts', 'Explanation');
      navigatorView.setPlaceholder(placeholder);

      assert.isTrue(placeholder.isShowing());
      assert.isFalse(placeholder.element.parentElement?.hasAttribute('hidden'));
      assert.isTrue(navigatorView.scriptsTree.element.parentElement?.hasAttribute('hidden'));

      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/script.js`;
      const {project} = addResourceAndUISourceCode(url, mainFrame, '', 'text/javascript');

      assert.isTrue(placeholder.element.parentElement?.hasAttribute('hidden'));
      assert.isFalse(navigatorView.scriptsTree.element.parentElement?.hasAttribute('hidden'));

      project.removeUISourceCode(url);
      assert.isFalse(placeholder.element.parentElement?.hasAttribute('hidden'));
      assert.isTrue(navigatorView.scriptsTree.element.parentElement?.hasAttribute('hidden'));
    });

    it('forwards contextmenu events on the placeholder to handleContextMenu', () => {
      const navigatorView = new Sources.NavigatorView.NavigatorView('test', networkProjectManager);
      const contextMenuSpy = sinon.spy(navigatorView, 'handleContextMenu');
      const placeholder = new UI.EmptyWidget.EmptyWidget('No content scripts', 'Explanation');
      navigatorView.setPlaceholder(placeholder);

      const event = new MouseEvent('contextmenu', {bubbles: true});
      placeholder.element.dispatchEvent(event);

      sinon.assert.calledOnceWithExactly(contextMenuSpy, event);
    });
  });

  describe('NavigatorGroupTreeNode automatic file system controls', () => {
    const root = '/path/to/bar' as Platform.DevToolsPath.RawPathString;
    const uuid = '549bbf9b-48b2-4af7-aebd-d3ba68993094';

    it('renders a spinner when automatic file system is connecting', () => {
      const automaticFileSystemManager =
          sinon.createStubInstance(Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager);
      const fileSystem = new Persistence.AutomaticFileSystemWorkspaceBinding.FileSystem(
          {root, uuid, state: 'connecting'}, automaticFileSystemManager, workspace);
      const navigatorView =
          Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true, networkProjectManager});
      const groupNode = new Sources.NavigatorView.NavigatorGroupTreeNode(
          navigatorView, fileSystem, 'auto-fs', Sources.NavigatorView.Types.AutomaticFileSystem, 'bar');
      const treeElement = groupNode.treeNode();

      const spinner = treeElement.listItemElement.querySelector('devtools-spinner');
      assert.exists(spinner);
    });

    it('renders a connect button when automatic file system is disconnected and connects on click', async () => {
      const automaticFileSystemManager =
          sinon.createStubInstance(Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager);
      const fileSystem = new Persistence.AutomaticFileSystemWorkspaceBinding.FileSystem(
          {root, uuid, state: 'disconnected'}, automaticFileSystemManager, workspace);
      const navigatorView =
          Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true, networkProjectManager});
      const groupNode = new Sources.NavigatorView.NavigatorGroupTreeNode(
          navigatorView, fileSystem, 'auto-fs', Sources.NavigatorView.Types.AutomaticFileSystem, 'bar');
      const treeElement = groupNode.treeNode();

      const button = treeElement.listItemElement.querySelector('devtools-button');
      assert.exists(button);
      assert.strictEqual(button.textContent?.trim(), 'Connect');

      button.click();
      sinon.assert.calledOnceWithExactly(automaticFileSystemManager.connectAutomaticFileSystem, true);
    });
  });

  describe('NavigatorSourceTreeElement AI floating button', () => {
    it('renders AI floating button when action is registered and executes it on click', async () => {
      const actionExecuteSpy = sinon.spy();
      const mockAction = {
        title: () => 'Ask AI',
        execute: actionExecuteSpy,
      } as unknown as UI.ActionRegistration.Action;
      sinon.stub(UI.ActionRegistry.ActionRegistry.instance(), 'hasAction')
          .withArgs('drjones.sources-floating-button')
          .returns(true);
      sinon.stub(UI.ActionRegistry.ActionRegistry.instance(), 'getAction')
          .withArgs('drjones.sources-floating-button')
          .returns(mockAction);

      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/app.js`;
      addResourceAndUISourceCode(url, mainFrame, 'console.log(1);', 'text/javascript');
      const uiSourceCode = workspace.uiSourceCodeForURL(url) as Workspace.UISourceCode.UISourceCode;

      const navigatorView =
          Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true, networkProjectManager});
      const sourceSelectedSpy = sinon.spy(navigatorView, 'sourceSelected');
      const node = new Sources.NavigatorView.NavigatorUISourceCodeTreeNode(navigatorView, uiSourceCode, mainFrame);
      const treeElement = node.treeNode() as Sources.NavigatorView.NavigatorSourceTreeElement;
      treeElement.onattach();

      const floatingButton = treeElement.listItemElement.querySelector('devtools-floating-button');
      assert.exists(floatingButton);

      floatingButton.click();
      sinon.assert.calledOnceWithExactly(sourceSelectedSpy, uiSourceCode, false);
      sinon.assert.calledOnce(actionExecuteSpy);
    });
  });

  describe('view injection', () => {
    it('passes view input to custom view function on performUpdate', async () => {
      const viewSpy = sinon.spy<Sources.NavigatorView.View>((input, _output, targetElement) => {
        Sources.NavigatorView.DEFAULT_VIEW(input, _output, targetElement);
      });
      const navigatorView = new Sources.NavigatorView.NavigatorView('test', networkProjectManager, false, viewSpy);
      sinon.assert.calledOnce(viewSpy);
      assert.strictEqual(viewSpy.firstCall.args[0].treeElement, navigatorView.scriptsTree.element);
      assert.isNull(viewSpy.firstCall.args[0].placeholder);

      const placeholder = new UI.EmptyWidget.EmptyWidget('Empty', 'Description');
      navigatorView.setPlaceholder(placeholder);
      sinon.assert.calledTwice(viewSpy);
      assert.strictEqual(viewSpy.secondCall.args[0].placeholder, placeholder);
      assert.isFalse(viewSpy.secondCall.args[0].showTree);
    });
  });
});
