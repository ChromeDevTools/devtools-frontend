// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
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
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {dispatchEvent} from '../../testing/MockConnection.js';
import {addChildFrame, createResource, getMainFrame} from '../../testing/ResourceTreeHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as SettingsUI from '../../ui/settings/settings.js';

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

  interface DumpedTreeNode {
    title: string;
    classes?: string[];
    expanded?: boolean;
    selected?: boolean;
    children?: DumpedTreeNode[];
  }

  interface DumpTreeOptions {
    includeClasses?: boolean;
    includeStatus?: boolean;
  }

  function dumpTree(
      navigatorView: Sources.NavigatorView.NavigatorView,
      options: DumpTreeOptions = {},
      ): DumpedTreeNode[] {
    const {includeClasses = false, includeStatus = false} = options;
    function dumpElement(element: UI.TreeOutline.TreeElement): DumpedTreeNode {
      const title = typeof element.title === 'string' ? element.title : element.title.textContent ?? '';
      const node: DumpedTreeNode = {title};
      if (includeClasses) {
        const relevantClasses =
            Array.from(element.listItemElement.classList)
                .filter(c => c.startsWith('navigator-') || c.startsWith('is-') || c.startsWith('has-'))
                .sort();
        if (relevantClasses.length > 0) {
          node.classes = relevantClasses;
        }
      }
      if (includeStatus) {
        if (element.expanded) {
          node.expanded = true;
        }
        if (element.selected) {
          node.selected = true;
        }
      }
      const children = element.children();
      if (children.length > 0) {
        node.children = children.map(dumpElement);
      }
      return node;
    }
    return navigatorView.scriptsTree.rootElement().children().map(dumpElement);
  }

  function findTreeElement(
      navigatorView: Sources.NavigatorView.NavigatorView,
      predicate: (element: UI.TreeOutline.TreeElement) => boolean,
      ): UI.TreeOutline.TreeElement|null {
    function search(element: UI.TreeOutline.TreeElement): UI.TreeOutline.TreeElement|null {
      if (predicate(element)) {
        return element;
      }
      for (const child of element.children()) {
        const found = search(child);
        if (found) {
          return found;
        }
      }
      return null;
    }
    for (const rootChild of navigatorView.scriptsTree.rootElement().children()) {
      const found = search(rootChild);
      if (found) {
        return found;
      }
    }
    return null;
  }

  function findDumpedNode(nodes: DumpedTreeNode[], title: string): DumpedTreeNode|null {
    for (const node of nodes) {
      if (node.title === title) {
        return node;
      }
      if (node.children) {
        const found = findDumpedNode(node.children, title);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  function activateRow(
      navigatorView: Sources.NavigatorView.NavigatorView,
      title: string,
      action: 'enter'|'space'|'dblclick',
      options: {button?: number} = {},
      ): void {
    const treeElement = findTreeElement(navigatorView, el => {
      const elTitle = typeof el.title === 'string' ? el.title : el.title.textContent ?? '';
      return elTitle === title;
    });
    if (!treeElement) {
      throw new Error(`Tree element with title "${title}" not found`);
    }
    if (action === 'enter') {
      treeElement.select(true);
      navigatorView.scriptsTree.contentElement.dispatchEvent(
          new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    } else if (action === 'space') {
      treeElement.select(true);
      navigatorView.scriptsTree.contentElement.dispatchEvent(
          new KeyboardEvent('keydown', {key: ' ', keyCode: 32, bubbles: true}));
    } else if (action === 'dblclick') {
      treeElement.listItemElement.dispatchEvent(
          new MouseEvent('dblclick', {bubbles: true, cancelable: true, button: options.button ?? 0}));
    }
  }

  function openContextMenuOnRow(
      navigatorView: Sources.NavigatorView.NavigatorView,
      title: string,
      ): void {
    const treeElement = findTreeElement(navigatorView, el => {
      const elTitle = typeof el.title === 'string' ? el.title : el.title.textContent ?? '';
      return elTitle === title;
    });
    if (!treeElement) {
      throw new Error(`Tree element with title "${title}" not found`);
    }
    treeElement.listItemElement.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, cancelable: true}));
  }

  function addResourceAndUISourceCode(
      url: Platform.DevToolsPath.UrlString, frame: SDK.ResourceTreeModel.ResourceTreeFrame, content: string,
      mimeType: string, existingProject?: Bindings.ContentProviderBasedProject.ContentProviderBasedProject,
      overrideResourceType?: Common.ResourceType.ResourceType) {
    // createResource is only called for text/html (Document) resources because ResourceMapping
    // only registers Document resources from ResourceTreeModel into the workspace. For other
    // content types (scripts, stylesheets), UISourceCodes are created directly on the project.
    if (mimeType === 'text/html') {
      createResource(frame, url, mimeType, content);
    }
    const project = existingProject ??
        new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
            workspace, 'PROJECT_ID', Workspace.Workspace.projectTypes.Network, 'Test project',
            false /* isServiceProject*/);
    if (!existingProject) {
      Bindings.NetworkProject.NetworkProject.setTargetForProject(project, target);
    }
    const resourceType = overrideResourceType ?? Common.ResourceType.ResourceType.fromMimeType(mimeType);
    let uiSourceCode = workspace.uiSourceCodeForURL(url) as Workspace.UISourceCode.UISourceCode;
    if (!uiSourceCode) {
      uiSourceCode = project.createUISourceCode(url, resourceType);
    }
    Bindings.NetworkProject.NetworkProject.setInitialFrameAttribution(uiSourceCode, frame.id);
    const contentProvider =
        TextUtils.StaticContentProvider.StaticContentProvider.fromString(url, resourceType, content);
    const metadata = new Workspace.UISourceCode.UISourceCodeMetadata(null, null);
    project.addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata, mimeType);
    return {project, uiSourceCode};
  }

  it('can discard multiple childless frames', async () => {
    const url = urlString`http://example.com/index.html`;

    const childFrame = await addChildFrame(target);
    const {project} = addResourceAndUISourceCode(url, childFrame, '', 'text/html');

    const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
    await navigatorView.updateComplete;
    const children = navigatorView.scriptsTree.rootElement().children();
    assert.lengthOf(children, 1, 'The NavigatorView root node should have 1 child before node removal');
    assert.strictEqual(children[0].title, 'top');

    // Remove leaf node and assert that node removal propagates up to the root node.
    project.removeUISourceCode(url);
    assert.deepEqual(dumpTree(navigatorView), [],
                     'The NavigatorView root node should not have any children after node removal');
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

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;
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

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;
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

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;
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

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;
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

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;
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
      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      renderElementIntoDOM(navigatorView);
      const placeholder = new UI.EmptyWidget.EmptyWidget('No content scripts', 'Explanation');
      placeholder.element.slot = 'placeholder';
      placeholder.show(navigatorView.element);
      await navigatorView.updateComplete;

      const placeholderSlot = navigatorView.contentElement.querySelector('slot[name="placeholder"]');
      assert.exists(placeholderSlot);
      assert.isFalse(placeholderSlot.parentElement?.hasAttribute('hidden'));
      assert.isTrue(navigatorView.scriptsTree.element.parentElement?.hasAttribute('hidden'));

      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/script.js`;
      const {project} = addResourceAndUISourceCode(url, mainFrame, '', 'text/javascript');
      await navigatorView.updateComplete;

      assert.isTrue(placeholderSlot.parentElement?.hasAttribute('hidden'));
      assert.isFalse(navigatorView.scriptsTree.element.parentElement?.hasAttribute('hidden'));

      project.removeUISourceCode(url);
      await navigatorView.updateComplete;
      assert.isFalse(placeholderSlot.parentElement?.hasAttribute('hidden'));
      assert.isTrue(navigatorView.scriptsTree.element.parentElement?.hasAttribute('hidden'));
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
      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
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
      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
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

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
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
      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager], viewSpy);
      await navigatorView.updateComplete;
      sinon.assert.calledOnce(viewSpy);
      assert.strictEqual(viewSpy.firstCall.args[0].treeElement, navigatorView.scriptsTree.element);
      assert.isFalse(viewSpy.firstCall.args[0].showTree);
    });
  });

  describe('folder merging', () => {
    it('merges single-child folder chains into one row and populates children on reveal', async () => {
      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/src/components/widgets/button.js`;
      const {uiSourceCode} = addResourceAndUISourceCode(url, mainFrame, '', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      // The single-child folders "src", "components", "widgets" are merged into "src/components/widgets".
      assert.deepEqual(dumpTree(navigatorView), [
        {
          title: 'top',
          children: [
            {
              title: 'example.com',
              children: [
                {
                  title: 'src/components/widgets',
                },
              ],
            },
          ],
        },
      ]);

      // Revealing the source code expands the merged folder and populates the leaf file.
      navigatorView.revealUISourceCode(uiSourceCode);
      assert.deepEqual(dumpTree(navigatorView), [
        {
          title: 'top',
          children: [
            {
              title: 'example.com',
              children: [
                {
                  title: 'src/components/widgets',
                  children: [
                    {
                      title: 'button.js',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);
    });

    it('unmerges folder chain when a sibling folder is added', async () => {
      const mainFrame = await getMainFrame(target);
      const url1 = urlString`http://example.com/src/components/widgets/button.js`;
      const {project, uiSourceCode: uiSourceCode1} = addResourceAndUISourceCode(url1, mainFrame, '', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;
      navigatorView.revealUISourceCode(uiSourceCode1);

      // Now add a sibling file under "src/utils/math.js".
      const url2 = urlString`http://example.com/src/utils/math.js`;
      const {uiSourceCode: uiSourceCode2} = addResourceAndUISourceCode(url2, mainFrame, '', 'text/javascript', project);
      await navigatorView.updateComplete;
      navigatorView.revealUISourceCode(uiSourceCode2);

      // "src" should now be its own row with "components/widgets" and "utils" as children.
      assert.deepEqual(dumpTree(navigatorView), [
        {
          title: 'top',
          children: [
            {
              title: 'example.com',
              children: [
                {
                  title: 'src',
                  children: [
                    {
                      title: 'components/widgets',
                      children: [
                        {
                          title: 'button.js',
                        },
                      ],
                    },
                    {
                      title: 'utils',
                      children: [
                        {
                          title: 'math.js',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);
    });
  });

  describe('sort order', () => {
    it('sorts folders before files, then by content type, then naturally by name', async () => {
      const mainFrame = await getMainFrame(target);
      const {project} =
          addResourceAndUISourceCode(urlString`http://example.com/folder/child.js`, mainFrame, '', 'text/javascript');
      addResourceAndUISourceCode(urlString`http://example.com/style.css`, mainFrame, '', 'text/css', project);
      addResourceAndUISourceCode(urlString`http://example.com/index.html`, mainFrame, '', 'text/html', project);
      addResourceAndUISourceCode(urlString`http://example.com/item10.js`, mainFrame, '', 'text/javascript', project);
      addResourceAndUISourceCode(urlString`http://example.com/item2.js`, mainFrame, '', 'text/javascript', project);
      addResourceAndUISourceCode(urlString`http://example.com/b.js`, mainFrame, '', 'text/javascript', project);
      addResourceAndUISourceCode(urlString`http://example.com/a.js`, mainFrame, '', 'text/javascript', project);
      addResourceAndUISourceCode(urlString`http://example.com/data.json`, mainFrame, '', 'application/json', project,
                                 Common.ResourceType.resourceTypes.Other);

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      // Children of example.com should be:
      // 1. folder: 'folder'
      // 2. document: 'index.html'
      // 3. scripts: 'a.js', 'b.js', 'item2.js', 'item10.js'
      // 4. stylesheet: 'style.css'
      // 5. other: 'data.json'
      const exampleComNode = findTreeElement(navigatorView, el => el.title === 'example.com');
      assert.exists(exampleComNode);
      const childTitles = exampleComNode.children().map(c => c.title);
      assert.deepEqual(childTitles, [
        'folder',
        'index.html',
        'a.js',
        'b.js',
        'item2.js',
        'item10.js',
        'style.css',
        'data.json',
      ]);
    });
  });

  describe('node removal', () => {
    it('keeps parent folder while siblings exist and removes empty parent folder when last child is removed',
       async () => {
         const mainFrame = await getMainFrame(target);
         const url1 = urlString`http://example.com/src/app.js`;
         const url2 = urlString`http://example.com/src/utils.js`;
         const {project, uiSourceCode: uiSourceCode1} =
             addResourceAndUISourceCode(url1, mainFrame, '', 'text/javascript');
         addResourceAndUISourceCode(url2, mainFrame, '', 'text/javascript', project);

         const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
         await navigatorView.updateComplete;
         navigatorView.revealUISourceCode(uiSourceCode1);

         // Initially both files are present under "src".
         assert.deepEqual(dumpTree(navigatorView), [
           {
             title: 'top',
             children: [
               {
                 title: 'example.com',
                 children: [
                   {
                     title: 'src',
                     children: [
                       {title: 'app.js'},
                       {title: 'utils.js'},
                     ],
                   },
                 ],
               },
             ],
           },
         ]);

         // Remove the first file; "src" folder must remain because "utils.js" is still there.
         project.removeUISourceCode(url1);
         await navigatorView.updateComplete;
         assert.deepEqual(dumpTree(navigatorView), [
           {
             title: 'top',
             children: [
               {
                 title: 'example.com',
                 children: [
                   {
                     title: 'src',
                     children: [
                       {title: 'utils.js'},
                     ],
                   },
                 ],
               },
             ],
           },
         ]);

         // Remove the second file; the empty "src" folder and "example.com" should now be removed.
         project.removeUISourceCode(url2);
         await navigatorView.updateComplete;
         assert.deepEqual(dumpTree(navigatorView), []);
       });
  });

  describe('authored and deployed grouping', () => {
    afterEach(() => {
      Common.Settings.Settings.instance()
          .resolve(SettingsUI.SourcesSettings.navigatorGroupByAuthoredSettingDescriptor)
          .set(false);
    });

    it('groups source-mapped files under Authored and network files under Deployed', async () => {
      Common.Settings.Settings.instance()
          .resolve(SettingsUI.SourcesSettings.navigatorGroupByAuthoredSettingDescriptor)
          .set(true);

      const mainFrame = await getMainFrame(target);
      const deployedUrl = urlString`http://example.com/bundle.js`;
      const authoredUrl = urlString`http://example.com/src/app.ts`;

      const {project} = addResourceAndUISourceCode(deployedUrl, mainFrame, '', 'text/javascript');

      // Add authored source map source code
      const authoredContentProvider = TextUtils.StaticContentProvider.StaticContentProvider.fromString(
          authoredUrl, Common.ResourceType.resourceTypes.SourceMapScript, '');
      const authoredUiSourceCode =
          project.createUISourceCode(authoredUrl, Common.ResourceType.resourceTypes.SourceMapScript);
      project.addUISourceCodeWithProvider(authoredUiSourceCode, authoredContentProvider,
                                          new Workspace.UISourceCode.UISourceCodeMetadata(null, null),
                                          'text/typescript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      navigatorView.enableAuthoredGrouping = true;
      await navigatorView.updateComplete;
      navigatorView.revealUISourceCode(authoredUiSourceCode);

      const dumped = dumpTree(navigatorView);
      assert.deepEqual(dumped, [
        {
          title: 'Authored',
          children: [
            {
              title: 'example.com',
              children: [
                {
                  title: 'src',
                  children: [
                    {title: 'app.ts'},
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Deployed',
          children: [
            {
              title: 'top',
              children: [
                {
                  title: 'example.com',
                  children: [
                    {title: 'bundle.js'},
                  ],
                },
              ],
            },
          ],
        },
      ]);
    });
  });

  describe('node removal ordering', () => {
    it('removes nodes without selection on path before nodes with selected ancestor folder', async () => {
      const mainFrame = await getMainFrame(target);
      const urlFolderFile = urlString`http://example.com/src/a.js`;
      const urlRootFile = urlString`http://example.com/b.js`;

      const {project, uiSourceCode: uiSourceCode1} =
          addResourceAndUISourceCode(urlFolderFile, mainFrame, '', 'text/javascript');
      const {uiSourceCode: uiSourceCode2} =
          addResourceAndUISourceCode(urlRootFile, mainFrame, '', 'text/javascript', project);

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      navigatorView.revealUISourceCode(uiSourceCode1);
      const folderTreeElement = findTreeElement(navigatorView, el => el.title === 'src');
      assert.exists(folderTreeElement);
      folderTreeElement.select();
      assert.isTrue(folderTreeElement.selected);

      // The end state after removal is identical (all nodes removed); we spy on removeUISourceCodeNode
      // to verify the removal ordering optimization that removes unselected paths first (crbug.com/1409025).
      const removeUISourceCodeNodeSpy = sinon.spy(
          navigatorView as unknown as
              {removeUISourceCodeNode: (node: Sources.NavigatorView.NavigatorUISourceCodeTreeNode) => void},
          'removeUISourceCodeNode',
      );

      project.removeProject();

      sinon.assert.calledTwice(removeUISourceCodeNodeSpy);
      // The node without selection on its path (b.js) must be removed before the node with selected ancestor folder (src/a.js).
      assert.strictEqual(removeUISourceCodeNodeSpy.firstCall.args[0].uiSourceCode(), uiSourceCode2);
      assert.strictEqual(removeUISourceCodeNodeSpy.secondCall.args[0].uiSourceCode(), uiSourceCode1);
    });

    it('removes nodes without selection on path before nodes with selected ancestor group', async () => {
      const mainFrame = await getMainFrame(target);
      const urlExampleFile = urlString`http://example.com/a.js`;
      const urlOtherFile = urlString`http://other.com/b.js`;

      const {project, uiSourceCode: uiSourceCode1} =
          addResourceAndUISourceCode(urlExampleFile, mainFrame, '', 'text/javascript');
      const {uiSourceCode: uiSourceCode2} =
          addResourceAndUISourceCode(urlOtherFile, mainFrame, '', 'text/javascript', project);

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      navigatorView.revealUISourceCode(uiSourceCode1);
      const domainTreeElement = findTreeElement(navigatorView, el => el.title === 'example.com');
      assert.exists(domainTreeElement);
      domainTreeElement.select();
      assert.isTrue(domainTreeElement.selected);

      // The end state after removal is identical (all nodes removed); we spy on removeUISourceCodeNode
      // to verify the removal ordering optimization that removes unselected paths first (crbug.com/1409025).
      const removeUISourceCodeNodeSpy = sinon.spy(
          navigatorView as unknown as
              {removeUISourceCodeNode: (node: Sources.NavigatorView.NavigatorUISourceCodeTreeNode) => void},
          'removeUISourceCodeNode',
      );

      project.removeProject();

      sinon.assert.calledTwice(removeUISourceCodeNodeSpy);
      // The node without selection on its path (other.com/b.js) must be removed before the node with selected ancestor group (example.com/a.js).
      assert.strictEqual(removeUISourceCodeNodeSpy.firstCall.args[0].uiSourceCode(), uiSourceCode2);
      assert.strictEqual(removeUISourceCodeNodeSpy.secondCall.args[0].uiSourceCode(), uiSourceCode1);
    });
  });

  describe('revealUISourceCode', () => {
    it('expands ancestors and selects the target row', async () => {
      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/nested/path/to/script.js`;
      const {uiSourceCode} = addResourceAndUISourceCode(url, mainFrame, '', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      const node = navigatorView.revealUISourceCode(uiSourceCode, true);
      assert.exists(node);
      assert.exists(node.treeElement);
      assert.isTrue(node.treeElement.selected);

      // Verify ancestors are expanded and target is selected in dumpTree.
      const dumped = dumpTree(navigatorView, {includeStatus: true});
      assert.deepEqual(dumped, [
        {
          title: 'top',
          expanded: true,
          children: [
            {
              title: 'example.com',
              expanded: true,
              children: [
                {
                  title: 'nested/path/to',
                  expanded: true,
                  children: [
                    {
                      title: 'script.js',
                      selected: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);
    });
  });

  describe('selection events', () => {
    it('dispatches SOURCE_SELECTED event on enter, space, and double click', async () => {
      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/script.js`;
      const {uiSourceCode} = addResourceAndUISourceCode(url, mainFrame, '', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      navigatorView.revealUISourceCode(uiSourceCode);

      const eventSpy = sinon.spy();
      navigatorView.addEventListener(Sources.NavigatorView.Events.SOURCE_SELECTED, eventSpy);

      // Enter key
      activateRow(navigatorView, 'script.js', 'enter');
      sinon.assert.calledOnce(eventSpy);
      assert.deepEqual(eventSpy.firstCall.args[0].data, {uiSourceCode, focusSource: true});
      eventSpy.resetHistory();

      // Space key
      activateRow(navigatorView, 'script.js', 'space');
      sinon.assert.calledOnce(eventSpy);
      assert.deepEqual(eventSpy.firstCall.args[0].data, {uiSourceCode, focusSource: true});
      eventSpy.resetHistory();

      // Double click with primary button (button: 0) -> focusSource: true
      activateRow(navigatorView, 'script.js', 'dblclick', {button: 0});
      sinon.assert.calledOnce(eventSpy);
      assert.deepEqual(eventSpy.firstCall.args[0].data, {uiSourceCode, focusSource: true});
      eventSpy.resetHistory();

      // Double click with middle button (button: 1) -> focusSource: false
      activateRow(navigatorView, 'script.js', 'dblclick', {button: 1});
      sinon.assert.calledOnce(eventSpy);
      assert.deepEqual(eventSpy.firstCall.args[0].data, {uiSourceCode, focusSource: false});
    });
  });

  describe('context menus', () => {
    it('shows context menu on file row', async () => {
      const showStub = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/script.js`;
      const {uiSourceCode} = addResourceAndUISourceCode(url, mainFrame, '', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      navigatorView.revealUISourceCode(uiSourceCode);

      openContextMenuOnRow(navigatorView, 'script.js');
      sinon.assert.calledOnce(showStub);
    });

    it('shows context menu on folder row', async () => {
      const showStub = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/src/script.js`;
      addResourceAndUISourceCode(url, mainFrame, '', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      openContextMenuOnRow(navigatorView, 'src');
      sinon.assert.calledOnce(showStub);
    });
  });

  describe('dirty and ignore-list state', () => {
    it('prepends asterisk to title when UISourceCode is dirty and restores on reset', async () => {
      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/script.js`;
      const {uiSourceCode} = addResourceAndUISourceCode(url, mainFrame, 'console.log(1);', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      navigatorView.revealUISourceCode(uiSourceCode);
      let scriptNode = findDumpedNode(dumpTree(navigatorView), 'script.js');
      assert.exists(scriptNode);

      uiSourceCode.setWorkingCopy('console.log(2);');
      scriptNode = findDumpedNode(dumpTree(navigatorView), '*script.js');
      assert.exists(scriptNode);

      uiSourceCode.resetWorkingCopy();
      scriptNode = findDumpedNode(dumpTree(navigatorView), 'script.js');
      assert.exists(scriptNode);
    });

    it('applies is-ignore-listed class when script is ignore-listed', async () => {
      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/script.js`;
      const {uiSourceCode} = addResourceAndUISourceCode(url, mainFrame, 'console.log(1);', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      navigatorView.revealUISourceCode(uiSourceCode);
      let dumped = dumpTree(navigatorView, {includeClasses: true});
      let scriptNode = findDumpedNode(dumped, 'script.js');
      assert.exists(scriptNode);
      assert.isFalse(scriptNode.classes?.includes('is-ignore-listed') ?? false);

      const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance();
      ignoreListManager.enableIgnoreListing = true;

      let patternChangePromise = new Promise<void>(resolve => {
        const listener = () => {
          ignoreListManager.removeChangeListener(listener);
          resolve();
        };
        ignoreListManager.addChangeListener(listener);
      });
      ignoreListManager.ignoreListURL(url);
      await patternChangePromise;

      dumped = dumpTree(navigatorView, {includeClasses: true});
      scriptNode = findDumpedNode(dumped, 'script.js');
      assert.exists(scriptNode);
      assert.isTrue(scriptNode.classes?.includes('is-ignore-listed'));

      patternChangePromise = new Promise<void>(resolve => {
        const listener = () => {
          ignoreListManager.removeChangeListener(listener);
          resolve();
        };
        ignoreListManager.addChangeListener(listener);
      });
      ignoreListManager.unIgnoreListURL(url);
      await patternChangePromise;

      dumped = dumpTree(navigatorView, {includeClasses: true});
      scriptNode = findDumpedNode(dumped, 'script.js');
      assert.exists(scriptNode);
      assert.isFalse(scriptNode.classes?.includes('is-ignore-listed') ?? false);
    });
  });

  describe('screenshots', () => {
    function addFile(url: Platform.DevToolsPath.UrlString, frame: SDK.ResourceTreeModel.ResourceTreeFrame,
                     content: string, mimeType: string,
                     project: Bindings.ContentProviderBasedProject.ContentProviderBasedProject,
                     overrideResourceType?: Common.ResourceType.ResourceType) {
      if (mimeType === 'text/html') {
        createResource(frame, url, mimeType, content);
      }
      const resourceType = overrideResourceType ?? Common.ResourceType.ResourceType.fromMimeType(mimeType);
      let uiSourceCode = workspace.uiSourceCodeForURL(url) as Workspace.UISourceCode.UISourceCode;
      if (!uiSourceCode) {
        uiSourceCode = project.createUISourceCode(url, resourceType);
      }
      Bindings.NetworkProject.NetworkProject.setInitialFrameAttribution(uiSourceCode, frame.id);
      const contentProvider =
          TextUtils.StaticContentProvider.StaticContentProvider.fromString(url, resourceType, content);
      const metadata = new Workspace.UISourceCode.UISourceCodeMetadata(null, null);
      project.addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata, mimeType);
      return uiSourceCode;
    }

    afterEach(() => {
      Common.Settings.Settings.instance()
          .resolve(SettingsUI.SourcesSettings.navigatorGroupByAuthoredSettingDescriptor)
          .set(false);
      Workspace.IgnoreListManager.IgnoreListManager.instance().enableIgnoreListing = false;
    });

    it('renders network tree with merged folders and files', async () => {
      const mainFrame = await getMainFrame(target);
      const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
          workspace, 'PROJECT_ID', Workspace.Workspace.projectTypes.Network, 'Test project', false);
      Bindings.NetworkProject.NetworkProject.setTargetForProject(project, target);

      const buttonUiSourceCode = addFile(urlString`http://example.com/src/components/widgets/button.js`, mainFrame, '',
                                         'text/javascript', project);
      addFile(urlString`http://example.com/index.html`, mainFrame, '', 'text/html', project);
      addFile(urlString`http://example.com/styles.css`, mainFrame, '', 'text/css', project);

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      renderElementIntoDOM(navigatorView, {includeCommonStyles: true, width: 300, height: 300});
      await navigatorView.updateComplete;

      navigatorView.revealUISourceCode(buttonUiSourceCode, /* select= */ true);
      await navigatorView.updateComplete;

      await assertScreenshot('sources/navigator-view-network.png');
    });

    it('renders ignore-listed and dirty files', async () => {
      const mainFrame = await getMainFrame(target);
      const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
          workspace, 'PROJECT_ID', Workspace.Workspace.projectTypes.Network, 'Test project', false);
      Bindings.NetworkProject.NetworkProject.setTargetForProject(project, target);

      const dirtyUrl = urlString`http://example.com/dirty.js`;
      const dirtyUiSourceCode = addFile(dirtyUrl, mainFrame, 'console.log(1);', 'text/javascript', project);

      const ignoredUrl = urlString`http://example.com/ignored.js`;
      const ignoredUiSourceCode = addFile(ignoredUrl, mainFrame, 'console.log(2);', 'text/javascript', project);

      const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance();
      ignoreListManager.enableIgnoreListing = true;
      const patternChangePromise = new Promise<void>(resolve => {
        const listener = () => {
          ignoreListManager.removeChangeListener(listener);
          resolve();
        };
        ignoreListManager.addChangeListener(listener);
      });
      ignoreListManager.ignoreListURL(ignoredUrl);
      await patternChangePromise;

      dirtyUiSourceCode.setWorkingCopy('console.log(11);');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      renderElementIntoDOM(navigatorView, {includeCommonStyles: true, width: 300, height: 300});
      await navigatorView.updateComplete;

      navigatorView.revealUISourceCode(dirtyUiSourceCode);
      navigatorView.revealUISourceCode(ignoredUiSourceCode);
      await navigatorView.updateComplete;

      await assertScreenshot('sources/navigator-view-ignore-listed-and-dirty.png');
    });

    it('renders authored and deployed grouping', async () => {
      Common.Settings.Settings.instance()
          .resolve(SettingsUI.SourcesSettings.navigatorGroupByAuthoredSettingDescriptor)
          .set(true);

      const mainFrame = await getMainFrame(target);
      const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
          workspace, 'PROJECT_ID', Workspace.Workspace.projectTypes.Network, 'Test project', false);
      Bindings.NetworkProject.NetworkProject.setTargetForProject(project, target);

      const deployedUrl = urlString`http://example.com/bundle.js`;
      const authoredUrl = urlString`http://example.com/src/app.ts`;

      const deployedUiSourceCode = addFile(deployedUrl, mainFrame, '', 'text/javascript', project);

      const authoredContentProvider = TextUtils.StaticContentProvider.StaticContentProvider.fromString(
          authoredUrl, Common.ResourceType.resourceTypes.SourceMapScript, '');
      const authoredUiSourceCode =
          project.createUISourceCode(authoredUrl, Common.ResourceType.resourceTypes.SourceMapScript);
      project.addUISourceCodeWithProvider(authoredUiSourceCode, authoredContentProvider,
                                          new Workspace.UISourceCode.UISourceCodeMetadata(null, null),
                                          'text/typescript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      navigatorView.enableAuthoredGrouping = true;
      renderElementIntoDOM(navigatorView, {includeCommonStyles: true, width: 300, height: 300});
      await navigatorView.updateComplete;

      navigatorView.revealUISourceCode(authoredUiSourceCode);
      navigatorView.revealUISourceCode(deployedUiSourceCode);
      await navigatorView.updateComplete;

      await assertScreenshot('sources/navigator-view-authored-deployed.png');
    });
  });
});
