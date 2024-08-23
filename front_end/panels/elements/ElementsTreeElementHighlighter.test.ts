// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as Elements from './elements.js';

describeWithMockConnection('ElementsTreeElementHighlighter', () => {
  let target: SDK.Target.Target;
  let treeOutline: Elements.ElementsTreeOutline.ElementsTreeOutline;
  let throttler: Common.Throttler.Throttler;
  let throttlerSchedule: sinon.SinonStub;

  beforeEach(() => {
    stubNoopSettings();
    target = createTarget();
    treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
    treeOutline.wireToDOMModel(target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel);
    throttler = new Common.Throttler.Throttler(0);
    throttlerSchedule = sinon.stub(throttler, 'schedule');
    throttlerSchedule.resolves();
  });

  const highlightsNodeOnRequestEvent = (inScope: boolean) => () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    new Elements.ElementsTreeElementHighlighter.ElementsTreeElementHighlighter(treeOutline, throttler);

    const model = target.model(SDK.OverlayModel.OverlayModel);
    assert.exists(model);
    const node = new SDK.DOMModel.DOMNode(target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel);
    const treeElement = new Elements.ElementsTreeElement.ElementsTreeElement(node, /* isClosingTag=*/ true);
    sinon.stub(treeOutline, 'createTreeElementFor').withArgs(node).returns(treeElement);
    const treeOutlineSetHoverEffect = sinon.spy(treeOutline, 'setHoverEffect');
    const treeElementReveal = sinon.spy(treeElement, 'reveal');

    model.dispatchEventToListeners(SDK.OverlayModel.Events.HIGHLIGHT_NODE_REQUESTED, node);
    assert.strictEqual(throttlerSchedule.calledOnce, inScope);
    if (inScope) {
      throttlerSchedule.firstCall.firstArg();
      assert.isTrue(treeOutlineSetHoverEffect.calledOnce);
      assert.isTrue(treeElementReveal.called);
    }
  };

  it('highlights node on in scope request event', highlightsNodeOnRequestEvent(true));
  it('highlights node on out of scope request event', highlightsNodeOnRequestEvent(false));
});
