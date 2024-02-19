// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Elements from '../../../../../front_end/panels/elements/elements.js';

describe('DOMLinkifier', () => {
  it('includes pseudo identifier in the label', () => {
    const domLinkifier = Elements.DOMLinkifier.Linkifier.instance({forceNew: true});
    const node = sinon.createStubInstance(SDK.DOMModel.DOMNode, {
      nodeType: Node.ELEMENT_NODE,
      pseudoType: Protocol.DOM.PseudoType.ViewTransitionGroup,
      localName: '::view-transition-group',
      nodeName: '::view-transition-group',
      pseudoIdentifier: 'root',
      shadowRootType: null,
      nodeNameInCorrectCase: '::view-transition-group',
    });

    const el = domLinkifier.linkify(node);
    const pseudoLabel = (el as HTMLElement).shadowRoot?.querySelector('.node-label-pseudo')?.textContent;
    assert.strictEqual(pseudoLabel, '::view-transition-group(root)');
  });
});
