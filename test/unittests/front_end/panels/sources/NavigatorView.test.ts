// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import * as Breakpoints from '../../../../../front_end/models/breakpoints/breakpoints.js';
import * as Persistence from '../../../../../front_end/models/persistence/persistence.js';
import * as TextUtils from '../../../../../front_end/models/text_utils/text_utils.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Sources from '../../../../../front_end/panels/sources/sources.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../helpers/MockConnection.js';

describeWithMockConnection('NavigatorView', () => {
  let target: SDK.Target.Target;
  let workspace: Workspace.Workspace.WorkspaceImpl;

  beforeEach(() => {
    Root.Runtime.experiments.register(Root.Runtime.ExperimentName.AUTHORED_DEPLOYED_GROUPING, '');
    Root.Runtime.experiments.register(Root.Runtime.ExperimentName.JUST_MY_CODE, '');

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
      mimeType: string, resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel) {
    frame.addResource(new SDK.Resource.Resource(
        resourceTreeModel, null, url, url, frame.id, null, Common.ResourceType.resourceTypes.Document, 'text/html',
        null, null));
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
    const mainFrameId = 'main' as Protocol.Page.FrameId;
    const childFrameId = 'child' as Protocol.Page.FrameId;

    const resourceTreeModel =
        target.model(SDK.ResourceTreeModel.ResourceTreeModel) as SDK.ResourceTreeModel.ResourceTreeModel;
    await resourceTreeModel.once(SDK.ResourceTreeModel.Events.CachedResourcesLoaded);
    resourceTreeModel.frameAttached(mainFrameId, null);
    const childFrame = resourceTreeModel.frameAttached(childFrameId, mainFrameId);
    assertNotNullOrUndefined(childFrame);
    const {project} = addResourceAndUISourceCode(url, childFrame, '', 'text/html', resourceTreeModel);

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
});
