// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import {createFakeSetting, describeWithLocale} from '../../../../testing/EnvironmentHelpers.js';
import {ListModel} from '../../legacy.js';

import * as QuickOpen from './quick_open.js';

function createCommandMenuProvider(inputs: string[]) {
  const setting = createFakeSetting<boolean>('test-setting', false);
  setting.setRegistration({
    settingName: 'test-setting',
    settingType: Common.SettingRegistration.SettingType.BOOLEAN,
    category: Common.SettingRegistration.SettingCategory.APPEARANCE,
    defaultValue: false,
  });
  const provider = new QuickOpen.CommandMenu.CommandMenuProvider(
      inputs.map(
          input =>
              QuickOpen.CommandMenu.CommandMenu.createSettingCommand(setting, i18n.i18n.lockedString(input), true)),
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

describeWithLocale('FilteredListWidget', () => {
  beforeEach(() => {
    sinon.reset();
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
    assert.isTrue(selectItem.notCalled);
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
