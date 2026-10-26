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
import * as Dialogs from '../dialogs/dialogs.js';
import * as RenderCoordinator from '../render_coordinator/render_coordinator.js';

import * as Menus from './menus.js';

async function createMenu(): Promise<Menus.Menu.Menu> {
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

  const menu = new Menus.Menu.Menu();
  menu.position = Dialogs.Dialog.DialogVerticalPosition.BOTTOM;
  menu.origin = () => new DOMPoint(0, 0);
  menuItems.forEach(item => {
    const menuItem = new Menus.Menu.MenuItem();
    menuItem.value = item.value;
    menuItem.textContent = item.name;
    menu.appendChild(menuItem);
  });

  await RenderCoordinator.done();
  return menu;
}

describe('Menu', () => {
  setupLocaleHooks();

  describe('focus indicator', () => {
    afterEach(() => setColorScheme('light'));

    for (const theme of ['light', 'dark'] as const) {
      it(`has at least 3:1 contrast in the ${theme} theme`, async () => {
        setColorScheme(theme);
        const menu = await createMenu();
        renderElementIntoDOM(menu);
        await RenderCoordinator.done();
        const dialog = menu.shadowRoot?.querySelector('devtools-dialog');
        const menuContainer = menu.shadowRoot?.querySelector('#container');
        assert.exists(dialog);
        assert.exists(menuContainer);
        await dialog.setDialogVisible(true);
        const surfaceElement = dialog.shadowRoot?.querySelector('#content');
        assert.exists(surfaceElement);
        const items = menu.querySelectorAll('devtools-menu-item');
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

  it('can render multiple options as selected at once', async () => {
    const menu = await createMenu();
    renderElementIntoDOM(menu);
    [...menu.querySelectorAll('devtools-menu-item')][0].selected = true;
    [...menu.querySelectorAll('devtools-menu-item')][1].selected = true;
    assert.isNotNull(menu.shadowRoot);
    const devtoolsDialog = menu.shadowRoot.querySelector('devtools-dialog');
    await devtoolsDialog?.setDialogVisible(true);
    const selectedItems = [...menu.querySelectorAll('devtools-menu-item')].filter(item => item.selected);
    assert.deepEqual(selectedItems.map(item => item.innerText), ['Option 1', 'Option 2']);
  });
});
