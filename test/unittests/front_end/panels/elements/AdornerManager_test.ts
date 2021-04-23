// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as ElementsModule from '../../../../../front_end/panels/elements/elements.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';

class FakeSettingStore {
  private store: ElementsModule.AdornerManager.AdornerSetting[];

  constructor(store: ElementsModule.AdornerManager.AdornerSetting[]) {
    this.store = store;
  }

  get(): ElementsModule.AdornerManager.AdornerSetting[] {
    return this.store;
  }

  set(settings: ElementsModule.AdornerManager.AdornerSetting[]) {
    this.store = settings;
  }
}

describeWithEnvironment('AdornerManager', async () => {
  let Elements: typeof ElementsModule;

  before(async () => {
    Elements = await import('../../../../../front_end/panels/elements/elements.js');
  });

  it('can sync badge settings with the settings store correctly', () => {
    const nonexistentAdorner = '__SHOULD_NEVER_EXIST__';
    const settingStore = new FakeSettingStore([
      {
        adorner: nonexistentAdorner,
        isEnabled: true,
      },
    ]);
    const adornerManager = new Elements.AdornerManager.AdornerManager(settingStore);
    const syncedSettings = adornerManager.getSettings();
    assert.isFalse(
        syncedSettings.has(nonexistentAdorner),
        'setting-syncing should remove nonexistent adorners from setting store');

    for (const {adorner, isEnabled} of Elements.AdornerManager.DefaultAdornerSettings) {
      assert.isTrue(syncedSettings.has(adorner), 'synced settings should contain default adorners');
      assert.strictEqual(
          syncedSettings.get(adorner), isEnabled, 'synced default setting should store the correct value');
    }

    assert.sameDeepMembers(
        settingStore.get(), Elements.AdornerManager.DefaultAdornerSettings,
        'the setting store should be persisted with the updated settings');
  });

  it('can preserve persisted setting after syncing', () => {
    const {adorner, isEnabled} = Elements.AdornerManager.DefaultAdornerSettings[0];
    const updatedSetting = !isEnabled;
    const adornerManager = new Elements.AdornerManager.AdornerManager(new FakeSettingStore([
      {
        adorner,
        isEnabled: updatedSetting,
      },
    ]));
    assert.isTrue(adornerManager.getSettings().has(adorner), 'synced settings should contain existing adorners');
    assert.strictEqual(
        adornerManager.isAdornerEnabled(adorner), updatedSetting,
        'synced setting should preserve previously persisted value');
  });

  it('can update settings to be persisted', () => {
    const {adorner, isEnabled} = Elements.AdornerManager.DefaultAdornerSettings[0];
    const updatedSetting = !isEnabled;
    const settingStore = new FakeSettingStore([]);
    const adornerManager = new Elements.AdornerManager.AdornerManager(settingStore);
    adornerManager.updateSettings(new Map([
      [adorner, updatedSetting],
    ]));
    assert.isTrue(adornerManager.getSettings().has(adorner), 'badge setting should still exist after update');
    assert.strictEqual(
        adornerManager.isAdornerEnabled(adorner), updatedSetting, 'badge setting should be updated in the manager');
    assert.deepOwnInclude(
        settingStore.get(), {
          adorner,
          isEnabled: updatedSetting,
        },
        'badge setting update should be persisted to the setting store');
  });
});
