// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../../../testing/DOMHelpers.js';  // eslint-disable-line rulesdir/es_modules_import
import {
  describeWithLocale,
} from '../../../testing/EnvironmentHelpers.js';
import * as LitHtml from '../../lit-html/lit-html.js';
import * as Dialogs from '../dialogs/dialogs.js';
import * as Coordinator from '../render_coordinator/render_coordinator.js';

import * as Menus from './menus.js';

const {html} = LitHtml;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

async function createMenu(): Promise<Menus.SelectMenu.SelectMenu> {
  const menuItems = [
    {
      name: 'Option 1',
      value: '1',
      group: '',
    },
    {
      name: 'Option 2',
      value: '2',
      group: '',
    },
    {
      name: 'Option 3',
      value: '3',
      group: '',
    },
    {
      name: 'Option 4',
      value: '4',
      group: '',
    },
  ];

  const menu = new Menus.SelectMenu.SelectMenu();
  menu.position = Dialogs.Dialog.DialogVerticalPosition.BOTTOM;
  menuItems.forEach(item => {
    const selectMenuItem = new Menus.Menu.MenuItem();
    selectMenuItem.value = item.value;
    selectMenuItem.textContent = item.name;
    menu.appendChild(selectMenuItem);
  });

  await coordinator.done();
  return menu;
}

describeWithLocale('SelectMenu', () => {
  it('will use the buttonTitle property if that is provided', async () => {
    const menu = await createMenu();
    const firsItem = menu.querySelector('devtools-menu-item');
    if (!firsItem) {
      assert.fail('No item was found.');
      return;
    }
    menu.buttonTitle = 'Override Title';
    Helpers.renderElementIntoDOM(menu);
    await coordinator.done();
    assert.isNotNull(menu.shadowRoot);
    const button = menu.shadowRoot.querySelector('devtools-select-menu-button');
    if (!button) {
      assert.fail('devtools-select-menu-button not found');
      return;
    }
    assert.instanceOf(button, HTMLElement);
    assert.strictEqual(button.innerText, 'Override Title');
  });

  it('allows the buttonTitle to be a function', async () => {
    const menu = await createMenu();
    const firsItem = menu.querySelector('devtools-menu-item');
    if (!firsItem) {
      assert.fail('No item was found.');
      return;
    }
    firsItem.selected = true;
    menu.buttonTitle = () => html`Override Title`;
    Helpers.renderElementIntoDOM(menu);
    await coordinator.done();
    assert.isNotNull(menu.shadowRoot);
    const button = menu.shadowRoot.querySelector('devtools-select-menu-button');
    if (!button) {
      assert.fail('devtools-select-menu-button not found');
      return;
    }
    assert.instanceOf(button, HTMLElement);
    assert.strictEqual(button.innerText, 'Override Title');
  });

  it('can render multiple options as selected at once', async () => {
    const selectMenu = await createMenu();
    Helpers.renderElementIntoDOM(selectMenu);
    [...selectMenu.querySelectorAll('devtools-menu-item')][0].selected = true;
    [...selectMenu.querySelectorAll('devtools-menu-item')][1].selected = true;
    assert.isNotNull(selectMenu.shadowRoot);
    const devtoolsMenu = selectMenu.shadowRoot.querySelector('devtools-menu');
    const devtoolsDialog = devtoolsMenu?.shadowRoot?.querySelector('devtools-dialog');
    await devtoolsDialog?.setDialogVisible(true);
    const selectedItems = [...selectMenu.querySelectorAll('devtools-menu-item')].filter(item => item.selected);
    assert.deepEqual(selectedItems.map(item => item.innerText), ['Option 1', 'Option 2']);
  });
});
