// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Common from '../../core/common/common.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import type * as UI from '../../ui/legacy/legacy.js';

import * as Settings from './settings.js';

describeWithEnvironment('FrameworkIgnoreListSettingsTab', () => {
  setupSettingsHooks();

  let tab: Settings.FrameworkIgnoreListSettingsTab.FrameworkIgnoreListSettingsTab;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '600px';
    container.style.height = '600px';
    container.style.position = 'relative';
    renderElementIntoDOM(container, {includeCommonStyles: true});
    tab = new Settings.FrameworkIgnoreListSettingsTab.FrameworkIgnoreListSettingsTab();
    tab.element.style.position = 'relative';
    tab.element.style.width = '100%';
    tab.element.style.height = '100%';
    tab.markAsRoot();
    tab.show(container);
  });

  it('renders settings checkboxes correctly according to setting state', () => {
    const shadowRoot = tab.element.shadowRoot;
    assert.exists(shadowRoot);

    const enableCheckbox =
        shadowRoot.querySelector<UI.UIUtils.CheckboxLabel>('.enable-ignore-listing devtools-checkbox');
    assert.exists(enableCheckbox);
    assert.isTrue(enableCheckbox.checked);  // default is true

    const generalCheckboxes =
        shadowRoot.querySelectorAll<UI.UIUtils.CheckboxLabel>('.general-exclusion-group devtools-checkbox');
    assert.lengthOf(generalCheckboxes, 3);

    // skip-content-scripts: default true
    assert.isTrue(generalCheckboxes[0].checked);
    // automatically-ignore-list-known-third-party-scripts: default true
    assert.isTrue(generalCheckboxes[1].checked);
    // skip-anonymous-scripts: default false
    assert.isFalse(generalCheckboxes[2].checked);
  });

  it('updates setting values when checkboxes are clicked', () => {
    const shadowRoot = tab.element.shadowRoot;
    assert.exists(shadowRoot);

    const generalCheckboxes =
        shadowRoot.querySelectorAll<UI.UIUtils.CheckboxLabel>('.general-exclusion-group devtools-checkbox');

    // Toggle skip-content-scripts (default true -> false)
    const checkboxInput0 = generalCheckboxes[0].shadowRoot?.querySelector('input');
    assert.exists(checkboxInput0);
    checkboxInput0.click();
    assert.isFalse(Common.Settings.Settings.instance().moduleSetting('skip-content-scripts').get());

    // Toggle skip-anonymous-scripts (default false -> true)
    const checkboxInput1 = generalCheckboxes[2].shadowRoot?.querySelector('input');
    assert.exists(checkboxInput1);
    checkboxInput1.click();
    assert.isTrue(Common.Settings.Settings.instance().moduleSetting('skip-anonymous-scripts').get());
  });

  it('updates checkbox state when settings are changed programmatically', () => {
    const shadowRoot = tab.element.shadowRoot;
    assert.exists(shadowRoot);

    const generalCheckboxes =
        shadowRoot.querySelectorAll<UI.UIUtils.CheckboxLabel>('.general-exclusion-group devtools-checkbox');

    Common.Settings.Settings.instance().moduleSetting('skip-content-scripts').set(false);
    assert.isFalse(generalCheckboxes[0].checked);

    Common.Settings.Settings.instance().moduleSetting('skip-anonymous-scripts').set(true);
    assert.isTrue(generalCheckboxes[2].checked);
  });

  it('disables other settings when ignore listing is disabled', () => {
    const shadowRoot = tab.element.shadowRoot;
    assert.exists(shadowRoot);

    const enableCheckbox =
        shadowRoot.querySelector<UI.UIUtils.CheckboxLabel>('.enable-ignore-listing devtools-checkbox');
    assert.exists(enableCheckbox);
    const generalCheckboxes =
        shadowRoot.querySelectorAll<UI.UIUtils.CheckboxLabel>('.general-exclusion-group devtools-checkbox');
    const addPatternButton = shadowRoot.querySelector<HTMLButtonElement>('.add-button');
    assert.exists(addPatternButton);

    // Initially all enabled
    assert.isFalse(generalCheckboxes[0].disabled);
    assert.isFalse(generalCheckboxes[1].disabled);
    assert.isFalse(generalCheckboxes[2].disabled);
    assert.isFalse(addPatternButton.disabled);

    // Disable global ignore listing
    assert.exists(enableCheckbox.shadowRoot);
    const enableInput = enableCheckbox.shadowRoot.querySelector('input');
    assert.exists(enableInput);
    enableInput.click();

    // Check all are disabled
    assert.isTrue(generalCheckboxes[0].disabled);
    assert.isTrue(generalCheckboxes[1].disabled);
    assert.isTrue(generalCheckboxes[2].disabled);
    assert.isTrue(addPatternButton.disabled);
  });

  it('renders ignore-list items and updates settings when toggled', () => {
    const regexSetting =
        Common.Settings.Settings.instance().moduleSetting('skip-stack-frames-pattern') as Common.Settings.RegExpSetting;
    regexSetting.setAsArray([
      {pattern: 'pattern1', disabled: false},
      {pattern: 'pattern2', disabled: true},
    ]);

    const shadowRoot = tab.element.shadowRoot;
    assert.exists(shadowRoot);

    const listWidgetElement = shadowRoot.querySelector('.ignore-list');
    assert.exists(listWidgetElement);
    const listWidgetShadowRoot = listWidgetElement.shadowRoot;
    assert.exists(listWidgetShadowRoot);

    const items =
        listWidgetShadowRoot.querySelectorAll<UI.UIUtils.CheckboxLabel>('.ignore-list-item devtools-checkbox');
    assert.lengthOf(items, 2);

    assert.strictEqual(items[0].getLabelText(), 'pattern1');
    assert.isTrue(items[0].checked);  // !disabled => checked = true

    assert.strictEqual(items[1].getLabelText(), 'pattern2');
    assert.isFalse(items[1].checked);  // disabled => checked = false

    // Toggle first pattern (checked true -> false)
    const firstCheckboxInput = items[0].shadowRoot?.querySelector('input');
    assert.exists(firstCheckboxInput);
    firstCheckboxInput.click();

    const updatedPatterns = regexSetting.getAsArray();
    assert.lengthOf(updatedPatterns, 2);
    assert.strictEqual(updatedPatterns[0].pattern, 'pattern1');
    assert.isTrue(updatedPatterns[0].disabled);
    assert.strictEqual(updatedPatterns[1].pattern, 'pattern2');
    assert.isTrue(updatedPatterns[1].disabled);
  });

  it('removes custom regex rules', () => {
    const regexSetting =
        Common.Settings.Settings.instance().moduleSetting('skip-stack-frames-pattern') as Common.Settings.RegExpSetting;
    regexSetting.setAsArray([
      {pattern: 'pattern1', disabled: false},
      {pattern: 'pattern2', disabled: true},
    ]);

    const shadowRoot = tab.element.shadowRoot;
    assert.exists(shadowRoot);

    const listWidgetElement = shadowRoot.querySelector('.ignore-list');
    assert.exists(listWidgetElement);
    const listWidgetShadowRoot = listWidgetElement.shadowRoot;
    assert.exists(listWidgetShadowRoot);

    const listItems = listWidgetShadowRoot.querySelectorAll('.list-item');
    assert.lengthOf(listItems, 2);

    const firstItem = listItems[0];
    const removeButton = firstItem.querySelectorAll('devtools-button')[1];
    assert.exists(removeButton);

    removeButton.click();

    assert.deepEqual(regexSetting.getAsArray(), [
      {pattern: 'pattern2', disabled: true},
    ]);
  });

  it('adds custom regex rules', () => {
    const regexSetting =
        Common.Settings.Settings.instance().moduleSetting('skip-stack-frames-pattern') as Common.Settings.RegExpSetting;
    regexSetting.setAsArray([]);

    const shadowRoot = tab.element.shadowRoot;
    assert.exists(shadowRoot);

    const addPatternButton = shadowRoot.querySelector<HTMLButtonElement>('.add-button');
    assert.exists(addPatternButton);
    addPatternButton.click();

    const listWidgetElement = shadowRoot.querySelector('.ignore-list');
    assert.exists(listWidgetElement);
    const listWidgetShadowRoot = listWidgetElement.shadowRoot;
    assert.exists(listWidgetShadowRoot);

    const editorContainer = listWidgetShadowRoot.querySelector('.editor-container');
    assert.exists(editorContainer);

    const input = editorContainer.querySelector<HTMLInputElement>('input[type="text"]');
    assert.exists(input);
    input.value = 'new-pattern';
    input.dispatchEvent(new Event('input'));

    const commitButton = editorContainer.querySelector<HTMLElement>('.editor-buttons devtools-button:nth-child(2)');
    assert.exists(commitButton);
    commitButton.dispatchEvent(new Event('click'));

    assert.deepEqual(regexSetting.getAsArray(), [
      {pattern: 'new-pattern', disabled: false},
    ]);
  });

  it('shows validation errors for invalid rules', () => {
    const regexSetting =
        Common.Settings.Settings.instance().moduleSetting('skip-stack-frames-pattern') as Common.Settings.RegExpSetting;
    regexSetting.setAsArray([
      {pattern: 'duplicate-pattern', disabled: false},
    ]);

    const shadowRoot = tab.element.shadowRoot;
    assert.exists(shadowRoot);

    const addPatternButton = shadowRoot.querySelector<HTMLButtonElement>('.add-button');
    assert.exists(addPatternButton);
    addPatternButton.click();

    const listWidgetElement = shadowRoot.querySelector('.ignore-list');
    assert.exists(listWidgetElement);
    const listWidgetShadowRoot = listWidgetElement.shadowRoot;
    assert.exists(listWidgetShadowRoot);

    const editorContainer = listWidgetShadowRoot.querySelector('.editor-container');
    assert.exists(editorContainer);
    const input = editorContainer.querySelector<HTMLInputElement>('input[type="text"]');
    assert.exists(input);
    const commitButton = editorContainer.querySelector<HTMLElement>('.editor-buttons devtools-button:nth-child(2)');
    assert.exists(commitButton);
    const errorContainer = editorContainer.querySelector<HTMLElement>('.list-widget-input-validation-error');
    assert.exists(errorContainer);

    // Test 1: Empty pattern
    input.value = '   ';
    input.dispatchEvent(new Event('input'));
    commitButton.dispatchEvent(new Event('click'));
    assert.strictEqual(errorContainer.textContent, 'Rule can’t be empty');

    // Test 2: Duplicate pattern
    input.value = 'duplicate-pattern';
    input.dispatchEvent(new Event('input'));
    commitButton.dispatchEvent(new Event('click'));
    assert.strictEqual(errorContainer.textContent, 'Rule already exists');

    // Test 3: Invalid regex pattern
    input.value = '[';
    input.dispatchEvent(new Event('input'));
    commitButton.dispatchEvent(new Event('click'));
    assert.strictEqual(errorContainer.textContent, 'Rule must be a valid regular expression');
  });

  it('renders ignore list tab screenshot', async () => {
    const regexSetting =
        Common.Settings.Settings.instance().moduleSetting('skip-stack-frames-pattern') as Common.Settings.RegExpSetting;
    regexSetting.setAsArray([
      {pattern: 'pattern1', disabled: false},
      {pattern: 'pattern2', disabled: true},
    ]);

    await assertScreenshot('settings/framework_ignore_list_settings_tab.png');
  });

  it('renders ignore list tab screenshot when ignore listing is disabled', async () => {
    const regexSetting =
        Common.Settings.Settings.instance().moduleSetting('skip-stack-frames-pattern') as Common.Settings.RegExpSetting;
    regexSetting.setAsArray([
      {pattern: 'pattern1', disabled: false},
      {pattern: 'pattern2', disabled: true},
    ]);

    Common.Settings.Settings.instance().moduleSetting('enable-ignore-listing').set(false);

    await assertScreenshot('settings/framework_ignore_list_settings_tab_disabled.png');
  });

  it('renders ignore list tab screenshot in edit mode with error', async () => {
    const shadowRoot = tab.element.shadowRoot;
    assert.exists(shadowRoot);

    const addPatternButton = shadowRoot.querySelector<HTMLButtonElement>('.add-button');
    assert.exists(addPatternButton);
    addPatternButton.click();

    const listWidgetElement = shadowRoot.querySelector('.ignore-list');
    assert.exists(listWidgetElement);
    const listWidgetShadowRoot = listWidgetElement.shadowRoot;
    assert.exists(listWidgetShadowRoot);
    const editorContainer = listWidgetShadowRoot.querySelector('.editor-container');
    assert.exists(editorContainer);
    const input = editorContainer.querySelector<HTMLInputElement>('input[type="text"]');
    assert.exists(input);
    const commitButton = editorContainer.querySelector<HTMLElement>('.editor-buttons devtools-button:nth-child(2)');
    assert.exists(commitButton);

    // Trigger validation error
    input.value = '   ';
    input.dispatchEvent(new Event('input'));
    commitButton.dispatchEvent(new Event('click'));

    await assertScreenshot('settings/framework_ignore_list_settings_tab_edit_error.png');
  });
});
