// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getSelectedItemText, QUICK_OPEN_SELECTOR} from '../../e2e/helpers/quick_open-helpers.js';
import {openSettingsTab} from '../../e2e/helpers/settings-helpers.js';
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
} from '../../e2e/helpers/settings-shortcuts-helpers.js';

describe('Shortcuts Settings tab', () => {
  it('should update when the shortcuts preset is changed ', async ({devToolsPage}) => {
    await openSettingsTab('Shortcuts', devToolsPage);
    await selectKeyboardShortcutPreset('vsCode', devToolsPage);

    await waitForVSCodeShortcutPreset(devToolsPage);

    const shortcutsShortcuts = await shortcutsForAction('Show Shortcuts', devToolsPage);
    const settingsShortcuts = await shortcutsForAction('Settings', devToolsPage);
    const pauseShortcuts = await shortcutsForAction('Pause script execution', devToolsPage);
    assert.deepEqual(shortcutsShortcuts, VS_CODE_SHORTCUTS_SHORTCUTS);
    assert.deepEqual(settingsShortcuts, VS_CODE_SETTINGS_SHORTCUTS);
    assert.deepEqual(pauseShortcuts, VS_CODE_PAUSE_SHORTCUTS);
  });

  it('should apply new shortcuts when the preset is changed', async ({devToolsPage}) => {
    await openSettingsTab('Shortcuts', devToolsPage);
    await selectKeyboardShortcutPreset('vsCode', devToolsPage);

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
    await openSettingsTab('Shortcuts', devToolsPage);
    await editShortcutListItem('Toggle Console', devToolsPage);

    const shortcutInputsText = await shortcutInputValues(devToolsPage);
    assert.deepEqual(shortcutInputsText, CONSOLE_SHORTCUT_INPUT_TEXT);
  });

  it('should allow users to open the shortcut editor and change and add shortcuts', async ({devToolsPage}) => {
    await openSettingsTab('Shortcuts', devToolsPage);
    await editShortcutListItem('Toggle Console', devToolsPage);

    await devToolsPage.page.keyboard.down('Control');
    await devToolsPage.page.keyboard.press('1');
    await devToolsPage.page.keyboard.up('Control');

    await clickAddShortcutLink(devToolsPage);
    await waitForEmptyShortcutInput(devToolsPage);
    await devToolsPage.page.keyboard.down('Control');
    await devToolsPage.page.keyboard.press('2');
    await devToolsPage.page.keyboard.up('Control');

    const shortcutInputsText = await shortcutInputValues(devToolsPage);
    assert.deepEqual(shortcutInputsText, CONTROL_1_CONTROL_2_SHORTCUT_INPUTS_TEXT);
    await clickShortcutConfirmButton(devToolsPage);
    await devToolsPage.waitForNoElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);

    const shortcuts = await shortcutsForAction('Toggle Console', devToolsPage);
    assert.deepEqual(shortcuts, CONTROL_1_CONTROL_2_SHORTCUT_DISPLAY_TEXT);
  });

  it('should allow users to open shortcut editor and change and reset shortcuts', async ({devToolsPage}) => {
    await openSettingsTab('Shortcuts', devToolsPage);
    const defaultShortcuts = await shortcutsForAction('Start recording events', devToolsPage);

    await editShortcutListItem('Start recording events', devToolsPage);

    await devToolsPage.page.keyboard.down('Control');
    await devToolsPage.page.keyboard.press('1');
    await devToolsPage.page.keyboard.up('Control');

    await clickAddShortcutLink(devToolsPage);
    await waitForEmptyShortcutInput(devToolsPage);
    await devToolsPage.page.keyboard.down('Control');
    await devToolsPage.page.keyboard.press('2');
    await devToolsPage.page.keyboard.up('Control');

    await clickShortcutConfirmButton(devToolsPage);
    await devToolsPage.waitForNoElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);

    const modifiedShortcuts = await shortcutsForAction('Start recording events', devToolsPage);
    assert.deepEqual(modifiedShortcuts, CONTROL_1_CONTROL_2_SHORTCUT_DISPLAY_TEXT);

    await editShortcutListItem('Start recording events', devToolsPage);
    await clickShortcutResetButton(devToolsPage);

    await clickShortcutConfirmButton(devToolsPage);
    await devToolsPage.waitForNoElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);

    const shortcuts = await shortcutsForAction('Start recording events', devToolsPage);
    assert.deepEqual(shortcuts, defaultShortcuts, 'Default shortcuts weren\'t restored correctly');
  });

  it('should allow users to open the shortcut editor and delete and reset shortcuts', async ({devToolsPage}) => {
    await openSettingsTab('Shortcuts', devToolsPage);
    await editShortcutListItem('Toggle Console', devToolsPage);

    await devToolsPage.page.keyboard.down('Control');
    await devToolsPage.page.keyboard.press('1');
    await devToolsPage.page.keyboard.up('Control');

    await clickAddShortcutLink(devToolsPage);
    await waitForEmptyShortcutInput(devToolsPage);
    await devToolsPage.page.keyboard.down('Control');
    await devToolsPage.page.keyboard.press('2');
    await devToolsPage.page.keyboard.up('Control');

    const shortcutInputsText = await shortcutInputValues(devToolsPage);
    assert.deepEqual(shortcutInputsText, CONTROL_1_CONTROL_2_SHORTCUT_INPUTS_TEXT);

    await clickShortcutDeleteButton(0, devToolsPage);
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

    const shortcuts = await shortcutsForAction('Toggle Console', devToolsPage);
    assert.deepEqual(shortcuts, CONSOLE_SHORTCUT_DISPLAY_TEXT);
  });

  it('should allow users to cancel an edit and discard their changes to shortcuts', async ({devToolsPage}) => {
    await openSettingsTab('Shortcuts', devToolsPage);
    await editShortcutListItem('Toggle Console', devToolsPage);

    await devToolsPage.page.keyboard.down('Control');
    await devToolsPage.page.keyboard.press('1');
    await devToolsPage.page.keyboard.up('Control');

    await clickAddShortcutLink(devToolsPage);
    await waitForEmptyShortcutInput(devToolsPage);
    await devToolsPage.page.keyboard.down('Control');
    await devToolsPage.page.keyboard.press('2');
    await devToolsPage.page.keyboard.up('Control');

    const shortcutInputsText = await shortcutInputValues(devToolsPage);
    assert.deepEqual(shortcutInputsText, CONTROL_1_CONTROL_2_SHORTCUT_INPUTS_TEXT);
    await clickShortcutCancelButton(devToolsPage);
    await devToolsPage.waitForNoElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);

    const shortcuts = await shortcutsForAction('Toggle Console', devToolsPage);
    assert.deepEqual(shortcuts, CONSOLE_SHORTCUT_DISPLAY_TEXT);
  });

  it('should allow users to set a multi-keypress shortcut (chord)', async ({devToolsPage}) => {
    await openSettingsTab('Shortcuts', devToolsPage);
    await editShortcutListItem('Toggle Console', devToolsPage);

    await devToolsPage.page.keyboard.down('Control');
    await devToolsPage.page.keyboard.press('1');
    await devToolsPage.page.keyboard.up('Control');
    await devToolsPage.page.keyboard.down('Control');
    await devToolsPage.page.keyboard.press('2');
    await devToolsPage.page.keyboard.up('Control');

    const shortcutInputsText = await shortcutInputValues(devToolsPage);
    assert.deepEqual(shortcutInputsText, CONTROL_1_CONTROL_2_CHORD_INPUT_TEXT);
    await clickShortcutConfirmButton(devToolsPage);
    await devToolsPage.waitForNoElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);

    const shortcuts = await shortcutsForAction('Toggle Console', devToolsPage);
    assert.deepEqual(shortcuts, CONTROL_1_CONTROL_2_CHORD_DISPLAY_TEXT);
  });

  it('should display the physical key that is pressed rather than special characters', async ({devToolsPage}) => {
    await openSettingsTab('Shortcuts', devToolsPage);
    await editShortcutListItem('Toggle Console', devToolsPage);

    await devToolsPage.page.keyboard.down('Control');
    await devToolsPage.page.keyboard.down('Alt');
    await devToolsPage.page.keyboard.press('c');
    await devToolsPage.page.keyboard.up('Alt');
    await devToolsPage.page.keyboard.up('Control');

    const shortcutInputsText = await shortcutInputValues(devToolsPage);
    assert.deepEqual(shortcutInputsText, CONTROL_ALT_C_SHORTCUT_INPUT_TEXT);
  });

  it('should allow users to set a new shortcut after the chord timeout', async ({devToolsPage}) => {
    await openSettingsTab('Shortcuts', devToolsPage);
    await editShortcutListItem('Toggle Console', devToolsPage);

    await devToolsPage.page.keyboard.down('Control');
    await devToolsPage.page.keyboard.press('1');
    await devToolsPage.page.keyboard.up('Control');
    await devToolsPage.timeout(SHORTCUT_CHORD_TIMEOUT * 1.2);
    await devToolsPage.page.keyboard.down('Control');
    await devToolsPage.page.keyboard.press('2');
    await devToolsPage.page.keyboard.up('Control');

    const shortcutInputsText = await shortcutInputValues(devToolsPage);
    assert.deepEqual(shortcutInputsText, CONTROL_2_SHORTCUT_INPUT_TEXT);
    await clickShortcutConfirmButton(devToolsPage);
    await devToolsPage.waitForNoElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);

    const shortcuts = await shortcutsForAction('Toggle Console', devToolsPage);
    assert.deepEqual(shortcuts, CONTROL_2_SHORTCUT_DISPLAY_TEXT);
  });
});
