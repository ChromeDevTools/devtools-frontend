// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import {renderElementIntoDOM, setColorScheme} from '../../../../testing/DOMHelpers.js';
import {createFakeSetting} from '../../../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../../../testing/LocaleHelpers.js';
import * as SettingsUI from '../../../settings/settings.js';
import {ListModel} from '../../legacy.js';

import * as QuickOpen from './quick_open.js';

function createCommandMenuProvider(inputs: string[]) {
  const setting = createFakeSetting<boolean>('test-setting', false);
  const settingUI = new SettingsUI.SettingUIRegistration.SettingUI({
    category: Common.SettingRegistration.SettingCategory.APPEARANCE,
  });
  const provider = new QuickOpen.CommandMenu.CommandMenuProvider(
      inputs.map(input => QuickOpen.CommandMenu.CommandMenu.createSettingCommand(setting, i18n.i18n.lockedString(input),
                                                                                 true, settingUI)),
  );
  return provider;
}

async function testMatch(inputs: string[], query: string, expectedSelection: number, expectedMatches: number[]) {
  const provider = createCommandMenuProvider(inputs);
  const selectItem = sinon.spy(provider, 'selectItem');
  const listModelReplaceAll = sinon.spy(ListModel.ListModel.prototype, 'replaceAll');
  const history: string[] = [];
  const filteredListWidget = new QuickOpen.FilteredListWidget.FilteredListWidget(provider, history, () => undefined);
  await filteredListWidget.setQuery(query);
  // FilteredListWidget.scheduleFilter uses setTimeout.
  await new Promise(resolve => window.setTimeout(resolve, 0));
  const keyboardEvent = new KeyboardEvent('keydown', {key: 'Enter'});
  filteredListWidget.contentElement.dispatchEvent(keyboardEvent);
  assert.deepEqual([query], history);
  assert.strictEqual(1, selectItem.callCount);
  assert.strictEqual(expectedSelection, selectItem.lastCall.args[0]);
  assert.deepEqual(expectedMatches, listModelReplaceAll.lastCall.args[0]);
}

describe('FilteredListWidget', () => {
  setupLocaleHooks();
  beforeEach(() => {
    sinon.reset();
  });

  describe('focus indicator', () => {
    afterEach(() => setColorScheme('light'));

    for (const theme of ['light', 'dark'] as const) {
      it(`has at least 3:1 contrast in the ${theme} theme`, async () => {
        setColorScheme(theme);
        const provider = createCommandMenuProvider(['first setting', 'second setting']);
        sinon.stub(provider, 'attach');
        const widget = new QuickOpen.FilteredListWidget.FilteredListWidget(provider, [], () => undefined);
        renderElementIntoDOM(widget, {width: 400, height: 200});
        // Match the surface of the dialog that contains Quick Open.
        widget.contentElement.style.backgroundColor = 'var(--sys-color-cdt-base-container)';
        await widget.setQuery('');
        await new Promise(resolve => window.setTimeout(resolve, 0));

        const outsideInput = document.createElement('input');
        renderElementIntoDOM(outsideInput, {allowMultipleChildren: true});
        outsideInput.focus();
        const selected = widget.contentElement.querySelector('.filtered-list-widget-item.selected');
        const unselected = widget.contentElement.querySelector('.filtered-list-widget-item:not(.selected)');
        assert.exists(selected);
        assert.exists(unselected);
        assert.strictEqual(getComputedStyle(selected).outlineStyle, 'none');
        widget.focus();
        assert.isTrue(widget.contentElement.matches(':focus-within'));
        const style = getComputedStyle(selected);
        assert.strictEqual(style.outlineStyle, 'solid');
        assert.strictEqual(style.outlineWidth, '2px');
        assert.strictEqual(style.outlineOffset, '-2px');
        assert.strictEqual(getComputedStyle(unselected).outlineStyle, 'none');

        const outline = Common.Color.parse(style.outlineColor);
        const surface = Common.Color.parse(getComputedStyle(widget.contentElement).backgroundColor);
        const selection = Common.Color.parse(style.backgroundColor);
        assert.exists(outline);
        assert.exists(surface);
        assert.exists(selection);
        const surfaceRGBA = surface.asLegacyColor().rgba();
        const selectionRGBA = Common.ColorUtils.blendColors(selection.asLegacyColor().rgba(), surfaceRGBA);
        for (const background of [surfaceRGBA, selectionRGBA]) {
          assert.isAtLeast(Common.ColorUtils.contrastRatio(outline.asLegacyColor().rgba(), background), 3);
        }

        widget.contentElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
        assert.isFalse(selected.classList.contains('selected'));
        assert.isTrue(unselected.classList.contains('selected'));
        assert.strictEqual(getComputedStyle(selected).outlineStyle, 'none');
        assert.strictEqual(getComputedStyle(unselected).outlineStyle, 'solid');

        outsideInput.focus();
        assert.isTrue(unselected.classList.contains('selected'));
        assert.strictEqual(getComputedStyle(unselected).outlineStyle, 'none');
      });
    }
  });

  it('set query to select item and type Enter', async () => {
    const provider = createCommandMenuProvider([
      'first setting',
      'second setting',
      'third setting',
    ]);
    const selectItem = sinon.spy(provider, 'selectItem');
    let callCount = 0;

    async function testSetting(query: string, expectation: number) {
      const filteredListWidget = new QuickOpen.FilteredListWidget.FilteredListWidget(provider, [], () => undefined);
      await filteredListWidget.setQuery(query);
      // FilteredListWidget.scheduleFilter uses setTimeout.
      await new Promise(resolve => window.setTimeout(resolve, 0));
      const keyboardEvent = new KeyboardEvent('keydown', {key: 'Enter'});
      filteredListWidget.contentElement.dispatchEvent(keyboardEvent);
      assert.strictEqual(++callCount, selectItem.callCount);
      assert.strictEqual(expectation, selectItem.lastCall.args[0]);
    }

    await testSetting('third', 2);
    await testSetting('second', 1);
    await testSetting('first', 0);
  });

  it('type Enter when no item has been selected', () => {
    const provider = createCommandMenuProvider([
      'setting a',
      'setting b',
      'setting c',
    ]);
    const selectItem = sinon.spy(provider, 'selectItem');
    const filteredListWidget = new QuickOpen.FilteredListWidget.FilteredListWidget(provider, [], () => undefined);
    const keyboardEvent = new KeyboardEvent('keydown', {key: 'Enter'});
    filteredListWidget.contentElement.dispatchEvent(keyboardEvent);
    sinon.assert.notCalled(selectItem);
  });

  it('empty query matches everything', async () => {
    await testMatch(['a', 'bc'], '', 0, [0, 1]);
  });

  it('case-insensitive matching: upper case', async () => {
    await testMatch(['abc', 'acB'], 'aB', 0, [0, 1]);
  });

  it('case-insensitive matching: lower case', async () => {
    await testMatch(['abc', 'bac', 'a_B'], 'ab', 0, [0, 2]);
  });

  it('duplicate symbols in matching', async () => {
    await testMatch(['abab', 'abaa', 'caab', 'baac', 'fooaab'], 'aab', 2, [2, 4, 0]);
  });

  it('ranking by score', async () => {
    await testMatch(['fxxxoxxxo', 'barforo', 'foobar', 'fxoxoxo'], 'foo', 2, [2, 1, 0, 3]);
  });

  it('dangerous input escaping', async () => {
    await testMatch(['^[]{}()\\.$*+?|', '0123456789abcdef'], '^[]{}()\\.$*+?|', 0, [0]);
  });

});
