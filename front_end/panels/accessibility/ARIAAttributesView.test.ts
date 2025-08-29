// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as Accessibility from './accessibility.js';

describeWithMockConnection('ARIAAttributesView', () => {
  let target: SDK.Target.Target;
  let domModel: SDK.DOMModel.DOMModel;
  let node: SDK.DOMModel.DOMNode;
  let setAttributeValueSpy: sinon.SinonSpy;

  beforeEach(() => {
    stubNoopSettings();
    target = createTarget();
    domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
    node = new SDK.DOMModel.DOMNode(domModel);
    node.setAttributesPayload(['role', 'checkbox', 'aria-checked', 'true']);
    setAttributeValueSpy = sinon.spy(node, 'setAttributeValue');
  });

  const modifyAttribute =
      (view: Accessibility.ARIAAttributesView.ARIAAttributesPane, childIndex: number, newValue: string) => {
        const treeOutline = view.getTreeOutlineForTesting();
        assert.exists(treeOutline);
        const treeElement =
            treeOutline.rootElement().childAt(childIndex) as Accessibility.ARIAAttributesView.ARIAAttributesTreeElement;
        assert.exists(treeElement);
        treeElement.listItemElement.querySelector('span')?.click();

        const prompt = treeElement.getPromptForTesting();
        assert.exists(prompt);
        const proxyElement = prompt.element();
        (proxyElement as HTMLElement).textContent = newValue;

        proxyElement.dispatchEvent(new FocusEvent('blur'));
      };

  it('can modify an ARIA attribute value', () => {
    const view = new Accessibility.ARIAAttributesView.ARIAAttributesPane();
    renderElementIntoDOM(view);
    view.setNode(node);

    modifyAttribute(view, 1, 'false');

    sinon.assert.calledOnceWithExactly(setAttributeValueSpy, 'aria-checked', 'false');
  });

  it('can modify an ARIA role', () => {
    const view = new Accessibility.ARIAAttributesView.ARIAAttributesPane();
    renderElementIntoDOM(view);
    view.setNode(node);

    modifyAttribute(view, 0, 'radio');

    sinon.assert.calledOnceWithExactly(setAttributeValueSpy, 'role', 'radio');
  });
});

describe('ARIAAttributesTreeElement', () => {
  it('should create a value element with the correct class and text content', () => {
    const value = 'test value';
    const element = Accessibility.ARIAAttributesView.ARIAAttributesTreeElement.createARIAValueElement(value);
    assert.strictEqual(element.textContent, value);
    assert.isTrue(element.classList.contains('monospace'));
  });

  it('should append a name element with the correct classes and text content', () => {
    const parentPane = {} as Accessibility.ARIAAttributesView.ARIAAttributesPane;
    const attribute = {name: 'aria-label', value: 'test'} as SDK.DOMModel.Attribute;
    const target = {} as SDK.Target.Target;
    const treeElement = new Accessibility.ARIAAttributesView.ARIAAttributesTreeElement(parentPane, attribute, target);
    treeElement.onattach();

    treeElement.appendNameElement('aria-label');

    const nameElement = treeElement.listItemElement.querySelector('.ax-name');
    assert.exists(nameElement);
    assert.strictEqual(nameElement.textContent, 'aria-label');
    assert.isTrue(nameElement.classList.contains('monospace'));
  });

  it('should append a value element with the correct text content', () => {
    const parentPane = {} as Accessibility.ARIAAttributesView.ARIAAttributesPane;
    const attribute = {name: 'aria-label', value: 'test'} as SDK.DOMModel.Attribute;
    const target = {} as SDK.Target.Target;
    const treeElement = new Accessibility.ARIAAttributesView.ARIAAttributesTreeElement(parentPane, attribute, target);
    treeElement.onattach();

    treeElement.appendAttributeValueElement('test');

    const valueElement = treeElement.listItemElement.querySelector('span:not(.ax-name):not(.separator)');
    assert.exists(valueElement);
    assert.strictEqual(valueElement.textContent, 'test');
  });
});
