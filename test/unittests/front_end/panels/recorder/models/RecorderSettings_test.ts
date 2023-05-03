// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Models from '../../../../../../front_end/panels/recorder/models/models.js';
import * as Common from '../../../../../../front_end/core/common/common.js';
import {
  describeWithEnvironment,
} from '../../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';

describeWithEnvironment('RecorderSettings', () => {
  let recorderSettings: Models.RecorderSettings.RecorderSettings;

  beforeEach(() => {
    recorderSettings = new Models.RecorderSettings.RecorderSettings();
  });

  it('should have correct default values', async () => {
    assert.isTrue(recorderSettings.selectorAttribute === '');
    assert.isTrue(
        recorderSettings.speed === Models.RecordingPlayer.PlayRecordingSpeed.Normal,
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
        Common.Settings.Settings.instance().settingForTest('recorderSelectorAttribute').get(),
        value,
    );
  });

  it('should save speed attribute change', () => {
    recorderSettings.speed = Models.RecordingPlayer.PlayRecordingSpeed.ExtremelySlow;
    assert.strictEqual(
        Common.Settings.Settings.instance().settingForTest('recorderPanelReplaySpeed').get(),
        Models.RecordingPlayer.PlayRecordingSpeed.ExtremelySlow,
    );
  });

  it('should save selector type change', () => {
    const selectorType = Models.Schema.SelectorType.CSS;
    recorderSettings.setSelectorByType(selectorType, false);
    assert.isFalse(
        Common.Settings.Settings.instance().settingForTest(`recorder${selectorType}SelectorEnabled`).get(),
    );
  });
});
