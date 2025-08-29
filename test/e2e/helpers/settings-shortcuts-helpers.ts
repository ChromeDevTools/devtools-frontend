// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';
import type {ElementHandle} from 'puppeteer-core';

import {
  platform,
  selectOption,
} from '../../shared/helper.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

const CANCEL_BUTTON_SELECTOR = '[aria-label="Discard changes"]';
const CONFIRM_BUTTON_SELECTOR = '[aria-label="Confirm changes"]';
const DELETE_BUTTON_SELECTOR = '[aria-label="Remove shortcut"]';
const EDIT_BUTTON_SELECTOR = '[aria-label="Edit shortcut"]';
const RESET_BUTTON_SELECTOR = '[aria-label="Reset shortcuts for action"]';
const SHORTCUT_DISPLAY_SELECTOR = '.keybinds-shortcut';
const SHORTCUT_INPUT_SELECTOR = '.keybinds-editing input';
const SHORTCUT_SELECT_TEXT = 'DevTools (Default)Visual Studio Code';
export const ADD_SHORTCUT_LINK_TEXT = 'Add a shortcut';
export const SHORTCUT_CHORD_TIMEOUT = 1000;

/* eslint-disable @typescript-eslint/naming-convention */
export let VS_CODE_SHORTCUTS_SHORTCUTS = ['CtrlKCtrlS'];
export let VS_CODE_SETTINGS_SHORTCUTS = ['Shift?', 'Ctrl,'];
export let VS_CODE_SHORTCUTS_QUICK_OPEN_TEXT = 'Show ShortcutsCtrl + K Ctrl + SSettings';
export let VS_CODE_PAUSE_SHORTCUTS = ['Ctrl\\', 'F5', 'ShiftF5'];
export let CONTROL_1_CONTROL_2_SHORTCUT_INPUTS_TEXT = ['Ctrl + 1', 'Ctrl + 2'];
export let CONTROL_1_CONTROL_2_CHORD_INPUT_TEXT = ['Ctrl + 1 Ctrl + 2'];
export let CONTROL_2_SHORTCUT_INPUT_TEXT = ['Ctrl + 2'];
export let CONTROL_1_CONTROL_2_SHORTCUT_DISPLAY_TEXT = ['Ctrl1', 'Ctrl2'];
export let CONTROL_1_CONTROL_2_CHORD_DISPLAY_TEXT = ['Ctrl1Ctrl2'];
export let CONTROL_2_SHORTCUT_DISPLAY_TEXT = ['Ctrl2'];
export let CONSOLE_SHORTCUT_INPUT_TEXT = ['Ctrl + `'];
export let CONSOLE_SHORTCUT_DISPLAY_TEXT = ['Ctrl`'];
export let CONTROL_ALT_C_SHORTCUT_INPUT_TEXT = ['Ctrl + Alt + C'];
/* eslint-enable @typescript-eslint/naming-convention */
if (platform === 'mac') {
  VS_CODE_SHORTCUTS_SHORTCUTS = ['⌘K⌘S'];
  VS_CODE_SETTINGS_SHORTCUTS = ['⇧?', '⌘,'];
  VS_CODE_SHORTCUTS_QUICK_OPEN_TEXT = 'Show Shortcuts⌘ K ⌘ SSettings';
  VS_CODE_PAUSE_SHORTCUTS = ['F5', '⇧F5', '⌘\\'];
  CONTROL_1_CONTROL_2_SHORTCUT_INPUTS_TEXT = ['Ctrl 1', 'Ctrl 2'];
  CONTROL_1_CONTROL_2_CHORD_INPUT_TEXT = ['Ctrl 1 Ctrl 2'];
  CONTROL_2_SHORTCUT_INPUT_TEXT = ['Ctrl 2'];
  CONTROL_1_CONTROL_2_SHORTCUT_DISPLAY_TEXT = ['Ctrl1', 'Ctrl2'];
  CONTROL_1_CONTROL_2_CHORD_DISPLAY_TEXT = ['Ctrl1Ctrl2'];
  CONTROL_2_SHORTCUT_DISPLAY_TEXT = ['Ctrl2'];
  CONSOLE_SHORTCUT_INPUT_TEXT = ['Ctrl `'];
  CONSOLE_SHORTCUT_DISPLAY_TEXT = ['Ctrl`'];
  CONTROL_ALT_C_SHORTCUT_INPUT_TEXT = ['Ctrl ⌥ C'];
}

