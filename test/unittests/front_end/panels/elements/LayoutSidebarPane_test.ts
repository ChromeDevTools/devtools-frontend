// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as ElementsComponents from '../../../../../front_end/panels/elements/components/components.js';
import * as Elements from '../../../../../front_end/panels/elements/elements.js';
import type * as Common from '../../../../../front_end/core/common/common.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';

import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../helpers/MockConnection.js';

const {assert} = chai;

const NODE_ID = 1 as Protocol.DOM.NodeId;

describeWithMockConnection('LayoutSidebarPane', () => {
  let target: SDK.Target.Target;
  let layoutPaneComponent: ElementsComponents.LayoutPane.LayoutPane;
  let view: Elements.LayoutSidebarPane.LayoutSidebarPane;

  beforeEach(() => {
    stubNoopSettings();
    target = createTarget();
    layoutPaneComponent = new ElementsComponents.LayoutPane.LayoutPane();
    setMockConnectionResponseHandler('DOM.getDocument', () => ({root: {nodeId: NODE_ID}}));
    setMockConnectionResponseHandler('DOM.getNodesForSubtreeByStyle', () => ({nodeIds: []}));
  });

  afterEach(() => {
    view.detach();
  });

  const updatesUiOnEvent = <T extends keyof SDK.OverlayModel.EventTypes>(
      event: Platform.TypeScriptUtilities.NoUnion<T>, inScope: boolean) => async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    view = Elements.LayoutSidebarPane.LayoutSidebarPane.instance(
        {forceNew: true, layoutPaneComponent, throttleTimeout: 0});
    view.markAsRoot();
    view.show(document.body);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    const model = target.model(SDK.OverlayModel.OverlayModel);
    assertNotNullOrUndefined(model);
    const componentDataSet = sinon.spy(layoutPaneComponent, 'data', ['set']);
    model.dispatchEventToListeners(
        event,
        ...[{nodeId: 42, enabled: true}] as unknown as
            Common.EventTarget.EventPayloadToRestParameters<SDK.OverlayModel.EventTypes, T>);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    assert.strictEqual(componentDataSet.set.called, inScope);
  };

  it('updates UI on in scope grid overlay update event',
     updatesUiOnEvent(SDK.OverlayModel.Events.PersistentGridOverlayStateChanged, true));
  it('does not update UI on out of scope grid overlay update event',
     updatesUiOnEvent(SDK.OverlayModel.Events.PersistentGridOverlayStateChanged, false));
  it('updates UI on in scope flex overlay update event',
     updatesUiOnEvent(SDK.OverlayModel.Events.PersistentFlexContainerOverlayStateChanged, true));
  it('does not update UI on out of scope flex overlay update event',
     updatesUiOnEvent(SDK.OverlayModel.Events.PersistentFlexContainerOverlayStateChanged, false));
});
