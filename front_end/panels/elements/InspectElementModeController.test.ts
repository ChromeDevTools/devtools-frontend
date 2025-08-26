// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {
  createTarget,
  registerNoopActions,
  stubNoopSettings,
} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../testing/MockConnection.js';
import {
  setMockResourceTree,
} from '../../testing/ResourceTreeHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

const NODE_ID = 1 as Protocol.DOM.NodeId;

describeWithMockConnection('InspectElementModeController', () => {
  let inScopeTarget: SDK.Target.Target;
  let inScopeSubTarget: SDK.Target.Target;
  let outOfScopeTarget: SDK.Target.Target;
  let outOfScopeSubTarget: SDK.Target.Target;
  let modeController: Elements.InspectElementModeController.InspectElementModeController;

  function onModeToggle(target: SDK.Target.Target) {
    const model = target.model(SDK.OverlayModel.OverlayModel);
    return model!.once(SDK.OverlayModel.Events.INSPECT_MODE_WILL_BE_TOGGLED);
  }

  function failOnModeToggle(target: SDK.Target.Target) {
    const model = target.model(SDK.OverlayModel.OverlayModel);
    model!.addEventListener(
        SDK.OverlayModel.Events.INSPECT_MODE_WILL_BE_TOGGLED,
        () => assert.fail('Unexpected mode toggle on out of scope target'));
  }

  beforeEach(() => {
    setMockResourceTree(false);
    stubNoopSettings();
    registerNoopActions(['elements.toggle-element-search']);
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
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
        ?.dispatchEventToListeners(SDK.OverlayModel.Events.EXITED_INSPECT_MODE);

    await new Promise<void>(resolve => queueMicrotask(resolve));

    expectToggle = true;
    inScopeTarget.model(SDK.OverlayModel.OverlayModel)
        ?.dispatchEventToListeners(SDK.OverlayModel.Events.EXITED_INSPECT_MODE);
    await modeToggles;
  });
});

describeWithMockConnection('InspectElementModeController panel interactions', () => {
  let elementsPanel: sinon.SinonStubbedInstance<Elements.ElementsPanel.ElementsPanel>;
  let node: SDK.DOMModel.DOMNode;
  let viewManager: sinon.SinonStubbedInstance<UI.ViewManager.ViewManager>;

  beforeEach(() => {
    stubNoopSettings();
    registerNoopActions(['elements.toggle-element-search']);
    setMockConnectionResponseHandler('DOM.getDocument', () => ({root: {nodeId: NODE_ID}}));
    setMockConnectionResponseHandler('DOM.pushNodeByPathToFrontend', () => ({nodeId: NODE_ID}));

    viewManager = sinon.createStubInstance(UI.ViewManager.ViewManager, {
      showView: Promise.resolve(),
    });
    sinon.stub(UI.ViewManager.ViewManager, 'instance').returns(viewManager);

    Elements.InspectElementModeController.InspectElementModeController.instance({forceNew: true});
    elementsPanel =
        sinon.createStubInstance(Elements.ElementsPanel.ElementsPanel, {revealAndSelectNode: Promise.resolve()});
    sinon.stub(Elements.ElementsPanel.ElementsPanel, 'instance').returns(elementsPanel);
    node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
  });

  it('node is selected and element panel shown when no return to panel flavor is present', async () => {
    UI.Context.Context.instance().setFlavor(Common.ReturnToPanel.ReturnToPanelFlavor, null);

    await SDK.OverlayModel.OverlayModel.inspectNodeHandler!(node);

    sinon.assert.calledOnce(elementsPanel.revealAndSelectNode);
    sinon.assert.calledWith(elementsPanel.revealAndSelectNode.firstCall, node, sinon.match({
      showPanel: true,
      focusNode: true,
      highlightInOverlay: false,
    }));
    sinon.assert.notCalled(viewManager.showView);
  });

  it('node is selected and triggering panel is shown when return to panel flavor is present', async () => {
    UI.Context.Context.instance().setFlavor(
        Common.ReturnToPanel.ReturnToPanelFlavor, new Common.ReturnToPanel.ReturnToPanelFlavor('freestyler'));

    await SDK.OverlayModel.OverlayModel.inspectNodeHandler!(node);

    sinon.assert.calledOnce(elementsPanel.revealAndSelectNode);
    sinon.assert.calledWith(elementsPanel.revealAndSelectNode.firstCall, node, sinon.match({
      showPanel: false,
      highlightInOverlay: false,
    }));
    sinon.assert.calledOnceWithExactly(viewManager.showView, 'freestyler', false, false);
  });

  it('elements panel is shown on second inspection if no flavor is set after the first inspection', async () => {
    UI.Context.Context.instance().setFlavor(
        Common.ReturnToPanel.ReturnToPanelFlavor, new Common.ReturnToPanel.ReturnToPanelFlavor('freestyler'));

    await SDK.OverlayModel.OverlayModel.inspectNodeHandler!(node);

    sinon.assert.calledOnce(elementsPanel.revealAndSelectNode);
    sinon.assert.calledWith(elementsPanel.revealAndSelectNode.firstCall, node, sinon.match({
      showPanel: false,
      highlightInOverlay: false,
    }));

    await SDK.OverlayModel.OverlayModel.inspectNodeHandler!(node);

    sinon.assert.calledTwice(elementsPanel.revealAndSelectNode);
    sinon.assert.calledWith(elementsPanel.revealAndSelectNode.secondCall, node, sinon.match({
      showPanel: true,
      focusNode: true,
      highlightInOverlay: false,
    }));
  });
});
