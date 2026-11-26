// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const registeredSettings = new Map();
const orderValuesBySettingCategory = new Map();
export function register(settingDescriptor, settingUIDescriptor) {
    const settingName = settingDescriptor.name;
    if (registeredSettings.has(settingName)) {
        throw new Error(`Duplicate setting name '${settingName}'`);
    }
    const { category, order } = settingUIDescriptor;
    if (category && typeof order === 'number') {
        let orderValues = orderValuesBySettingCategory.get(category);
        if (!orderValues) {
            orderValues = new Set();
            orderValuesBySettingCategory.set(category, orderValues);
        }
        if (orderValues.has(order)) {
            throw new Error(`Duplicate order value '${order}' for settings category '${category}'`);
        }
        orderValues.add(order);
    }
    registeredSettings.set(settingName, { descriptor: settingDescriptor, uiDescriptor: settingUIDescriptor });
}
export function getRegisteredSettings() {
    return Array.from(registeredSettings.values());
}
export class SettingUI {
    #raw;
    constructor(raw) {
        this.#raw = raw;
    }
    get title() {
        return this.#raw.title?.() ?? '';
    }
    get category() {
        return this.#raw.category ?? null;
    }
    get order() {
        return this.#raw.order ?? null;
    }
    get tags() {
        return this.#raw.tags ? this.#raw.tags.map(tag => tag()).join('\0') : '';
    }
    get options() {
        return this.#raw.options?.map(opt => ({
            value: opt.value,
            title: opt.title(),
            text: typeof opt.text === 'function' ? opt.text() : opt.text,
            raw: opt.raw,
        })) ??
            [];
    }
    get reloadRequired() {
        return Boolean(this.#raw.reloadRequired);
    }
    get learnMore() {
        return this.#raw.learnMore ?? null;
    }
}
export function maybeResolve(settingDescriptor) {
    const settingUI = registeredSettings.get(settingDescriptor.name);
    return settingUI ? new SettingUI(settingUI.uiDescriptor) : null;
}
export function resolve(settingDescriptor) {
    const ui = maybeResolve(settingDescriptor);
    if (!ui) {
        throw new Error(`No UI descriptor registered for setting '${settingDescriptor.name}'`);
    }
    return ui;
}
export function resetSettings() {
    orderValuesBySettingCategory.clear();
    registeredSettings.clear();
}
//# sourceMappingURL=SettingUIRegistration.js.map