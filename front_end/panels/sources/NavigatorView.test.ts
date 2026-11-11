// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import * as sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {dispatchEvent} from '../../testing/MockConnection.js';
import {addChildFrame, createResource, getMainFrame} from '../../testing/ResourceTreeHelpers.js';
import {createFileSystemUISourceCode} from '../../testing/UISourceCodeHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
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
      const title = getTreeElementTitle(element);
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
    return getTreeOutline(navigatorView).rootElement().children().map(dumpElement);
  }

  function getTreeOutline(navigatorView: Sources.NavigatorView.NavigatorView): UI.TreeOutline.TreeOutline {
    navigatorView.performUpdate();
    const treeViewElement = navigatorView.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
    treeViewElement?.flushPendingUpdatesForTesting();
    const treeOutline = treeViewElement?.getInternalTreeOutlineForTest();
    if (!treeOutline) {
      throw new Error('treeOutline not found');
    }
    return treeOutline;
  }

  function isTreeHidden(navigatorView: Sources.NavigatorView.NavigatorView): boolean {
    return Boolean(getTreeOutline(navigatorView).element.parentElement?.hasAttribute('hidden'));
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
    for (const rootChild of getTreeOutline(navigatorView).rootElement().children()) {
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

  function findTreeNode(
      root: Sources.NavigatorView.NavigatorTreeNode,
      predicate: (node: Sources.NavigatorView.NavigatorTreeNode) => boolean,
      ): Sources.NavigatorView.NavigatorTreeNode|null {
    if (predicate(root)) {
      return root;
    }
    for (const child of root.children()) {
      const found = findTreeNode(child, predicate);
      if (found) {
        return found;
      }
    }
    return null;
  }

  function getPrompt(targetNode: Sources.NavigatorView.NavigatorUISourceCodeTreeNode): UI.TextPrompt.TextPromptElement|
      null {
    const navView = (targetNode as unknown as {navigatorView: Sources.NavigatorView.NavigatorView}).navigatorView;
    const devtoolsTree = navView.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
    devtoolsTree?.flushPendingUpdatesForTesting();
    const searchRoots: ParentNode[] = [];
    if (devtoolsTree?.shadowRoot) {
      searchRoots.push(devtoolsTree.shadowRoot);
    }
    if (devtoolsTree?.templateRoot) {
      searchRoots.push(devtoolsTree.templateRoot);
    }
    searchRoots.push(navView.contentElement);
    const widgets = searchRoots.flatMap(r => Array.from(r.querySelectorAll('devtools-widget')));
    for (const w of widgets) {
      if (w.shadowRoot) {
        searchRoots.push(w.shadowRoot);
      }
    }
    const prompts =
        searchRoots.flatMap(r => Array.from(r.querySelectorAll<UI.TextPrompt.TextPromptElement>('devtools-prompt')));
    return prompts.find(p => p.getAttribute('value') === targetNode.title ||
                            p.getAttribute('value') === targetNode.uiSourceCode().displayName()) ??
        null;
  }

  function getTreeElementTitle(element: UI.TreeOutline.TreeElement): string {
    if (typeof element.title === 'string' && element.title.length > 0) {
      return element.title;
    }
    const titleElement = element.titleElement as Element | undefined;
    const treeElementTitle = titleElement?.querySelector?.('.tree-element-title');
    const dataTitle =
        treeElementTitle?.getAttribute('data-title') || element.listItemElement?.getAttribute('data-title');
    if (dataTitle) {
      return dataTitle;
    }
    if (treeElementTitle?.textContent) {
      return treeElementTitle.textContent;
    }
    return element.titleElement?.textContent ?? '';
  }

  function getTreeElementTooltip(element: UI.TreeOutline.TreeElement): string {
    return element.tooltip || element.listItemElement.querySelector('[title]')?.getAttribute('title') || '';
  }

  function getTreeElement(
      navigatorView: Sources.NavigatorView.NavigatorView,
      title: string,
      ): UI.TreeOutline.TreeElement {
    const treeElement = findTreeElement(navigatorView, el => {
      return getTreeElementTitle(el) === title;
    });
    if (!treeElement) {
      throw new Error(`Tree element with title "${title}" not found`);
    }
    return treeElement;
  }

  function activateRow(
      navigatorView: Sources.NavigatorView.NavigatorView,
      title: string,
      action: 'click'|'enter'|'space'|'dblclick',
      options: {button?: number} = {},
      ): void {
    const treeElement = getTreeElement(navigatorView, title);
    if (action === 'click') {
      treeElement.listItemElement.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
    } else if (action === 'enter') {
      treeElement.select(true);
      getTreeOutline(navigatorView)
          .contentElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    } else if (action === 'space') {
      treeElement.select(true);
      treeElement.listItemElement.dispatchEvent(
          new KeyboardEvent('keydown', {key: ' ', keyCode: 32, bubbles: true, composed: true}));
    } else if (action === 'dblclick') {
      treeElement.listItemElement.dispatchEvent(
          new MouseEvent('dblclick', {bubbles: true, cancelable: true, button: options.button ?? 0}));
    }
  }

  function dragStartRow(
      navigatorView: Sources.NavigatorView.NavigatorView,
      title: string,
      ): DataTransfer {
    const dataTransfer = new DataTransfer();
    getTreeElement(navigatorView, title)
        .listItemElement.dispatchEvent(new DragEvent('dragstart', {bubbles: true, cancelable: true, dataTransfer}));
    return dataTransfer;
  }

  function mouseDownRow(
      navigatorView: Sources.NavigatorView.NavigatorView,
      title: string,
      options: {which?: number} = {},
      ): void {
    getTreeElement(navigatorView, title)
        .listItemElement.dispatchEvent(
            new MouseEvent('mousedown', {bubbles: true, cancelable: true, which: options.which ?? 1}));
  }

  function openContextMenuOnRow(
      navigatorView: Sources.NavigatorView.NavigatorView,
      title: string,
      ): void {
    getTreeElement(navigatorView, title)
        .listItemElement.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, cancelable: true}));
  }

  function hoverRow(
      navigatorView: Sources.NavigatorView.NavigatorView,
      title: string,
      hovered: boolean,
      ): void {
    const eventType = hovered ? 'mousemove' : 'mouseleave';
    getTreeElement(navigatorView, title)
        .listItemElement.dispatchEvent(new MouseEvent(eventType, {bubbles: true, cancelable: true}));
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
    const children = getTreeOutline(navigatorView).rootElement().children();
    assert.lengthOf(children, 1, 'The NavigatorView root node should have 1 child before node removal');
    assert.strictEqual(getTreeElementTitle(children[0]), 'top');

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
      const topChildren = getTreeOutline(navigatorView).rootElement().children();
      assert.lengthOf(topChildren, 1);
      assert.strictEqual(getTreeElementTitle(topChildren[0]), 'top');

      const children = topChildren[0].children();
      assert.lengthOf(children, 1);
      assert.strictEqual(getTreeElementTitle(children[0]), 'example.com');
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
      const topChildren = getTreeOutline(navigatorView).rootElement().children();
      assert.lengthOf(topChildren, 1);
      assert.strictEqual(getTreeElementTitle(topChildren[0]), 'top');

      const children = topChildren[0].children();
      assert.lengthOf(children, 1);
      assert.strictEqual(getTreeElementTitle(children[0]), 'Extension Context');
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
      const topChildren = getTreeOutline(navigatorView).rootElement().children();
      assert.lengthOf(topChildren, 1);
      assert.strictEqual(getTreeElementTitle(topChildren[0]), 'top');

      const children = topChildren[0].children();
      assert.lengthOf(children, 1);
      assert.strictEqual(getTreeElementTitle(children[0]), 'example.com');
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
      const topChildren = getTreeOutline(navigatorView).rootElement().children();
      assert.lengthOf(topChildren, 1);
      assert.strictEqual(getTreeElementTitle(topChildren[0]), 'top');

      const children = topChildren[0].children();
      assert.lengthOf(children, 1);
      assert.strictEqual(getTreeElementTitle(children[0]), 'example.com');
    });

    it('should indicate if a display name cannot be found', async () => {
      const mainFrame = await getMainFrame(target);

      const url = urlString`*bad url*`;
      addResourceAndUISourceCode(url, mainFrame, '', 'text/html');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;
      const topChildren = getTreeOutline(navigatorView).rootElement().children();
      assert.lengthOf(topChildren, 1);
      assert.strictEqual(getTreeElementTitle(topChildren[0]), 'top');

      const children = topChildren[0].children();
      assert.lengthOf(children, 1);
      assert.strictEqual(getTreeElementTitle(children[0]), '(no domain)');
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
      assert.isTrue(isTreeHidden(navigatorView));

      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/script.js`;
      const {project} = addResourceAndUISourceCode(url, mainFrame, '', 'text/javascript');
      await navigatorView.updateComplete;

      assert.isTrue(placeholderSlot.parentElement?.hasAttribute('hidden'));
      assert.isFalse(isTreeHidden(navigatorView));

      project.removeUISourceCode(url);
      await navigatorView.updateComplete;
      assert.isFalse(placeholderSlot.parentElement?.hasAttribute('hidden'));
      assert.isTrue(isTreeHidden(navigatorView));
    });
  });

  describe('folder and group tree elements', () => {
    it('renders a devtools-icon with the appropriate icon type in leading icons', () => {
      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      const groupNode = new Sources.NavigatorView.NavigatorGroupTreeNode(
          navigatorView, null, 'domain:example.com', Sources.NavigatorView.Types.Domain, 'example.com');
      navigatorView.rootNode.appendChild(groupNode);
      const treeElement = getTreeElement(navigatorView, 'example.com');
      const icon = treeElement.listItemElement.querySelector('.leading-icons devtools-icon');
      assert.exists(icon);
      assert.strictEqual(icon.getAttribute('name'), 'cloud');
    });

    it('computes joined path tooltip for nested NavigatorFolderTreeNode', async () => {
      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/src/components/button.js`;
      const {project} = addResourceAndUISourceCode(url, mainFrame, '', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      const folderTreeElement = getTreeElement(navigatorView, 'src/components');
      assert.strictEqual(getTreeElementTooltip(folderTreeElement), 'src/components');

      project.removeProject();
    });

    it('appends ignore-listed suffix to folder tooltip when folder is exclusively ignore-listed', async () => {
      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/src/script.js`;
      const {project, uiSourceCode} = addResourceAndUISourceCode(url, mainFrame, '', 'text/javascript');

      Workspace.IgnoreListManager.IgnoreListManager.instance().ignoreListUISourceCode(uiSourceCode);

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      const folderTreeElement = getTreeElement(navigatorView, 'src');
      assert.strictEqual(getTreeElementTooltip(folderTreeElement), 'src (ignore listed)');

      project.removeProject();
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
      navigatorView.rootNode.appendChild(groupNode);
      const treeElement = getTreeElement(navigatorView, 'bar');

      const spinner = treeElement.listItemElement.querySelector('.trailing-icons devtools-spinner');
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
      navigatorView.rootNode.appendChild(groupNode);
      const treeElement = getTreeElement(navigatorView, 'bar');

      const button = treeElement.listItemElement.querySelector<HTMLElement>('.trailing-icons devtools-button');
      assert.exists(button);
      assert.strictEqual(button.textContent?.trim(), 'Connect');

      button.click();
      sinon.assert.calledOnceWithExactly(automaticFileSystemManager.connectAutomaticFileSystem, true);
    });

    it('updates trailing icons when automatic file system state changes', async () => {
      const automaticFileSystemManager =
          sinon.createStubInstance(Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager);
      const fsData = {
        root,
        uuid,
        state: 'connecting' as Persistence.AutomaticFileSystemManager.AutomaticFileSystem['state'],
      };
      const fileSystem =
          new Persistence.AutomaticFileSystemWorkspaceBinding.FileSystem(fsData, automaticFileSystemManager, workspace);
      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      const groupNode = new Sources.NavigatorView.NavigatorGroupTreeNode(
          navigatorView, fileSystem, 'auto-fs', Sources.NavigatorView.Types.AutomaticFileSystem, 'bar');
      navigatorView.rootNode.appendChild(groupNode);
      const treeElement = getTreeElement(navigatorView, 'bar');

      assert.isFalse(treeElement.isExpandable());
      assert.isNull(treeElement.listItemElement.querySelector('ul[role="group"]'));
      assert.exists(treeElement.listItemElement.querySelector('.trailing-icons devtools-spinner'));

      fsData.state = 'disconnected';
      navigatorView.requestUpdate();
      await navigatorView.updateComplete;

      const updatedTreeElement = getTreeElement(navigatorView, 'bar');

      assert.isFalse(updatedTreeElement.isExpandable());
      assert.isNull(updatedTreeElement.listItemElement.querySelector('.trailing-icons devtools-spinner'));
      assert.exists(updatedTreeElement.listItemElement.querySelector('.trailing-icons devtools-button'));
    });
  });

  describe('NavigatorUISourceCodeTreeNode AI floating button', () => {
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
      const {project, uiSourceCode} = addResourceAndUISourceCode(url, mainFrame, 'console.log(1);', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      const sourceSelectedSpy = sinon.spy(navigatorView, 'sourceSelected');
      const node = new Sources.NavigatorView.NavigatorUISourceCodeTreeNode(navigatorView, uiSourceCode, mainFrame);
      navigatorView.rootNode.appendChild(node);
      const treeElement = getTreeElement(navigatorView, 'app.js');

      const floatingButton = treeElement.listItemElement.querySelector('devtools-floating-button');
      assert.exists(floatingButton);

      floatingButton.click();
      sinon.assert.calledOnceWithExactly(sourceSelectedSpy, uiSourceCode, false);
      sinon.assert.calledOnce(actionExecuteSpy);

      project.removeProject();
    });

    it('does not render AI floating button for non-text files', async () => {
      sinon.stub(UI.ActionRegistry.ActionRegistry.instance(), 'hasAction')
          .withArgs('drjones.sources-floating-button')
          .returns(true);

      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/image.png`;
      const {project, uiSourceCode} = addResourceAndUISourceCode(url, mainFrame, '', 'image/png', undefined,
                                                                 Common.ResourceType.resourceTypes.Image);

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      const node = new Sources.NavigatorView.NavigatorUISourceCodeTreeNode(navigatorView, uiSourceCode, mainFrame);
      navigatorView.rootNode.appendChild(node);
      const treeElement = getTreeElement(navigatorView, 'image.png');

      const floatingButton = treeElement.listItemElement.querySelector('devtools-floating-button');
      assert.isNull(floatingButton);

      project.removeProject();
    });

    it('does not render AI floating button when action is not registered', async () => {
      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/app.js`;
      const {project, uiSourceCode} = addResourceAndUISourceCode(url, mainFrame, 'console.log(1);', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      const node = new Sources.NavigatorView.NavigatorUISourceCodeTreeNode(navigatorView, uiSourceCode, mainFrame);
      navigatorView.rootNode.appendChild(node);
      const treeElement = getTreeElement(navigatorView, 'app.js');

      const floatingButton = treeElement.listItemElement.querySelector('devtools-floating-button');
      assert.isNull(floatingButton);

      project.removeProject();
    });
  });

  describe('view injection', () => {
    it('passes view input to custom view function on performUpdate', async () => {
      const viewSpy = sinon.spy<Sources.NavigatorView.View>((input, _output, targetElement) => {
        Sources.NavigatorView.DEFAULT_VIEW(input, _output, targetElement);
      });
      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager], viewSpy);
      await navigatorView.updateComplete;
      assert.deepEqual(viewSpy.firstCall.args[0].nodes, []);
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
      const exampleComNode = findTreeElement(navigatorView, el => getTreeElementTitle(el) === 'example.com');
      assert.exists(exampleComNode);
      const childTitles = exampleComNode.children().map(c => getTreeElementTitle(c));
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
    afterEach(async () => {
      Common.Settings.Settings.instance()
          .resolve(SettingsUI.SourcesSettings.navigatorGroupByAuthoredSettingDescriptor)
          .set(false);
      await new Promise(resolve => setTimeout(resolve, 0));
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
      const folderTreeElement = getTreeElement(navigatorView, 'src');
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
      const domainTreeElement = getTreeElement(navigatorView, 'example.com');
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
      assert.isTrue(navigatorView.isNodeSelected(node));

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

    it('preserves revealed selection when synchronously focused before rendering', async () => {
      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/script.js`;
      const {uiSourceCode} = addResourceAndUISourceCode(url, mainFrame, '', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      renderElementIntoDOM(navigatorView);
      await navigatorView.updateComplete;
      const treeViewElement =
          navigatorView.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
      treeViewElement?.flushPendingUpdatesForTesting();

      const revealedNode = navigatorView.revealUISourceCode(uiSourceCode, true);
      assert.exists(revealedNode);
      navigatorView.focus();

      await navigatorView.updateComplete;
      treeViewElement?.flushPendingUpdatesForTesting();

      assert.isTrue(navigatorView.isNodeSelected(revealedNode));
      const selectedTreeElement = getTreeOutline(navigatorView).selectedTreeElement;
      assert.exists(selectedTreeElement);
      assert.strictEqual(getTreeElementTitle(selectedTreeElement), 'script.js');
      assert.notStrictEqual(getTreeElementTitle(selectedTreeElement), 'top');
    });
  });

  describe('selection events', () => {
    async function setupSourceNode(options: {mount?: boolean} = {}) {
      const {mount = true} = options;
      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/script.js`;
      const {project, uiSourceCode} = addResourceAndUISourceCode(url, mainFrame, '', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      if (mount) {
        renderElementIntoDOM(navigatorView);
      }
      await navigatorView.updateComplete;

      const node = navigatorView.revealUISourceCode(uiSourceCode);
      await navigatorView.updateComplete;
      return {project, uiSourceCode, navigatorView, node, url};
    }

    async function setupSelectionTest() {
      const {project, uiSourceCode, navigatorView} = await setupSourceNode();
      const eventSpy = sinon.spy();
      navigatorView.addEventListener(Sources.NavigatorView.Events.SOURCE_SELECTED, eventSpy);
      return {project, uiSourceCode, navigatorView, eventSpy};
    }

    it('dispatches SOURCE_SELECTED event on click without focusing source', async () => {
      const {project, uiSourceCode, navigatorView, eventSpy} = await setupSelectionTest();
      activateRow(navigatorView, 'script.js', 'click');
      sinon.assert.calledOnce(eventSpy);
      assert.deepEqual(eventSpy.firstCall.args[0].data, {uiSourceCode, focusSource: false});
      project.removeProject();
    });

    it('dispatches SOURCE_SELECTED event on Enter key with focusing source', async () => {
      const {project, uiSourceCode, navigatorView, eventSpy} = await setupSelectionTest();
      activateRow(navigatorView, 'script.js', 'enter');
      sinon.assert.calledOnce(eventSpy);
      assert.deepEqual(eventSpy.firstCall.args[0].data, {uiSourceCode, focusSource: true});
      project.removeProject();
    });

    it('dispatches SOURCE_SELECTED event on Space key with focusing source', async () => {
      const {project, uiSourceCode, navigatorView, eventSpy} = await setupSelectionTest();
      activateRow(navigatorView, 'script.js', 'space');
      sinon.assert.calledOnce(eventSpy);
      assert.deepEqual(eventSpy.firstCall.args[0].data, {uiSourceCode, focusSource: true});
      project.removeProject();
    });

    it('dispatches SOURCE_SELECTED event on primary double click with focusing source', async () => {
      const {project, uiSourceCode, navigatorView, eventSpy} = await setupSelectionTest();
      activateRow(navigatorView, 'script.js', 'dblclick', {button: 0});
      sinon.assert.calledOnce(eventSpy);
      assert.deepEqual(eventSpy.firstCall.args[0].data, {uiSourceCode, focusSource: true});
      project.removeProject();
    });

    it('dispatches SOURCE_SELECTED event on middle double click without focusing source', async () => {
      const {project, uiSourceCode, navigatorView, eventSpy} = await setupSelectionTest();
      activateRow(navigatorView, 'script.js', 'dblclick', {button: 1});
      sinon.assert.calledOnce(eventSpy);
      assert.deepEqual(eventSpy.firstCall.args[0].data, {uiSourceCode, focusSource: false});
      project.removeProject();
    });

    it('sets URL data on drag start', async () => {
      const {project, navigatorView, url} = await setupSourceNode();
      const dataTransfer = dragStartRow(navigatorView, 'script.js');
      assert.strictEqual(dataTransfer.getData('text/plain'), url);
      project.removeProject();
    });

    it('renames on mousedown when selected and focused', async () => {
      const clock = sinon.useFakeTimers({toFake: ['setTimeout']});
      try {
        const {project, uiSourceCode, navigatorView, node} = await setupSourceNode();
        assert.exists(node);
        sinon.stub(uiSourceCode, 'canRename').returns(true);

        navigatorView.selectNode(node);
        sinon.stub(navigatorView.contentElement, 'hasFocus').returns(true);

        const renameSpy = sinon.spy(navigatorView, 'rename');
        mouseDownRow(navigatorView, 'script.js');

        clock.tick(300);
        sinon.assert.calledOnceWithExactly(renameSpy, node, false);

        project.removeProject();
      } finally {
        clock.restore();
      }
    });

    it('renames file via <devtools-prompt> on commit', async () => {
      const {project, uiSourceCode, navigatorView, node} = await setupSourceNode();
      assert.exists(node);

      const renameStub = sinon.stub(uiSourceCode, 'rename').callsFake(async newTitle => {
        sinon.stub(uiSourceCode, 'displayName').returns(newTitle);
        return true;
      });
      const callbackSpy = sinon.spy();
      const renameDone = new Promise<boolean>(resolve => node.rename(committed => {
        callbackSpy(committed);
        resolve(committed);
      }));

      assert.isTrue(node.isEditing);
      assert.isTrue(navigatorView.isRenaming());
      await navigatorView.updateComplete;
      await UI.Widget.Widget.allUpdatesComplete;
      const prompt = getPrompt(node);
      assert.exists(prompt);
      assert.isTrue(prompt.hasAttribute('editing'));
      assert.strictEqual(prompt.getAttribute('value'), 'script.js');
      assert.isFalse(prompt.hasAttribute('aria-label'));

      prompt.dispatchEvent(new UI.TextPrompt.TextPromptElement.CommitEvent('renamed.js'));
      await renameDone;
      await navigatorView.updateComplete;
      await UI.Widget.Widget.allUpdatesComplete;

      sinon.assert.calledOnceWithExactly(renameStub, 'renamed.js' as Platform.DevToolsPath.RawPathString);
      sinon.assert.calledOnceWithExactly(callbackSpy, true);
      assert.isFalse(node.isEditing);
      assert.isFalse(navigatorView.isRenaming());
      assert.isFalse(getPrompt(node)?.hasAttribute('editing'));
      assert.isFalse(getPrompt(node)?.hasAttribute('aria-label'));
      project.removeProject();
    });

    it('re-sorts file among siblings and preserves selection on successful rename', async () => {
      const mainFrame = await getMainFrame(target);
      const urlA = urlString`http://example.com/src/a.js`;
      const urlB = urlString`http://example.com/src/b.js`;
      const urlC = urlString`http://example.com/src/c.js`;
      const {project} = addResourceAndUISourceCode(urlA, mainFrame, '', 'text/javascript');
      const {uiSourceCode: uiSourceCodeB} = addResourceAndUISourceCode(urlB, mainFrame, '', 'text/javascript', project);
      addResourceAndUISourceCode(urlC, mainFrame, '', 'text/javascript', project);

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      renderElementIntoDOM(navigatorView);
      await navigatorView.updateComplete;

      const nodeB = navigatorView.revealUISourceCode(uiSourceCodeB, true);
      assert.exists(nodeB);
      await navigatorView.updateComplete;
      assert.isTrue(navigatorView.isNodeSelected(nodeB));

      const renameStub = sinon.stub(uiSourceCodeB, 'rename').callsFake(async newTitle => {
        sinon.stub(uiSourceCodeB, 'displayName').returns(newTitle);
        return true;
      });

      const renameDone = new Promise<boolean>(resolve => nodeB.rename(resolve));
      const prompt = getPrompt(nodeB);
      assert.exists(prompt);
      prompt.dispatchEvent(new UI.TextPrompt.TextPromptElement.CommitEvent('z.js'));
      await renameDone;
      await navigatorView.updateComplete;

      sinon.assert.calledOnceWithExactly(renameStub, 'z.js' as Platform.DevToolsPath.RawPathString);

      const dumped = dumpTree(navigatorView, {includeStatus: true});
      const srcNode = findDumpedNode(dumped, 'src');
      assert.exists(srcNode?.children);
      assert.deepEqual(srcNode.children.map(c => ({title: c.title, selected: Boolean(c.selected)})), [
        {title: 'a.js', selected: false},
        {title: 'c.js', selected: false},
        {title: 'z.js', selected: true},
      ]);
      assert.isTrue(navigatorView.isNodeSelected(nodeB));

      project.removeProject();
    });

    it('cancels renaming via <devtools-prompt> on cancel', async () => {
      const {project, uiSourceCode, navigatorView, node} = await setupSourceNode();
      assert.exists(node);

      const renameStub = sinon.stub(uiSourceCode, 'rename');
      const callbackSpy = sinon.spy();
      node.rename(callbackSpy);

      assert.isTrue(node.isEditing);
      assert.isTrue(navigatorView.isRenaming());
      assert.isFalse(navigatorView.shouldRenameOnMouseDown(node));
      const prompt = getPrompt(node);
      assert.exists(prompt);

      prompt.dispatchEvent(new UI.TextPrompt.TextPromptElement.CancelEvent());
      await navigatorView.updateComplete;

      sinon.assert.notCalled(renameStub);
      sinon.assert.calledOnceWithExactly(callbackSpy, false);
      assert.isFalse(node.isEditing);
      assert.isFalse(navigatorView.isRenaming());
      assert.isFalse(getPrompt(node)?.hasAttribute('editing'));
      assert.strictEqual(node.title, 'script.js');
      const devtoolsTree = navigatorView.contentElement.querySelector('devtools-tree');
      assert.isTrue(navigatorView.contentElement.hasFocus() || Boolean(devtoolsTree?.contains(document.activeElement)));
      project.removeProject();
    });

    it('preserves editing state and typed text when updateTitle is called while editing', async () => {
      const {project, navigatorView, node} = await setupSourceNode();
      assert.exists(node);

      node.rename();
      await navigatorView.updateComplete;

      assert.isTrue(node.isEditing);
      assert.isTrue(navigatorView.isRenaming());
      const prompt = getPrompt(node);
      assert.exists(prompt);
      assert.isTrue(prompt.hasAttribute('editing'));

      // Simulate typing text into the active prompt proxy.
      const proxy = prompt.shadowRoot?.querySelector<HTMLElement>('span.text-prompt');
      if (proxy) {
        proxy.textContent = 'typed-name.js';
        proxy.dispatchEvent(new InputEvent('input', {bubbles: true}));
      }

      // Calling updateTitle while editing should not cancel edit or revert prompt.
      node.updateTitle();
      await navigatorView.updateComplete;

      assert.isTrue(node.isEditing);
      assert.isTrue(navigatorView.isRenaming());
      assert.isTrue(prompt.hasAttribute('editing'));
      if (proxy) {
        assert.strictEqual(proxy.textContent, 'typed-name.js');
      }

      node.cancelRename();
      await navigatorView.updateComplete;
      project.removeProject();
    });

    it('renames dirty file without leading asterisk and restores asterisk on cancel', async () => {
      const {project, uiSourceCode, navigatorView, node} = await setupSourceNode();
      assert.exists(node);

      uiSourceCode.setWorkingCopy('modified content');
      assert.isTrue(uiSourceCode.isDirty());
      assert.strictEqual(node.title, '*script.js');

      const callbackSpy = sinon.spy();
      node.rename(callbackSpy);

      assert.isTrue(node.isEditing);
      assert.isTrue(navigatorView.isRenaming());
      const prompt = getPrompt(node);
      assert.exists(prompt);
      assert.strictEqual(prompt.getAttribute('value'), 'script.js');

      prompt.dispatchEvent(new UI.TextPrompt.TextPromptElement.CancelEvent());
      await navigatorView.updateComplete;

      sinon.assert.calledOnceWithExactly(callbackSpy, false);
      assert.isFalse(node.isEditing);
      assert.isFalse(navigatorView.isRenaming());
      assert.isFalse(getPrompt(node)?.hasAttribute('editing'));
      assert.strictEqual(node.title, '*script.js');
      project.removeProject();
    });

    it('does not steal focus or reveal when renaming', async () => {
      const {project, navigatorView, node} = await setupSourceNode();
      assert.exists(node);
      const mainFrame = await getMainFrame(target);
      const otherUrl = urlString`http://example.com/other.js`;
      const {uiSourceCode: otherUiSourceCode} = addResourceAndUISourceCode(otherUrl, mainFrame, '', 'text/javascript');

      navigatorView.selectNode(node);
      node.rename();
      await navigatorView.updateComplete;
      assert.isTrue(navigatorView.isRenaming());

      const revealed = navigatorView.revealUISourceCode(otherUiSourceCode, true);
      assert.isNull(revealed);
      assert.isTrue(navigatorView.isNodeSelected(node));

      getPrompt(node)?.dispatchEvent(new UI.TextPrompt.TextPromptElement.CancelEvent());
      await navigatorView.updateComplete;
      assert.isFalse(navigatorView.isRenaming());

      const revealedAfter = navigatorView.revealUISourceCode(otherUiSourceCode, true);
      assert.isNotNull(revealedAfter);
      assert.isTrue(navigatorView.isNodeSelected(revealedAfter));

      project.removeProject();
    });

    it('retries rename when UISourceCode.rename fails', async () => {
      const {project, uiSourceCode, node, navigatorView} = await setupSourceNode();
      assert.exists(node);

      const renameStub = sinon.stub(uiSourceCode, 'rename');
      const firstRenamePromise = Promise.resolve(false);
      renameStub.onFirstCall().returns(firstRenamePromise);
      renameStub.onSecondCall().resolves(true);

      const callbackSpy = sinon.spy();
      const renameDone = new Promise<boolean>(resolve => node.rename(committed => {
        callbackSpy(committed);
        resolve(committed);
      }));

      let prompt = getPrompt(node);
      assert.exists(prompt);
      prompt.dispatchEvent(new UI.TextPrompt.TextPromptElement.CommitEvent('invalid.js'));
      await firstRenamePromise;
      await Promise.resolve();
      await navigatorView.updateComplete;

      sinon.assert.notCalled(callbackSpy);
      prompt = getPrompt(node);
      assert.exists(prompt);
      assert.isTrue(node.isEditing);

      prompt.dispatchEvent(new UI.TextPrompt.TextPromptElement.CommitEvent('valid.js'));
      await renameDone;
      await navigatorView.updateComplete;

      sinon.assert.calledOnceWithExactly(callbackSpy, true);
      assert.isFalse(node.isEditing);
      project.removeProject();
    });

    it('removes newly created file when rename is canceled', async () => {
      const {project, navigatorView} = await setupSourceNode();
      const removeSpy = sinon.spy();
      const newUrl = urlString`http://example.com/new-script.js`;
      const createdUISourceCode = project.createUISourceCode(newUrl, Common.ResourceType.resourceTypes.Script);
      project.addUISourceCode(createdUISourceCode);
      sinon.stub(createdUISourceCode, 'remove').callsFake(() => {
        removeSpy();
        project.removeUISourceCode(newUrl);
      });

      sinon.stub(project, 'createFile').resolves(createdUISourceCode);
      const renameSpy = sinon.spy(navigatorView, 'rename');

      await navigatorView.create(project, 'new-script.js' as Platform.DevToolsPath.EncodedPathString);
      await navigatorView.updateComplete;

      sinon.assert.calledOnce(renameSpy);
      const [node, creatingNew] = renameSpy.firstCall.args;
      assert.isTrue(creatingNew);
      assert.isTrue(node.isEditing);

      const prompt = getPrompt(node);
      assert.exists(prompt);

      prompt.dispatchEvent(new UI.TextPrompt.TextPromptElement.CancelEvent());
      await navigatorView.updateComplete;

      sinon.assert.calledOnce(removeSpy);
      assert.isFalse(node.isEditing);
      project.removeProject();
    });

    it('cancels rename and clears renaming state when UISourceCode is removed during rename', async () => {
      const {project, uiSourceCode, navigatorView, node} = await setupSourceNode({mount: false});
      assert.exists(node);

      const callbackSpy = sinon.spy();
      node.rename(callbackSpy);
      assert.isTrue(navigatorView.isRenaming());

      const mainFrame = await getMainFrame(target);
      const otherUrl = urlString`http://example.com/other.js`;
      const {uiSourceCode: otherUISourceCode} =
          addResourceAndUISourceCode(otherUrl, mainFrame, '', 'text/javascript', project);
      await navigatorView.updateComplete;

      project.removeUISourceCode(uiSourceCode.url());
      await navigatorView.updateComplete;

      assert.isFalse(navigatorView.isRenaming());
      sinon.assert.calledOnceWithExactly(callbackSpy, false);

      const revealedNode = navigatorView.revealUISourceCode(otherUISourceCode);
      assert.isNotNull(revealedNode);

      project.removeProject();
    });

    it('clears renaming state when NavigatorView is reset during rename', async () => {
      const {project, navigatorView, node} = await setupSourceNode();
      assert.exists(node);

      const callbackSpy = sinon.spy();
      node.rename(callbackSpy);
      assert.isTrue(navigatorView.isRenaming());

      navigatorView.reset();

      assert.isFalse(navigatorView.isRenaming());
      sinon.assert.calledOnceWithExactly(callbackSpy, false);

      project.removeProject();
    });

    it('preserves editing state, renaming state, and typed text when updateTitle is called during rename', async () => {
      const {project, navigatorView, node} = await setupSourceNode();
      assert.exists(node);

      node.rename();
      assert.isTrue(node.isEditing);
      assert.isTrue(navigatorView.isRenaming());
      await navigatorView.updateComplete;
      await UI.Widget.Widget.allUpdatesComplete;

      const prompt = getPrompt(node);
      assert.exists(prompt);
      document.execCommand('insertText', false, 'typed-name.js');
      assert.strictEqual(prompt.deepInnerText(), 'typed-name.js');

      node.updateTitle();
      await navigatorView.updateComplete;
      await UI.Widget.Widget.allUpdatesComplete;

      assert.isTrue(node.isEditing);
      assert.isTrue(navigatorView.isRenaming());
      assert.strictEqual(getPrompt(node), prompt);
      assert.strictEqual(prompt.deepInnerText(), 'typed-name.js');

      prompt.dispatchEvent(new UI.TextPrompt.TextPromptElement.CancelEvent());
      await navigatorView.updateComplete;
      await UI.Widget.Widget.allUpdatesComplete;
      assert.isFalse(node.isEditing);
      assert.isFalse(navigatorView.isRenaming());
      project.removeProject();
    });
  });

  describe('NavigatorSourceTitleWidget', () => {
    it('propagates title, editing, onCommit, and onCancel to view input', async () => {
      const view = createViewFunctionStub(Sources.NavigatorView.NavigatorSourceTitleWidget);
      const widget = new Sources.NavigatorView.NavigatorSourceTitleWidget(undefined, view);
      const initialInputPromise = view.nextInput;
      renderElementIntoDOM(widget);
      await initialInputPromise;

      const commitSpy = sinon.spy();
      const cancelSpy = sinon.spy();
      widget.onCommit = commitSpy;
      widget.onCancel = cancelSpy;

      const nextInputPromise = view.nextInput;
      widget.title = 'test.js';
      widget.editing = true;
      const viewInput = await nextInputPromise;

      assert.exists(viewInput);
      assert.strictEqual(viewInput.title, 'test.js');
      assert.isTrue(viewInput.editing);

      viewInput.onCommit('committed.js');
      sinon.assert.calledOnceWithExactly(commitSpy, 'committed.js');

      viewInput.onCancel();
      sinon.assert.calledOnce(cancelSpy);
    });

    it('stops mousedown, click, and dblclick propagation only while editing', async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);

      Sources.NavigatorView.DEFAULT_NAVIGATOR_SOURCE_TITLE_VIEW(
          {title: 'script.js', editing: false, onCommit: () => {}, onCancel: () => {}}, undefined, container);

      const prompt = container.querySelector('devtools-prompt');
      assert.exists(prompt);

      const mousedownSpy = sinon.spy();
      const clickSpy = sinon.spy();
      const dblclickSpy = sinon.spy();
      container.addEventListener('mousedown', mousedownSpy);
      container.addEventListener('click', clickSpy);
      container.addEventListener('dblclick', dblclickSpy);

      prompt.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
      prompt.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      prompt.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));

      sinon.assert.calledOnce(mousedownSpy);
      sinon.assert.calledOnce(clickSpy);
      sinon.assert.calledOnce(dblclickSpy);

      Sources.NavigatorView.DEFAULT_NAVIGATOR_SOURCE_TITLE_VIEW(
          {title: 'script.js', editing: true, onCommit: () => {}, onCancel: () => {}}, undefined, container);

      prompt.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
      prompt.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      prompt.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));

      // No new events received by container because propagation stopped
      sinon.assert.calledOnce(mousedownSpy);
      sinon.assert.calledOnce(clickSpy);
      sinon.assert.calledOnce(dblclickSpy);
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

    it('sets jslog-context to content type name on file row', async () => {
      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/script.js`;
      const {uiSourceCode} = addResourceAndUISourceCode(url, mainFrame, '', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      navigatorView.revealUISourceCode(uiSourceCode);

      const treeElement = getTreeElement(navigatorView, 'script.js');
      assert.include(treeElement.listItemElement.getAttribute('jslog'), 'script');
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

    it('highlights frame on hover and hides highlight on mouseleave', async () => {
      const overlayModel = target.model(SDK.OverlayModel.OverlayModel);
      assert.exists(overlayModel);
      const highlightFrameSpy = sinon.spy(overlayModel, 'highlightFrame');
      const hideHighlightSpy = sinon.spy(SDK.OverlayModel.OverlayModel, 'hideDOMNodeHighlight');

      const childFrame = await addChildFrame(target);
      const url = urlString`http://example.com/subframe/index.html`;
      addResourceAndUISourceCode(url, childFrame, '', 'text/html');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      hoverRow(navigatorView, childFrame.displayName(), true);
      sinon.assert.calledOnceWithExactly(highlightFrameSpy, childFrame.id);

      hoverRow(navigatorView, childFrame.displayName(), false);
      sinon.assert.calledOnce(hideHighlightSpy);
    });
  });

  describe('selection and expansion tracking', () => {
    it('marks folder as expanded and lazily populates children on expandNode', async () => {
      const mainFrame = await getMainFrame(target);
      const url1 = urlString`http://example.com/src/a.js`;
      const url2 = urlString`http://example.com/src/b.js`;
      const {project} = addResourceAndUISourceCode(url1, mainFrame, '', 'text/javascript');
      addResourceAndUISourceCode(url2, mainFrame, '', 'text/javascript', project);

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      const folderTreeElement = getTreeElement(navigatorView, 'src');
      const folderNode = findTreeNode(navigatorView.rootNode, node => node.title === 'src');
      assert.exists(folderNode);
      assert.isFalse(navigatorView.isNodeExpanded(folderNode));
      assert.isFalse(folderNode.isPopulated());
      assert.lengthOf(folderTreeElement.children(), 0);

      navigatorView.expandNode(folderNode);
      await navigatorView.updateComplete;

      assert.isTrue(navigatorView.isNodeExpanded(folderNode));
      assert.isTrue(folderNode.isPopulated());
      const updatedFolderTreeElement = getTreeElement(navigatorView, 'src');
      assert.lengthOf(updatedFolderTreeElement.children(), 2);
      assert.strictEqual(getTreeElementTitle(updatedFolderTreeElement.children()[0]), 'a.js');
      assert.strictEqual(getTreeElementTitle(updatedFolderTreeElement.children()[1]), 'b.js');

      project.removeProject();
    });

    it('marks folder as not expanded on collapseNode', async () => {
      const mainFrame = await getMainFrame(target);
      const url1 = urlString`http://example.com/src/a.js`;
      const url2 = urlString`http://example.com/src/b.js`;
      const {project} = addResourceAndUISourceCode(url1, mainFrame, '', 'text/javascript');
      addResourceAndUISourceCode(url2, mainFrame, '', 'text/javascript', project);

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      const folderNode = findTreeNode(navigatorView.rootNode, node => node.title === 'src');
      assert.exists(folderNode);
      navigatorView.expandNode(folderNode);
      await navigatorView.updateComplete;
      assert.isTrue(navigatorView.isNodeExpanded(folderNode));
      assert.isTrue(getTreeElement(navigatorView, 'src').expanded);

      navigatorView.collapseNode(folderNode);
      await navigatorView.updateComplete;

      assert.isFalse(navigatorView.isNodeExpanded(folderNode));
      assert.isFalse(getTreeElement(navigatorView, 'src').expanded);

      project.removeProject();
    });

    it('updates tracked selection on selectNode', async () => {
      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/script.js`;
      const {project, uiSourceCode} = addResourceAndUISourceCode(url, mainFrame, '', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      const node = navigatorView.revealUISourceCode(uiSourceCode);
      assert.exists(node);

      navigatorView.selectNode(node);

      assert.isTrue(navigatorView.isNodeSelected(node));
      sinon.stub(uiSourceCode, 'canRename').returns(true);
      sinon.stub(navigatorView.contentElement, 'hasFocus').returns(true);
      assert.isTrue(navigatorView.shouldRenameOnMouseDown(node));

      project.removeProject();
    });

    it('selects file node when opening context menu on file row', async () => {
      sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/script.js`;
      const {project, uiSourceCode} = addResourceAndUISourceCode(url, mainFrame, '', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      const node = navigatorView.revealUISourceCode(uiSourceCode);
      assert.exists(node);
      assert.isFalse(navigatorView.isNodeSelected(node));

      openContextMenuOnRow(navigatorView, 'script.js');

      assert.isTrue(navigatorView.isNodeSelected(node));

      project.removeProject();
    });

    it('selects folder node when opening context menu on folder row', async () => {
      sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/src/script.js`;
      const {project} = addResourceAndUISourceCode(url, mainFrame, '', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      const folderNode = findTreeNode(navigatorView.rootNode, node => node.title === 'src');
      assert.exists(folderNode);
      assert.isFalse(navigatorView.isNodeSelected(folderNode));

      openContextMenuOnRow(navigatorView, 'src');

      assert.isTrue(navigatorView.isNodeSelected(folderNode));

      project.removeProject();
    });

    it('preserves expansion of unmerged parent folder when a sibling folder is added', async () => {
      const mainFrame = await getMainFrame(target);
      const url1 = urlString`http://example.com/src/components/button.js`;
      const {project, uiSourceCode: uiSourceCode1} = addResourceAndUISourceCode(url1, mainFrame, '', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;
      navigatorView.revealUISourceCode(uiSourceCode1);

      const mergedNode = findTreeNode(navigatorView.rootNode, node => node.mergedTitle() === 'src/components');
      assert.exists(mergedNode);
      navigatorView.expandNode(mergedNode);
      assert.isTrue(navigatorView.isNodeExpanded(mergedNode));

      // Add a sibling folder under "src/utils/math.js".
      const url2 = urlString`http://example.com/src/utils/math.js`;
      addResourceAndUISourceCode(url2, mainFrame, '', 'text/javascript', project);
      await navigatorView.updateComplete;

      // "src" should now be its own unmerged row and remain expanded.
      const srcTreeElement = getTreeElement(navigatorView, 'src');
      const srcNode = findTreeNode(navigatorView.rootNode, node => node.title === 'src');
      assert.exists(srcNode);
      assert.isTrue(navigatorView.isNodeExpanded(srcNode));
      assert.isTrue(srcTreeElement.expanded);

      project.removeProject();
    });

    it('updates selection to parent folder when unpopulated folder chain unmerges', async () => {
      const mainFrame = await getMainFrame(target);
      const url1 = urlString`http://example.com/src/components/button.js`;
      const {project} = addResourceAndUISourceCode(url1, mainFrame, '', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      const mergedNode = findTreeNode(navigatorView.rootNode, node => node.mergedTitle() === 'src/components');
      assert.exists(mergedNode);
      navigatorView.selectNode(mergedNode);
      assert.isTrue(navigatorView.isNodeSelected(mergedNode));

      // Add a sibling folder under "src/utils/math.js".
      const url2 = urlString`http://example.com/src/utils/math.js`;
      addResourceAndUISourceCode(url2, mainFrame, '', 'text/javascript', project);
      await navigatorView.updateComplete;

      // The unmerged "src" folder now takes over the tree element and receives the selection.
      const srcTreeElement = getTreeElement(navigatorView, 'src');
      const srcNode = findTreeNode(navigatorView.rootNode, node => node.title === 'src');
      assert.exists(srcNode);
      assert.isTrue(srcTreeElement.selected);
      assert.isTrue(navigatorView.isNodeSelected(srcNode));

      project.removeProject();
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

    afterEach(async () => {
      Common.Settings.Settings.instance()
          .resolve(SettingsUI.SourcesSettings.navigatorGroupByAuthoredSettingDescriptor)
          .set(false);
      Workspace.IgnoreListManager.IgnoreListManager.instance().enableIgnoreListing = false;
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    async function flushTreeUpdates(navigatorView: Sources.NavigatorView.NavigatorView): Promise<void> {
      (navigatorView.contentElement.querySelector('devtools-tree') as UI.TreeOutline.TreeViewElement | null)
          ?.flushPendingUpdatesForTesting();
      await raf();
    }

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
      await flushTreeUpdates(navigatorView);

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
      await flushTreeUpdates(navigatorView);

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
      await flushTreeUpdates(navigatorView);

      await assertScreenshot('sources/navigator-view-authored-deployed.png');
    });
  });

  describe('presenter state computation', () => {
    it('updates NavigatorUISourceCodeTreeNode title, tooltip, and ignore-listed state without creating a TreeElement',
       async () => {
         const mainFrame = await getMainFrame(target);
         const url = urlString`http://example.com/script.js`;
         const {project, uiSourceCode} = addResourceAndUISourceCode(url, mainFrame, '', 'text/javascript');

         const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
         const node = new Sources.NavigatorView.NavigatorUISourceCodeTreeNode(navigatorView, uiSourceCode, null);
         assert.strictEqual(node.title, 'script.js');
         assert.strictEqual(node.tooltip, 'http://example.com/script.js');

         uiSourceCode.setWorkingCopy('modified');
         node.updateTitle();
         assert.strictEqual(node.title, '*script.js');

         Workspace.IgnoreListManager.IgnoreListManager.instance().ignoreListUISourceCode(uiSourceCode);
         node.updateTitle();
         assert.isTrue(node.recursiveProperties.exclusivelyIgnored);
         assert.strictEqual(node.tooltip, 'http://example.com/script.js (ignore listed)');

         project.removeProject();
       });

    it('computes NavigatorTreeNode.computedTooltip() for nested and ignore-listed folders without creating a TreeElement',
       async () => {
         const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
         const srcFolder = new Sources.NavigatorView.NavigatorFolderTreeNode(
             navigatorView, null, 'src', Sources.NavigatorView.Types.NetworkFolder,
             'src' as Platform.DevToolsPath.EncodedPathString, 'src', urlString``);
         const componentsFolder = new Sources.NavigatorView.NavigatorFolderTreeNode(
             navigatorView, null, 'components', Sources.NavigatorView.Types.NetworkFolder,
             'src/components' as Platform.DevToolsPath.EncodedPathString, 'components', urlString``);
         srcFolder.appendChild(componentsFolder);
         componentsFolder.recursiveProperties.exclusivelyIgnored = true;

         assert.strictEqual(componentsFolder.computedTooltip(), 'src/components (ignore listed)');
       });

    it('updates NavigatorFolderTreeNode hasMappedFiles presenter state in updateTitle()', async () => {
      const {project} = createFileSystemUISourceCode({
        url: urlString`file:///path/to/project/src/script.js`,
        mimeType: 'text/javascript',
        fileSystemPath: 'file:///path/to/project',
      });
      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      const folderNode = new Sources.NavigatorView.NavigatorFolderTreeNode(
          navigatorView, project, 'src', Sources.NavigatorView.Types.FileSystemFolder,
          'src' as Platform.DevToolsPath.EncodedPathString, 'src', urlString``);

      const filePathHasBindingsStub =
          sinon.stub(Persistence.Persistence.PersistenceImpl.instance(), 'filePathHasBindings');
      filePathHasBindingsStub.returns(true);
      folderNode.updateTitle();
      assert.isTrue(folderNode.hasMappedFiles);

      filePathHasBindingsStub.returns(false);
      folderNode.updateTitle();
      assert.isFalse(folderNode.hasMappedFiles);

      workspace.removeProject(project);
    });

    it('resets exclusivelyIgnored and is-ignore-listed class on non-script UISourceCode when ignore-listing is disabled',
       async () => {
         const mainFrame = await getMainFrame(target);
         const url = urlString`http://example.com/multi-files.html`;
         const {project, uiSourceCode} = addResourceAndUISourceCode(
             url, mainFrame, '<html></html>', 'text/html', undefined, Common.ResourceType.resourceTypes.Document);

         const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance();
         ignoreListManager.enableIgnoreListing = true;

         const patternChangePromise = new Promise<void>(resolve => {
           const listener = () => {
             ignoreListManager.removeChangeListener(listener);
             resolve();
           };
           ignoreListManager.addChangeListener(listener);
         });
         ignoreListManager.ignoreListURL(url);
         await patternChangePromise;

         const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
         await navigatorView.updateComplete;
         const node = navigatorView.revealUISourceCode(uiSourceCode);
         assert.exists(node);
         const treeElement = getTreeElement(navigatorView, 'multi-files.html');
         assert.isTrue(node.recursiveProperties.exclusivelyIgnored);
         assert.isTrue(treeElement.listItemElement.classList.contains('is-ignore-listed'));

         try {
           ignoreListManager.enableIgnoreListing = false;
           node.updateTitle();
           const updatedTreeElement = getTreeElement(navigatorView, 'multi-files.html');

           assert.isNull(node.recursiveProperties.exclusivelyIgnored);
           assert.isFalse(updatedTreeElement.listItemElement.classList.contains('is-ignore-listed'));
         } finally {
           ignoreListManager.enableIgnoreListing = true;
           ignoreListManager.unIgnoreListURL(url);
           project.removeProject();
         }
       });

    it('auto-expands NavigatorGroupTreeNode on attach even if updateTitle was called before treeNode was created',
       async () => {
         const {project} = createFileSystemUISourceCode({
           url: urlString`file:///path/to/project/src/script.js`,
           mimeType: 'text/javascript',
           fileSystemPath: 'file:///path/to/project',
         });
         const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
         await navigatorView.updateComplete;
         navigatorView.reset(true);
         const groupNode = new Sources.NavigatorView.NavigatorGroupTreeNode(
             navigatorView, project, 'file:///path/to/project', Sources.NavigatorView.Types.FileSystem, 'Project',
             urlString``);

         const filePathHasBindingsStub =
             sinon.stub(Persistence.Persistence.PersistenceImpl.instance(), 'filePathHasBindings');
         filePathHasBindingsStub.returns(true);

         // Call updateTitle before treeNode() / attach.
         groupNode.updateTitle();
         assert.isTrue(groupNode.hasMappedFiles);

         navigatorView.rootNode.appendChild(groupNode);
         navigatorView.performUpdate();
         const treeElement = getTreeElement(navigatorView, 'Project');
         assert.exists(treeElement);

         assert.isTrue(treeElement.listItemElement.classList.contains('has-mapped-files'));
         assert.isTrue(treeElement.expanded);
         assert.isTrue(navigatorView.isNodeExpanded(groupNode));

         workspace.removeProject(project);
       });
  });

  describe('NavigatorTreeNode helpers and child sorting', () => {
    it('computes mergedTitle, mergedLeafNode, effectiveChildren, and tooltip on merged folder chains', async () => {
      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/src/components/widgets/button.js`;
      const {project, uiSourceCode} = addResourceAndUISourceCode(url, mainFrame, '', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      const widgetsFolder = findTreeNode(navigatorView.rootNode, node => node.title === 'widgets') as
          Sources.NavigatorView.NavigatorFolderTreeNode;
      assert.exists(widgetsFolder);
      const componentsFolder = widgetsFolder.parent as Sources.NavigatorView.NavigatorFolderTreeNode;
      assert.exists(componentsFolder);
      const srcFolder = componentsFolder.parent as Sources.NavigatorView.NavigatorFolderTreeNode;
      assert.exists(srcFolder);

      // Before populate() / revealUISourceCode(), unexpanded folders must have empty effectiveChildren.
      assert.isFalse(srcFolder.isPopulated());
      assert.isFalse(widgetsFolder.isPopulated());
      assert.deepEqual(srcFolder.effectiveChildren(), []);
      assert.deepEqual(widgetsFolder.effectiveChildren(), []);

      const fileNode = navigatorView.revealUISourceCode(uiSourceCode);
      assert.exists(fileNode);

      // In the merged folder chain src -> components -> widgets:
      assert.isTrue(widgetsFolder.isPopulated());
      assert.strictEqual(srcFolder.mergedTitle(), 'src/components/widgets');
      assert.strictEqual(srcFolder.mergedLeafNode(), widgetsFolder);
      assert.deepEqual(srcFolder.effectiveChildren(), [fileNode]);
      assert.strictEqual(srcFolder.computedTooltip(), 'src/components/widgets');
      assert.strictEqual(widgetsFolder.computedTooltip(), 'src/components/widgets');

      // Intermediate isMerged: true node returns its own tooltip rather than delegating:
      assert.isTrue(componentsFolder.isMerged);
      assert.strictEqual(componentsFolder.computedTooltip(), 'src/components');

      // On unmerged leaf folder:
      assert.strictEqual(widgetsFolder.mergedTitle(), 'widgets');
      assert.strictEqual(widgetsFolder.mergedLeafNode(), widgetsFolder);
      assert.deepEqual(widgetsFolder.effectiveChildren(), [fileNode]);

      project.removeProject();
    });

    it('keeps children sorted via compareNodes and re-sorts via resortChild on rename', async () => {
      const mainFrame = await getMainFrame(target);
      const urlB = urlString`http://example.com/b.js`;
      const urlA = urlString`http://example.com/a.js`;
      const urlC = urlString`http://example.com/c.js`;
      const {project, uiSourceCode: uiSourceCodeB} = addResourceAndUISourceCode(urlB, mainFrame, '', 'text/javascript');
      const {uiSourceCode: uiSourceCodeA} = addResourceAndUISourceCode(urlA, mainFrame, '', 'text/javascript', project);
      const {uiSourceCode: uiSourceCodeC} = addResourceAndUISourceCode(urlC, mainFrame, '', 'text/javascript', project);

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      renderElementIntoDOM(navigatorView);
      await navigatorView.updateComplete;

      const nodeB = navigatorView.revealUISourceCode(uiSourceCodeB);
      const nodeA = navigatorView.revealUISourceCode(uiSourceCodeA);
      const nodeC = navigatorView.revealUISourceCode(uiSourceCodeC);
      assert.exists(nodeA);
      assert.exists(nodeB);
      assert.exists(nodeC);

      const parentFolder = nodeA.parent as Sources.NavigatorView.NavigatorTreeNode;
      assert.exists(parentFolder);

      // Verify initial sort order: a.js, b.js, c.js
      assert.deepEqual(
          parentFolder.children().map(c => c.title),
          ['a.js', 'b.js', 'c.js'],
      );

      // Rename b.js to z.js via commit event
      sinon.stub(uiSourceCodeB, 'rename').callsFake(async newTitle => {
        sinon.stub(uiSourceCodeB, 'displayName').returns(newTitle);
        return true;
      });

      const renameDone = new Promise<boolean>(resolve => nodeB.rename(resolve));
      const prompt = getPrompt(nodeB);
      assert.exists(prompt);
      prompt.dispatchEvent(new UI.TextPrompt.TextPromptElement.CommitEvent('z.js'));
      await renameDone;
      await UI.Widget.Widget.allUpdatesComplete;

      // Children should now be re-sorted: a.js, c.js, z.js
      assert.deepEqual(
          parentFolder.children().map(c => c.title),
          ['a.js', 'c.js', 'z.js'],
      );
      assert.isTrue(navigatorView.isNodeSelected(nodeB));

      // Calling resortChild with a detached node that is not a child of parentFolder is a no-op:
      const detachedNode =
          new Sources.NavigatorView.NavigatorTreeNode(navigatorView, 'detached', Sources.NavigatorView.Types.File);
      parentFolder.resortChild(detachedNode);
      assert.deepEqual(
          parentFolder.children().map(c => c.title),
          ['a.js', 'c.js', 'z.js'],
      );

      project.removeProject();
    });

    it('clears selection via deselectIfDescendant when an ancestor folder is removed', async () => {
      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/src/script.js`;
      const {project, uiSourceCode} = addResourceAndUISourceCode(url, mainFrame, '', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      const node = navigatorView.revealUISourceCode(uiSourceCode, /* select= */ true);
      assert.exists(node);
      assert.isTrue(navigatorView.isNodeSelected(node));

      const srcFolder = node.parent as Sources.NavigatorView.NavigatorTreeNode;
      assert.exists(srcFolder);
      const domainFolder = srcFolder.parent as Sources.NavigatorView.NavigatorTreeNode;
      assert.exists(domainFolder);

      domainFolder.removeChild(srcFolder);
      assert.isFalse(navigatorView.isNodeSelected(node));
      assert.isTrue(srcFolder.isDisposed());

      project.removeProject();
    });

    it('uses merged leaf URL when building folder context menu on a merged chain', async () => {
      const getContextMenuItemsStub =
          sinon.stub(Workspace.IgnoreListManager.IgnoreListManager.instance(), 'getIgnoreListFolderContextMenuItems')
              .returns([]);
      const mainFrame = await getMainFrame(target);
      const url = urlString`http://example.com/src/components/widgets/button.js`;
      const {project, uiSourceCode} = addResourceAndUISourceCode(url, mainFrame, '', 'text/javascript');

      const navigatorView = new Sources.NavigatorView.NavigatorView(undefined, [networkProjectManager]);
      await navigatorView.updateComplete;

      const srcFolder = findTreeNode(navigatorView.rootNode, node => node.title === 'src') as
          Sources.NavigatorView.NavigatorFolderTreeNode;
      assert.exists(srcFolder);

      navigatorView.revealUISourceCode(uiSourceCode);

      const contextMenu = new UI.ContextMenu.ContextMenu(new MouseEvent('contextmenu'));
      navigatorView.handleFolderContextMenu(contextMenu, srcFolder);

      sinon.assert.calledOnce(getContextMenuItemsStub);
      assert.strictEqual(
          getContextMenuItemsStub.firstCall.args[0],
          urlString`http://example.com/src/components/widgets`,
      );

      project.removeProject();
    });
  });
});
