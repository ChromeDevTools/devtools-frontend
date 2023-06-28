// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import type * as ElementsModule from '../../../../../front_end/panels/elements/elements.js';
import * as Adorners from '../../../../../front_end/ui/components/adorners/adorners.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithRealConnection} from '../../helpers/RealConnection.js';

const {assert} = chai;

const stubTopLayerDOMNode =
    (nodeName: string, backendNodeId: number, ownerDocument: SDK.DOMModel.DOMDocument): SDK.DOMModel.DOMNode => {
      return {
        nodeName: () => nodeName,
        backendNodeId: () => backendNodeId,
        ownerDocument,
      } as SDK.DOMModel.DOMNode;
    };

const stubElementsTreeElement = (): ElementsModule.ElementsTreeElement.ElementsTreeElement => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    adorn: ({name: string}, content?: HTMLElement): Adorners.Adorner.Adorner => new Adorners.Adorner.Adorner(),
  } as ElementsModule.ElementsTreeElement.ElementsTreeElement;
};

describeWithRealConnection('TopLayerContainer', async () => {
  let Elements: typeof ElementsModule;

  before(async () => {
    Elements = await import('../../../../../front_end/panels/elements/elements.js');
  });

  it('should update top layer elements correctly', async () => {
    const stubDocument = {} as SDK.DOMModel.DOMDocument;
    const topLayerDOMNode1 = stubTopLayerDOMNode('dialog', 1, stubDocument);
    const topLayerDOMNode2 = stubTopLayerDOMNode('div', 2, stubDocument);
    const domModel = {
      target: () => createTarget(),
      getTopLayerElements: async () => Promise.resolve([1 as Protocol.DOM.NodeId, 2 as Protocol.DOM.NodeId]),
      idToDOMNode: new Map([
        [1, topLayerDOMNode1],
        [2, topLayerDOMNode2],
      ]),
    } as SDK.DOMModel.DOMModel;
    stubDocument.domModel = () => domModel;

    const topLayerTreeNode1 = stubElementsTreeElement();
    const topLayerTreeNode2 = stubElementsTreeElement();
    const tree = {
      treeElementByNode: new WeakMap([
        [topLayerDOMNode1, topLayerTreeNode1],
        [topLayerDOMNode2, topLayerTreeNode2],
      ]),
    } as ElementsModule.ElementsTreeOutline.ElementsTreeOutline;

    const topLayerContainer = new Elements.TopLayerContainer.TopLayerContainer(tree, stubDocument);
    await topLayerContainer.updateTopLayerElements();
    assert.strictEqual(topLayerContainer.currentTopLayerDOMNodes.size, 2);
  });
});
