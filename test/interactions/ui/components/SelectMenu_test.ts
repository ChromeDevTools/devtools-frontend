// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as Menus from '../../../../front_end/ui/components/menus/menus.js';
import {loadComponentDocExample} from '../../../../test/interactions/helpers/shared.js';
import {
  $,
  activeElement,
  click,
  clickElement,
  getBrowserAndPages,
  waitFor,
  waitForFunction,
  waitForNone,
} from '../../../../test/shared/helper.js';
import {
  assertElementScreenshotUnchanged,
  waitForDialogAnimationEnd,
} from '../../../shared/screenshots.js';

type GetSelectMenuOptions = {
  placeholderSelector?: string,
};
async function getFocusedItemValue() {
  const focusedItem = await waitFor('devtools-menu-item:focus');
  return await focusedItem.evaluate((item: Element) => (item as Menus.Menu.MenuItem).value);
}

async function getSelectMenu(options: GetSelectMenuOptions = {}) {
  await loadComponentDocExample('select_menu/basic.html');
  if (options.placeholderSelector) {
    const placeholder = await waitFor(options.placeholderSelector);
    return await waitFor('devtools-select-menu', placeholder);
  }
  return await waitFor('devtools-select-menu');
}

async function openMenu(options: GetSelectMenuOptions = {}) {
  const selectMenu = await getSelectMenu(options);
  const animationEndPromise = waitForDialogAnimationEnd();
  await click('button', {
    root: selectMenu,
  });
  await animationEndPromise;
  return await waitFor('dialog[open]');
}

async function testScreenshotOnPlaceholder(placeholderSelector: string, screenshot: string) {
  const dialog = await waitFor(placeholderSelector);
  const selectMenu = await waitFor('devtools-select-menu', dialog);
  const animationEndPromise = waitForDialogAnimationEnd();
  await click('button', {
    root: selectMenu,
  });
  await animationEndPromise;

  await assertElementScreenshotUnchanged(dialog, screenshot);
}

