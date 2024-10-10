// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
  setMockConnectionResponseHandler,
} from '../../testing/MockConnection.js';
import {MockProtocolBackend} from '../../testing/MockScopeChain.js';
import {setMockResourceTree} from '../../testing/ResourceTreeHelpers.js';
import {createContentProviderUISourceCodes} from '../../testing/UISourceCodeHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Sources from './sources.js';

describeWithMockConnection('NetworkNavigatorView', () => {
  let workspace: Workspace.Workspace.WorkspaceImpl;
  beforeEach(async () => {
    setMockResourceTree(false);
    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
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
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
    Root.Runtime.experiments.register(Root.Runtime.ExperimentName.AUTHORED_DEPLOYED_GROUPING, '');
    Root.Runtime.experiments.register(Root.Runtime.ExperimentName.JUST_MY_CODE, '');
  });

  describe('reveals main target', () => {
    let target: SDK.Target.Target;
    let project: Bindings.ContentProviderBasedProject.ContentProviderBasedProject;

    beforeEach(async () => {
      const tabTarget = createTarget({type: SDK.Target.Type.TAB});
      createTarget({parentTarget: tabTarget, subtype: 'prerender'});
      target = createTarget({parentTarget: tabTarget});
      ({project} = createContentProviderUISourceCodes({
         items: [
           {url: 'http://example.com/' as Platform.DevToolsPath.UrlString, mimeType: 'text/html'},
           {url: 'http://example.com/favicon.ico' as Platform.DevToolsPath.UrlString, mimeType: 'image/x-icon'},
           {url: 'http://example.com/gtm.js' as Platform.DevToolsPath.UrlString, mimeType: 'application/javascript'},
         ],
         projectType: Workspace.Workspace.projectTypes.Network,
         target,
       }));
    });

    afterEach(() => {
      Workspace.Workspace.WorkspaceImpl.instance().removeProject(project);
    });

    it('shows folder with scripts requests', async () => {
      const {project} = createContentProviderUISourceCodes({
        items: [
          {
            url: 'http://example.com/script.js' as Platform.DevToolsPath.UrlString,
            mimeType: 'application/javascript',
            resourceType: Common.ResourceType.resourceTypes.Script,
          },
        ],
        projectType: Workspace.Workspace.projectTypes.Network,
        target,
      });

      const navigatorView = Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true});
      const rootElement = navigatorView.scriptsTree.rootElement();
      const folder = rootElement.firstChild();
      const file = folder?.firstChild();

      assert.strictEqual(folder?.title, 'example.com');
      assert.strictEqual(file?.title, 'script.js');

      project.removeProject();
    });

    it('does not show Fetch and XHR requests', async () => {
      const {project} = createContentProviderUISourceCodes({
        items: [
          {
            url: 'http://example.com/list-xhr.json' as Platform.DevToolsPath.UrlString,
            mimeType: 'application/json',
            resourceType: Common.ResourceType.resourceTypes.XHR,
          },
          {
            url: 'http://example.com/list-fetch.json' as Platform.DevToolsPath.UrlString,
            mimeType: 'application/json',
            resourceType: Common.ResourceType.resourceTypes.Fetch,
          },
        ],
        projectType: Workspace.Workspace.projectTypes.Network,
        target,
      });

      const navigatorView = Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true});
      const rootElement = navigatorView.scriptsTree.rootElement();
      assert.strictEqual(rootElement.children().length, 0);

      project.removeProject();
    });

    it('reveals main frame target on navigation', async () => {
      const navigatorView = Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true});

      const rootElement = navigatorView.scriptsTree.rootElement();
      assert.strictEqual(rootElement.childCount(), 1);
      assert.strictEqual(rootElement.firstChild()?.childCount(), 3);
      assert.isFalse(rootElement.firstChild()?.expanded);
      assert.isTrue(rootElement.firstChild()?.selected);

      target.setInspectedURL('http://example.com/' as Platform.DevToolsPath.UrlString);

      assert.isTrue(navigatorView.scriptsTree.firstChild()?.expanded);
      assert.isTrue(navigatorView.scriptsTree.firstChild()?.firstChild()?.selected);
    });

    it('reveals main frame target when added', async () => {
      target.setInspectedURL('http://example.com/' as Platform.DevToolsPath.UrlString);
      const navigatorView = Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true});

      const rootElement = navigatorView.scriptsTree.rootElement();
      assert.strictEqual(rootElement.childCount(), 1);
      assert.strictEqual(rootElement.firstChild()?.childCount(), 3);
      assert.isTrue(navigatorView.scriptsTree.firstChild()?.expanded);
      assert.isTrue(navigatorView.scriptsTree.firstChild()?.firstChild()?.selected);
    });
  });

  it('updates in scope change', () => {
    const target = createTarget();
    const {project} = createContentProviderUISourceCodes({
      items: [
        {url: 'http://example.com/' as Platform.DevToolsPath.UrlString, mimeType: 'text/html'},
        {url: 'http://example.com/favicon.ico' as Platform.DevToolsPath.UrlString, mimeType: 'image/x-icon'},
        {url: 'http://example.com/gtm.js' as Platform.DevToolsPath.UrlString, mimeType: 'application/javascript'},
      ],
      projectId: 'project',
      projectType: Workspace.Workspace.projectTypes.Network,
      target,
    });
    const anotherTarget = createTarget();
    const {project: anotherProject} = createContentProviderUISourceCodes({
      items: [
        {url: 'http://example.org/' as Platform.DevToolsPath.UrlString, mimeType: 'text/html'},
        {url: 'http://example.org/background.bmp' as Platform.DevToolsPath.UrlString, mimeType: 'image/x-icon'},
      ],
      projectId: 'anotherProject',
      projectType: Workspace.Workspace.projectTypes.Network,
      target: anotherTarget,
    });

    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    const navigatorView = Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true});

    let rootElement = navigatorView.scriptsTree.rootElement();
    assert.strictEqual(rootElement.childCount(), 1);
    assert.strictEqual(rootElement.firstChild()?.childCount(), 3);
    assert.deepEqual(rootElement.firstChild()?.children().map(i => i.title), ['(index)', 'gtm.js', 'favicon.ico']);

    SDK.TargetManager.TargetManager.instance().setScopeTarget(anotherTarget);

    rootElement = navigatorView.scriptsTree.rootElement();
    assert.strictEqual(rootElement.childCount(), 1);
    assert.strictEqual(rootElement.firstChild()?.childCount(), 2);
    assert.deepEqual(rootElement.firstChild()?.children().map(i => i.title), ['(index)', 'background.bmp']);

    project.removeProject();
    anotherProject.removeProject();
  });

  describe('removing source codes selection throttling', () => {
    let target: SDK.Target.Target;

    beforeEach(() => {
      target = createTarget();
    });

    it('selects just once when removing multiple sibling source codes', () => {
      const {project} = createContentProviderUISourceCodes({
        items: [
          {url: 'http://example.com/a.js' as Platform.DevToolsPath.UrlString, mimeType: 'application/javascript'},
          {url: 'http://example.com/b.js' as Platform.DevToolsPath.UrlString, mimeType: 'application/javascript'},
        ],
        projectType: Workspace.Workspace.projectTypes.Network,
        target,
      });
      const {project: otherProject} = createContentProviderUISourceCodes({
        items: [
          {url: 'http://example.com/c.js' as Platform.DevToolsPath.UrlString, mimeType: 'application/javascript'},
        ],
        projectType: Workspace.Workspace.projectTypes.Network,
        projectId: 'other',
        target,
      });

      const navigatorView = Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true});
      const rootElement = navigatorView.scriptsTree.rootElement();
      const exampleComNode = rootElement.firstChild();
      assert.exists(exampleComNode);
      const nodeA = exampleComNode.childAt(0);
      const nodeB = exampleComNode.childAt(1);
      const nodeC = exampleComNode.childAt(2);
      assert.exists(nodeA);
      assert.exists(nodeB);
      assert.exists(nodeC);

      // Select the 'http://example.com/a.js' node. Remove the project with a.js and b.js and verify
      // that the selection is moved from 'a.js' to 'c.js', without temporarily selecting 'b.js'.
      nodeA.select();

      const nodeBSelectSpy = sinon.spy(nodeB, 'select');
      const nodeCSelectSpy = sinon.spy(nodeC, 'select');

      project.removeProject();

      assert.isTrue(nodeBSelectSpy.notCalled);
      assert.isTrue(nodeCSelectSpy.called);

      otherProject.removeProject();
    });

    it('selects parent after removing all children', () => {
      const {project} = createContentProviderUISourceCodes({
        items: [
          {url: 'http://example.com/a.js' as Platform.DevToolsPath.UrlString, mimeType: 'application/javascript'},
          {url: 'http://example.com/b.js' as Platform.DevToolsPath.UrlString, mimeType: 'application/javascript'},
          {url: 'http://example.com/c.js' as Platform.DevToolsPath.UrlString, mimeType: 'application/javascript'},
        ],
        projectType: Workspace.Workspace.projectTypes.Network,
        target,
      });

      const navigatorView = Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true});
      const rootElement = navigatorView.scriptsTree.rootElement();
      const nodeExampleCom = rootElement.firstChild();
      assert.exists(nodeExampleCom);
      const nodeA = nodeExampleCom.childAt(0);
      const nodeB = nodeExampleCom.childAt(1);
      const nodeC = nodeExampleCom.childAt(2);
      assert.exists(nodeA);
      assert.exists(nodeB);
      assert.exists(nodeC);

      // Select the 'http://example.com/a.js' node. Remove all the source codenodes and check the selection
      // is not propagated forward to the siblings as we remove them. Instead, the selection will be moved
      // directly to the parent.
      nodeA.select();

      const nodeBSelectSpy = sinon.spy(nodeB, 'select');
      const nodeCSelectSpy = sinon.spy(nodeC, 'select');
      const nodeExampleComSelectSpy = sinon.spy(nodeExampleCom, 'select');

      project.removeProject();

      assert.isTrue(nodeBSelectSpy.notCalled);
      assert.isTrue(nodeCSelectSpy.notCalled);
      assert.isTrue(nodeExampleComSelectSpy.called);

      // Note that the last asserion is slightly misleading since the empty example.com node is removed.
      // Let us make that clear here.
      assert.strictEqual(rootElement.childCount(), 0);
    });

    it('selects sibling after removing folder children', async () => {
      const {project} = createContentProviderUISourceCodes({
        items: [
          {url: 'http://example.com/d/a.js' as Platform.DevToolsPath.UrlString, mimeType: 'application/javascript'},
          {url: 'http://example.com/d/b.js' as Platform.DevToolsPath.UrlString, mimeType: 'application/javascript'},
        ],
        projectType: Workspace.Workspace.projectTypes.Network,
        target,
      });
      const {project: otherProject} = createContentProviderUISourceCodes({
        items: [
          {url: 'http://example.com/c.js' as Platform.DevToolsPath.UrlString, mimeType: 'application/javascript'},
        ],
        projectType: Workspace.Workspace.projectTypes.Network,
        projectId: 'other',
        target,
      });

      const navigatorView = Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true});
      const rootElement = navigatorView.scriptsTree.rootElement();
      const exampleComNode = rootElement.firstChild();
      assert.exists(exampleComNode);
      const nodeD = exampleComNode.childAt(0);
      assert.exists(nodeD);
      await nodeD.expand();
      const nodeA = nodeD.childAt(0);
      const nodeB = nodeD.childAt(1);
      const nodeC = exampleComNode.childAt(1);
      assert.exists(nodeA);
      assert.exists(nodeB);
      assert.exists(nodeC);

      // Select the 'http://example.com/a.js' node.
      nodeA.select();

      const nodeBSelectSpy = sinon.spy(nodeB, 'select');
      const nodeCSelectSpy = sinon.spy(nodeC, 'select');

      // Remove the project with the a.js and b.js nodes.
      project.removeProject();

      // Let us check that we do not push the selection forward over node 'b.js'.
      // Instead, the selection will be pushed to 'c.js' (with an intermediate step at 'd').
      // (Ideally, it would move directly from 'a.js' to 'c.js', but we are currently only
      // optimizing away the moves to siblings.)
      assert.isTrue(nodeBSelectSpy.notCalled);
      assert.isTrue(nodeCSelectSpy.called);

      // Also note that the folder 'd' is removed. Let us make that explicit.
      assert.strictEqual(exampleComNode.childCount(), 1);
      assert.strictEqual(exampleComNode.childAt(0), nodeC);

      otherProject.removeProject();
    });

    it('selects sibling after removing individual folder children', async () => {
      const {project} = createContentProviderUISourceCodes({
        items: [
          {url: 'http://example.com/d/a.js' as Platform.DevToolsPath.UrlString, mimeType: 'application/javascript'},
          {url: 'http://example.com/e/b.js' as Platform.DevToolsPath.UrlString, mimeType: 'application/javascript'},
        ],
        projectType: Workspace.Workspace.projectTypes.Network,
        target,
      });
      const {project: otherProject} = createContentProviderUISourceCodes({
        items: [
          {url: 'http://example.com/c.js' as Platform.DevToolsPath.UrlString, mimeType: 'application/javascript'},
        ],
        projectType: Workspace.Workspace.projectTypes.Network,
        projectId: 'other',
        target,
      });

      const navigatorView = Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true});
      const rootElement = navigatorView.scriptsTree.rootElement();
      const exampleComNode = rootElement.firstChild();
      assert.exists(exampleComNode);
      const nodeD = exampleComNode.childAt(0);
      const nodeE = exampleComNode.childAt(1);
      const nodeC = exampleComNode.childAt(2);
      assert.exists(nodeD);
      assert.exists(nodeE);
      await nodeD.expand();
      await nodeE.expand();
      const nodeA = nodeD.childAt(0);
      const nodeB = nodeE.childAt(0);
      assert.exists(nodeA);
      assert.exists(nodeB);
      assert.exists(nodeC);

      // Select the 'http://example.com/a.js' node.
      nodeA.select();

      const nodeESelectSpy = sinon.spy(nodeE, 'select');
      const nodeBSelectSpy = sinon.spy(nodeB, 'select');
      const nodeCSelectSpy = sinon.spy(nodeC, 'select');

      // Remove a.js and b.js nodes. This will remove their nodes, including the containing folders.
      // The selection will be moved from 'a.js' to its parent (folder 'd') and when that gets removed,
      // it should move to 'c' rather being pushed forward to 'e'.
      project.removeProject();

      assert.isTrue(nodeESelectSpy.notCalled);
      assert.isTrue(nodeBSelectSpy.notCalled);
      assert.isTrue(nodeCSelectSpy.called);

      // Also note that nodeD and nodeE are removed. Let us make that explicit.
      assert.strictEqual(exampleComNode.childCount(), 1);
      assert.strictEqual(exampleComNode.childAt(0), nodeC);

      otherProject.removeProject();
    });

    it('selects just once when excution-context-destroyed event removes sibling source codes', async () => {
      const backend = new MockProtocolBackend();

      dispatchEvent(target, 'Runtime.executionContextCreated', {
        context: {
          id: 2,
          origin: 'http://example.com',
          name: 'c2',
          uniqueId: 'c2',
          auxData: {
            frameId: 'f2',
          },
        },
      });

      await backend.addScript(
          target, {content: '42', url: 'http://example.com/a.js', executionContextId: 2, hasSourceURL: false}, null);
      await backend.addScript(
          target, {content: '42', url: 'http://example.com/b.js', executionContextId: 2, hasSourceURL: false}, null);
      await backend.addScript(target, {content: '42', url: 'http://example.com/c.js', hasSourceURL: false}, null);

      const navigatorView = Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true});
      const rootElement = navigatorView.scriptsTree.rootElement();
      const exampleComNode = rootElement.firstChild();
      assert.exists(exampleComNode);
      const nodeA = exampleComNode.childAt(0);
      const nodeB = exampleComNode.childAt(1);
      const nodeC = exampleComNode.childAt(2);
      assert.exists(nodeA);
      assert.exists(nodeB);
      assert.exists(nodeC);

      // Select the 'http://example.com/a.js' node. Remove the project with a.js and b.js and verify
      // that the selection is moved from 'a.js' to 'c.js', without temporarily selecting 'b.js'.
      nodeA.select();

      const nodeBSelectSpy = sinon.spy(nodeB, 'select');
      const nodeCSelectSpy = sinon.spy(nodeC, 'select');

      dispatchEvent(
          target, 'Runtime.executionContextDestroyed', {executionContextId: 2, executionContextUniqueId: 'c2'});

      assert.isTrue(nodeBSelectSpy.notCalled);
      assert.isTrue(nodeCSelectSpy.called);

      // Sanity check - we should have only one source now.
      assert.strictEqual(exampleComNode.childCount(), 1);
    });
  });

  describe('with ignore listing', () => {
    let target: SDK.Target.Target;
    let resolveFn: (() => void)|null = null;

    beforeEach(() => {
      target = createTarget();
      Bindings.IgnoreListManager.IgnoreListManager.instance().addChangeListener(() => {
        if (resolveFn) {
          resolveFn();
          resolveFn = null;
        }
      });
      setMockConnectionResponseHandler('Debugger.setBlackboxPatterns', () => ({}));
      setMockConnectionResponseHandler('Debugger.setBlackboxExecutionContexts', () => ({}));
    });

    const updatePatternSetting = async (settingValue: Common.Settings.RegExpSettingItem[]) => {
      const setting = Common.Settings.Settings.instance().moduleSetting('skip-stack-frames-pattern') as
          Common.Settings.RegExpSetting;
      const promise = new Promise<void>(resolve => {
        resolveFn = resolve;
      });
      setting.setAsArray(settingValue);
      void await promise;
    };
    const enableIgnoreListing = () => updatePatternSetting([{pattern: '-hidden', disabled: false}]);
    const disableIgnoreListing = () => updatePatternSetting([]);

    it('shows folder with only ignore listed content as ignore listed', async () => {
      await enableIgnoreListing();
      const {project} = createContentProviderUISourceCodes({
        items: [
          {
            url: 'http://example.com/ignored/a/a-hidden.js' as Platform.DevToolsPath.UrlString,
            mimeType: 'application/javascript',
          },
          {
            url: 'http://example.com/ignored/b/b-hidden.js' as Platform.DevToolsPath.UrlString,
            mimeType: 'application/javascript',
          },
          {
            url: 'http://example.com/mixed/a/a-hidden.js' as Platform.DevToolsPath.UrlString,
            mimeType: 'application/javascript',
          },
          {
            url: 'http://example.com/mixed/b/b.js' as Platform.DevToolsPath.UrlString,
            mimeType: 'application/javascript',
          },
        ],
        projectType: Workspace.Workspace.projectTypes.Network,
        target,
      });

      const navigatorView = Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true});
      const rootElement = navigatorView.scriptsTree.rootElement();
      const nodeExampleCom = rootElement.firstChild();
      const ignoredFolder = nodeExampleCom!.childAt(0);
      const mixedFolder = nodeExampleCom!.childAt(1);

      assert.strictEqual(mixedFolder!.tooltip, 'mixed');
      assert.strictEqual(ignoredFolder!.tooltip, 'ignored (ignore listed)');

      project.removeProject();
    });

    it('updates folders when ignore listing rules change', async () => {
      const {project} = createContentProviderUISourceCodes({
        items: [
          {
            url: 'http://example.com/ignored/a/a-hidden.js' as Platform.DevToolsPath.UrlString,
            mimeType: 'application/javascript',
          },
          {
            url: 'http://example.com/ignored/b/b-hidden.js' as Platform.DevToolsPath.UrlString,
            mimeType: 'application/javascript',
          },
          {
            url: 'http://example.com/mixed/a/a-hidden.js' as Platform.DevToolsPath.UrlString,
            mimeType: 'application/javascript',
          },
          {
            url: 'http://example.com/mixed/b/b.js' as Platform.DevToolsPath.UrlString,
            mimeType: 'application/javascript',
          },
        ],
        projectType: Workspace.Workspace.projectTypes.Network,
        target,
      });

      const navigatorView = Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true});
      const rootElement = navigatorView.scriptsTree.rootElement();
      const nodeExampleCom = rootElement.firstChild();
      const ignoredFolder = nodeExampleCom!.childAt(0);
      const mixedFolder = nodeExampleCom!.childAt(1);

      assert.strictEqual(mixedFolder!.tooltip, 'mixed');
      assert.strictEqual(ignoredFolder!.tooltip, 'ignored');

      await enableIgnoreListing();

      assert.strictEqual(mixedFolder!.tooltip, 'mixed');
      assert.strictEqual(ignoredFolder!.tooltip, 'ignored (ignore listed)');

      await disableIgnoreListing();

      assert.strictEqual(mixedFolder!.tooltip, 'mixed');
      assert.strictEqual(ignoredFolder!.tooltip, 'ignored');

      project.removeProject();
    });

    it('updates folders when files are added or removed', async () => {
      await enableIgnoreListing();
      const {project} = createContentProviderUISourceCodes({
        items: [
          {
            url: 'http://example.com/ignored/a/a-hidden.js' as Platform.DevToolsPath.UrlString,
            mimeType: 'application/javascript',
          },
          {
            url: 'http://example.com/ignored/b/b-hidden.js' as Platform.DevToolsPath.UrlString,
            mimeType: 'application/javascript',
          },
          {
            url: 'http://example.com/mixed/a/a-hidden.js' as Platform.DevToolsPath.UrlString,
            mimeType: 'application/javascript',
          },
        ],
        projectType: Workspace.Workspace.projectTypes.Network,
        target,
      });

      const navigatorView = Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true});
      const rootElement = navigatorView.scriptsTree.rootElement();
      const nodeExampleCom = rootElement.firstChild();
      const ignoredFolder = nodeExampleCom!.childAt(0);
      const mixedFolder = nodeExampleCom!.childAt(1);

      assert.strictEqual(mixedFolder!.tooltip, 'mixed/a (ignore listed)');
      assert.strictEqual(ignoredFolder!.tooltip, 'ignored (ignore listed)');

      const {project: otherProject} = createContentProviderUISourceCodes({
        items: [
          {
            url: 'http://example.com/mixed/b/b.js' as Platform.DevToolsPath.UrlString,
            mimeType: 'application/javascript',
          },
        ],
        projectType: Workspace.Workspace.projectTypes.Network,
        target,
      });

      assert.strictEqual(mixedFolder!.tooltip, 'mixed');
      assert.strictEqual(ignoredFolder!.tooltip, 'ignored (ignore listed)');

      otherProject.removeProject();

      assert.strictEqual(mixedFolder!.tooltip, 'mixed (ignore listed)');
      assert.strictEqual(ignoredFolder!.tooltip, 'ignored (ignore listed)');

      project.removeProject();
    });
  });
});
