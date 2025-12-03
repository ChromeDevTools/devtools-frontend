// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../../../generated/protocol.js';
import {
  renderElementIntoDOM,
} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../../../testing/ViewFunctionHelpers.js';

import * as PreloadingComponents from './components.js';

function renderRuleSetDetailsView() {
  const view = createViewFunctionStub(PreloadingComponents.RuleSetDetailsView.RuleSetDetailsView);
  const component = new PreloadingComponents.RuleSetDetailsView.RuleSetDetailsView(undefined, view);
  renderElementIntoDOM(component);
  return {component, view};
}

describeWithEnvironment('RuleSetDetailsView', () => {
  it('renders placeholder if not selected', async () => {
    const {component, view} = renderRuleSetDetailsView();
    component.ruleSet = null;

    assert.isNull(await view.nextInput);
  });

  it('renders rule set', async () => {
    const {component, view} = renderRuleSetDetailsView();
    const sourceText = `
{
  "prefetch": [
    {
      "source": "list",
      "urls": ["/subresource.js"]
    }
  ]
}
`;
    component.ruleSet = {
      id: 'ruleSetId:1' as Protocol.Preload.RuleSetId,
      loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
      sourceText,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
    };
    component.shouldPrettyPrint = false;

    const input = await view.nextInput;
    assert.exists(input);
    assert.isUndefined(input.errorMessage);
    assert.strictEqual(input.sourceText, sourceText);
  });

  it('renders url when included', async () => {
    const {component, view} = renderRuleSetDetailsView();
    component.ruleSet = {
      id: 'ruleSetId:1' as Protocol.Preload.RuleSetId,
      loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
      sourceText: '<something valid>',
      url: 'https://example.com/speculationrules.json',
      requestId: 'requestId' as Protocol.Network.RequestId,
    };

    const input = await view.nextInput;
    assert.exists(input);
    assert.strictEqual(input.url, 'https://example.com/speculationrules.json');
  });

  it('renders the error message', async () => {
    const {component, view} = renderRuleSetDetailsView();
    component.ruleSet = {
      id: 'ruleSetId:1' as Protocol.Preload.RuleSetId,
      loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
      sourceText: '<something invalid>',
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      errorType: Protocol.Preload.RuleSetErrorType.SourceIsNotJsonObject,
      errorMessage: 'Line: 6, column: 1, Syntax error.',
    };

    const input = await view.nextInput;
    assert.exists(input);
    assert.strictEqual(input.errorMessage, 'Line: 6, column: 1, Syntax error.');
  });

  it('formats the source text', async () => {
    const {component, view} = renderRuleSetDetailsView();
    component.ruleSet = {
      id: 'ruleSetId:1' as Protocol.Preload.RuleSetId,
      loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
      sourceText: '{"prefetch":[{"source": "list","urls": ["/subresource.js"]}]}',
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
    };

    const input = await view.nextInput;
    assert.exists(input);
    assert.strictEqual(input.sourceText, `{
    "prefetch": [
        {
            "source": "list",
            "urls": [
                "/subresource.js"
            ]
        }
    ]
}`);
  });
});
