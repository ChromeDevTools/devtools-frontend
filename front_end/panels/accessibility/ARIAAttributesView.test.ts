// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../testing/MockConnection.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Accessibility from './accessibility.js';

describeWithMockConnection('ARIAAttributesView', () => {
  let node: SDK.DOMModel.DOMNode;

  beforeEach(() => {
    setMockConnectionResponseHandler('Debugger.enable', () => ({}));
    setMockConnectionResponseHandler('Storage.getStorageKeyForFrame', () => ({}));
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
