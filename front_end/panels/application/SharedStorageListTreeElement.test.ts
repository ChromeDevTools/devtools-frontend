// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
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
  const TEST_SITE_A = TEST_ORIGIN_A;
  const TEST_ORIGIN_B = 'http://b.test';
  const TEST_SITE_B = TEST_ORIGIN_B;
  const TEST_ORIGIN_C = 'http://c.test';
  const TEST_SITE_C = TEST_ORIGIN_C;

  const EVENTS = [
    {
      accessTime: 0,
      method: Protocol.Storage.SharedStorageAccessMethod.Append,
      mainFrameId: MAIN_FRAME_ID,
      ownerOrigin: TEST_ORIGIN_A,
      ownerSite: TEST_SITE_A,
      params: {key: 'key0', value: 'value0'} as Protocol.Storage.SharedStorageAccessParams,
      scope: Protocol.Storage.SharedStorageAccessScope.Window,
    },
    {
      accessTime: 10,
      method: Protocol.Storage.SharedStorageAccessMethod.Get,
      mainFrameId: MAIN_FRAME_ID,
      ownerOrigin: TEST_ORIGIN_A,
      ownerSite: TEST_SITE_A,
      params: {key: 'key0'} as Protocol.Storage.SharedStorageAccessParams,
      scope: Protocol.Storage.SharedStorageAccessScope.SharedStorageWorklet,
    },
    {
      accessTime: 15,
      method: Protocol.Storage.SharedStorageAccessMethod.Length,
      mainFrameId: MAIN_FRAME_ID,
      ownerOrigin: TEST_ORIGIN_B,
      ownerSite: TEST_SITE_B,
      params: {} as Protocol.Storage.SharedStorageAccessParams,
      scope: Protocol.Storage.SharedStorageAccessScope.SharedStorageWorklet,
    },
    {
      accessTime: 20,
      method: Protocol.Storage.SharedStorageAccessMethod.Clear,
      mainFrameId: MAIN_FRAME_ID,
      ownerOrigin: TEST_ORIGIN_B,
      ownerSite: TEST_SITE_B,
      params: {} as Protocol.Storage.SharedStorageAccessParams,
      scope: Protocol.Storage.SharedStorageAccessScope.Window,
    },
    {
      accessTime: 100,
      method: Protocol.Storage.SharedStorageAccessMethod.Set,
      mainFrameId: MAIN_FRAME_ID,
      ownerOrigin: TEST_ORIGIN_C,
      ownerSite: TEST_SITE_C,
      params: {key: 'key0', value: 'value1', ignoreIfPresent: true} as Protocol.Storage.SharedStorageAccessParams,
      scope: Protocol.Storage.SharedStorageAccessScope.SharedStorageWorklet,
    },
    {
      accessTime: 150,
      method: Protocol.Storage.SharedStorageAccessMethod.RemainingBudget,
      mainFrameId: MAIN_FRAME_ID,
      ownerOrigin: TEST_ORIGIN_C,
      ownerSite: TEST_SITE_C,
      params: {} as Protocol.Storage.SharedStorageAccessParams,
      scope: Protocol.Storage.SharedStorageAccessScope.SharedStorageWorklet,
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

    const container = document.createElement('div');
    renderElementIntoDOM(container);
    const panel = Application.ResourcesPanel.ResourcesPanel.instance({forceNew: true});
    panel.markAsRoot();
    panel.show(container);

    treeElement = new Application.SharedStorageListTreeElement.SharedStorageListTreeElement(panel);

    const view = treeElement.view;
    const wasShownSpy = sinon.spy(view, 'wasShown');

    container.appendChild(treeElement.listItemNode);
    treeElement.treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    treeElement.selectable = true;
    treeElement.select();

    sinon.assert.calledOnce(wasShownSpy);

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
