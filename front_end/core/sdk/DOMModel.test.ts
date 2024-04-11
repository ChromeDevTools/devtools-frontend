// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as SDK from './sdk.js';

describeWithMockConnection('DOMModel', () => {
  it('updates the document on an documentUpdate event if there already is a previous document', async () => {
    const parentTarget = createTarget();
    const target = createTarget({parentTarget});
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    assert.exists(domModel.agent);

    domModel.setDocumentForTest({nodeId: 0} as Protocol.DOM.Node);
    const spy = sinon.spy(domModel.agent, 'invoke_getDocument');

    assert.isTrue(spy.notCalled);
    assert.isNotNull(domModel.existingDocument());

    domModel.documentUpdated();
    assert.isTrue(spy.calledOnce);
  });

  it('does not request document if there is not a previous document', async () => {
    const parentTarget = createTarget();
    const target = createTarget({parentTarget});
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    assert.exists(domModel.agent);

    domModel.setDocumentForTest(null);
    const spy = sinon.spy(domModel.agent, 'invoke_getDocument');

    assert.isTrue(spy.notCalled);
    assert.isNull(domModel.existingDocument());

    domModel.documentUpdated();
    assert.isTrue(spy.notCalled);
  });

  describe('DOMNode', () => {
    describe('simpleSelector', () => {
      let target: SDK.Target.Target;
      let model: SDK.DOMModel.DOMModel;
      beforeEach(() => {
        target = createTarget();

        const modelBeforeAssertion = target.model(SDK.DOMModel.DOMModel);
        assert.exists(modelBeforeAssertion);
        model = modelBeforeAssertion;
      });

      afterEach(() => {
        target.dispose('NO_REASON');
      });

      it('should return localName when it\'s not an input, it does not have an idea and does not contain any classes',
         () => {
           const domNode = SDK.DOMModel.DOMNode.create(model, null, false, {
             nodeId: 1 as Protocol.DOM.NodeId,
             backendNodeId: 2 as Protocol.DOM.BackendNodeId,
             nodeType: Node.ELEMENT_NODE,
             nodeName: 'div',
             localName: 'div',
             nodeValue: '',
           });
           assert.strictEqual(domNode.simpleSelector(), 'div');
         });

      it('should return localName with input type if it is an input and does not contain any idea or classes', () => {
        const domNode = SDK.DOMModel.DOMNode.create(model, null, false, {
          nodeId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'input',
          attributes: [
            'type',
            'text',
          ],
          localName: 'input',
          nodeValue: '',
        });
        assert.strictEqual(domNode.simpleSelector(), 'input[type="text"]');
      });

      it('should return localName with id if it has an id', () => {
        const domNode = SDK.DOMModel.DOMNode.create(model, null, false, {
          nodeId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'input',
          attributes: [
            'type',
            'text',
            'id',
            'input-with-id',
          ],
          localName: 'input',
          nodeValue: '',
        });
        assert.strictEqual(domNode.simpleSelector(), 'input#input-with-id');
      });

      it('should return localName with classes appended for an input', () => {
        const domNode = SDK.DOMModel.DOMNode.create(model, null, false, {
          nodeId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'input',
          attributes: [
            'type',
            'text',
            'class',
            'first-class second-class',
          ],
          localName: 'input',
          nodeValue: '',
        });
        assert.strictEqual(domNode.simpleSelector(), 'input.first-class.second-class');
      });

      it('should return localName with classes appended for a div without mentioning div', () => {
        const domNode = SDK.DOMModel.DOMNode.create(model, null, false, {
          nodeId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'div',
          attributes: [
            'type',
            'text',
            'class',
            'first-class second-class',
          ],
          localName: 'div',
          nodeValue: '',
        });
        assert.strictEqual(domNode.simpleSelector(), '.first-class.second-class');
      });

      it('should return localName for a pseudo class without pseudo identifier', () => {
        const domNode = SDK.DOMModel.DOMNode.create(model, null, false, {
          nodeId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: '::before',
          localName: '::before',
          nodeValue: '',
        });
        assert.strictEqual(domNode.simpleSelector(), '::before');
      });

      it('should return localName for a pseudo class with a pseudo identifier', () => {
        const domNode = SDK.DOMModel.DOMNode.create(model, null, false, {
          nodeId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          pseudoIdentifier: 'root',
          nodeName: '::view-transition-new',
          localName: '::view-transition-new',
          nodeValue: '',
        });
        assert.strictEqual(domNode.simpleSelector(), '::view-transition-new(root)');
      });
    });
  });
});