export const selectKeyboardShortcutPreset =
    async (option: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const presetSelectElement = await devToolsPage.waitForElementWithTextContent(SHORTCUT_SELECT_TEXT);
  await selectOption(await presetSelectElement.toElement('select'), option);
};

export const getShortcutListItemElement =
    async (shortcutText: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const textMatches = await devToolsPage.$$textContent(shortcutText);
  let titleElement;
  for (const matchingElement of textMatches) {
    // some actions have the same name as categories, so we have to make sure we've got the right one
    if (await matchingElement.evaluate(element => element.matches('.keybinds-action-name'))) {
      titleElement = matchingElement;
      break;
    }
  }
  assert.isOk(titleElement, 'shortcut element not found');
  const listItemElement = await titleElement.getProperty('parentElement');
  return listItemElement.asElement();
};

export const editShortcutListItem =
    async (shortcutText: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const listItemElement = await getShortcutListItemElement(shortcutText, devToolsPage) as ElementHandle;

  await devToolsPage.clickElement(listItemElement);
  await devToolsPage.click(EDIT_BUTTON_SELECTOR, {root: listItemElement});

  await devToolsPage.waitFor(RESET_BUTTON_SELECTOR);
};

export const shortcutsForAction =
    async (shortcutText: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const listItemElement = await getShortcutListItemElement(shortcutText, devToolsPage);
  assert.isOk(listItemElement, `Could not find shortcut item with text ${shortcutText}`);
  const shortcutElements = await listItemElement.$$(SHORTCUT_DISPLAY_SELECTOR);
  const shortcutElementsTextContent =
      await Promise.all(shortcutElements.map(element => element.getProperty('textContent')));
  return await Promise.all(
      shortcutElementsTextContent.map(async textContent => textContent ? await textContent.jsonValue() : []));
};

export const shortcutInputValues = async (devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const shortcutInputs = await devToolsPage.$$(SHORTCUT_INPUT_SELECTOR);
  assert.isOk(shortcutInputs.length, 'shortcut input not found');
  const shortcutValues = await Promise.all(shortcutInputs.map(async input => await input.getProperty('value')));
  return await Promise.all(shortcutValues.map(async value => value ? await value.jsonValue() : []));
};

export const clickAddShortcutLink = async (devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const addShortcutLinkTextMatches = await devToolsPage.waitForElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);
  let addShortcutLinkElement;
  // the link container and the link have the same textContent, but only the latter has a click handler
  for (const matchingElement of addShortcutLinkTextMatches) {
    if (await matchingElement.evaluate(element => element.matches('devtools-button'))) {
      addShortcutLinkElement = matchingElement;
      break;
    }
  }
  assert.isOk(addShortcutLinkElement, 'could not find add shortcut link');

  await devToolsPage.clickElement(addShortcutLinkElement);
};

export const clickShortcutConfirmButton = async (devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.click(CONFIRM_BUTTON_SELECTOR);
};

export const clickShortcutCancelButton = async (devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.click(CANCEL_BUTTON_SELECTOR);
};

export const clickShortcutResetButton = async (devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.click(RESET_BUTTON_SELECTOR);
};

export const clickShortcutDeleteButton =
    async (index: number, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const deleteButtons = await devToolsPage.$$(DELETE_BUTTON_SELECTOR);
  if (deleteButtons.length <= index) {
    assert.fail(`shortcut delete button #${index} not found`);
  }
  await devToolsPage.clickElement(deleteButtons[index]);
};

export const waitForEmptyShortcutInput = async (devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.waitForFunction(async () => {
    const shortcutInputs = await devToolsPage.$$(SHORTCUT_INPUT_SELECTOR);
    const shortcutInputValues = await Promise.all(shortcutInputs.map(input => input.getProperty('value')));
    const shortcutInputValueStrings =
        await Promise.all(shortcutInputValues.map(value => value ? value.jsonValue() : {}));
    return shortcutInputValueStrings.includes('');
  });
};

export const waitForVSCodeShortcutPreset = async (devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  // wait for a shortcut that vsCode has but the default preset does not
  await devToolsPage.waitForElementWithTextContent(VS_CODE_SHORTCUTS_SHORTCUTS.join(''));
};
