// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Application from '../../../../../front_end/panels/application/application.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {
  createTarget,
  stubNoopSettings,
} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

describeWithMockConnection('SharedStorageListTreeElement', function() {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;
    let sharedStorageModel: Application.SharedStorageModel.SharedStorageModel|null;
    let resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel|null;
    let treeElement: Application.SharedStorageListTreeElement.SharedStorageListTreeElement;

    const TEST_ORIGIN_A = 'http://a.test';
    const TEST_ORIGIN_B = 'http://b.test';
    const TEST_ORIGIN_C = 'http://c.test';

    const ID = 'AA' as Protocol.Page.FrameId;

    const EVENTS = [
      {
        accessTime: 0,
        type: Protocol.Storage.SharedStorageAccessType.DocumentAppend,
        mainFrameId: ID,
        ownerOrigin: TEST_ORIGIN_A,
        params: {key: 'key0', value: 'value0'} as Protocol.Storage.SharedStorageAccessParams,
      },
      {
        accessTime: 10,
        type: Protocol.Storage.SharedStorageAccessType.WorkletGet,
        mainFrameId: ID,
        ownerOrigin: TEST_ORIGIN_A,
        params: {key: 'key0'} as Protocol.Storage.SharedStorageAccessParams,
      },
      {
        accessTime: 15,
        type: Protocol.Storage.SharedStorageAccessType.WorkletLength,
        mainFrameId: ID,
        ownerOrigin: TEST_ORIGIN_B,
        params: {} as Protocol.Storage.SharedStorageAccessParams,
      },
      {
        accessTime: 20,
        type: Protocol.Storage.SharedStorageAccessType.DocumentClear,
        mainFrameId: ID,
        ownerOrigin: TEST_ORIGIN_B,
        params: {} as Protocol.Storage.SharedStorageAccessParams,
      },
      {
        accessTime: 100,
        type: Protocol.Storage.SharedStorageAccessType.WorkletSet,
        mainFrameId: ID,
        ownerOrigin: TEST_ORIGIN_C,
        params: {key: 'key0', value: 'value1', ignoreIfPresent: true} as Protocol.Storage.SharedStorageAccessParams,
      },
      {
        accessTime: 150,
        type: Protocol.Storage.SharedStorageAccessType.WorkletRemainingBudget,
        mainFrameId: ID,
        ownerOrigin: TEST_ORIGIN_C,
        params: {} as Protocol.Storage.SharedStorageAccessParams,
      },
    ];

    const MOCK_MAIN_FRAME = {
      get id(): Protocol.Page.FrameId {
        return ID;
      },
      isMainFrame(): boolean {
        return true;
      },
      isOutermostFrame(): boolean {
        return true;
      },
    } as SDK.ResourceTreeModel.ResourceTreeFrame;

    beforeEach(async () => {
      stubNoopSettings();
      target = targetFactory();
      Root.Runtime.experiments.register(Root.Runtime.ExperimentName.PRELOADING_STATUS_PANEL, '', false);
      Root.Runtime.experiments.register(Root.Runtime.ExperimentName.STORAGE_BUCKETS_TREE, '', false);

      sharedStorageModel = target.model(Application.SharedStorageModel.SharedStorageModel);
      resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    });

    it('shows view on select', async () => {
      assertNotNullOrUndefined(sharedStorageModel);
      sinon.stub(sharedStorageModel, 'enable').resolves();

      const panel = Application.ResourcesPanel.ResourcesPanel.instance({forceNew: true});
      panel.markAsRoot();
      panel.show(document.body);

      treeElement = new Application.SharedStorageListTreeElement.SharedStorageListTreeElement(panel);

      const view = treeElement.view;
      const wasShownSpy = sinon.spy(view, 'wasShown');

      document.body.appendChild(treeElement.listItemNode);
      treeElement.treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
      treeElement.selectable = true;
      treeElement.select();

      assert.isTrue(wasShownSpy.calledOnce);

      panel.detach();
    });

    it('adds events', async () => {
      assertNotNullOrUndefined(sharedStorageModel);
      sinon.stub(sharedStorageModel, 'enable').resolves();

      const panel = Application.ResourcesPanel.ResourcesPanel.instance({forceNew: true});
      treeElement = new Application.SharedStorageListTreeElement.SharedStorageListTreeElement(panel);
      const view = treeElement.view;

      view.setDefaultIdForTesting(ID);
      for (const event of EVENTS) {
        treeElement.addEvent(event);
      }

      assert.deepEqual(view.getEventsForTesting(), EVENTS);

      panel.detach();
    });

    it('clears events upon main frame navigation', async () => {
      assertNotNullOrUndefined(sharedStorageModel);
      sinon.stub(sharedStorageModel, 'enable').resolves();

      const panel = Application.ResourcesPanel.ResourcesPanel.instance({forceNew: true});
      treeElement = new Application.SharedStorageListTreeElement.SharedStorageListTreeElement(panel);
      const view = treeElement.view;

      view.setDefaultIdForTesting(ID);
      for (const event of EVENTS) {
        treeElement.addEvent(event);
      }

      assert.deepEqual(view.getEventsForTesting(), EVENTS);

      // Events are cleared on main frame navigation.
      assertNotNullOrUndefined(resourceTreeModel);
      resourceTreeModel.dispatchEventToListeners(
          SDK.ResourceTreeModel.Events.PrimaryPageChanged,
          {frame: MOCK_MAIN_FRAME, type: SDK.ResourceTreeModel.PrimaryPageChangeType.Navigation});
      assert.deepEqual(view.getEventsForTesting(), []);

      panel.detach();
    });
  };
  describe('without tab target', () => tests(() => createTarget()));
  describe('with tab target', () => tests(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));
});
