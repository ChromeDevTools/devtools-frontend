// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../../../../../../front_end/generated/protocol.js';
import * as PreloadingComponents from '../../../../../../../front_end/panels/application/preloading/components/components.js';
import * as Coordinator from '../../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {
  assertShadowRoot,
  renderElementIntoDOM,
} from '../../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../helpers/EnvironmentHelpers.js';
import type * as TextEditor from '../../../../../../../front_end/ui/components/text_editor/text_editor.js';

const {assert} = chai;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

async function renderRuleSetDetailsView(data: PreloadingComponents.RuleSetDetailsView.RuleSetDetailsViewData):
    Promise<HTMLElement> {
  const component = new PreloadingComponents.RuleSetDetailsView.RuleSetDetailsView();
  component.data = data;
  renderElementIntoDOM(component);
  assertShadowRoot(component.shadowRoot);
  await coordinator.done();

  return component;
}

describeWithEnvironment('RuleSetDetailsView', async () => {
  it('renders nothing if not selected', async () => {
    const data = null;

    const component = await renderRuleSetDetailsView(data);
    assertShadowRoot(component.shadowRoot);
    assert.strictEqual(component.shadowRoot.textContent, '');
  });

  it('renders rule set', async () => {
    const data: Protocol.Preload.RuleSet = {
      id: 'ruleSetId:1' as Protocol.Preload.RuleSetId,
      loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
      sourceText: `
{
  "prefetch": [
    {
      "source": "list",
      "urls": ["/subresource.js"]
    }
  ]
}
`,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
    };
    const component = await renderRuleSetDetailsView(data);
    assert.deepEqual(component.shadowRoot?.getElementById('error-message-text')?.textContent, undefined);

    const textEditor = component.shadowRoot?.querySelector('devtools-text-editor') as TextEditor.TextEditor.TextEditor;
    assert.strictEqual(textEditor.state.doc.toString(), data.sourceText);
  });

  it('renders rule set from Speculation-Rules HTTP header', async () => {
    const data: Protocol.Preload.RuleSet = {
      id: 'ruleSetId:1' as Protocol.Preload.RuleSetId,
      loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
      sourceText: `
{
  "prefetch": [
    {
      "source": "list",
      "urls": ["/subresource.js"]
    }
  ]
}
`,
      url: 'https://example.com/speculationrules.json',
      requestId: 'reqeustId' as Protocol.Network.RequestId,
    };
    const component = await renderRuleSetDetailsView(data);
    assert.deepEqual(component.shadowRoot?.getElementById('error-message-text')?.textContent, undefined);
    const textEditor = component.shadowRoot?.querySelector('devtools-text-editor') as TextEditor.TextEditor.TextEditor;
    assert.strictEqual(textEditor.state.doc.toString(), data.sourceText);
  });

  it('renders invalid rule set', async () => {
    const data: Protocol.Preload.RuleSet = {
      id: 'ruleSetId:1' as Protocol.Preload.RuleSetId,
      loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
      sourceText: `
{
  "prefetch": [
    {
      "source": "list",
`,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      errorType: Protocol.Preload.RuleSetErrorType.SourceIsNotJsonObject,
      errorMessage: 'Line: 6, column: 1, Syntax error.',
    };
    const component = await renderRuleSetDetailsView(data);
    assert.deepEqual(
        component.shadowRoot?.getElementById('error-message-text')?.textContent, 'Line: 6, column: 1, Syntax error.');
    const textEditor = component.shadowRoot?.querySelector('devtools-text-editor') as TextEditor.TextEditor.TextEditor;
    assert.strictEqual(textEditor.state.doc.toString(), data.sourceText);
  });

  it('renders invalid rule set', async () => {
    const data: Protocol.Preload.RuleSet = {
      id: 'ruleSetId:1' as Protocol.Preload.RuleSetId,
      loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
      sourceText: `
{
  "prefetch": [
    {
      "source": "list"
    }
  ]
}
`,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      errorType: Protocol.Preload.RuleSetErrorType.InvalidRulesSkipped,
      errorMessage: 'A list rule must have a "urls" array.',
    };
    const component = await renderRuleSetDetailsView(data);
    assert.deepEqual(
        component.shadowRoot?.getElementById('error-message-text')?.textContent,
        'A list rule must have a "urls" array.');
    const textEditor = component.shadowRoot?.querySelector('devtools-text-editor') as TextEditor.TextEditor.TextEditor;
    assert.strictEqual(textEditor.state.doc.toString(), data.sourceText);
  });
});
