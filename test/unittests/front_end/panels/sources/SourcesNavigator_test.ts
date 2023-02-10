// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import * as Persistence from '../../../../../front_end/models/persistence/persistence.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Sources from '../../../../../front_end/panels/sources/sources.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import {describeWithMockConnection, dispatchEvent} from '../../helpers/MockConnection.js';
import {MockProtocolBackend} from '../../helpers/MockScopeChain.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';
import {createContentProviderUISourceCodes} from '../../helpers/UISourceCodeHelpers.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';

describeWithMockConnection('NetworkNavigatorView', () => {
  const revealMainTarget = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;
    let project: Bindings.ContentProviderBasedProject.ContentProviderBasedProject;

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
      Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew: true, debuggerWorkspaceBinding});
      const breakpointManager = Bindings.BreakpointManager.BreakpointManager.instance(
          {forceNew: true, targetManager, workspace, debuggerWorkspaceBinding});
      Persistence.Persistence.PersistenceImpl.instance({forceNew: true, workspace, breakpointManager});
      Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance({forceNew: true, workspace});
      UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
      target = targetFactory();
      stubNoopSettings();
      Root.Runtime.experiments.register(Root.Runtime.ExperimentName.AUTHORED_DEPLOYED_GROUPING, '');
      Root.Runtime.experiments.register(Root.Runtime.ExperimentName.JUST_MY_CODE, '');

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

    it('reveals main frame target on navigation', async () => {
      const navigatorView = Sources.SourcesNavigator.NetworkNavigatorView.instance({forceNew: true});

      const rootElement = navigatorView.scriptsTree.rootElement();
      assertNotNullOrUndefined(rootElement);
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
      assertNotNullOrUndefined(rootElement);
      assert.strictEqual(rootElement.childCount(), 1);
      assert.strictEqual(rootElement.firstChild()?.childCount(), 3);
      assert.isTrue(navigatorView.scriptsTree.firstChild()?.expanded);
      assert.isTrue(navigatorView.scriptsTree.firstChild()?.firstChild()?.selected);
    });
  };

  describe('without tab target', () => revealMainTarget(createTarget));
  describe('with tab target', () => revealMainTarget(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));

  describe('removing source codes selection throttling', () => {
    let target: SDK.Target.Target;
    let workspace: Workspace.Workspace.WorkspaceImpl;

    beforeEach(async () => {
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
      const breakpointManager = Bindings.BreakpointManager.BreakpointManager.instance(
          {forceNew: true, targetManager, workspace, debuggerWorkspaceBinding});
      Persistence.Persistence.PersistenceImpl.instance({forceNew: true, workspace, breakpointManager});
      Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance({forceNew: true, workspace});
      UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
      target = createTarget();
      stubNoopSettings();
      Root.Runtime.experiments.register(Root.Runtime.ExperimentName.AUTHORED_DEPLOYED_GROUPING, '');
      Root.Runtime.experiments.register(Root.Runtime.ExperimentName.JUST_MY_CODE, '');
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
      assertNotNullOrUndefined(rootElement);

      const exampleComNode = rootElement.firstChild();
      assertNotNullOrUndefined(exampleComNode);
      const nodeA = exampleComNode.childAt(0);
      const nodeB = exampleComNode.childAt(1);
      const nodeC = exampleComNode.childAt(2);
      assertNotNullOrUndefined(nodeA);
      assertNotNullOrUndefined(nodeB);
      assertNotNullOrUndefined(nodeC);

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
      assertNotNullOrUndefined(rootElement);

      const nodeExampleCom = rootElement.firstChild();
      assertNotNullOrUndefined(nodeExampleCom);
      const nodeA = nodeExampleCom.childAt(0);
      const nodeB = nodeExampleCom.childAt(1);
      const nodeC = nodeExampleCom.childAt(2);
      assertNotNullOrUndefined(nodeA);
      assertNotNullOrUndefined(nodeB);
      assertNotNullOrUndefined(nodeC);

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
      assertNotNullOrUndefined(rootElement);

      const exampleComNode = rootElement.firstChild();
      assertNotNullOrUndefined(exampleComNode);
      const nodeD = exampleComNode.childAt(0);
      assertNotNullOrUndefined(nodeD);
      await nodeD.expand();
      const nodeA = nodeD.childAt(0);
      const nodeB = nodeD.childAt(1);
      const nodeC = exampleComNode.childAt(1);
      assertNotNullOrUndefined(nodeA);
      assertNotNullOrUndefined(nodeB);
      assertNotNullOrUndefined(nodeC);

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
      assertNotNullOrUndefined(rootElement);

      const exampleComNode = rootElement.firstChild();
      assertNotNullOrUndefined(exampleComNode);
      const nodeD = exampleComNode.childAt(0);
      const nodeE = exampleComNode.childAt(1);
      const nodeC = exampleComNode.childAt(2);
      assertNotNullOrUndefined(nodeD);
      assertNotNullOrUndefined(nodeE);
      await nodeD.expand();
      await nodeE.expand();
      const nodeA = nodeD.childAt(0);
      const nodeB = nodeE.childAt(0);
      assertNotNullOrUndefined(nodeA);
      assertNotNullOrUndefined(nodeB);
      assertNotNullOrUndefined(nodeC);

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
      assertNotNullOrUndefined(rootElement);

      const exampleComNode = rootElement.firstChild();
      assertNotNullOrUndefined(exampleComNode);
      const nodeA = exampleComNode.childAt(0);
      const nodeB = exampleComNode.childAt(1);
      const nodeC = exampleComNode.childAt(2);
      assertNotNullOrUndefined(nodeA);
      assertNotNullOrUndefined(nodeB);
      assertNotNullOrUndefined(nodeC);

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
});
