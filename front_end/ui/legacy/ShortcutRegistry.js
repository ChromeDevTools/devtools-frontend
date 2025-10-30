// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { getRegisteredActionExtensions } from './ActionRegistration.js';
import { Context } from './Context.js';
import { Dialog } from './Dialog.js';
import { KeyboardShortcut, Modifiers } from './KeyboardShortcut.js';
import { isEditing } from './UIUtils.js';
let shortcutRegistryInstance;
export class ShortcutRegistry {
    actionRegistry;
    actionToShortcut;
    keyMap;
    activePrefixKey;
    activePrefixTimeout;
    consumePrefix;
    devToolsDefaultShortcutActions;
    disabledDefaultShortcutsForAction;
    keybindSetSetting;
    userShortcutsSetting;
    constructor(actionRegistry) {
        this.actionRegistry = actionRegistry;
        this.actionToShortcut = new Platform.MapUtilities.Multimap();
        this.keyMap = new ShortcutTreeNode(0, 0);
        this.activePrefixKey = null;
        this.activePrefixTimeout = null;
        this.consumePrefix = null;
        this.devToolsDefaultShortcutActions = new Set();
        this.disabledDefaultShortcutsForAction = new Platform.MapUtilities.Multimap();
        this.keybindSetSetting = Common.Settings.Settings.instance().moduleSetting('active-keybind-set');
        this.keybindSetSetting.addChangeListener(event => {
            Host.userMetrics.keybindSetSettingChanged(event.data);
            this.registerBindings();
        });
        this.userShortcutsSetting = Common.Settings.Settings.instance().moduleSetting('user-shortcuts');
        this.userShortcutsSetting.addChangeListener(this.registerBindings, this);
        this.registerBindings();
    }
    static instance(opts = { forceNew: null, actionRegistry: null }) {
        const { forceNew, actionRegistry } = opts;
        if (!shortcutRegistryInstance || forceNew) {
            if (!actionRegistry) {
                throw new Error('Missing actionRegistry for shortcutRegistry');
            }
            shortcutRegistryInstance = new ShortcutRegistry(actionRegistry);
        }
        return shortcutRegistryInstance;
    }
    static removeInstance() {
        shortcutRegistryInstance = undefined;
    }
    applicableActions(key, handlers = {}) {
        let actions = [];
        const keyMap = this.activePrefixKey || this.keyMap;
        const keyNode = keyMap.getNode(key);
        if (keyNode) {
            actions = keyNode.actions();
        }
        const applicableActions = this.actionRegistry.applicableActions(actions, Context.instance());
        if (keyNode) {
            for (const actionId of Object.keys(handlers)) {
                if (keyNode.actions().indexOf(actionId) >= 0) {
                    if (this.actionRegistry.hasAction(actionId)) {
                        const action = this.actionRegistry.getAction(actionId);
                        applicableActions.push(action);
                    }
                }
            }
        }
        return applicableActions;
    }
    shortcutsForAction(action) {
        return [...this.actionToShortcut.get(action)];
    }
    actionsForDescriptors(descriptors) {
        let keyMapNode = this.keyMap;
        for (const { key } of descriptors) {
            if (!keyMapNode) {
                return [];
            }
            keyMapNode = keyMapNode.getNode(key);
        }
        return keyMapNode ? keyMapNode.actions() : [];
    }
    globalShortcutKeys() {
        const keys = [];
        for (const node of this.keyMap.chords().values()) {
            const actions = node.actions();
            const applicableActions = this.actionRegistry.applicableActions(actions, Context.instance());
            if (applicableActions.length || node.hasChords()) {
                keys.push(node.key());
            }
        }
        return keys;
    }
    keysForAction(actionId) {
        const keys = [...this.actionToShortcut.get(actionId)].flatMap(shortcut => shortcut.descriptors.map(descriptor => descriptor.key));
        return keys;
    }
    shortcutTitleForAction(actionId) {
        for (const shortcut of this.actionToShortcut.get(actionId)) {
            return shortcut.title();
        }
        return undefined;
    }
    keyAndModifiersForAction(actionId) {
        for (const keys of this.keysForAction(actionId)) {
            const { keyCode, modifiers } = KeyboardShortcut.keyCodeAndModifiersFromKey(keys);
            const key = KeyboardShortcut.keyCodeToKey(keyCode);
            if (key) {
                return { key, modifier: KeyboardShortcut.modifierValueToModifier(modifiers) || Modifiers.None };
            }
        }
        return undefined;
    }
    // DevTools and Chrome modifier values do not match, see latter here: crsrc.org/c/ui/events/event_constants.h;l=24
    devToolsToChromeModifier(devToolsModifier) {
        return devToolsModifier.value * 2;
    }
    handleShortcut(event, handlers) {
        void this.handleKey(KeyboardShortcut.makeKeyFromEvent(event), event.key, event, handlers);
    }
    actionHasDefaultShortcut(actionId) {
        return this.devToolsDefaultShortcutActions.has(actionId);
    }
    getShortcutListener(handlers) {
        const shortcuts = Object.keys(handlers).flatMap(action => [...this.actionToShortcut.get(action)]);
        // We only want keys for these specific actions to get handled this
        // way; all others should be allowed to bubble up.
        const allowlistKeyMap = new ShortcutTreeNode(0, 0);
        shortcuts.forEach(shortcut => {
            allowlistKeyMap.addKeyMapping(shortcut.descriptors.map(descriptor => descriptor.key), shortcut.action);
        });
        return (event) => {
            const key = KeyboardShortcut.makeKeyFromEvent(event);
            const keyMap = this.activePrefixKey ? allowlistKeyMap.getNode(this.activePrefixKey.key()) : allowlistKeyMap;
            if (!keyMap) {
                return;
            }
            if (keyMap.getNode(key)) {
                this.handleShortcut(event, handlers);
            }
        };
    }
    addShortcutListener(element, handlers) {
        const listener = this.getShortcutListener(handlers);
        element.addEventListener('keydown', listener);
        return listener;
    }
    async handleKey(key, domKey, event, handlers) {
        const keyModifiers = key >> 8;
        const hasHandlersOrPrefixKey = Boolean(handlers) || Boolean(this.activePrefixKey);
        const keyMapNode = this.keyMap.getNode(key);
        const actions = this.applicableActions(key, handlers);
        const maybeHasActions = actions.length > 0 || (keyMapNode?.hasChords());
        if ((!hasHandlersOrPrefixKey && isPossiblyInputKey()) || !maybeHasActions ||
            KeyboardShortcut.isModifier(KeyboardShortcut.keyCodeAndModifiersFromKey(key).keyCode)) {
            return;
        }
        if (event) {
            event.consume(true);
        }
        // We allow the use of Ctrl/Meta+Plus/Minus/0 even when a modal dialog is open,
        // so that users are able to zoom in and out even while for example the Settings
        // dialog is shown.
        const DIALOG_ALLOWED_ACTION_IDS = ['main.zoom-in', 'main.zoom-out', 'main.zoom-reset'];
        if (!hasHandlersOrPrefixKey && Dialog.hasInstance() &&
            (actions.length !== 1 || !DIALOG_ALLOWED_ACTION_IDS.includes(actions[0].id()))) {
            return;
        }
        if (this.activePrefixTimeout) {
            clearTimeout(this.activePrefixTimeout);
            const handled = await maybeExecuteActionForKey.call(this, event);
            this.activePrefixKey = null;
            this.activePrefixTimeout = null;
            if (handled) {
                return;
            }
            if (this.consumePrefix) {
                await this.consumePrefix();
            }
        }
        if (keyMapNode?.hasChords()) {
            this.activePrefixKey = keyMapNode;
            this.consumePrefix = async () => {
                this.activePrefixKey = null;
                this.activePrefixTimeout = null;
                await maybeExecuteActionForKey.call(this, event);
            };
            this.activePrefixTimeout = window.setTimeout(this.consumePrefix, KeyTimeout);
        }
        else {
            await maybeExecuteActionForKey.call(this, event);
        }
        function isPossiblyInputKey() {
            if (!event || !isEditing() || /^F\d+|Control|Shift|Alt|Meta|Escape|Win|U\+001B$/.test(domKey)) {
                return false;
            }
            if (!keyModifiers) {
                return true;
            }
            const modifiers = Modifiers;
            // Undo/Redo will also cause input, so textual undo should take precedence over DevTools undo when editing.
            if (Host.Platform.isMac()) {
                if (KeyboardShortcut.makeKey('z', modifiers.Meta.value) === key) {
                    return true;
                }
                if (KeyboardShortcut.makeKey('z', modifiers.Meta.value | modifiers.Shift.value) === key) {
                    return true;
                }
            }
            else {
                if (KeyboardShortcut.makeKey('z', modifiers.Ctrl.value) === key) {
                    return true;
                }
                if (KeyboardShortcut.makeKey('y', modifiers.Ctrl.value) === key) {
                    return true;
                }
                if (!Host.Platform.isWin() &&
                    KeyboardShortcut.makeKey('z', modifiers.Ctrl.value | modifiers.Shift.value) === key) {
                    return true;
                }
            }
            if ((keyModifiers & (modifiers.Ctrl.value | modifiers.Alt.value)) ===
                (modifiers.Ctrl.value | modifiers.Alt.value)) {
                return Host.Platform.isWin();
            }
            return !hasModifier(modifiers.Ctrl.value) && !hasModifier(modifiers.Alt.value) &&
                !hasModifier(modifiers.Meta.value);
        }
        function hasModifier(mod) {
            return Boolean(keyModifiers & mod);
        }
        /**
         * ;
         */
        async function maybeExecuteActionForKey(event) {
            const actions = this.applicableActions(key, handlers);
            if (!actions.length) {
                return false;
            }
            for (const action of actions) {
                let handled;
                if (event) {
                    void VisualLogging.logKeyDown(null, event, action.id());
                }
                if (handlers?.[action.id()]) {
                    handled = await handlers[action.id()]();
                }
                if (!handlers) {
                    handled = await action.execute();
                }
                if (handled) {
                    Host.userMetrics.keyboardShortcutFired(action.id());
                    return true;
                }
            }
            return false;
        }
    }
    registerUserShortcut(shortcut) {
        for (const otherShortcut of this.disabledDefaultShortcutsForAction.get(shortcut.action)) {
            if (otherShortcut.descriptorsMatch(shortcut.descriptors) &&
                otherShortcut.hasKeybindSet(this.keybindSetSetting.get())) {
                // this user shortcut is the same as a disabled default shortcut,
                // so we should just enable the default
                this.removeShortcut(otherShortcut);
                return;
            }
        }
        for (const otherShortcut of this.actionToShortcut.get(shortcut.action)) {
            if (otherShortcut.descriptorsMatch(shortcut.descriptors)) {
                // don't allow duplicate shortcuts
                return;
            }
        }
        this.addShortcutToSetting(shortcut);
    }
    removeShortcut(shortcut) {
        if (shortcut.type === "DefaultShortcut" /* Type.DEFAULT_SHORTCUT */ || shortcut.type === "KeybindSetShortcut" /* Type.KEYBIND_SET_SHORTCUT */) {
            this.addShortcutToSetting(shortcut.changeType("DisabledDefault" /* Type.DISABLED_DEFAULT */));
        }
        else {
            this.removeShortcutFromSetting(shortcut);
        }
    }
    disabledDefaultsForAction(actionId) {
        return this.disabledDefaultShortcutsForAction.get(actionId);
    }
    addShortcutToSetting(shortcut) {
        const userShortcuts = this.userShortcutsSetting.get();
        userShortcuts.push(shortcut);
        this.userShortcutsSetting.set(userShortcuts);
    }
    removeShortcutFromSetting(shortcut) {
        const userShortcuts = this.userShortcutsSetting.get();
        const index = userShortcuts.findIndex(shortcut.equals, shortcut);
        if (index !== -1) {
            userShortcuts.splice(index, 1);
            this.userShortcutsSetting.set(userShortcuts);
        }
    }
    registerShortcut(shortcut) {
        this.actionToShortcut.set(shortcut.action, shortcut);
        this.keyMap.addKeyMapping(shortcut.descriptors.map(descriptor => descriptor.key), shortcut.action);
    }
    registerBindings() {
        this.actionToShortcut.clear();
        this.keyMap.clear();
        const keybindSet = this.keybindSetSetting.get();
        this.disabledDefaultShortcutsForAction.clear();
        this.devToolsDefaultShortcutActions.clear();
        const forwardedKeys = [];
        const userShortcuts = this.userShortcutsSetting.get();
        for (const userShortcut of userShortcuts) {
            const shortcut = KeyboardShortcut.createShortcutFromSettingObject(userShortcut);
            if (shortcut.type === "DisabledDefault" /* Type.DISABLED_DEFAULT */) {
                this.disabledDefaultShortcutsForAction.set(shortcut.action, shortcut);
            }
            else {
                if (ForwardedActions.has(shortcut.action)) {
                    forwardedKeys.push(...shortcut.descriptors.map(descriptor => KeyboardShortcut.keyCodeAndModifiersFromKey(descriptor.key)));
                }
                this.registerShortcut(shortcut);
            }
        }
        for (const actionExtension of getRegisteredActionExtensions()) {
            const actionId = actionExtension.id();
            const bindings = actionExtension.bindings();
            for (let i = 0; bindings && i < bindings.length; ++i) {
                const keybindSets = bindings[i].keybindSets;
                if (!platformMatches(bindings[i].platform) || !keybindSetsMatch(keybindSets)) {
                    continue;
                }
                const keys = bindings[i].shortcut.split(/\s+/);
                const shortcutDescriptors = keys.map(KeyboardShortcut.makeDescriptorFromBindingShortcut);
                if (shortcutDescriptors.length > 0) {
                    if (this.isDisabledDefault(shortcutDescriptors, actionId)) {
                        this.devToolsDefaultShortcutActions.add(actionId);
                        continue;
                    }
                    if (ForwardedActions.has(actionId)) {
                        forwardedKeys.push(...shortcutDescriptors.map(shortcut => KeyboardShortcut.keyCodeAndModifiersFromKey(shortcut.key)));
                    }
                    if (!keybindSets) {
                        this.devToolsDefaultShortcutActions.add(actionId);
                        this.registerShortcut(new KeyboardShortcut(shortcutDescriptors, actionId, "DefaultShortcut" /* Type.DEFAULT_SHORTCUT */));
                    }
                    else {
                        if (keybindSets.includes("devToolsDefault" /* KeybindSet.DEVTOOLS_DEFAULT */)) {
                            this.devToolsDefaultShortcutActions.add(actionId);
                        }
                        this.registerShortcut(new KeyboardShortcut(shortcutDescriptors, actionId, "KeybindSetShortcut" /* Type.KEYBIND_SET_SHORTCUT */, new Set(keybindSets)));
                    }
                }
            }
        }
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.setWhitelistedShortcuts(JSON.stringify(forwardedKeys));
        function platformMatches(platformsString) {
            if (!platformsString) {
                return true;
            }
            const platforms = platformsString.split(',');
            let isMatch = false;
            const currentPlatform = Host.Platform.platform();
            for (let i = 0; !isMatch && i < platforms.length; ++i) {
                isMatch = platforms[i] === currentPlatform;
            }
            return isMatch;
        }
        function keybindSetsMatch(keybindSets) {
            if (!keybindSets) {
                return true;
            }
            return keybindSets.includes(keybindSet);
        }
    }
    isDisabledDefault(shortcutDescriptors, action) {
        const disabledDefaults = this.disabledDefaultShortcutsForAction.get(action);
        for (const disabledDefault of disabledDefaults) {
            if (disabledDefault.descriptorsMatch(shortcutDescriptors)) {
                return true;
            }
        }
        return false;
    }
}
export class ShortcutTreeNode {
    #key;
    #actions;
    #chords;
    depth;
    constructor(key, depth = 0) {
        this.#key = key;
        this.#actions = [];
        this.#chords = new Map();
        this.depth = depth;
    }
    addAction(action) {
        this.#actions.push(action);
    }
    key() {
        return this.#key;
    }
    chords() {
        return this.#chords;
    }
    hasChords() {
        return this.#chords.size > 0;
    }
    addKeyMapping(keys, action) {
        if (keys.length < this.depth) {
            return;
        }
        if (keys.length === this.depth) {
            this.addAction(action);
        }
        else {
            const key = keys[this.depth];
            if (!this.#chords.has(key)) {
                this.#chords.set(key, new ShortcutTreeNode(key, this.depth + 1));
            }
            this.#chords.get(key).addKeyMapping(keys, action);
        }
    }
    getNode(key) {
        return this.#chords.get(key) || null;
    }
    actions() {
        return this.#actions;
    }
    clear() {
        this.#actions = [];
        this.#chords = new Map();
    }
}
export class ForwardedShortcut {
    static instance = new ForwardedShortcut();
}
export const ForwardedActions = new Set([
    'main.toggle-dock',
    'debugger.toggle-breakpoints-active',
    'debugger.toggle-pause',
    'quick-open.show-command-menu',
    'console.toggle',
]);
export const KeyTimeout = 1000;
export const DefaultShortcutSetting = 'devToolsDefault';
//# sourceMappingURL=ShortcutRegistry.js.map