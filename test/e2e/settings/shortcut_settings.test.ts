// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getSelectedItemText, QUICK_OPEN_SELECTOR} from '../helpers/quick_open-helpers.js';
import {openSettingsTab} from '../helpers/settings-helpers.js';
import {
  ADD_SHORTCUT_LINK_TEXT,
  clickAddShortcutLink,
  clickShortcutCancelButton,
  clickShortcutConfirmButton,
  clickShortcutDeleteButton,
  clickShortcutResetButton,
  CONSOLE_SHORTCUT_DISPLAY_TEXT,
  CONSOLE_SHORTCUT_INPUT_TEXT,
  CONTROL_1_CONTROL_2_CHORD_DISPLAY_TEXT,
  CONTROL_1_CONTROL_2_CHORD_INPUT_TEXT,
  CONTROL_1_CONTROL_2_SHORTCUT_DISPLAY_TEXT,
  CONTROL_1_CONTROL_2_SHORTCUT_INPUTS_TEXT,
  CONTROL_2_SHORTCUT_DISPLAY_TEXT,
  CONTROL_2_SHORTCUT_INPUT_TEXT,
  CONTROL_ALT_C_SHORTCUT_INPUT_TEXT,
  editShortcutListItem,
  selectKeyboardShortcutPreset,
  SHORTCUT_CHORD_TIMEOUT,
  shortcutInputValues,
  shortcutsForAction,
  VS_CODE_PAUSE_SHORTCUTS,
  VS_CODE_SETTINGS_SHORTCUTS,
  VS_CODE_SHORTCUTS_QUICK_OPEN_TEXT,
  VS_CODE_SHORTCUTS_SHORTCUTS,
  waitForEmptyShortcutInput,
  waitForVSCodeShortcutPreset,
} from '../helpers/settings-shortcuts-helpers.js';

