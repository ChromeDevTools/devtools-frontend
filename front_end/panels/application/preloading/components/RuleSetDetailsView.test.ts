// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../../../generated/protocol.js';
import {
  renderElementIntoDOM,
} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';
import type * as TextEditor from '../../../../ui/components/text_editor/text_editor.js';

import * as PreloadingComponents from './components.js';

async function renderRuleSetDetailsView(
    data: PreloadingComponents.RuleSetDetailsView.RuleSetDetailsViewData,
    shouldPrettyPrint: boolean): Promise<HTMLElement> {
  const component = new PreloadingComponents.RuleSetDetailsView.RuleSetDetailsView();
  component.shouldPrettyPrint = shouldPrettyPrint;
  component.data = data;
  renderElementIntoDOM(component);
  assert.isNotNull(component.shadowRoot);
  await RenderCoordinator.done();

  return component;
}

describeWithEnvironment('RuleSetDetailsView', () => {
  it('renders placeholder if not selected', async () => {
    const data = null;

    const component = await renderRuleSetDetailsView(data, false);
    assert.isNotNull(component.shadowRoot);
    assert.exists(component.shadowRoot.querySelector('.empty-state'));

    const header = component.shadowRoot.querySelector('.empty-state-header')?.textContent;
    const description = component.shadowRoot.querySelector('.empty-state-description')?.textContent;
    assert.deepEqual(header, 'No element selected');
    assert.deepEqual(description, 'Select an element for more details');
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
    const component = await renderRuleSetDetailsView(data, false);
    assert.isUndefined(component.shadowRoot?.getElementById('error-message-text')?.textContent);

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
      requestId: 'requestId' as Protocol.Network.RequestId,
    };
    const component = await renderRuleSetDetailsView(data, false);
    assert.isUndefined(component.shadowRoot?.getElementById('error-message-text')?.textContent);
    const textEditor = component.shadowRoot?.querySelector('devtools-text-editor') as TextEditor.TextEditor.TextEditor;
    assert.strictEqual(textEditor.state.doc.toString(), data.sourceText);
  });

  it('renders invalid rule set, broken JSON', async () => {
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
    const component = await renderRuleSetDetailsView(data, false);
    assert.deepEqual(
        component.shadowRoot?.getElementById('error-message-text')?.textContent, 'Line: 6, column: 1, Syntax error.');
    const textEditor = component.shadowRoot?.querySelector('devtools-text-editor') as TextEditor.TextEditor.TextEditor;
    assert.strictEqual(textEditor.state.doc.toString(), data.sourceText);
  });

  it('renders invalid rule set, invalid top-level key', async () => {
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
  ],
  "tag": "マイルール"
}
`,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      errorType: Protocol.Preload.RuleSetErrorType.InvalidRulesetLevelTag,
      errorMessage: 'Tag value is invalid: must be ASCII printable.',
    };
    const component = await renderRuleSetDetailsView(data, false);
    assert.deepEqual(
        component.shadowRoot?.getElementById('error-message-text')?.textContent,
        'Tag value is invalid: must be ASCII printable.');
    const textEditor = component.shadowRoot?.querySelector('devtools-text-editor') as TextEditor.TextEditor.TextEditor;
    assert.strictEqual(textEditor.state.doc.toString(), data.sourceText);
  });

  it('renders invalid rule set, lacking `urls`', async () => {
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
    const component = await renderRuleSetDetailsView(data, false);
    assert.deepEqual(
        component.shadowRoot?.getElementById('error-message-text')?.textContent,
        'A list rule must have a "urls" array.');
    const textEditor = component.shadowRoot?.querySelector('devtools-text-editor') as TextEditor.TextEditor.TextEditor;
    assert.strictEqual(textEditor.state.doc.toString(), data.sourceText);
  });

  it('renders formatted rule set', async () => {
    const data: Protocol.Preload.RuleSet = {
      id: 'ruleSetId:1' as Protocol.Preload.RuleSetId,
      loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
      sourceText: '{"prefetch":[{"source": "list","urls": ["/subresource.js"]}]}',
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
    };
    const component = await renderRuleSetDetailsView(data, true);
    assert.isUndefined(component.shadowRoot?.getElementById('error-message-text')?.textContent);

    const textEditor = component.shadowRoot?.querySelector('devtools-text-editor') as TextEditor.TextEditor.TextEditor;
    // Formatted sourceText should be different from the data.sourceText in this case.
    assert.notEqual(textEditor.state.doc.toString(), data.sourceText);
    assert.strictEqual(textEditor.state.doc.toString(), `{
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
