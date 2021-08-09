// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Buttons from '../../../../../../front_end/ui/components/buttons/buttons.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {assertElement, dispatchKeyDownEvent, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const {assert} = chai;

describe('Button', async () => {
  it('can be clicked', async () => {
    const button = new Buttons.Button.Button();
    button.variant = Buttons.Button.Variant.PRIMARY;
    button.innerText = 'Button';
    renderElementIntoDOM(button);
    await coordinator.done();

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
});
