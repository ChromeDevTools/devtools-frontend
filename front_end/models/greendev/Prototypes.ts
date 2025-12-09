// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

let instance: Prototypes|null = null;

export interface GreenDevSettings {
  inDevToolsFloaty: Common.Settings.Setting<boolean>;
  inlineWidgets: Common.Settings.Setting<boolean>;
  aiAnnotations: Common.Settings.Setting<boolean>;
}

export class Prototypes {
  private constructor() {
  }

  static instance(): Prototypes {
    if (instance) {
      return instance;
    }
    instance = new Prototypes();
    return instance;
  }

  isEnabled(setting: 'inDevToolsFloaty'|'inlineWidgets'|'aiAnnotations'): boolean {
    return this.settings()[setting].get();
  }

  settings(): Readonly<GreenDevSettings> {
    const settings = Common.Settings.Settings.instance();
    const inDevToolsFloaty =
        settings.createSetting('greendev-in-devtools-floaty-enabled', false, Common.Settings.SettingStorageType.LOCAL);

    const inlineWidgets =
        settings.createSetting('greendev-inline-widgets-enabled', false, Common.Settings.SettingStorageType.LOCAL);

    const aiAnnotations = settings.createSetting(
        'greendev-ai-annotations-enabled',
        false,
        Common.Settings.SettingStorageType.LOCAL,
    );
    return {inDevToolsFloaty, inlineWidgets, aiAnnotations};
  }
}
