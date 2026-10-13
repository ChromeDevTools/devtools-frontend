// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, describe, it} from 'mocha';

import * as Common from '../../../core/common/common.js';
import {renderElementIntoDOM, setColorScheme} from '../../../testing/DOMHelpers.js';
import {
  setupLocaleHooks,
} from '../../../testing/LocaleHelpers.js';
import {html} from '../../lit/lit.js';
import * as Dialogs from '../dialogs/dialogs.js';
import * as RenderCoordinator from '../render_coordinator/render_coordinator.js';

import * as Menus from './menus.js';

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

  await RenderCoordinator.done();
  return menu;
}

describe('SelectMenu', () => {
  setupLocaleHooks();

  describe('focus indicator', () => {
    afterEach(() => setColorScheme('light'));

    for (const theme of ['light', 'dark'] as const) {
      it(`has at least 3:1 contrast in the ${theme} theme`, async () => {
        setColorScheme(theme);
        const selectMenu = await createMenu();
        renderElementIntoDOM(selectMenu);
        await RenderCoordinator.done();
        const menu = selectMenu.shadowRoot?.querySelector('devtools-menu');
        const dialog = menu?.shadowRoot?.querySelector('devtools-dialog');
        const menuContainer = menu?.shadowRoot?.querySelector('#container');
        assert.exists(dialog);
        assert.exists(menuContainer);
        await dialog.setDialogVisible(true);
        const surfaceElement = dialog.shadowRoot?.querySelector('#content');
        assert.exists(surfaceElement);
        const items = selectMenu.querySelectorAll('devtools-menu-item');
        menuContainer.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
        assert.isTrue(items[0].matches(':focus-visible'));

        const firstItem = items[0].shadowRoot?.querySelector('.menu-item');
        const secondItem = items[1].shadowRoot?.querySelector('.menu-item');
        assert.exists(firstItem);
        assert.exists(secondItem);
        const style = getComputedStyle(firstItem, '::after');
        assert.strictEqual(style.outlineStyle, 'solid');
        assert.strictEqual(style.outlineWidth, '2px');
        assert.strictEqual(style.outlineOffset, '-2px');
        assert.strictEqual(getComputedStyle(secondItem, '::after').outlineStyle, 'none');

        const outline = Common.Color.parse(style.outlineColor);
        const surface = Common.Color.parse(getComputedStyle(surfaceElement).backgroundColor);
        const focus = Common.Color.parse(style.backgroundColor);
        assert.exists(outline);
        assert.exists(surface);
        assert.exists(focus);
        const surfaceRGBA = surface.asLegacyColor().rgba();
        const focusRGBA = Common.ColorUtils.blendColors(focus.asLegacyColor().rgba(), surfaceRGBA);
        for (const background of [surfaceRGBA, focusRGBA]) {
          assert.isAtLeast(Common.ColorUtils.contrastRatio(outline.asLegacyColor().rgba(), background), 3);
        }

        items[0].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
        assert.isTrue(items[1].matches(':focus-visible'));
        assert.strictEqual(getComputedStyle(firstItem, '::after').outlineStyle, 'none');
        assert.strictEqual(getComputedStyle(secondItem, '::after').outlineStyle, 'solid');
        await dialog.setDialogVisible(false);
        await RenderCoordinator.done();
      });
    }
  });

  it('will use the buttonTitle property if that is provided', async () => {
    const menu = await createMenu();
    const firsItem = menu.querySelector('devtools-menu-item');
    assert.exists(firsItem);
    menu.buttonTitle = 'Override Title';
    renderElementIntoDOM(menu);
    await RenderCoordinator.done();
    assert.isNotNull(menu.shadowRoot);
    const button = menu.shadowRoot.querySelector('devtools-select-menu-button');
    assert.exists(button);
    assert.instanceOf(button, HTMLElement);
    assert.strictEqual(button.innerText, 'Override Title');
  });

  it('allows the buttonTitle to be a function', async () => {
    const menu = await createMenu();
    const firsItem = menu.querySelector('devtools-menu-item');
    assert.exists(firsItem);
    firsItem.selected = true;
    menu.buttonTitle = () => html`Override Title`;
    renderElementIntoDOM(menu);
    await RenderCoordinator.done();
    assert.isNotNull(menu.shadowRoot);
    const button = menu.shadowRoot.querySelector('devtools-select-menu-button');
    assert.exists(button);
    assert.instanceOf(button, HTMLElement);
    assert.strictEqual(button.innerText, 'Override Title');
  });

  it('can render multiple options as selected at once', async () => {
    const selectMenu = await createMenu();
    renderElementIntoDOM(selectMenu);
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
