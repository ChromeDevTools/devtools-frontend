// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import * as Elements from './elements.js';

describe('DOMLinkifier', () => {
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
    it('includes pseudo identifier in the label', () => {
      const domLinkifier = Elements.DOMLinkifier.Linkifier.instance({forceNew: true});
      const el = domLinkifier.linkify(viewTransitionNode);
      const pseudoLabel = (el as HTMLElement).shadowRoot?.querySelector('.node-label-pseudo')?.textContent;
      assert.strictEqual(pseudoLabel, '::view-transition-group(root)');
    });

    it('does not include ancestor name for a view transition pseudo', () => {
      const domLinkifier = Elements.DOMLinkifier.Linkifier.instance({forceNew: true});

      const el = domLinkifier.linkify(viewTransitionNode);
      const nodeLabel = (el as HTMLElement).shadowRoot?.querySelector('.node-label-name');
      assert.isNull(nodeLabel);
    });
  });

  it('can linkify DOM node with text content correctly', () => {
    const domLinkifier = Elements.DOMLinkifier.Linkifier.instance({forceNew: true});
    const node = sinon.createStubInstance(SDK.DOMModel.DOMNode, {
      nodeType: Node.ELEMENT_NODE,
    });

    const el = domLinkifier.linkify(node, {
      textContent: 'sample content',
    }) as Element;
    assert.strictEqual(el.shadowRoot?.querySelector('button')?.textContent, 'sample content');
  });
});
