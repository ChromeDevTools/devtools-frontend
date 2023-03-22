// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Elements from '../../../../../front_end/panels/elements/elements.js';

import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

import * as TreeOutline from '../../../../../front_end/ui/components/tree_outline/tree_outline.js';

const {assert} = chai;

const MAIN_FRAME_ID = 'MAIN_FRAME_ID' as Protocol.Page.FrameId;

describeWithMockConnection('AccessibilityTreeView', () => {
  let target: SDK.Target.Target;
  let toggleButoon: HTMLElement;
  let treeComponent: TreeOutline.TreeOutline.TreeOutline<Elements.AccessibilityTreeUtils.AXTreeNodeData>;

  beforeEach(() => {
    stubNoopSettings();
    target = createTarget();
    toggleButoon = document.createElement('div');
    treeComponent = new TreeOutline.TreeOutline.TreeOutline<Elements.AccessibilityTreeUtils.AXTreeNodeData>();
  });

  const updatesUiOnEvent = (inScope: boolean) => async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    new Elements.AccessibilityTreeView.AccessibilityTreeView(toggleButoon, treeComponent);

    const model = target.model(SDK.AccessibilityModel.AccessibilityModel);
    assertNotNullOrUndefined(model);
    const treeComponentDataSet = sinon.spy(treeComponent, 'data', ['set']);
    sinon.stub(SDK.FrameManager.FrameManager.instance(), 'getOutermostFrame').returns({
      id: MAIN_FRAME_ID,
    } as SDK.ResourceTreeModel.ResourceTreeFrame);

    model.dispatchEventToListeners(SDK.AccessibilityModel.Events.TreeUpdated, {
      root: {numChildren: () => 0, role: () => null, getFrameId: () => MAIN_FRAME_ID, id: () => 'id'} as unknown as
          SDK.AccessibilityModel.AccessibilityNode,
    });
    await new Promise<void>(resolve => queueMicrotask(resolve));
    assert.strictEqual(treeComponentDataSet.set.called, inScope);
  };

  it('updates UI on in scope update event', updatesUiOnEvent(true));
  it('does not update UI on out of scope update event', updatesUiOnEvent(false));
});
