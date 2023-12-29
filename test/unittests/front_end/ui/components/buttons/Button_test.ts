// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Buttons from '../../../../../../front_end/ui/components/buttons/buttons.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {assertElement, dispatchKeyDownEvent, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const {assert} = chai;

describe('Button', async () => {
  const iconUrl = new URL('../../../../../../front_end/Images/file-image.svg', import.meta.url).toString();

  async function renderButton(
      data: Buttons.Button.ButtonData = {
        variant: Buttons.Button.Variant.PRIMARY,
      },
      text = 'Button'): Promise<Buttons.Button.Button> {
    const button = new Buttons.Button.Button();
    button.data = data;
    // Toolbar and round buttons do not take text, and error if you try to set any.
    if (data.variant !== Buttons.Button.Variant.TOOLBAR && data.variant !== Buttons.Button.Variant.ROUND) {
      button.innerText = text;
    }
    renderElementIntoDOM(button);
    await coordinator.done();
    return button;
  }

  async function testClick(
      data: Buttons.Button.ButtonData = {
        variant: Buttons.Button.Variant.PRIMARY,
        disabled: false,
      },
      expectedClickCount = 1): Promise<void> {
    const button = await renderButton(data);

    let clicks = 0;
    button.onclick = () => clicks++;

    const innerButton = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    assertElement(innerButton, HTMLButtonElement);

    innerButton.click();
    dispatchKeyDownEvent(innerButton, {
      key: 'Enter',
    });

    assert.strictEqual(clicks, expectedClickCount);
  }

  it('primary button can be clicked', async () => {
    await testClick({
      variant: Buttons.Button.Variant.PRIMARY,
    });
  });

  it('disabled primary button cannot be clicked', async () => {
    await testClick(
        {
          variant: Buttons.Button.Variant.PRIMARY,
          disabled: true,
        },
        0);
  });

  it('secondary button can be clicked', async () => {
    await testClick({
      variant: Buttons.Button.Variant.SECONDARY,
    });
  });

  it('disabled secondary button cannot be clicked', async () => {
    await testClick(
        {
          variant: Buttons.Button.Variant.SECONDARY,
          disabled: true,
        },
        0);
  });

  it('toolbar button can be clicked', async () => {
    await testClick({
      variant: Buttons.Button.Variant.TOOLBAR,
      iconUrl,
    });
  });

  it('disabled toolbar button cannot be clicked', async () => {
    await testClick(
        {
          variant: Buttons.Button.Variant.TOOLBAR,
          iconUrl,
          disabled: true,
        },
        0);
  });

  it('gets the no additional classes set for the inner button if only text is provided', async () => {
    const button = await renderButton();
    const innerButton = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    assert.isTrue(!innerButton.classList.contains('text-with-icon'));
    assert.isTrue(!innerButton.classList.contains('only-icon'));
  });

  it('gets title set', async () => {
    const button = await renderButton({
      variant: Buttons.Button.Variant.PRIMARY,
      title: 'Custom',
    });
    const innerButton = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    assert.strictEqual(innerButton.title, 'Custom');

    button.title = 'Custom2';
    await coordinator.done();
    assert.strictEqual(innerButton.title, 'Custom2');
  });

  it('gets the text-with-icon class set for the inner button if text and icon is provided', async () => {
    const button = await renderButton(
        {
          variant: Buttons.Button.Variant.PRIMARY,
          iconUrl,
        },
        'text');
    const innerButton = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    assert.isTrue(innerButton.classList.contains('text-with-icon'));
    assert.isTrue(!innerButton.classList.contains('only-icon'));
  });

  it('gets the only-icon class set for the inner button if only icon is provided', async () => {
    const button = await renderButton(
        {
          variant: Buttons.Button.Variant.PRIMARY,
          iconUrl,
        },
        '');
    const innerButton = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    assert.isTrue(!innerButton.classList.contains('text-with-icon'));
    assert.isTrue(innerButton.classList.contains('only-icon'));
  });

  it('gets the `small` class set for the inner button if size === SMALL', async () => {
    const button = await renderButton(
        {
          variant: Buttons.Button.Variant.PRIMARY,
          size: Buttons.Button.Size.SMALL,
        },
        '');
    const innerButton = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    assert.isTrue(innerButton.classList.contains('small'));
  });

  it('does not get the `small` class set for the inner button if size === MEDIUM', async () => {
    const button = await renderButton(
        {
          variant: Buttons.Button.Variant.PRIMARY,
          iconUrl,
        },
        '');
    const innerButton = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    assert.isFalse(innerButton.classList.contains('small'));
  });

  it('sets icon size for round icon button according to passed parameters', async () => {
    const iconUrl = new URL('../../../../../../front_end/Images/document.svg', import.meta.url).toString();
    const button = await renderButton(
        {
          variant: Buttons.Button.Variant.ROUND,
          size: Buttons.Button.Size.SMALL,
          iconUrl,
          iconWidth: '15px',
          iconHeight: '16px',
        },
        '');
    const innerButton = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    assert.isTrue(innerButton.classList.contains('explicit-size'));
    const icon = button.shadowRoot?.querySelector('devtools-icon') as HTMLElement;
    const basicIcon = icon.shadowRoot?.querySelector('.icon-basic') as HTMLElement;
    assert.strictEqual(basicIcon.style.height, '16px');
    assert.strictEqual(basicIcon.style.width, '15px');
  });

  describe('in forms', () => {
    async function renderForm(data: Buttons.Button.ButtonData = {
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
      await coordinator.done();
      return reference;
    }

    it('submits a form with button[type=submit]', async () => {
      const state = await renderForm({
        variant: Buttons.Button.Variant.PRIMARY,
        type: 'submit',
      });
      state.button.click();
      assert.strictEqual(state.submitCount, 1);
    });

    it('does not submit a form with button[type=button]', async () => {
      const state = await renderForm({
        variant: Buttons.Button.Variant.PRIMARY,
        type: 'button',
      });
      state.button.click();
      assert.strictEqual(state.submitCount, 0);
    });

    it('resets a form with button[type=reset]', async () => {
      const state = await renderForm({
        variant: Buttons.Button.Variant.PRIMARY,
        type: 'reset',
      });
      state.input.value = 'test';
      state.button.click();
      assert.strictEqual(state.input.value, '');
    });
  });
});
