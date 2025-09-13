// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Elements from './elements.js';

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
      const domLinkifier = Elements.DOMLinkifier.Linkifier.instance({forceNew: true});
      const el = domLinkifier.linkify(viewTransitionNode) as HTMLElement;
      renderElementIntoDOM(el);
      await raf();
      const pseudoLabel = el.shadowRoot?.querySelector('.node-label-pseudo')?.textContent;
      assert.strictEqual(pseudoLabel, '::view-transition-group(root)');
    });

    it('does not include ancestor name for a view transition pseudo', async () => {
      const domLinkifier = Elements.DOMLinkifier.Linkifier.instance({forceNew: true});

      const el = domLinkifier.linkify(viewTransitionNode) as HTMLElement;
      renderElementIntoDOM(el);
      await raf();
      const nodeLabel = el.shadowRoot?.querySelector('.node-label-name');
      assert.isNull(nodeLabel);
    });
  });

  it('can linkify DOM node with text content correctly', async () => {
    const domLinkifier = Elements.DOMLinkifier.Linkifier.instance({forceNew: true});
    const node = sinon.createStubInstance(SDK.DOMModel.DOMNode, {
      nodeType: Node.ELEMENT_NODE,
    });

    const el = domLinkifier.linkify(node, {
      textContent: 'sample content',
    }) as HTMLElement;
    renderElementIntoDOM(el);
    await raf();
    assert.strictEqual(el.shadowRoot?.querySelector('button')?.textContent, 'sample content');
  });
});
