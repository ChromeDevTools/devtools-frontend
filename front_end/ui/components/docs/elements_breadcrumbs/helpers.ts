// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Elements from '../../../../panels/elements/components/components.js';
import type * as SDK from '../../../../core/sdk/sdk.js';

interface CrumbOverrides extends Partial<Elements.Helper.DOMNode> {
  attributes?: {[x: string]: string|undefined};
}

let id = 0;
export const makeCrumb = (overrides: CrumbOverrides = {}): Elements.Helper.DOMNode => {
  const attributes = overrides.attributes || {};
  const newCrumb: Elements.Helper.DOMNode = {
    nodeType: Node.ELEMENT_NODE,
    id: id++,
    pseudoType: '',
    parentNode: null,
    shadowRootType: '',
    nodeName: 'body',
    nodeNameNicelyCased: 'body',
    legacyDomNode: {} as unknown as SDK.DOMModel.DOMNode,
    highlightNode: (): void => {},
    clearHighlight: (): void => {},
    getAttribute: (x: string): string => attributes[x] || '',
    ...overrides,
  };
  return newCrumb;
};
