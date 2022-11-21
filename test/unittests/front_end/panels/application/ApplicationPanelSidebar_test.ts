// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Application from '../../../../../front_end/panels/application/application.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

describeWithMockConnection('ApplicationPanelSidebar', () => {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;

    beforeEach(() => {
      stubNoopSettings();
      target = targetFactory();
      Root.Runtime.experiments.register('backgroundServices', '', false);
      Root.Runtime.experiments.register(Root.Runtime.ExperimentName.PRELOADING_STATUS_PANEL, '', false);
    });

    it('shows cookies for all frames', async () => {
      sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();  // Silence console error
      Application.ResourcesPanel.ResourcesPanel.instance({forceNew: true});
      const sidebar = await Application.ResourcesPanel.ResourcesPanel.showAndGetSidebar();
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assertNotNullOrUndefined(resourceTreeModel);
      sinon.stub(resourceTreeModel, 'frames').returns([
        {
          url: 'http://www.example.com/',
          unreachableUrl: () => null,
          resourceTreeModel: () => resourceTreeModel,
        } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame,
        {
          url: 'http://www.example.com/admin/',
          unreachableUrl: () => null,
          resourceTreeModel: () => resourceTreeModel,
        } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame,
        {
          url: 'http://www.example.org/',
          unreachableUrl: () => null,
          resourceTreeModel: () => resourceTreeModel,
        } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame,
      ]);
      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.CachedResourcesLoaded, resourceTreeModel);

      assert.strictEqual(sidebar.cookieListTreeElement.childCount(), 2);
      assert.deepStrictEqual(
          sidebar.cookieListTreeElement.children().map(e => e.title),
          ['http://www.example.com', 'http://www.example.org']);
    });
  };
  describe('without tab target', () => tests(() => createTarget()));
  describe('with tab target', () => tests(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));
});
