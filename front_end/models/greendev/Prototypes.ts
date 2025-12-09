// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';

let instance: Prototypes|null = null;

export interface GreenDevSettings {
  inDevToolsFloaty: Common.Settings.Setting<boolean>;
  inlineWidgets: Common.Settings.Setting<boolean>;
  artifactViewer: Common.Settings.Setting<boolean>;
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

  /**
   * Returns true if the specific setting is turned on AND the GreenDev flag is enabled
   */
  isEnabled(setting: keyof GreenDevSettings): boolean {
    const greendevFlagEnabled = Boolean(Root.Runtime.hostConfig.devToolsGreenDevUi?.enabled);

    return greendevFlagEnabled && this.settings()[setting].get();
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

    const artifactViewer =
        settings.createSetting('greendev-artifact-viewer-enabled', false, Common.Settings.SettingStorageType.LOCAL);
    return {inDevToolsFloaty, inlineWidgets, aiAnnotations, artifactViewer};
  }
}
