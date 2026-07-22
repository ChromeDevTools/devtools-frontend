// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
const registeredSettings = new Map();
export function register(settingDescriptor, settingUIDescriptor) {
    const settingName = settingDescriptor.name;
    if (registeredSettings.has(settingName)) {
        throw new Error(`Duplicate setting name '${settingName}'`);
    }
    registeredSettings.set(settingName, { descriptor: settingDescriptor, uiDescriptor: settingUIDescriptor });
}
export function getRegisteredSettings() {
    const combined = new Map();
    for (const legacy of Common.SettingRegistration.getRegisteredSettings()) {
        combined.set(legacy.settingName, {
            descriptor: {
                name: legacy.settingName,
                type: legacy.settingType,
                defaultValue: legacy.defaultValue,
                storageType: legacy.storageType,
            },
            uiDescriptor: {
                category: legacy.category,
                order: legacy.order,
                title: legacy.title,
                tags: legacy.tags,
                options: legacy.options,
                reloadRequired: legacy.reloadRequired,
                deprecationNotice: legacy.deprecationNotice,
                learnMore: legacy.learnMore,
            },
        });
    }
    for (const [name, registeredUI] of registeredSettings) {
        combined.set(name, registeredUI);
    }
    return Array.from(combined.values());
}
export function maybeResolve(settingDescriptor) {
    const settingUI = registeredSettings.get(settingDescriptor.name) ??
        getRegisteredSettings().find(registered => registered.descriptor.name === settingDescriptor.name);
    return settingUI?.uiDescriptor ?? null;
}
export function resolve(settingDescriptor) {
    const uiDescriptor = maybeResolve(settingDescriptor);
    if (!uiDescriptor) {
        throw new Error(`No UI descriptor registered for setting '${settingDescriptor.name}'`);
    }
    return uiDescriptor;
}
export function resetSettings() {
    registeredSettings.clear();
}
//# sourceMappingURL=SettingUIRegistration.js.map