describe('SelectMenu', () => {
  it('shows the button to open the menu', async () => {
    const selectMenu = await getSelectMenu();
    const button = await $('button', selectMenu);
    assert.isNotNull(button);
  });

  it('opens the menu when the button is clicked', async () => {
    const selectMenu = await getSelectMenu();
    const openDialog = await $('dialog[open]', selectMenu);
    assert.isNull(openDialog);
    await click('button');
    await waitFor('dialog[open]');
  });

  it('changes focus across menu\'s items using keyboard arrows', async () => {
    const {frontend} = getBrowserAndPages();

    // First, test navigation on a menu without groups.
    await openMenu();

    await frontend.keyboard.press('ArrowDown');
    assert.strictEqual(await getFocusedItemValue(), '1');

    await frontend.keyboard.press('ArrowDown');
    assert.strictEqual(await getFocusedItemValue(), '2');

    await frontend.keyboard.press('ArrowUp');
    assert.strictEqual(await getFocusedItemValue(), '1');

    await frontend.keyboard.press('Escape');

    // Next, test navigation on a menu with groups.
    await openMenu({placeholderSelector: '#place-holder-4'});

    await frontend.keyboard.press('ArrowDown');
    assert.strictEqual(await getFocusedItemValue(), '1');

    await frontend.keyboard.press('ArrowUp');
    assert.strictEqual(await getFocusedItemValue(), '1');

    await frontend.keyboard.press('ArrowDown');
    assert.strictEqual(await getFocusedItemValue(), '2');

    await frontend.keyboard.press('ArrowUp');
    assert.strictEqual(await getFocusedItemValue(), '1');
  });

  it('focuses the first item when pressing the right arrow key ', async () => {
    const {frontend} = getBrowserAndPages();

    // First, test navigation on a menu without groups.
    await openMenu();

    await frontend.keyboard.press('ArrowRight');
    assert.strictEqual(await getFocusedItemValue(), '1');

    await frontend.keyboard.press('Escape');

    // Next, test navigation on a menu with groups.
    await openMenu({placeholderSelector: '#place-holder-4'});

    await frontend.keyboard.press('ArrowRight');
    assert.strictEqual(await getFocusedItemValue(), '1');
  });

  it('focuses the last item when pressing the up arrow key ', async () => {
    const {frontend} = getBrowserAndPages();

    // First, test navigation on a menu without groups.
    await openMenu();

    await frontend.keyboard.press('ArrowUp');
    assert.strictEqual(await getFocusedItemValue(), '4');

    await frontend.keyboard.press('Escape');

    // Next, test navigation on a menu with groups.
    await openMenu({placeholderSelector: '#place-holder-4'});

    await frontend.keyboard.press('ArrowUp');
    assert.strictEqual(await getFocusedItemValue(), '4');
  });

  it('changes focus across menu\'s items using the HOME and END keys', async () => {
    const {frontend} = getBrowserAndPages();

    // First, test navigation on a menu without groups.
    await openMenu();

    await frontend.keyboard.press('ArrowDown');
    assert.strictEqual(await getFocusedItemValue(), '1');

    await frontend.keyboard.press('End');
    assert.strictEqual(await getFocusedItemValue(), '4');

    await frontend.keyboard.press('Home');
    assert.strictEqual(await getFocusedItemValue(), '1');

    await frontend.keyboard.press('Escape');

    // Next, test navigation on a menu with groups.
    await openMenu({placeholderSelector: '#place-holder-4'});

    await frontend.keyboard.press('ArrowDown');
    assert.strictEqual(await getFocusedItemValue(), '1');

    await frontend.keyboard.press('End');
    assert.strictEqual(await getFocusedItemValue(), '4');

    await frontend.keyboard.press('Home');
    assert.strictEqual(await getFocusedItemValue(), '1');
  });

  it('opens a menu using the UP and DOWN keys appropriately', async () => {
    const {frontend} = getBrowserAndPages();
    await loadComponentDocExample('select_menu/basic.html');

    // Focus the first select menu, which deploys downwards and open it using the
    // down arrow key.
    await frontend.keyboard.press('Tab');
    await frontend.keyboard.press('ArrowDown');
    await waitFor('dialog[open]');

    await frontend.keyboard.press('Escape');
    const placeHolder1 = await waitFor('#place-holder-1');
    await waitFor('dialog:not([open])', placeHolder1);

    // Focus the second select menu, which deploys upwards and open it using the
    // up arrow key.
    await frontend.keyboard.press('Tab');
    await frontend.keyboard.press('ArrowUp');
    await waitFor('dialog[open]');
  });

  it('can close a menu with ESC and open it again using the keyboard', async () => {
    const {frontend} = getBrowserAndPages();
    await loadComponentDocExample('select_menu/basic.html');
    // Focus the first select menu, which deploys downwards and open it using the
    // down arrow key.
    await frontend.keyboard.press('Tab');
    await frontend.keyboard.press('ArrowDown');
    const placeHolder1 = await waitFor('#place-holder-1');
    await waitFor('dialog[open]', placeHolder1);

    await frontend.keyboard.press('Escape');
    await waitFor('dialog:not([open])', placeHolder1);

    // Wait until the focus is set on the button that opens the menu.
    await waitForFunction(async () => {
      const activeElementHandle = await activeElement();
      const activeElementName = await activeElementHandle.evaluate(e => e.tagName);
      return activeElementName === 'BUTTON';
    });
    await frontend.keyboard.press('ArrowDown');
    await waitFor('dialog[open]');
  });

  it('triggers a selectmenuselected event when clicking an item from the menu', async () => {
    await openMenu();
    const item = await waitFor('devtools-select-menu > devtools-menu-item:nth-child(1)');
    const itemText = await item.evaluate((itemText: Element) => (itemText as HTMLElement).innerText.trim());
    await clickElement(item);

    // Element containing the selected item's text.
    const result = await waitFor('#place-holder-1 > div');
    const resultText = await result.evaluate((result: Element) => (result as HTMLElement).innerText.trim());
    assert.strictEqual(resultText, `Selected option: ${itemText}`);
  });

  it('triggers a selectmenuselected event using the enter key', async () => {
    const {frontend} = getBrowserAndPages();
    await openMenu();
    await frontend.keyboard.press('ArrowDown');
    const focusedItem = await waitFor('devtools-menu-item:focus');
    const itemText = await focusedItem.evaluate((item: Element) => (item as HTMLElement).innerText.trim());
    await frontend.keyboard.press('Enter');

    // Element containing the selected item's text.
    const result = await waitFor('#place-holder-1 > div');
    const resultText = await result.evaluate((result: Element) => (result as HTMLElement).innerText.trim());
    assert.strictEqual(resultText, `Selected option: ${itemText}`);
  });

  it('closes the dialog by clicking it', async () => {
    const dialog = await openMenu();
    await clickElement(dialog);
    await waitFor('dialog:not([open])');
  });

  it('closes the dialog using the esc key', async () => {
    const {frontend} = getBrowserAndPages();
    await openMenu();
    await frontend.keyboard.press('Escape');

    await waitFor('dialog:not([open])');
  });

  it('renders a menu in its correct position (top or bottom)', async () => {
    await getSelectMenu();

    // Open the first (regular) menu
    const placeHolder1 = await waitFor('#place-holder-1');
    let animationEndPromise = waitForDialogAnimationEnd();
    await click('button', {
      root: placeHolder1,
    });
    await animationEndPromise;
    const regularMenuWrapper = await waitFor('devtools-select-menu', placeHolder1);

    const regularDialog = await waitFor('dialog[open]', placeHolder1);
    const regularDialogTopBound = await regularDialog.evaluate((dialog: Element) => dialog.getBoundingClientRect().top);
    const regularMenuWrapperBottomBound =
        await regularMenuWrapper.evaluate((menu: Element) => menu.getBoundingClientRect().bottom);
    assert.strictEqual(regularDialogTopBound, regularMenuWrapperBottomBound);

    // Close the first menu
    await clickElement(regularDialog);
    await waitFor('dialog:not([open])', placeHolder1);

    // Open the second (inverted) menu
    const placeHolder2 = await waitFor('#place-holder-2');
    const invertedButton = await waitFor('button', placeHolder2);
    animationEndPromise = waitForDialogAnimationEnd();
    await clickElement(invertedButton);
    await animationEndPromise;
    const invertedMenuWrapper = await waitFor('devtools-select-menu', placeHolder2);

    const invertedDialog = await waitFor('dialog[open]', placeHolder2);
    const invertedDialogBottomBound =
        await invertedDialog.evaluate((dialog: Element) => dialog.getBoundingClientRect().bottom);
    const invertedMenuWrapperTopBound =
        await invertedMenuWrapper.evaluate((menu: Element) => menu.getBoundingClientRect().top);
    assert.strictEqual(invertedDialogBottomBound, invertedMenuWrapperTopBound);
  });

  it('does not open on click if it\'s disabled', async () => {
    await getSelectMenu();
    const selectMenuWrapper = await waitFor('#place-holder-6');
    const selectMenu = await waitFor('devtools-select-menu', selectMenuWrapper);

    const selectMenuButton = await waitFor('devtools-select-menu-button', selectMenu);
    await clickElement(selectMenuButton);
    await waitForNone('dialog[open]');
  });

  itScreenshot('renders a menu with a connector', async () => {
    await loadComponentDocExample('select_menu/basic.html');
    await testScreenshotOnPlaceholder('#place-holder-3', 'select_menu/select_menu_with_connector.png');
  });

  itScreenshot('renders a menu with groups', async () => {
    await loadComponentDocExample('select_menu/basic.html');
    await testScreenshotOnPlaceholder('#place-holder-4', 'select_menu/select_menu_with_groups.png');
  });
});
