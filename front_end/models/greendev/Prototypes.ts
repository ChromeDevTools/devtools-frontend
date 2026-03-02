// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';

let instance: Prototypes|null = null;

export interface GreenDevSettings {
  aiAnnotations: Common.Settings.Setting<boolean>;
  copyToGemini: Common.Settings.Setting<boolean>;
  breakpointDebuggerAgent: Common.Settings.Setting<boolean>;
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
    const aiAnnotations = settings.createSetting(
        'greendev-ai-annotations-enabled',
        false,
        Common.Settings.SettingStorageType.LOCAL,
    );
    const copyToGemini =
        settings.createSetting('greendev-copy-to-gemini-enabled', false, Common.Settings.SettingStorageType.LOCAL);
    const breakpointDebuggerAgent = settings.createSetting(
        'greendev-breakpoint-debugger-agent-enabled',
        false,
        Common.Settings.SettingStorageType.LOCAL,
    );

    return {aiAnnotations, copyToGemini, breakpointDebuggerAgent};
  }
}
