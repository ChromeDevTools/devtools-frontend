// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';

export interface DOMNode {
  parentNode: DOMNode|null;
  id: number;
  nodeType: number;
  pseudoType?: string;
  shadowRootType: string|null;
  nodeName: string;
  nodeNameNicelyCased: string;
  legacyDomNode: SDK.DOMModel.DOMNode;
  highlightNode: (mode?: string) => void;
  clearHighlight: () => void;
  getAttribute: (attr: string) => string | undefined;
}

export const legacyNodeToElementsComponentsNode = (node: SDK.DOMModel.DOMNode): DOMNode => {
  return {
    parentNode: node.parentNode ? legacyNodeToElementsComponentsNode(node.parentNode) : null,
    id: (node.id as number),
    nodeType: node.nodeType(),
    pseudoType: node.pseudoType(),
    shadowRootType: node.shadowRootType(),
    nodeName: node.nodeName(),
    nodeNameNicelyCased: node.nodeNameInCorrectCase(),
    legacyDomNode: node,
    highlightNode: (mode?: string) => node.highlight(mode),
    clearHighlight: () => SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(),
    getAttribute: node.getAttribute.bind(node),
  };
};
