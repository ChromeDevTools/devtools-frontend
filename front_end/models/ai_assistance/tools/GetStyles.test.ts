// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from '../../../core/sdk/sdk.js';
import {
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import {
  createStubbedDomNodeWithModels,
  getMatchedStyles,
  ruleMatch,
} from '../../../testing/StyleHelpers.js';
import * as AiAssistance from '../ai_assistance.js';

function assertIsError<T>(response: AiAssistance.AiAgent.FunctionCallHandlerResult<T>):
    asserts response is {error: string} {
  if (!('error' in response)) {
    assert.fail(`Expected error response, but got: ${JSON.stringify(response)}`);
  }
}

function assertIsResult<T>(response: AiAssistance.AiAgent.FunctionCallHandlerResult<T>):
    asserts response is {result: T, widgets?: AiAssistance.AiAgent.AiWidget[]} {
  if (!('result' in response)) {
    assert.fail(`Expected success result response, but got: ${JSON.stringify(response)}`);
  }
}

describeWithEnvironment('GetStylesTool', () => {
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

  it('successfully returns computed and authored styles', async () => {
    const {node: resolvedNode, cssModel} = createStubbedDomNodeWithModels({nodeId: 42});

    resolvedNode.ownerDocument = null;
    element.ownerDocument = null;

    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(resolvedNode);

    const computedStyleMap = new Map([['color', 'red']]);
    (cssModel.getComputedStyle as sinon.SinonStub).resolves(computedStyleMap);

    const matchedPayload = [ruleMatch('div', {color: 'red'})];
    const matchedStyles = getMatchedStyles({cssModel, node: resolvedNode, matchedPayload});
    (cssModel.getMatchedStyles as sinon.SinonStub).resolves(matchedStyles);

    const tool = new AiAssistance.GetStyles.GetStylesTool();
    const context = {
      conversationContext: new AiAssistance.DOMNodeContext.DOMNodeContext(element),
    };

    const response = await tool.handler(
        {
          explanation: 'Get element styles',
          elements: [42],
          styleProperties: ['color'],
        },
        context);

    assertIsResult(response);
    assert.strictEqual(
        response.result,
        JSON.stringify(
            {
              42: {
                computed: {color: 'red'},
                authored: {color: 'red'},
              },
            },
            null, 2));
  });

  it('returns error when selected element is missing', async () => {
    const tool = new AiAssistance.GetStyles.GetStylesTool();
    const context = {
      conversationContext: null,
    };

    const response = await tool.handler(
        {
          explanation: 'Get element styles',
          elements: [42],
          styleProperties: ['color'],
        },
        context);

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: Could not find the currently selected element.');
  });

  it('returns error on origin mismatch', async () => {
    const {node: resolvedNode} = createStubbedDomNodeWithModels({nodeId: 42});

    element.ownerDocument = {
      documentURL: 'https://example.com',
    } as unknown as SDK.DOMModel.DOMDocument;

    resolvedNode.ownerDocument = {
      documentURL: 'https://another.com',
    } as unknown as SDK.DOMModel.DOMDocument;

    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(resolvedNode);

    const tool = new AiAssistance.GetStyles.GetStylesTool();
    const context = {
      conversationContext: new AiAssistance.DOMNodeContext.DOMNodeContext(element),
    };

    const response = await tool.handler(
        {
          explanation: 'Get element styles',
          elements: [42],
          styleProperties: ['color'],
        },
        context);

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: Node does not belong to the current origin.');
  });
});
