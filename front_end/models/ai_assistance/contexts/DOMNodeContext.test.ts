// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from '../../../core/sdk/sdk.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {SnapshotTester} from '../../../testing/SnapshotTester.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithEnvironment('DOMNodeContext', function() {
  const snapshotTester = new SnapshotTester(this, import.meta);

  let element: sinon.SinonStubbedInstance<SDK.DOMModel.DOMNode>;
  let target: sinon.SinonStubbedInstance<SDK.Target.Target>;
  let domModel: sinon.SinonStubbedInstance<SDK.DOMModel.DOMModel>;

  beforeEach(() => {
    target = sinon.createStubInstance(SDK.Target.Target);
    target.model.returns(null);

    domModel = sinon.createStubInstance(SDK.DOMModel.DOMModel);
    domModel.target.returns(target);

    element = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    element.domModel.returns(domModel);
    element.backendNodeId.returns(99 as unknown as ReturnType<SDK.DOMModel.DOMNode['backendNodeId']>);
  });

  it('getPromptDetails describes the node correctly', async function() {
    element.simpleSelector.returns('div#myElement');
    element.getChildNodesPromise.resolves(null);

    const nodeContext = new AiAssistance.DOMNodeContext.DOMNodeContext(element);
    const promptDetails = await nodeContext.getPromptDetails();

    assert.isNotNull(promptDetails);
    snapshotTester.assert(this, promptDetails!);
  });

  it('getUserFacingDetails returns details with Data Used title', async function() {
    element.simpleSelector.returns('div#myElement');
    element.getChildNodesPromise.resolves(null);

    const nodeContext = new AiAssistance.DOMNodeContext.DOMNodeContext(element);
    const details = await nodeContext.getUserFacingDetails();

    assert.isNotNull(details);
    snapshotTester.assert(this, JSON.stringify(details, null, 2));
  });

  it('describes an element with child nodes not loaded', async function() {
    element.simpleSelector.returns('div#myElement');
    element.getChildNodesPromise.resolves(null);

    const nodeContext = new AiAssistance.DOMNodeContext.DOMNodeContext(element);
    const result = await nodeContext.describe();

    snapshotTester.assert(this, result);
  });

  it('describes an element with no children, siblings, or parent', async function() {
    element.simpleSelector.returns('div#myElement');
    element.getChildNodesPromise.resolves([]);

    const nodeContext = new AiAssistance.DOMNodeContext.DOMNodeContext(element);
    const result = await nodeContext.describe();

    snapshotTester.assert(this, result);
  });

  it('describes an element with child element and text nodes', async function() {
    const childNodes: Array<sinon.SinonStubbedInstance<SDK.DOMModel.DOMNode>> = [
      sinon.createStubInstance(SDK.DOMModel.DOMNode),
      sinon.createStubInstance(SDK.DOMModel.DOMNode),
      sinon.createStubInstance(SDK.DOMModel.DOMNode),
    ];
    childNodes[0].nodeType.returns(Node.ELEMENT_NODE);
    childNodes[0].simpleSelector.returns('span.child1');
    childNodes[1].nodeType.returns(Node.TEXT_NODE);
    childNodes[2].nodeType.returns(Node.ELEMENT_NODE);
    childNodes[2].simpleSelector.returns('span.child2');

    element.simpleSelector.returns('div#parentElement');
    element.getChildNodesPromise.resolves(childNodes);
    element.nextSibling = null;
    element.previousSibling = null;
    element.parentNode = null;

    const nodeContext = new AiAssistance.DOMNodeContext.DOMNodeContext(element);
    const result = await nodeContext.describe();

    snapshotTester.assert(this, result);
  });

  it('describes an element with siblings and a parent', async function() {
    const nextSibling = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    nextSibling.nodeType.returns(Node.ELEMENT_NODE);
    const previousSibling = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    previousSibling.nodeType.returns(Node.TEXT_NODE);

    const parentNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    parentNode.simpleSelector.returns('div#grandparentElement');
    const parentChildNodes: Array<sinon.SinonStubbedInstance<SDK.DOMModel.DOMNode>> = [
      sinon.createStubInstance(SDK.DOMModel.DOMNode),
      sinon.createStubInstance(SDK.DOMModel.DOMNode),
    ];
    parentChildNodes[0].nodeType.returns(Node.ELEMENT_NODE);
    parentChildNodes[0].simpleSelector.returns('span.sibling1');
    parentChildNodes[1].nodeType.returns(Node.TEXT_NODE);
    parentNode.getChildNodesPromise.resolves(parentChildNodes);

    element.simpleSelector.returns('div#parentElement');
    element.getChildNodesPromise.resolves(null);
    element.nextSibling = nextSibling;
    element.previousSibling = previousSibling;
    element.parentNode = parentNode;

    const nodeContext = new AiAssistance.DOMNodeContext.DOMNodeContext(element);
    const result = await nodeContext.describe();

    snapshotTester.assert(this, result);
  });
});
