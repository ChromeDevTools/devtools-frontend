// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getBrowserAndPages,
  timeout,
  waitFor,
  waitForFunction,
  waitForNoElementsWithTextContent,
} from '../../shared/helper.js';

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
  it('should update when the shortcuts preset is changed ', async () => {
    await openSettingsTab('Shortcuts');
    await selectKeyboardShortcutPreset('vsCode');

    await waitForVSCodeShortcutPreset();

    const shortcutsShortcuts = await shortcutsForAction('Show Shortcuts');
    const settingsShortcuts = await shortcutsForAction('Settings');
    const pauseShortcuts = await shortcutsForAction('Pause script execution');
    assert.deepStrictEqual(shortcutsShortcuts, VS_CODE_SHORTCUTS_SHORTCUTS);
    assert.deepStrictEqual(settingsShortcuts, VS_CODE_SETTINGS_SHORTCUTS);
    assert.deepStrictEqual(pauseShortcuts, VS_CODE_PAUSE_SHORTCUTS);
  });

  it('should apply new shortcuts when the preset is changed', async () => {
    const {frontend} = getBrowserAndPages();
    await openSettingsTab('Shortcuts');
    await selectKeyboardShortcutPreset('vsCode');

    await waitForVSCodeShortcutPreset();

    // close the settings dialog
    await frontend.keyboard.press('Escape');

    // use a newly-enabled shortcut to open the command menu
    await frontend.keyboard.press('F1');
    await waitFor(QUICK_OPEN_SELECTOR);

    // make sure the command menu reflects the new shortcuts
    await frontend.keyboard.type('Show Shortcuts');
    const shortcutsItemText = await getSelectedItemText();

    assert.strictEqual(shortcutsItemText, VS_CODE_SHORTCUTS_QUICK_OPEN_TEXT);
  });

  it('should allow users to open the shortcut editor and view the current shortcut', async () => {
    await openSettingsTab('Shortcuts');
    await editShortcutListItem('Toggle Console');

    const shortcutInputsText = await shortcutInputValues();
    assert.deepStrictEqual(shortcutInputsText, CONSOLE_SHORTCUT_INPUT_TEXT);
  });

  it('should allow users to open the shortcut editor and change and add shortcuts', async () => {
    const {frontend} = getBrowserAndPages();

    await openSettingsTab('Shortcuts');
    await editShortcutListItem('Toggle Console');

    await frontend.keyboard.down('Control');
    await frontend.keyboard.press('1');
    await frontend.keyboard.up('Control');

    await clickAddShortcutLink();
    await waitForEmptyShortcutInput();
    await frontend.keyboard.down('Control');
    await frontend.keyboard.press('2');
    await frontend.keyboard.up('Control');

    const shortcutInputsText = await shortcutInputValues();
    assert.deepStrictEqual(shortcutInputsText, CONTROL_1_CONTROL_2_SHORTCUT_INPUTS_TEXT);
    await clickShortcutConfirmButton();
    await waitForNoElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);

    const shortcuts = await shortcutsForAction('Toggle Console');
    assert.deepStrictEqual(shortcuts, CONTROL_1_CONTROL_2_SHORTCUT_DISPLAY_TEXT);
  });

  it('should allow users to open shortcut editor and change and reset shortcuts', async () => {
    const {frontend} = getBrowserAndPages();

    await openSettingsTab('Shortcuts');
    const defaultShortcuts = await shortcutsForAction('Start recording events');

    await editShortcutListItem('Start recording events');

    await frontend.keyboard.down('Control');
    await frontend.keyboard.press('1');
    await frontend.keyboard.up('Control');

    await clickAddShortcutLink();
    await waitForEmptyShortcutInput();
    await frontend.keyboard.down('Control');
    await frontend.keyboard.press('2');
    await frontend.keyboard.up('Control');

    await clickShortcutConfirmButton();
    await waitForNoElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);

    const modifiedShortcuts = await shortcutsForAction('Start recording events');
    assert.deepStrictEqual(modifiedShortcuts, CONTROL_1_CONTROL_2_SHORTCUT_DISPLAY_TEXT);

    await editShortcutListItem('Start recording events');
    await clickShortcutResetButton();

    await clickShortcutConfirmButton();
    await waitForNoElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);

    const shortcuts = await shortcutsForAction('Start recording events');
    assert.deepStrictEqual(shortcuts, defaultShortcuts, 'Default shortcuts weren\'t restored correctly');
  });

  it('should allow users to open the shortcut editor and delete and reset shortcuts', async () => {
    const {frontend} = getBrowserAndPages();

    await openSettingsTab('Shortcuts');
    await editShortcutListItem('Toggle Console');

    await frontend.keyboard.down('Control');
    await frontend.keyboard.press('1');
    await frontend.keyboard.up('Control');

    await clickAddShortcutLink();
    await waitForEmptyShortcutInput();
    await frontend.keyboard.down('Control');
    await frontend.keyboard.press('2');
    await frontend.keyboard.up('Control');

    const shortcutInputsText = await shortcutInputValues();
    assert.deepStrictEqual(shortcutInputsText, CONTROL_1_CONTROL_2_SHORTCUT_INPUTS_TEXT);

    await clickShortcutDeleteButton(0);
    let shortcutInputTextAfterDeletion;
    await waitForFunction(async () => {
      shortcutInputTextAfterDeletion = await shortcutInputValues();
      return shortcutInputTextAfterDeletion.length === 1;
    });
    assert.deepStrictEqual(shortcutInputTextAfterDeletion, CONTROL_2_SHORTCUT_INPUT_TEXT);

    await clickShortcutResetButton();
    const shortcutInputTextAfterReset = await shortcutInputValues();
    assert.deepStrictEqual(shortcutInputTextAfterReset, CONSOLE_SHORTCUT_INPUT_TEXT);

    await clickShortcutConfirmButton();
    await waitForNoElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);

    const shortcuts = await shortcutsForAction('Toggle Console');
    assert.deepStrictEqual(shortcuts, CONSOLE_SHORTCUT_DISPLAY_TEXT);
  });

  it('should allow users to cancel an edit and discard their changes to shortcuts', async () => {
    const {frontend} = getBrowserAndPages();

    await openSettingsTab('Shortcuts');
    await editShortcutListItem('Toggle Console');

    await frontend.keyboard.down('Control');
    await frontend.keyboard.press('1');
    await frontend.keyboard.up('Control');

    await clickAddShortcutLink();
    await waitForEmptyShortcutInput();
    await frontend.keyboard.down('Control');
    await frontend.keyboard.press('2');
    await frontend.keyboard.up('Control');

    const shortcutInputsText = await shortcutInputValues();
    assert.deepStrictEqual(shortcutInputsText, CONTROL_1_CONTROL_2_SHORTCUT_INPUTS_TEXT);
    await clickShortcutCancelButton();
    await waitForNoElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);

    const shortcuts = await shortcutsForAction('Toggle Console');
    assert.deepStrictEqual(shortcuts, CONSOLE_SHORTCUT_DISPLAY_TEXT);
  });

  it('should allow users to set a multi-keypress shortcut (chord)', async () => {
    const {frontend} = getBrowserAndPages();

    await openSettingsTab('Shortcuts');
    await editShortcutListItem('Toggle Console');

    await frontend.keyboard.down('Control');
    await frontend.keyboard.press('1');
    await frontend.keyboard.up('Control');
    await frontend.keyboard.down('Control');
    await frontend.keyboard.press('2');
    await frontend.keyboard.up('Control');

    const shortcutInputsText = await shortcutInputValues();
    assert.deepStrictEqual(shortcutInputsText, CONTROL_1_CONTROL_2_CHORD_INPUT_TEXT);
    await clickShortcutConfirmButton();
    await waitForNoElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);

    const shortcuts = await shortcutsForAction('Toggle Console');
    assert.deepStrictEqual(shortcuts, CONTROL_1_CONTROL_2_CHORD_DISPLAY_TEXT);
  });

  it('should display the physical key that is pressed rather than special characters', async () => {
    const {frontend} = getBrowserAndPages();

    await openSettingsTab('Shortcuts');
    await editShortcutListItem('Toggle Console');

    await frontend.keyboard.down('Control');
    await frontend.keyboard.down('Alt');
    await frontend.keyboard.press('c');
    await frontend.keyboard.up('Alt');
    await frontend.keyboard.up('Control');

    const shortcutInputsText = await shortcutInputValues();
    assert.deepStrictEqual(shortcutInputsText, CONTROL_ALT_C_SHORTCUT_INPUT_TEXT);
  });

  describe('[slow test]', function() {
    this.timeout(10000);

    it('should allow users to set a new shortcut after the chord timeout', async function() {
      const {frontend} = getBrowserAndPages();

      await openSettingsTab('Shortcuts');
      await editShortcutListItem('Toggle Console');

      await frontend.keyboard.down('Control');
      await frontend.keyboard.press('1');
      await frontend.keyboard.up('Control');
      await timeout(SHORTCUT_CHORD_TIMEOUT * 1.2);
      await frontend.keyboard.down('Control');
      await frontend.keyboard.press('2');
      await frontend.keyboard.up('Control');

      const shortcutInputsText = await shortcutInputValues();
      assert.deepStrictEqual(shortcutInputsText, CONTROL_2_SHORTCUT_INPUT_TEXT);
      await clickShortcutConfirmButton();
      await waitForNoElementsWithTextContent(ADD_SHORTCUT_LINK_TEXT);

      const shortcuts = await shortcutsForAction('Toggle Console');
      assert.deepStrictEqual(shortcuts, CONTROL_2_SHORTCUT_DISPLAY_TEXT);
    });
  });
});
