// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {
  createTarget,
  stubNoopSettings,
} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {getMainFrame, MAIN_FRAME_ID, navigate} from '../../testing/ResourceTreeHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Application from './application.js';

describeWithMockConnection('SharedStorageListTreeElement', function() {
  let target: SDK.Target.Target;
  let sharedStorageModel: Application.SharedStorageModel.SharedStorageModel|null;
  let treeElement: Application.SharedStorageListTreeElement.SharedStorageListTreeElement;

  const TEST_ORIGIN_A = 'http://a.test';
  const TEST_ORIGIN_B = 'http://b.test';
  const TEST_ORIGIN_C = 'http://c.test';

  const EVENTS = [
    {
      accessTime: 0,
      type: Protocol.Storage.SharedStorageAccessType.DocumentAppend,
      mainFrameId: MAIN_FRAME_ID,
      ownerOrigin: TEST_ORIGIN_A,
      params: {key: 'key0', value: 'value0'} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 10,
      type: Protocol.Storage.SharedStorageAccessType.WorkletGet,
      mainFrameId: MAIN_FRAME_ID,
      ownerOrigin: TEST_ORIGIN_A,
      params: {key: 'key0'} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 15,
      type: Protocol.Storage.SharedStorageAccessType.WorkletLength,
      mainFrameId: MAIN_FRAME_ID,
      ownerOrigin: TEST_ORIGIN_B,
      params: {} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 20,
      type: Protocol.Storage.SharedStorageAccessType.DocumentClear,
      mainFrameId: MAIN_FRAME_ID,
      ownerOrigin: TEST_ORIGIN_B,
      params: {} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 100,
      type: Protocol.Storage.SharedStorageAccessType.WorkletSet,
      mainFrameId: MAIN_FRAME_ID,
      ownerOrigin: TEST_ORIGIN_C,
      params: {key: 'key0', value: 'value1', ignoreIfPresent: true} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 150,
      type: Protocol.Storage.SharedStorageAccessType.WorkletRemainingBudget,
      mainFrameId: MAIN_FRAME_ID,
      ownerOrigin: TEST_ORIGIN_C,
      params: {} as Protocol.Storage.SharedStorageAccessParams,
    },
  ];

  beforeEach(async () => {
    stubNoopSettings();
    SDK.ChildTargetManager.ChildTargetManager.install();
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});

    sharedStorageModel = target.model(Application.SharedStorageModel.SharedStorageModel);
  });

  it('shows view on select', async () => {
    assert.exists(sharedStorageModel);
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
    assert.exists(sharedStorageModel);
    sinon.stub(sharedStorageModel, 'enable').resolves();

    const panel = Application.ResourcesPanel.ResourcesPanel.instance({forceNew: true});
    treeElement = new Application.SharedStorageListTreeElement.SharedStorageListTreeElement(panel);
    const view = treeElement.view;

    view.setDefaultIdForTesting(MAIN_FRAME_ID);
    for (const event of EVENTS) {
      treeElement.addEvent(event);
    }

    assert.deepEqual(view.getEventsForTesting(), EVENTS);

    panel.detach();
  });

  it('clears events upon main frame navigation', async () => {
    assert.exists(sharedStorageModel);
    sinon.stub(sharedStorageModel, 'enable').resolves();

    const panel = Application.ResourcesPanel.ResourcesPanel.instance({forceNew: true});
    treeElement = new Application.SharedStorageListTreeElement.SharedStorageListTreeElement(panel);
    const view = treeElement.view;

    view.setDefaultIdForTesting(MAIN_FRAME_ID);
    for (const event of EVENTS) {
      treeElement.addEvent(event);
    }

    assert.deepEqual(view.getEventsForTesting(), EVENTS);

    // Events are cleared on main frame navigation.
    navigate(getMainFrame(target));
    assert.deepEqual(view.getEventsForTesting(), []);

    panel.detach();
  });
});
