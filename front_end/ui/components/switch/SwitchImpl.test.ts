// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';

// eslint-disable-next-line rulesdir/es_modules_import
import * as Switch from './switch.js';

describe('Switch', () => {
  it('should checked property reflect the current value for whether the Switch is checked or not', () => {
    const component = new Switch.Switch.Switch();
    component.checked = false;
    renderElementIntoDOM(component);

    const checkbox = component.shadowRoot?.querySelector('input')!;

    assert.isFalse(checkbox.checked);
    component.checked = true;
    assert.isTrue(checkbox.checked);
  });

  it('should emit SwitchChangeEvent whenever the checkbox inside is changed', async () => {
    const component = new Switch.Switch.Switch();
    const eventPromise = new Promise<Switch.Switch.SwitchChangeEvent>(resolve => {
      component.addEventListener(Switch.Switch.SwitchChangeEvent.eventName, ev => {
        resolve(ev);
      });
    });
    renderElementIntoDOM(component);

    const checkbox = component.shadowRoot?.querySelector('input')!;
    checkbox.checked = false;
    checkbox.click();

    const event = await eventPromise;
    assert.isTrue(event.checked);
  });

  it('emits only 1 click event when clicked', async () => {
    const component = new Switch.Switch.Switch();
    let clickEventCount = 0;
    const eventPromise = new Promise<MouseEvent>(resolve => {
      component.addEventListener('click', ev => {
        clickEventCount++;
        resolve(ev);
      });
    });
    renderElementIntoDOM(component);
    const slider = component.shadowRoot?.querySelector('span.slider') as HTMLSpanElement;
    slider.click();
    await eventPromise;
    assert.strictEqual(clickEventCount, 1);
  });
});
