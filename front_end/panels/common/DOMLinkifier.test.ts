// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {render} from '../../ui/lit/lit.js';

import * as PanelsCommon from './common.js';

describeWithEnvironment('DOMLinkifier', () => {
  describe('linking view transition pseudo nodes', () => {
    let viewTransitionNode: sinon.SinonStubbedInstance<SDK.DOMModel.DOMNode>;
    beforeEach(() => {
      viewTransitionNode = sinon.createStubInstance(SDK.DOMModel.DOMNode, {
        nodeType: Node.ELEMENT_NODE,
        pseudoType: Protocol.DOM.PseudoType.ViewTransitionGroup,
        localName: '::view-transition-group',
        nodeName: '::view-transition-group',
        pseudoIdentifier: 'root',
        shadowRootType: null,
        nodeNameInCorrectCase: '::view-transition-group',
      });
      viewTransitionNode.isViewTransitionPseudoNode.returns(true);
    });
    it('includes pseudo identifier in the label', async () => {
      const domLinkifier = PanelsCommon.DOMLinkifier.Linkifier.instance({forceNew: true});
      const container = document.createElement('div');
      render(domLinkifier.linkify(viewTransitionNode), container);
      renderElementIntoDOM(container);
      await raf();

      const el = container.firstElementChild as HTMLElement;
      assert.strictEqual(el.deepInnerText(), '::view-transition-group(root)');
    });

    it('does not include ancestor name for a view transition pseudo', async () => {
      const domLinkifier = PanelsCommon.DOMLinkifier.Linkifier.instance({forceNew: true});

      const container = document.createElement('div');
      render(domLinkifier.linkify(viewTransitionNode), container);
      renderElementIntoDOM(container);
      await raf();

      const el = container.firstElementChild as HTMLElement;
      const nodeLabel = el.shadowRoot?.querySelector('.node-label-name');
      assert.isNull(nodeLabel);
    });
  });

  it('can linkify DOM node with text content correctly', async () => {
    const domLinkifier = PanelsCommon.DOMLinkifier.Linkifier.instance({forceNew: true});
    const node = sinon.createStubInstance(SDK.DOMModel.DOMNode, {
      nodeType: Node.ELEMENT_NODE,
    });

    const container = document.createElement('div');
    render(
        domLinkifier.linkify(node, {
          textContent: 'sample content',
        }),
        container);
    renderElementIntoDOM(container);
    await raf();

    const el = container.firstElementChild as HTMLElement;
    assert.strictEqual(el.deepInnerText(), 'sample content');
  });
});
