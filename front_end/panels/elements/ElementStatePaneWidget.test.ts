// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

describeWithMockConnection('ElementStatePaneWidget', () => {
  let target: SDK.Target.Target;
  let view: Elements.ElementStatePaneWidget.ElementStatePaneWidget;

  const pseudoClasses = [
    'enabled',
    'disabled',
    'valid',
    'invalid',
    'user-valid',
    'user-invalid',
    'required',
    'optional',
    'read-only',
    'read-write',
    'in-range',
    'out-of-range',
    'visited',
    'link',
    'checked',
    'indeterminate',
    'placeholder-shown',
    'autofill',
  ];

  beforeEach(() => {
    stubNoopSettings();
    target = createTarget();
  });

  const assertExpectedPseudoClasses = async (
      nodeName: string, expectedPseudoClasses: string[], formAssociated: boolean = false,
      attribute?: [string, string]) => {
    view = new Elements.ElementStatePaneWidget.ElementStatePaneWidget();
    const tableUpdatedPromise = new Promise<void>(
        resolve => sinon.stub(view, 'updateElementSpecificStatesTableForTest').callsFake(resolve),
    );

    const model = target.model(SDK.DOMModel.DOMModel);
    assert.exists(model);

    const node = new SDK.DOMModel.DOMNode(model);

    sinon.stub(node, 'nodeType').returns(Node.ELEMENT_NODE);
    sinon.stub(node, 'nodeName').returns(nodeName);
    sinon.stub(node, 'enclosingElementOrSelf').returns(node);
    sinon.stub(node, 'callFunction').resolves({value: formAssociated});
    if (attribute) {
      sinon.stub(node, 'getAttribute').withArgs(attribute[0]).returns(attribute[1]);
    }

    const header = view.contentElement.querySelector('.force-specific-element-header');
    assert.instanceOf(header, HTMLElement);
    header.click();

    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);

    await tableUpdatedPromise;

    for (const pseudoClass of pseudoClasses) {
      const div = view.contentElement.querySelector(`#${pseudoClass}`);
      assert.instanceOf(div, HTMLDivElement);
      const shouldShow = expectedPseudoClasses.includes(pseudoClass);
      assert.strictEqual(
          !div.hidden, shouldShow, `Checkbox for ${pseudoClass} should be ${shouldShow ? 'shown' : 'hidden'}`);
    }
  };

  it('Calls the right backend functions', async () => {
    view = new Elements.ElementStatePaneWidget.ElementStatePaneWidget();

    const model = target.model(SDK.DOMModel.DOMModel);
    assert.exists(model);

    const node = new SDK.DOMModel.DOMNode(model);

    sinon.stub(node, 'nodeType').returns(Node.ELEMENT_NODE);
    sinon.stub(node, 'nodeName').returns('input');
    sinon.stub(node, 'enclosingElementOrSelf').returns(node);
    const checkboxes = sinon.spy(node.domModel().cssModel(), 'forcePseudoState');

    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);

    for (const pseudoClass of pseudoClasses) {
      const div = view.contentElement.querySelector(`#${pseudoClass}`);
      assert.exists(div);
      const span = div.children[0];
      const shadowRoot = span.shadowRoot;
      const input = shadowRoot?.querySelector('input');
      assert.exists(input, 'The span element doesn\'t have an input element');
      input.click();

      const args = checkboxes.lastCall.args;
      assert.strictEqual(args[0], node, 'Called forcePseudoState with wrong node');
      assert.strictEqual(args[1], pseudoClass, 'Called forcePseudoState with wrong pseudo-state');
      assert.strictEqual(args[2], true, 'Called forcePseudoState with wrong enable state');
    }
  });

  it('Hidden state for not ELEMENT_NODE type', async () => {
    view = new Elements.ElementStatePaneWidget.ElementStatePaneWidget();
    const tableUpdatedPromise = new Promise<void>(
        resolve => sinon.stub(view, 'updateElementSpecificStatesTableForTest').callsFake(resolve),
    );

    const model = target.model(SDK.DOMModel.DOMModel);
    assert.exists(model);
    const node = new SDK.DOMModel.DOMNode(model);
    sinon.stub(node, 'nodeType').returns(Node.TEXT_NODE);

    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
    await tableUpdatedPromise;

    const details = view.contentElement.querySelector('.specific-details');
    assert.exists(details, 'The details element doesn\'t exist');
    assert.instanceOf(details, HTMLDetailsElement, 'The details element is not an instance of HTMLDetailsElement');
    assert.isTrue(details.hidden, 'The details element is not hidden');
  });

  it('Hidden state for not supported element type', async () => {
    view = new Elements.ElementStatePaneWidget.ElementStatePaneWidget();
    const tableUpdatedPromise = new Promise<void>(
        resolve => sinon.stub(view, 'updateElementSpecificStatesTableForTest').callsFake(resolve),
    );

    const model = target.model(SDK.DOMModel.DOMModel);
    assert.exists(model);
    const node = new SDK.DOMModel.DOMNode(model);
    sinon.stub(node, 'nodeName').returns('not supported');
    sinon.stub(node, 'enclosingElementOrSelf').returns(node);
    sinon.stub(node, 'callFunction').resolves({value: false});

    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
    await tableUpdatedPromise;

    const details = view.contentElement.querySelector('.specific-details');
    assert.exists(details, 'The details element doesn\'t exist');
    assert.instanceOf(details, HTMLDetailsElement, 'The details element is not an instance of HTMLDetailsElement');
    assert.isTrue(details.hidden, 'The details element is not hidden');
  });

  it('Shows the specific pseudo-classes for input', async () => {
    await assertExpectedPseudoClasses(
        'input',
        [
          'disabled',
          'valid',
          'invalid',
          'user-valid',
          'user-invalid',
          'required',
          'read-only',
          'placeholder-shown',
          'autofill',
        ],
    );
  });

  it('Shows the specific pseudo-classes for button', async () => {
    await assertExpectedPseudoClasses(
        'button',
        ['disabled', 'valid', 'invalid', 'read-write'],
    );
  });

  it('Shows the specific pseudo-classes for fieldset', async () => {
    await assertExpectedPseudoClasses(
        'fieldset',
        ['disabled', 'valid', 'invalid', 'read-write'],
    );
  });

  it('Shows the specific pseudo-classes for textarea', async () => {
    await assertExpectedPseudoClasses(
        'textarea',
        [
          'disabled',
          'valid',
          'invalid',
          'user-valid',
          'user-invalid',
          'required',
          'read-only',
          'placeholder-shown',
        ],
    );
    await assertExpectedPseudoClasses(
        'textarea',
        [
          'disabled',
          'valid',
          'invalid',
          'user-valid',
          'user-invalid',
          'required',
          'read-write',
          'placeholder-shown',
        ],
        false, ['readonly', '']);
    await assertExpectedPseudoClasses(
        'textarea',
        [
          'enabled',
          'valid',
          'invalid',
          'user-valid',
          'user-invalid',
          'required',
          'read-write',
          'placeholder-shown',
        ],
        false, ['disabled', '']);
    await assertExpectedPseudoClasses(
        'textarea',
        [
          'disabled',
          'valid',
          'invalid',
          'user-valid',
          'user-invalid',
          'optional',
          'read-only',
          'placeholder-shown',
        ],
        false, ['required', '']);
  });

  it('Shows the specific pseudo-classes for select', async () => {
    await assertExpectedPseudoClasses(
        'select',
        ['disabled', 'valid', 'invalid', 'user-valid', 'user-invalid', 'required', 'read-write'],
    );
  });

  it('Shows the specific pseudo-classes for option', async () => {
    await assertExpectedPseudoClasses(
        'option',
        ['disabled', 'checked', 'read-write'],
    );
  });

  it('Shows the specific pseudo-classes for optgroup', async () => {
    await assertExpectedPseudoClasses(
        'optgroup',
        ['disabled', 'read-write'],
    );
  });

  it('Shows the specific pseudo-classes for FormAssociated', async () => {
    await assertExpectedPseudoClasses(
        'CustomFormAssociatedElement',
        ['disabled', 'valid', 'invalid', 'read-write'],
        true,
    );
  });

  it('Shows the specific pseudo-classes for object, output and img', async () => {
    await assertExpectedPseudoClasses(
        'object',
        ['valid', 'invalid', 'read-write'],
    );

    await assertExpectedPseudoClasses(
        'output',
        ['valid', 'invalid', 'read-write'],
    );

    await assertExpectedPseudoClasses(
        'img',
        ['valid', 'invalid', 'read-write'],
    );
  });
  it('Shows the specific pseudo-classes for progress', async () => {
    await assertExpectedPseudoClasses(
        'progress',
        ['read-write', 'indeterminate'],
    );
  });

  it('Shows the specific pseudo-classes for a and area with href', async () => {
    await assertExpectedPseudoClasses(
        'a',
        ['visited', 'link', 'read-write'],
        false,
        ['href', 'www.google.com'],
    );

    await assertExpectedPseudoClasses(
        'area',
        ['visited', 'link', 'read-write'],
        false,
        ['href', 'www.google.com'],
    );
  });

  it('Shows the specific pseudo-classes for a and area without href', async () => {
    await assertExpectedPseudoClasses(
        'a',
        ['read-write'],
    );

    await assertExpectedPseudoClasses(
        'area',
        ['read-write'],
    );
  });

  it('Shows the specific pseudo-classes for contenteditable div', async () => {
    await assertExpectedPseudoClasses(
        'div',
        ['read-only'],
        false,
        ['contenteditable', ''],
    );
  });

  it('Shows the specific pseudo-classes for radio or checkbox inputs', async () => {
    await assertExpectedPseudoClasses(
        'input',
        [
          'disabled',
          'valid',
          'invalid',
          'user-valid',
          'user-invalid',
          'required',
          'read-only',
          'placeholder-shown',
          'autofill',
          'checked',
          'indeterminate',
        ],
        false,
        ['type', 'checkbox'],
    );
    await assertExpectedPseudoClasses(
        'input',
        [
          'disabled',
          'valid',
          'invalid',
          'user-valid',
          'user-invalid',
          'required',
          'read-only',
          'placeholder-shown',
          'autofill',
          'checked',
          'indeterminate',
        ],
        false,
        ['type', 'radio'],
    );
  });

  it('Shows the specific pseudo-classes for datalist, label, legend and meter', async () => {
    await assertExpectedPseudoClasses(
        'datalist',
        ['read-write'],
    );
    await assertExpectedPseudoClasses(
        'label',
        ['read-write'],
    );
    await assertExpectedPseudoClasses(
        'legend',
        ['read-write'],
    );
    await assertExpectedPseudoClasses(
        'meter',
        ['read-write'],
    );
  });
});