describe('Shortcuts Settings tab', () => {
  it('should update when the shortcuts preset is changed ', async ({devToolsPage}) => {
    await openSettingsTab(devToolsPage, 'Shortcuts');
    await selectKeyboardShortcutPreset(devToolsPage, 'vsCode');

    await waitForVSCodeShortcutPreset(devToolsPage);

    const shortcutsShortcuts = await shortcutsForAction(devToolsPage, 'Show Shortcuts');
    const settingsShortcuts = await shortcutsForAction(devToolsPage, 'Settings');
    const pauseShortcuts = await shortcutsForAction(devToolsPage, 'Pause script execution');
    assert.deepEqual(shortcutsShortcuts, VS_CODE_SHORTCUTS_SHORTCUTS);
    assert.deepEqual(settingsShortcuts, VS_CODE_SETTINGS_SHORTCUTS);
    assert.deepEqual(pauseShortcuts, VS_CODE_PAUSE_SHORTCUTS);
  });

  it('should apply new shortcuts when the preset is changed', async ({devToolsPage}) => {
    await openSettingsTab(devToolsPage, 'Shortcuts');
    await selectKeyboardShortcutPreset(devToolsPage, 'vsCode');

    await waitForVSCodeShortcutPreset(devToolsPage);

    // close the settings dialog
    await devToolsPage.page.keyboard.press('Escape');

    // use a newly-enabled shortcut to open the command menu
    await devToolsPage.page.keyboard.press('F1');
    await devToolsPage.waitFor(QUICK_OPEN_SELECTOR);

    // make sure the command menu reflects the new shortcuts
    await devToolsPage.page.keyboard.type('Show Shortcuts');
    await devToolsPage.drainTaskQueue();
    const shortcutsItemText = await getSelectedItemText(devToolsPage);

    assert.strictEqual(shortcutsItemText, VS_CODE_SHORTCUTS_QUICK_OPEN_TEXT);
  });

  it('should allow users to open the shortcut editor and view the current shortcut', async ({devToolsPage}) => {
    await openSettingsTab(devToolsPage, 'Shortcuts');
    await editShortcutListItem(devToolsPage, 'Toggle Console');

    const shortcutInputsText = await shortcutInputValues(devToolsPage);
    assert.deepEqual(shortcutInputsText, CONSOLE_SHORTCUT_INPUT_TEXT);
  });

  it('should allow users to open the shortcut editor and change and add shortcuts', async ({devToolsPage}) => {
    await openSettingsTab(devToolsPage, 'Shortcuts');
    await editShortcutListItem(devToolsPage, 'Toggle Console');

    await devToolsPage.pressKey('1', {control: true});

    await clickAddShortcutLink(devToolsPage);
    await waitForEmptyShortcutInput(devToolsPage);
    await devToolsPage.pressKey('2', {control: true});

    const shortcutInputsText = await shortcutInputValues(devToolsPage);
    assert.deepEqual(shortcutInputsText, CONTROL_1_CONTROL_2_SHORTCUT_INPUTS_TEXT);
    await clickShortcutConfirmButton(devToolsPage);
    await devToolsPage.waitForNoElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);

    const shortcuts = await shortcutsForAction(devToolsPage, 'Toggle Console');
    assert.deepEqual(shortcuts, CONTROL_1_CONTROL_2_SHORTCUT_DISPLAY_TEXT);
  });

  it('should allow users to open shortcut editor and change and reset shortcuts', async ({devToolsPage}) => {
    await openSettingsTab(devToolsPage, 'Shortcuts');
    const defaultShortcuts = await shortcutsForAction(devToolsPage, 'Start recording events');

    await editShortcutListItem(devToolsPage, 'Start recording events');

    await devToolsPage.pressKey('1', {control: true});

    await clickAddShortcutLink(devToolsPage);
    await waitForEmptyShortcutInput(devToolsPage);
    await devToolsPage.pressKey('2', {control: true});

    await clickShortcutConfirmButton(devToolsPage);
    await devToolsPage.waitForNoElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);

    const modifiedShortcuts = await shortcutsForAction(devToolsPage, 'Start recording events');
    assert.deepEqual(modifiedShortcuts, CONTROL_1_CONTROL_2_SHORTCUT_DISPLAY_TEXT);

    await editShortcutListItem(devToolsPage, 'Start recording events');
    await clickShortcutResetButton(devToolsPage);

    await clickShortcutConfirmButton(devToolsPage);
    await devToolsPage.waitForNoElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);

    const shortcuts = await shortcutsForAction(devToolsPage, 'Start recording events');
    assert.deepEqual(shortcuts, defaultShortcuts, 'Default shortcuts weren\'t restored correctly');
  });

  it('should allow users to open the shortcut editor and delete and reset shortcuts', async ({devToolsPage}) => {
    await openSettingsTab(devToolsPage, 'Shortcuts');
    await editShortcutListItem(devToolsPage, 'Toggle Console');

    await devToolsPage.pressKey('1', {control: true});

    await clickAddShortcutLink(devToolsPage);
    await waitForEmptyShortcutInput(devToolsPage);
    await devToolsPage.pressKey('2', {control: true});

    const shortcutInputsText = await shortcutInputValues(devToolsPage);
    assert.deepEqual(shortcutInputsText, CONTROL_1_CONTROL_2_SHORTCUT_INPUTS_TEXT);

    await clickShortcutDeleteButton(devToolsPage, 0);
    let shortcutInputTextAfterDeletion;
    await devToolsPage.waitForFunction(async () => {
      shortcutInputTextAfterDeletion = await shortcutInputValues(devToolsPage);
      return shortcutInputTextAfterDeletion.length === 1;
    });
    assert.deepEqual(shortcutInputTextAfterDeletion, CONTROL_2_SHORTCUT_INPUT_TEXT);

    await clickShortcutResetButton(devToolsPage);
    const shortcutInputTextAfterReset = await shortcutInputValues(devToolsPage);
    assert.deepEqual(shortcutInputTextAfterReset, CONSOLE_SHORTCUT_INPUT_TEXT);

    await clickShortcutConfirmButton(devToolsPage);
    await devToolsPage.waitForNoElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);

    const shortcuts = await shortcutsForAction(devToolsPage, 'Toggle Console');
    assert.deepEqual(shortcuts, CONSOLE_SHORTCUT_DISPLAY_TEXT);
  });

  it('should allow users to cancel an edit and discard their changes to shortcuts', async ({devToolsPage}) => {
    await openSettingsTab(devToolsPage, 'Shortcuts');
    await editShortcutListItem(devToolsPage, 'Toggle Console');

    await devToolsPage.pressKey('1', {control: true});

    await clickAddShortcutLink(devToolsPage);
    await waitForEmptyShortcutInput(devToolsPage);
    await devToolsPage.pressKey('2', {control: true});

    const shortcutInputsText = await shortcutInputValues(devToolsPage);
    assert.deepEqual(shortcutInputsText, CONTROL_1_CONTROL_2_SHORTCUT_INPUTS_TEXT);
    await clickShortcutCancelButton(devToolsPage);
    await devToolsPage.waitForNoElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);

    const shortcuts = await shortcutsForAction(devToolsPage, 'Toggle Console');
    assert.deepEqual(shortcuts, CONSOLE_SHORTCUT_DISPLAY_TEXT);
  });

  it('should allow users to set a multi-keypress shortcut (chord)', async ({devToolsPage}) => {
    await openSettingsTab(devToolsPage, 'Shortcuts');
    await editShortcutListItem(devToolsPage, 'Toggle Console');

    await devToolsPage.pressKey('1', {control: true});
    await devToolsPage.pressKey('2', {control: true});

    const shortcutInputsText = await shortcutInputValues(devToolsPage);
    assert.deepEqual(shortcutInputsText, CONTROL_1_CONTROL_2_CHORD_INPUT_TEXT);
    await clickShortcutConfirmButton(devToolsPage);
    await devToolsPage.waitForNoElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);

    const shortcuts = await shortcutsForAction(devToolsPage, 'Toggle Console');
    assert.deepEqual(shortcuts, CONTROL_1_CONTROL_2_CHORD_DISPLAY_TEXT);
  });

  it('should display the physical key that is pressed rather than special characters', async ({devToolsPage}) => {
    await openSettingsTab(devToolsPage, 'Shortcuts');
    await editShortcutListItem(devToolsPage, 'Toggle Console');

    await devToolsPage.pressKey('c', {control: true, alt: true});

    const shortcutInputsText = await shortcutInputValues(devToolsPage);
    assert.deepEqual(shortcutInputsText, CONTROL_ALT_C_SHORTCUT_INPUT_TEXT);
  });

  it('should allow users to set a new shortcut after the chord timeout', async ({devToolsPage}) => {
    await openSettingsTab(devToolsPage, 'Shortcuts');
    await editShortcutListItem(devToolsPage, 'Toggle Console');

    await devToolsPage.pressKey('1', {control: true});
    await devToolsPage.timeout(SHORTCUT_CHORD_TIMEOUT * 1.2);
    await devToolsPage.pressKey('2', {control: true});

    const shortcutInputsText = await shortcutInputValues(devToolsPage);
    assert.deepEqual(shortcutInputsText, CONTROL_2_SHORTCUT_INPUT_TEXT);
    await clickShortcutConfirmButton(devToolsPage);
    await devToolsPage.waitForNoElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);

    const shortcuts = await shortcutsForAction(devToolsPage, 'Toggle Console');
    assert.deepEqual(shortcuts, CONTROL_2_SHORTCUT_DISPLAY_TEXT);
  });
});
