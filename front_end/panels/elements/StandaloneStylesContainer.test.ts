// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {
  assertScreenshot,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {
  createTarget,
} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
} from '../../testing/MockConnection.js';
import {
  getMatchedStylesWithProperties,
} from '../../testing/StyleHelpers.js';

import * as Elements from './elements.js';

describeWithMockConnection('StandaloneStylesContainer', () => {
  it('should render the component with a single section and properties', async () => {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    const cssModel = domModel!.cssModel();

    const node = new SDK.DOMModel.DOMNode(domModel!);
    node.init(null, false, {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'div',
      localName: 'div',
      nodeValue: '',
      attributes: [],
    });

    const matchedStyles = await getMatchedStylesWithProperties({
      cssModel: cssModel!,
      node,
      properties: [
        {name: 'color', value: 'red'},
        {name: 'font-size', value: '14px'},
      ],
      selector: 'div',
    });

    sinon.stub(cssModel!, 'cachedMatchedCascadeForNode').resolves(matchedStyles);

    const container = new Elements.StandaloneStylesContainer.StandaloneStylesContainer();
    container.element.style.width = 'var(--sys-size-20)';
    container.element.style.height = 'var(--sys-size-18)';
    renderElementIntoDOM(container);
    container.domNode = node;
    await container.updateComplete;

    await assertScreenshot('elements/standalone-styles-container.png');
  });
});
