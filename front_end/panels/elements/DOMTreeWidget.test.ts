// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Elements from './elements.js';

describeWithMockConnection('DOMTreeWidget', () => {
  let target: SDK.Target.Target;

  beforeEach(() => {
    stubNoopSettings();
    target = createTarget();
  });

  describe('node highlighting', () => {
    function createDomTree() {
      const elementsTreeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
      const view = createViewFunctionStub(Elements.ElementsTreeOutline.DOMTreeWidget, {
        elementsTreeOutline,
        alreadyExpandedParentTreeElement: null,
        highlightedTreeElement: null,
      });
      const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget(undefined, view);
      domTree.performUpdate();
      domTree.modelAdded(target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel);
      return {view};
    }

    const highlightsNodeOnRequestEvent = (inScope: boolean) => async () => {
      const {view} = createDomTree();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);

      const model = target.model(SDK.OverlayModel.OverlayModel);
      assert.exists(model);
      const node = new SDK.DOMModel.DOMNode(target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel);

      assert.isNull(view.input.currentHighlightedNode);
      const viewCallCount = view.callCount;
      model.dispatchEventToListeners(SDK.OverlayModel.Events.HIGHLIGHT_NODE_REQUESTED, node);
      if (inScope) {
        await view.nextInput;
        assert.strictEqual(view.input.currentHighlightedNode, node);
        sinon.assert.callCount(view, viewCallCount + 1);
      } else {
        assert.isNull(view.input.currentHighlightedNode);
        sinon.assert.callCount(view, viewCallCount);
      }
    };

    it('highlights node on in scope request event', highlightsNodeOnRequestEvent(true));
    it('does not highlight node on out of scope request event', highlightsNodeOnRequestEvent(false));
  });
});
