// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as Emulation from './emulation.js';
import * as UI from '../../ui/legacy/legacy.js';
import {
  deinitializeGlobalVars,
  initializeGlobalVars,
} from '../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../test/unittests/front_end/helpers/MockConnection.js';

describeWithMockConnection('AdvancedApp', () => {
  beforeEach(async () => {
    await deinitializeGlobalVars();
    Common.Settings.registerSettingsForTest([{
      category: Common.Settings.SettingCategory.GLOBAL,
      settingName: 'currentDockState',
      settingType: Common.Settings.SettingType.ENUM,
      defaultValue: 'right',
      options: [
        {
          value: 'right',
          text: () => 'right' as Platform.UIString.LocalizedString,
          title: () => 'Dock to right' as Platform.UIString.LocalizedString,
          raw: false,
        },
        {
          value: 'bottom',
          text: () => 'bottom' as Platform.UIString.LocalizedString,
          title: () => 'Dock to bottom' as Platform.UIString.LocalizedString,
          raw: false,
        },
        {
          value: 'left',
          text: () => 'left' as Platform.UIString.LocalizedString,
          title: () => 'Dock to left' as Platform.UIString.LocalizedString,
          raw: false,
        },
        {
          value: 'undocked',
          text: () => 'undocked' as Platform.UIString.LocalizedString,
          title: () => 'Undock' as Platform.UIString.LocalizedString,
          raw: false,
        },
      ],
    }]);
    await initializeGlobalVars({reset: false});
  });

  afterEach(async () => {
    await deinitializeGlobalVars();
  });

  it('updates colors node link on ColorThemeChanged', async () => {
    const advancedApp = Emulation.AdvancedApp.AdvancedApp.instance();
    Platform.assertNotNullOrUndefined(advancedApp);

    const fetchColorsSpy = sinon.spy(UI.Utils.DynamicTheming, 'fetchColors');

    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.dispatchEventToListeners(
        Host.InspectorFrontendHostAPI.Events.ColorThemeChanged);

    assert.isTrue(fetchColorsSpy.called);
  });
});
