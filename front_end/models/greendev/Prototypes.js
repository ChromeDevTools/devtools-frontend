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
        const aiAnnotations = settings.createSetting('greendev-ai-annotations-enabled', false, "Local" /* Common.Settings.SettingStorageType.LOCAL */);
        const beyondStylingGemini = settings.createSetting('greendev-beyond-styling-gemini-enabled', false, "Global" /* Common.Settings.SettingStorageType.GLOBAL */);
        const beyondStylingAntigravity = settings.createSetting('greendev-beyond-styling-antigravity-enabled', false, "Global" /* Common.Settings.SettingStorageType.GLOBAL */);
        const emulationCapabilities = settings.createSetting('greendev-emulation-capabilities-enabled', false, "Local" /* Common.Settings.SettingStorageType.LOCAL */);
        return {
            aiAnnotations,
            beyondStylingGemini,
            beyondStylingAntigravity,
            emulationCapabilities
        };
    }
}
//# sourceMappingURL=Prototypes.js.map