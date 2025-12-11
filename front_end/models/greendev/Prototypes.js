// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
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
    /**
     * Returns true if the specific setting is turned on AND the GreenDev flag is enabled
     */
    isEnabled(setting) {
        const greendevFlagEnabled = Boolean(Root.Runtime.hostConfig.devToolsGreenDevUi?.enabled);
        return greendevFlagEnabled && this.settings()[setting].get();
    }
    settings() {
        const settings = Common.Settings.Settings.instance();
        const inDevToolsFloaty = settings.createSetting('greendev-in-devtools-floaty-enabled', false, "Local" /* Common.Settings.SettingStorageType.LOCAL */);
        const inlineWidgets = settings.createSetting('greendev-inline-widgets-enabled', false, "Local" /* Common.Settings.SettingStorageType.LOCAL */);
        const aiAnnotations = settings.createSetting('greendev-ai-annotations-enabled', false, "Local" /* Common.Settings.SettingStorageType.LOCAL */);
        const artifactViewer = settings.createSetting('greendev-artifact-viewer-enabled', false, "Local" /* Common.Settings.SettingStorageType.LOCAL */);
        return { inDevToolsFloaty, inlineWidgets, aiAnnotations, artifactViewer };
    }
}
//# sourceMappingURL=Prototypes.js.map