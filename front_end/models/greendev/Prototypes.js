// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
let instance = null;
export class Prototypes {
    constructor() {
    }
    static instance() {
        if (instance) {
            return instance;
        }
        instance = new Prototypes();
        return instance;
    }
    isEnabled(setting) {
        return this.settings()[setting].get();
    }
    settings() {
        const settings = Common.Settings.Settings.instance();
        const inDevToolsFloaty = settings.createSetting('greendev-in-devtools-floaty-enabled', false, "Local" /* Common.Settings.SettingStorageType.LOCAL */);
        const inlineWidgets = settings.createSetting('greendev-inline-widgets-enabled', false, "Local" /* Common.Settings.SettingStorageType.LOCAL */);
        const aiAnnotations = settings.createSetting('greendev-ai-annotations-enabled', false, "Local" /* Common.Settings.SettingStorageType.LOCAL */);
        return { inDevToolsFloaty, inlineWidgets, aiAnnotations };
    }
}
//# sourceMappingURL=Prototypes.js.map