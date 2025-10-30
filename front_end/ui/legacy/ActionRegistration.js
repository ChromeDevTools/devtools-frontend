// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import { Context } from './Context.js';
const UIStrings = {
    /**
     * @description Title of the keybind category 'Elements' in Settings' Shortcuts pannel.
     */
    elements: 'Elements',
    /**
     * @description Title of the keybind category 'Screenshot' in Settings' Shortcuts pannel.
     */
    screenshot: 'Screenshot',
    /**
     * @description Title of the keybind category 'Network' in Settings' Shortcuts pannel.
     */
    network: 'Network',
    /**
     * @description Title of the keybind category 'Memory' in Settings' Shortcuts pannel.
     */
    memory: 'Memory',
    /**
     * @description Title of the keybind category 'JavaScript Profiler' in Settings' Shortcuts pannel.
     */
    javascript_profiler: 'JavaScript Profiler',
    /**
     * @description Title of the keybind category 'Console' in Settings' Shortcuts pannel.
     */
    console: 'Console',
    /**
     * @description Title of the keybind category 'Performance' in Settings' Shortcuts pannel.
     */
    performance: 'Performance',
    /**
     * @description Title of the keybind category 'Mobile' in Settings' Shortcuts pannel.
     */
    mobile: 'Mobile',
    /**
     * @description Title of the keybind category 'Help' in Settings' Shortcuts pannel.
     */
    help: 'Help',
    /**
     * @description Title of the keybind category 'Layers' in Settings' Shortcuts pannel.
     */
    layers: 'Layers',
    /**
     * @description Title of the keybind category 'Navigation' in Settings' Shortcuts pannel.
     */
    navigation: 'Navigation',
    /**
     * @description Title of the keybind category 'Drawer' in Settings' Shortcuts pannel.
     */
    drawer: 'Drawer',
    /**
     * @description Title of the keybind category 'Global' in Settings' Shortcuts pannel.
     */
    global: 'Global',
    /**
     * @description Title of the keybind category 'Resources' in Settings' Shortcuts pannel.
     */
    resources: 'Resources',
    /**
     * @description Title of the keybind category 'Background Services' in Settings' Shortcuts pannel.
     */
    background_services: 'Background Services',
    /**
     * @description Title of the keybind category 'Settings' in Settings' Shortcuts pannel.
     */
    settings: 'Settings',
    /**
     * @description Title of the keybind category 'Debugger' in Settings' Shortcuts pannel.
     */
    debugger: 'Debugger',
    /**
     * @description Title of the keybind category 'Sources' in Settings' Shortcuts pannel.
     */
    sources: 'Sources',
    /**
     * @description Title of the keybind category 'Rendering' in Settings' Shortcuts pannel.
     */
    rendering: 'Rendering',
    /**
     * @description Title of the keybind category 'Recorder' in Settings' Shortcuts pannel.
     */
    recorder: 'Recorder',
    /**
     * @description Title of the keybind category 'Changes' in Settings' Shortcuts pannel.
     */
    changes: 'Changes',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/ActionRegistration.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class Action extends Common.ObjectWrapper.ObjectWrapper {
    #enabled = true;
    #toggled = false;
    actionRegistration;
    constructor(actionRegistration) {
        super();
        this.actionRegistration = actionRegistration;
    }
    id() {
        return this.actionRegistration.actionId;
    }
    async execute(opts) {
        if (!this.actionRegistration.loadActionDelegate) {
            return false;
        }
        const delegate = await this.actionRegistration.loadActionDelegate();
        const actionId = this.id();
        return delegate.handleAction(Context.instance(), actionId, opts);
    }
    icon() {
        return this.actionRegistration.iconClass;
    }
    toggledIcon() {
        return this.actionRegistration.toggledIconClass;
    }
    toggleWithRedColor() {
        return Boolean(this.actionRegistration.toggleWithRedColor);
    }
    setEnabled(enabled) {
        if (this.#enabled === enabled) {
            return;
        }
        this.#enabled = enabled;
        this.dispatchEventToListeners("Enabled" /* Events.ENABLED */, enabled);
    }
    enabled() {
        return this.#enabled;
    }
    category() {
        return this.actionRegistration.category;
    }
    tags() {
        if (this.actionRegistration.tags) {
            // Get localized keys and separate by null character to prevent fuzzy matching from matching across them.
            return this.actionRegistration.tags.map(tag => tag()).join('\0');
        }
    }
    toggleable() {
        return Boolean(this.actionRegistration.toggleable);
    }
    title() {
        let title = this.actionRegistration.title ? this.actionRegistration.title() : i18n.i18n.lockedString('');
        const options = this.actionRegistration.options;
        if (options) {
            // Actions with an 'options' property don't have a title field. Instead, the displayed
            // title is taken from the 'title' property of the option that is not active. Only one of the
            // two options can be active at a given moment and the 'toggled' property of the action along
            // with the 'value' of the options are used to determine which one it is.
            for (const pair of options) {
                if (pair.value !== this.#toggled) {
                    title = pair.title();
                }
            }
        }
        return title;
    }
    toggled() {
        return this.#toggled;
    }
    setToggled(toggled) {
        console.assert(this.toggleable(), 'Shouldn\'t be toggling an untoggleable action', this.id());
        if (this.#toggled === toggled) {
            return;
        }
        this.#toggled = toggled;
        this.dispatchEventToListeners("Toggled" /* Events.TOGGLED */, toggled);
    }
    options() {
        return this.actionRegistration.options;
    }
    contextTypes() {
        if (this.actionRegistration.contextTypes) {
            return this.actionRegistration.contextTypes();
        }
        return undefined;
    }
    canInstantiate() {
        return Boolean(this.actionRegistration.loadActionDelegate);
    }
    bindings() {
        return this.actionRegistration.bindings;
    }
    experiment() {
        return this.actionRegistration.experiment;
    }
    featurePromotionId() {
        return this.actionRegistration.featurePromotionId;
    }
    setting() {
        return this.actionRegistration.setting;
    }
    condition() {
        return this.actionRegistration.condition;
    }
    order() {
        return this.actionRegistration.order;
    }
}
const registeredActions = new Map();
export function registerActionExtension(registration) {
    const actionId = registration.actionId;
    if (registeredActions.has(actionId)) {
        throw new Error(`Duplicate action ID '${actionId}'`);
    }
    if (!Platform.StringUtilities.isExtendedKebabCase(actionId)) {
        throw new Error(`Invalid action ID '${actionId}'`);
    }
    registeredActions.set(actionId, new Action(registration));
}
export function reset() {
    registeredActions.clear();
}
export function getRegisteredActionExtensions() {
    return Array.from(registeredActions.values())
        .filter(action => {
        const settingName = action.setting();
        try {
            if (settingName && !Common.Settings.moduleSetting(settingName).get()) {
                return false;
            }
        }
        catch (err) {
            if (err.message.startsWith('No setting registered')) {
                return false;
            }
        }
        return Root.Runtime.Runtime.isDescriptorEnabled({
            experiment: action.experiment(),
            condition: action.condition(),
        });
    })
        .sort((firstAction, secondAction) => {
        const order1 = firstAction.order() || 0;
        const order2 = secondAction.order() || 0;
        return order1 - order2;
    });
}
export function maybeRemoveActionExtension(actionId) {
    return registeredActions.delete(actionId);
}
export function getLocalizedActionCategory(category) {
    switch (category) {
        case "ELEMENTS" /* ActionCategory.ELEMENTS */:
            return i18nString(UIStrings.elements);
        case "SCREENSHOT" /* ActionCategory.SCREENSHOT */:
            return i18nString(UIStrings.screenshot);
        case "NETWORK" /* ActionCategory.NETWORK */:
            return i18nString(UIStrings.network);
        case "MEMORY" /* ActionCategory.MEMORY */:
            return i18nString(UIStrings.memory);
        case "JAVASCRIPT_PROFILER" /* ActionCategory.JAVASCRIPT_PROFILER */:
            return i18nString(UIStrings.javascript_profiler);
        case "CONSOLE" /* ActionCategory.CONSOLE */:
            return i18nString(UIStrings.console);
        case "PERFORMANCE" /* ActionCategory.PERFORMANCE */:
            return i18nString(UIStrings.performance);
        case "MOBILE" /* ActionCategory.MOBILE */:
            return i18nString(UIStrings.mobile);
        case "HELP" /* ActionCategory.HELP */:
            return i18nString(UIStrings.help);
        case "LAYERS" /* ActionCategory.LAYERS */:
            return i18nString(UIStrings.layers);
        case "NAVIGATION" /* ActionCategory.NAVIGATION */:
            return i18nString(UIStrings.navigation);
        case "DRAWER" /* ActionCategory.DRAWER */:
            return i18nString(UIStrings.drawer);
        case "GLOBAL" /* ActionCategory.GLOBAL */:
            return i18nString(UIStrings.global);
        case "RESOURCES" /* ActionCategory.RESOURCES */:
            return i18nString(UIStrings.resources);
        case "BACKGROUND_SERVICES" /* ActionCategory.BACKGROUND_SERVICES */:
            return i18nString(UIStrings.background_services);
        case "SETTINGS" /* ActionCategory.SETTINGS */:
            return i18nString(UIStrings.settings);
        case "DEBUGGER" /* ActionCategory.DEBUGGER */:
            return i18nString(UIStrings.debugger);
        case "SOURCES" /* ActionCategory.SOURCES */:
            return i18nString(UIStrings.sources);
        case "RENDERING" /* ActionCategory.RENDERING */:
            return i18nString(UIStrings.rendering);
        case "RECORDER" /* ActionCategory.RECORDER */:
            return i18nString(UIStrings.recorder);
        case "CHANGES" /* ActionCategory.CHANGES */:
            return i18nString(UIStrings.changes);
        case "" /* ActionCategory.NONE */:
            return i18n.i18n.lockedString('');
    }
    // Not all categories are cleanly typed yet. Return the category as-is in this case.
    return i18n.i18n.lockedString(category);
}
//# sourceMappingURL=ActionRegistration.js.map