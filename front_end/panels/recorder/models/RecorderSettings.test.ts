// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import {
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';

import * as Models from './models.js';

describeWithEnvironment('RecorderSettings', () => {
  let recorderSettings: Models.RecorderSettings.RecorderSettings;

  beforeEach(() => {
    recorderSettings = new Models.RecorderSettings.RecorderSettings();
  });

  it('should have correct default values', async () => {
    assert.isTrue(recorderSettings.selectorAttribute === '');
    assert.isTrue(
        recorderSettings.speed === Models.RecordingPlayer.PlayRecordingSpeed.NORMAL,
    );
    Object.values(Models.Schema.SelectorType).forEach(type => {
      assert.isTrue(recorderSettings.getSelectorByType(type));
    });
  });

  it('should get default Title', async () => {
    const now = new Date('2022-12-01 15:30');
    const clock = sinon.useFakeTimers(now.getTime());

    assert.strictEqual(
        recorderSettings.defaultTitle,
        `Recording ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`,
    );
    clock.restore();
  });

  it('should save selector attribute change', () => {
    const value = 'custom-selector';
    recorderSettings.selectorAttribute = value;
    assert.strictEqual(
        Common.Settings.Settings.instance().settingForTest('recorder-selector-attribute').get(),
        value,
    );
  });

  it('should save speed attribute change', () => {
    recorderSettings.speed = Models.RecordingPlayer.PlayRecordingSpeed.EXTREMELY_SLOW;
    assert.strictEqual(
        Common.Settings.Settings.instance().settingForTest('recorder-panel-replay-speed').get(),
        Models.RecordingPlayer.PlayRecordingSpeed.EXTREMELY_SLOW,
    );
  });

  it('should save selector type change', () => {
    const selectorType = Models.Schema.SelectorType.CSS;
    recorderSettings.setSelectorByType(selectorType, false);
    assert.isFalse(
        Common.Settings.Settings.instance().settingForTest(`recorder-${selectorType}-selector-enabled`).get(),
    );
  });
});
