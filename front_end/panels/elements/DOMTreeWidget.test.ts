// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';

import * as Elements from './elements.js';

describeWithEnvironment('DOMTreeWidget', () => {
  let target: SDK.Target.Target;

  beforeEach(() => {
    const universe = new TestUniverse();
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
    sinon.stub(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, 'instance').returns(universe.cssWorkspaceBinding);
    target = createTarget();
  });

  describe('node highlighting', () => {
    function createDomTree() {
      const elementsTreeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
      const view = createViewFunctionStub(Elements.ElementsTreeOutline.DOMTreeWidget, {
        elementsTreeOutline,
        alreadyExpandedParentTreeElement: null,
        highlightedTreeElement: null,
        isUpdatingHighlights: false,
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

  describe('show-html-comments setting', () => {
    it('updates showComments when setting changes', async () => {
      const elementsTreeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
      const view = createViewFunctionStub(Elements.ElementsTreeOutline.DOMTreeWidget, {
        elementsTreeOutline,
        alreadyExpandedParentTreeElement: null,
        highlightedTreeElement: null,
        isUpdatingHighlights: false,
      });
      const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget(undefined, view);
      domTree.performUpdate();

      assert.isTrue(domTree.showComments);
      assert.isTrue(view.input.showComments);

      const setting = Common.Settings.Settings.instance().moduleSetting('show-html-comments');
      setting.set(false);

      assert.isFalse(domTree.showComments);
      assert.isFalse(view.input.showComments);
    });

    it('removes change listener on detach', async () => {
      const elementsTreeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
      const view = createViewFunctionStub(Elements.ElementsTreeOutline.DOMTreeWidget, {
        elementsTreeOutline,
        alreadyExpandedParentTreeElement: null,
        highlightedTreeElement: null,
        isUpdatingHighlights: false,
      });
      const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget(undefined, view);
      domTree.performUpdate();

      domTree.detach();
      const setting = Common.Settings.Settings.instance().moduleSetting('show-html-comments');
      const viewCallCount = view.callCount;
      setting.set(false);

      sinon.assert.callCount(view, viewCallCount);
    });
  });

  describe('image preview popover', () => {
    it('shows preview when hovering over a link within the elements tree outline', async () => {
      const clock = sinon.useFakeTimers();
      try {
        const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget();
        domTree.markAsRoot();
        renderElementIntoDOM(domTree);
        domTree.performUpdate();

        const shadowHost = domTree.contentElement.firstElementChild as HTMLElement;
        assert.exists(shadowHost);
        const elementsTreeOutline = shadowHost.shadowRoot?.querySelector('.elements-tree-outline') as HTMLElement;
        assert.exists(elementsTreeOutline);

        const link = elementsTreeOutline.createChild('span');
        link.boxInWindow = () => new AnchorBox(0, 0, 10, 10);
        const imageUrl = Platform.DevToolsPath.urlString`http://example.com/image.png`;
        Elements.ImagePreviewPopover.ImagePreviewPopover.setImageUrl(link, imageUrl);

        const buildStub =
            sinon.stub(Components.ImagePreview.ImagePreview, 'build').resolves(document.createElement('div'));

        const event = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX: 5,
          clientY: 5,
        });
        link.dispatchEvent(event);

        for (let i = 0; i < 20; i++) {
          if (buildStub.called) {
            break;
          }
          clock.tick(1);
          await Promise.resolve();
        }

        sinon.assert.calledWith(buildStub, imageUrl, true);
        domTree.detach();
      } finally {
        clock.restore();
      }
    });
  });
});
