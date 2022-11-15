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
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
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

  describe('without tab tatget', () => revealMainTarget(createTarget));
  describe('with tab tatget', () => revealMainTarget(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));
});
