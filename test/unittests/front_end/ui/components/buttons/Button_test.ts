// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Buttons from '../../../../../../front_end/ui/components/buttons/buttons.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {assertElement, dispatchKeyDownEvent, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const {assert} = chai;

describe('Button', async () => {
  const iconUrl = new URL('../../../../../../front_end/Images/ic_file_image.svg', import.meta.url).toString();

  async function renderButton(
      data: Buttons.Button.ButtonDataWithVariant = {
        variant: Buttons.Button.Variant.PRIMARY,
      },
      text = 'Button'): Promise<Buttons.Button.Button> {
    const button = new Buttons.Button.Button();
    button.data = data;
    button.innerText = text;
    renderElementIntoDOM(button);
    await coordinator.done();
    return button;
  }

  it('can be clicked', async () => {
    const button = await renderButton();

    let clicks = 0;
    button.onclick = () => clicks++;

    const innerButton = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    assertElement(innerButton, HTMLButtonElement);

    innerButton.click();
    dispatchKeyDownEvent(innerButton, {
      key: 'Enter',
    });

    assert.strictEqual(clicks, 1);
  });

  it('gets the no additional classes set for the inner button if only text is provided', async () => {
    const button = await renderButton();
    const innerButton = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    assert.isTrue(!innerButton.classList.contains('text-with-icon'));
    assert.isTrue(!innerButton.classList.contains('only-icon'));
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
});
