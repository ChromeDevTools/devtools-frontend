// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {dispatchKeyDownEvent, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';

import * as Buttons from './buttons.js';

describe('Button', () => {
  const iconUrl = new URL('../../../Images/file-image.svg', import.meta.url).toString();

  function renderButton(
      data: Buttons.Button.ButtonData = {
        variant: Buttons.Button.Variant.PRIMARY,
      },
      text = 'Button'): Buttons.Button.Button {
    const button = new Buttons.Button.Button();
    button.data = data;
    // Toolbar and round buttons do not take text, and error if you try to set any.
    if (data.variant !== Buttons.Button.Variant.TOOLBAR && data.variant !== Buttons.Button.Variant.ICON) {
      button.innerText = text;
    }
    renderElementIntoDOM(button);
    return button;
  }

  function testClick(
      data: Buttons.Button.ButtonData = {
        variant: Buttons.Button.Variant.PRIMARY,
        disabled: false,
      },
      expectedClickCount = 1): void {
    const button = renderButton(data);

    let clicks = 0;
    button.onclick = () => clicks++;

    const innerButton = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    assert.instanceOf(innerButton, HTMLButtonElement);

    innerButton.click();
    dispatchKeyDownEvent(innerButton, {
      key: 'Enter',
    });

    assert.strictEqual(clicks, expectedClickCount);
  }

  it('changes to `disabled` state are reflect in the property', () => {
    const button = renderButton();
    button.disabled = false;
    assert.isFalse(button.disabled);
    button.disabled = true;
    assert.isTrue(button.disabled);
  });

  it('primary button can be clicked', () => {
    testClick({
      variant: Buttons.Button.Variant.PRIMARY,
    });
  });

  it('disabled primary button cannot be clicked', () => {
    testClick(
        {
          variant: Buttons.Button.Variant.PRIMARY,
          disabled: true,
        },
        0);
  });

  it('secondary button can be clicked', () => {
    testClick({
      variant: Buttons.Button.Variant.OUTLINED,
    });
  });

  it('disabled secondary button cannot be clicked', () => {
    testClick(
        {
          variant: Buttons.Button.Variant.OUTLINED,
          disabled: true,
        },
        0);
  });

  it('toolbar button can be clicked', () => {
    testClick({
      variant: Buttons.Button.Variant.TOOLBAR,
      iconUrl,
    });
  });

  it('disabled toolbar button cannot be clicked', () => {
    testClick(
        {
          variant: Buttons.Button.Variant.TOOLBAR,
          iconUrl,
          disabled: true,
        },
        0);
  });

  it('gets the no additional classes set for the inner button if only text is provided', () => {
    const button = renderButton();
    const innerButton = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    assert.isTrue(!innerButton.classList.contains('text-with-icon'));
    assert.isTrue(!innerButton.classList.contains('only-icon'));
  });

  it('gets title set', () => {
    const button = renderButton({
      variant: Buttons.Button.Variant.PRIMARY,
      title: 'Custom',
    });
    const innerButton = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    assert.strictEqual(innerButton.title, 'Custom');

    button.title = 'Custom2';
    assert.strictEqual(innerButton.title, 'Custom2');
  });

  it('gets the text-with-icon class set for the inner button if text and icon is provided', () => {
    const button = renderButton(
        {
          variant: Buttons.Button.Variant.PRIMARY,
          iconUrl,
        },
        'text');
    const innerButton = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    assert.isTrue(innerButton.classList.contains('text-with-icon'));
    assert.isTrue(!innerButton.classList.contains('only-icon'));
  });

  it('gets the only-icon class set for the inner button if only icon is provided', () => {
    const button = renderButton(
        {
          variant: Buttons.Button.Variant.PRIMARY,
          iconUrl,
        },
        '');
    const innerButton = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    assert.isTrue(!innerButton.classList.contains('text-with-icon'));
    assert.isTrue(innerButton.classList.contains('only-icon'));
  });

  it('gets the `small` class set for the inner button if size === SMALL', () => {
    const button = renderButton(
        {
          variant: Buttons.Button.Variant.PRIMARY,
          size: Buttons.Button.Size.SMALL,
        },
        '');
    const innerButton = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    assert.isTrue(innerButton.classList.contains('small'));
  });

  it('does not get the `small` class set for the inner button if size === MEDIUM', () => {
    const button = renderButton(
        {
          variant: Buttons.Button.Variant.PRIMARY,
          iconUrl,
        },
        '');
    const innerButton = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    assert.isFalse(innerButton.classList.contains('small'));
  });

  describe('in forms', () => {
    function renderForm(data: Buttons.Button.ButtonData = {
      variant: Buttons.Button.Variant.PRIMARY,
    }) {
      const form = document.createElement('form');
      const input = document.createElement('input');
      const button = new Buttons.Button.Button();
      const reference = {
        submitCount: 0,
        form,
        button,
        input,
      };
      form.onsubmit = (event: Event) => {
        event.preventDefault();
        reference.submitCount++;
      };
      button.data = data;
      button.innerText = 'button';

      form.append(input);
      form.append(button);

      renderElementIntoDOM(form);
      return reference;
    }

    it('submits a form with button[type=submit]', () => {
      const state = renderForm({
        variant: Buttons.Button.Variant.PRIMARY,
        type: 'submit',
      });
      state.button.click();
      assert.strictEqual(state.submitCount, 1);
    });

    it('does not submit a form with button[type=button]', () => {
      const state = renderForm({
        variant: Buttons.Button.Variant.PRIMARY,
        type: 'button',
      });
      state.button.click();
      assert.strictEqual(state.submitCount, 0);
    });

    it('resets a form with button[type=reset]', () => {
      const state = renderForm({
        variant: Buttons.Button.Variant.PRIMARY,
        type: 'reset',
      });
      state.input.value = 'test';
      state.button.click();
      assert.strictEqual(state.input.value, '');
    });
  });
});
