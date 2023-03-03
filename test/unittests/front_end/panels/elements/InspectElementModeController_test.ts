// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Elements from '../../../../../front_end/panels/elements/elements.js';

import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../helpers/MockConnection.js';

const {assert} = chai;

const NODE_ID = 1 as Protocol.DOM.NodeId;

describeWithMockConnection('InspectElementModeController', () => {
  let inScopeTarget: SDK.Target.Target;
  let inScopeSubTarget: SDK.Target.Target;
  let outOfScopeTarget: SDK.Target.Target;
  let outOfScopeSubTarget: SDK.Target.Target;
  let modeController: Elements.InspectElementModeController.InspectElementModeController;

  function onModeToggle(target: SDK.Target.Target) {
    const model = target.model(SDK.OverlayModel.OverlayModel);
    assertNotNullOrUndefined(model);
    return model.once(SDK.OverlayModel.Events.InspectModeWillBeToggled);
  }

  function failOnModeToggle(target: SDK.Target.Target) {
    const model = target.model(SDK.OverlayModel.OverlayModel);
    assertNotNullOrUndefined(model);
    model.addEventListener(
        SDK.OverlayModel.Events.InspectModeWillBeToggled,
        () => assert.fail('Unexected mode toggle on out of scope target'));
  }

  beforeEach(() => {
    stubNoopSettings();
    const tabTarget = createTarget({type: SDK.Target.Type.Tab});
    inScopeTarget = createTarget({parentTarget: tabTarget});
    inScopeSubTarget = createTarget({parentTarget: inScopeTarget});
    outOfScopeTarget = createTarget({parentTarget: tabTarget});
    outOfScopeSubTarget = createTarget({parentTarget: outOfScopeTarget});
    failOnModeToggle(outOfScopeTarget);
    failOnModeToggle(outOfScopeSubTarget);
    SDK.TargetManager.TargetManager.instance().setScopeTarget(inScopeTarget);
    modeController = new Elements.InspectElementModeController.InspectElementModeController();
    setMockConnectionResponseHandler('DOM.getDocument', () => ({root: {nodeId: NODE_ID}}));
  });

  it('synchronises mode for in scope models', async () => {
    for (const target of SDK.TargetManager.TargetManager.instance().targets()) {
      assert.isFalse(Boolean(target.model(SDK.OverlayModel.OverlayModel)?.inspectModeEnabled()));
    }

    modeController.toggleInspectMode();
    await Promise.all([onModeToggle(inScopeTarget), onModeToggle(inScopeSubTarget)]);

    const anotherInScopeSubTarget = createTarget({parentTarget: inScopeTarget});
    await onModeToggle(anotherInScopeSubTarget);

    const anotherOutOfScopeSubTarget = createTarget({parentTarget: inScopeTarget});
    failOnModeToggle(anotherOutOfScopeSubTarget);

    let expectToggle = false;
    const modeToggles =
        Promise.all([inScopeTarget, inScopeSubTarget, anotherInScopeSubTarget].map(t => onModeToggle(t).then(() => {
          assert.isTrue(expectToggle);
        })));
    outOfScopeTarget.model(SDK.OverlayModel.OverlayModel)
        ?.dispatchEventToListeners(SDK.OverlayModel.Events.ExitedInspectMode);

    await new Promise<void>(resolve => queueMicrotask(resolve));

    expectToggle = true;
    inScopeTarget.model(SDK.OverlayModel.OverlayModel)
        ?.dispatchEventToListeners(SDK.OverlayModel.Events.ExitedInspectMode);
    await modeToggles;
  });
});
