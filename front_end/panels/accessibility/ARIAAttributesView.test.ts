// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../testing/MockConnection.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Accessibility from './accessibility.js';

describeWithMockConnection('ARIAAttributesView', () => {
  let node: SDK.DOMModel.DOMNode;

  beforeEach(() => {
    setMockConnectionResponseHandler('Debugger.enable', () => ({} as Protocol.Debugger.EnableResponse));
    setMockConnectionResponseHandler('Storage.getStorageKey', () => ({} as Protocol.Storage.GetStorageKeyResponse));
    stubNoopSettings();
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
    node = new SDK.DOMModel.DOMNode(domModel);
    node.setAttributesPayload(['role', 'checkbox', 'aria-checked', 'true']);
  });

  it('can modify an ARIA attribute value', async () => {
    const viewFunction = createViewFunctionStub(Accessibility.ARIAAttributesView.ARIAAttributesPane);
    const view = new Accessibility.ARIAAttributesView.ARIAAttributesPane(viewFunction);
    view.setNode(node);

    const input = await viewFunction.nextInput;
    const ariaChecked = input.attributes.find(attr => attr.name === 'aria-checked');
    assert.exists(ariaChecked);
    const setAttributeValueSpy = sinon.spy(node, 'setAttributeValue');
    input.onCommitEditing(ariaChecked, 'false');

    sinon.assert.calledOnceWithExactly(setAttributeValueSpy, 'aria-checked', 'false');
  });

  it('can modify an ARIA role', async () => {
    const viewFunction = createViewFunctionStub(Accessibility.ARIAAttributesView.ARIAAttributesPane);
    const view = new Accessibility.ARIAAttributesView.ARIAAttributesPane(viewFunction);
    view.setNode(node);

    const input = await viewFunction.nextInput;
    const role = input.attributes.find(attr => attr.name === 'role');
    assert.exists(role);
    const setAttributeValueSpy = sinon.spy(node, 'setAttributeValue');
    input.onCommitEditing(role, 'radio');

    sinon.assert.calledOnceWithExactly(setAttributeValueSpy, 'role', 'radio');
  });

  it('autocompletes attributes', async () => {
    const viewFunction = createViewFunctionStub(Accessibility.ARIAAttributesView.ARIAAttributesPane);
    const view = new Accessibility.ARIAAttributesView.ARIAAttributesPane(viewFunction);
    view.setNode(node);

    const input = await viewFunction.nextInput;
    const role = input.attributes.find(attr => attr.name === 'role');
    assert.exists(role);
    const ariaChecked = input.attributes.find(attr => attr.name === 'aria-checked');
    assert.exists(ariaChecked);
    assert.deepEqual(await input.propertyCompletions.get(ariaChecked), ['true', 'false', 'mixed', 'undefined']);
    assert.isTrue(await input.propertyCompletions.has(role));
  });

  it('does not include completions in the text prompt value when editing', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container, {includeCommonStyles: true});
    const attributeBeingEdited = node.attributes().find(attr => attr.name === 'aria-checked') || null;
    assert.exists(attributeBeingEdited);
    const propertyCompletions = new Map([[attributeBeingEdited, ['true', 'false', 'mixed', 'undefined']]]);
    const input = {
      onStartEditing: sinon.stub(),
      onCommitEditing: sinon.stub(),
      onCancelEditing: sinon.stub(),
      attributeBeingEdited,
      attributes: node.attributes(),
      propertyCompletions,
    };
    Accessibility.ARIAAttributesView.DEFAULT_VIEW(input, {}, container);

    // Wait for devtools-tree to render its template.
    await new Promise(resolve => setTimeout(resolve, 0));

    const tree = container.querySelector('devtools-tree');
    assert.exists(tree);
    const treeOutline = tree.getInternalTreeOutlineForTest();

    // The second attribute is aria-checked
    const ariaCheckedTreeElement = treeOutline.rootElement().children()[1];
    assert.exists(ariaCheckedTreeElement);

    const prompt = ariaCheckedTreeElement.listItemElement.querySelector('devtools-prompt[editing]');
    assert.exists(prompt);

    const textPrompt = prompt.shadowRoot?.querySelector('.text-prompt');
    assert.exists(textPrompt);
    assert.strictEqual(textPrompt.textContent, 'true');
  });

  it('should render attributes', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container, {includeCommonStyles: true});
    const input = {
      onStartEditing: sinon.stub(),
      onCommitEditing: sinon.stub(),
      onCancelEditing: sinon.stub(),
      attributeBeingEdited: null,
      attributes: node.attributes(),
      propertyCompletions: new Map(),
    };
    Accessibility.ARIAAttributesView.DEFAULT_VIEW(input, {}, container);

    await assertScreenshot('accessibility/aria-attributes.png');
  });
});
