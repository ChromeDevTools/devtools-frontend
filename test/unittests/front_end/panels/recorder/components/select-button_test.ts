// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as RecorderComponents from '../../../../../../front_end/panels/recorder/components/components.js';
import * as Menus from '../../../../../../front_end/ui/components/menus/menus.js';

import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';

import {renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describe('SelectButton', () => {
  it('should emit selectbuttonclick event on button click', async () => {
    const component = new RecorderComponents.SelectButton.SelectButton();
    component.value = 'item1';
    component.items = [
      {value: 'item1', label: (): string => 'item1-label'},
      {value: 'item2', label: (): string => 'item2-label'},
    ];
    renderElementIntoDOM(component);
    await coordinator.done();
    const onceClicked = new Promise<RecorderComponents.SelectButton.SelectButtonClickEvent>(
        resolve => {
          component.addEventListener('selectbuttonclick', resolve, {
            once: true,
          });
        },
    );

    const button = component.shadowRoot?.querySelector('devtools-button');
    assert.exists(button);
    button?.click();

    const event = await onceClicked;
    assert.strictEqual(event.value, 'item1');
  });

  it('should emit selectbuttonclick event on item click in select menu', async () => {
    const component = new RecorderComponents.SelectButton.SelectButton();
    component.value = 'item1';
    component.items = [
      {value: 'item1', label: (): string => 'item1-label'},
      {value: 'item2', label: (): string => 'item2-label'},
    ];
    component.connectedCallback();
    await coordinator.done();
    const onceClicked = new Promise<RecorderComponents.SelectButton.SelectButtonClickEvent>(
        resolve => {
          component.addEventListener('selectbuttonclick', resolve, {
            once: true,
          });
        },
    );

    const selectMenu = component.shadowRoot?.querySelector(
        'devtools-select-menu',
    );
    assert.exists(selectMenu);
    selectMenu?.dispatchEvent(
        new Menus.SelectMenu.SelectMenuItemSelectedEvent('item1'),
    );

    const event = await onceClicked;
    assert.strictEqual(event.value, 'item1');
  });
});
