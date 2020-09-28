// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';

import {Action} from './Action.js';                  // eslint-disable-line no-unused-vars
import {ActionRegistry} from './ActionRegistry.js';  // eslint-disable-line no-unused-vars
import {Context} from './Context.js';
import {Dialog} from './Dialog.js';
import {Descriptor, KeyboardShortcut, Modifiers, Type} from './KeyboardShortcut.js';  // eslint-disable-line no-unused-vars
import {isEditing} from './UIUtils.js';

/** @type {!ShortcutRegistry} */
let shortcutRegistryInstance;

export class ShortcutRegistry {
  /**
   * @param {!ActionRegistry} actionRegistry
   */
  constructor(actionRegistry) {
    this._actionRegistry = actionRegistry;
    /** @type {!Platform.Multimap.<string, !KeyboardShortcut>} */
    this._actionToShortcut = new Platform.Multimap();
    this._keyMap = new ShortcutTreeNode(0, 0);
    /** @type {?ShortcutTreeNode} */
    this._activePrefixKey = null;
    /** @type {?number} */
    this._activePrefixTimeout = null;
    /** @type {?function():Promise<void>} */
    this._consumePrefix = null;
    /** @type {!Set.<string>} */
    this._devToolsDefaultShortcutActions = new Set();
    /** @type {!Platform.Multimap.<string, !KeyboardShortcut>} */
    this._disabledDefaultShortcutsForAction = new Platform.Multimap();
    this._keybindSetSetting = Common.Settings.Settings.instance().moduleSetting('activeKeybindSet');
    if (!Root.Runtime.experiments.isEnabled('customKeyboardShortcuts') &&
        this._keybindSetSetting.get() !== DefaultShortcutSetting) {
      this._keybindSetSetting.set(DefaultShortcutSetting);
    }
    this._keybindSetSetting.addChangeListener(event => {
      Host.userMetrics.keybindSetSettingChanged(event.data);
      this._registerBindings();
    });
    this._userShortcutsSetting = Common.Settings.Settings.instance().moduleSetting('userShortcuts');
    this._userShortcutsSetting.addChangeListener(this._registerBindings, this);

    this._registerBindings();
  }

  /**
   * @param {{forceNew: ?boolean, actionRegistry: ?ActionRegistry}} opts
   */
  static instance(opts = {forceNew: null, actionRegistry: null}) {
    const {forceNew, actionRegistry} = opts;
    if (!shortcutRegistryInstance || forceNew) {
      if (!actionRegistry) {
        throw new Error('Missing actionRegistry for shortcutRegistry');
      }
      shortcutRegistryInstance = new ShortcutRegistry(actionRegistry);
    }

    return shortcutRegistryInstance;
  }

  /**
   * @param {number} key
   * @param {!Object.<string, function():Promise.<boolean>>=} handlers
   * @return {!Array.<!Action>}
   */
  _applicableActions(key, handlers = {}) {
    let actions = [];
    const keyMap = this._activePrefixKey || this._keyMap;
    const keyNode = keyMap.getNode(key);
    if (keyNode) {
      actions = keyNode.actions();
    }
    const applicableActions = this._actionRegistry.applicableActions(actions, Context.instance());
    if (keyNode) {
      for (const actionId of Object.keys(handlers)) {
        if (keyNode.actions().indexOf(actionId) >= 0) {
          const action = this._actionRegistry.action(actionId);
          if (action) {
            applicableActions.push(action);
          }
        }
      }
    }
    return applicableActions;
  }

  /**
   * @param {string} action
   * @return {!Array.<!KeyboardShortcut>}
   */
  shortcutsForAction(action) {
    return [...this._actionToShortcut.get(action)];
  }

  /**
   * @param {!Array.<!Descriptor>} descriptors
   */
  actionsForDescriptors(descriptors) {
    let keyMapNode = this._keyMap;
    for (const {key} of descriptors) {
      if (!keyMapNode) {
        return [];
      }
      keyMapNode = keyMapNode.getNode(key);
    }
    return keyMapNode ? keyMapNode.actions() : [];
  }

  /**
   * @return {!Array<number>}
   */
  globalShortcutKeys() {
    const keys = [];
    for (const node of this._keyMap.chords().values()) {
      const actions = node.actions();
      const applicableActions = this._actionRegistry.applicableActions(actions, Context.instance());
      if (applicableActions.length || node.hasChords()) {
        keys.push(node.key());
      }
    }
    return keys;
  }

  /**
   * @deprecated this function is obsolete and will be removed in the
   * future along with the legacy shortcuts settings tab
   * crbug.com/174309
   *
   * @param {string} actionId
   * @return {!Array.<!Descriptor>}
   */
  shortcutDescriptorsForAction(actionId) {
    return [...this._actionToShortcut.get(actionId)].map(shortcut => shortcut.descriptors[0]);
  }

  /**
   * @param {!Array.<string>} actionIds
   * @return {!Array.<number>}
   */
  keysForActions(actionIds) {
    const keys = actionIds.flatMap(
        action => [...this._actionToShortcut.get(action)].flatMap(
            shortcut => shortcut.descriptors.map(descriptor => descriptor.key)));
    return [...(new Set(keys))];
  }

  /**
   * @param {string} actionId
   * @return {string|undefined}
   */
  shortcutTitleForAction(actionId) {
    const shortcuts = this._actionToShortcut.get(actionId);
    if (shortcuts.size) {
      return shortcuts.firstValue().title();
    }
  }

  /**
   * @param {!KeyboardEvent} event
   * @param {!Object.<string, function():Promise.<boolean>>=} handlers
   */
  handleShortcut(event, handlers) {
    this.handleKey(KeyboardShortcut.makeKeyFromEvent(event), event.key, event, handlers);
  }

  /**
   * @param {string} actionId
   * return {boolean}
   */
  actionHasDefaultShortcut(actionId) {
    return this._devToolsDefaultShortcutActions.has(actionId);
  }

  /**
   * @param {!Element} element
   * @param {!Object.<string, function():Promise.<boolean>>} handlers
   */
  addShortcutListener(element, handlers) {
    // We only want keys for these specific actions to get handled this
    // way; all others should be allowed to bubble up.
    const allowlistKeyMap = new ShortcutTreeNode(0, 0);
    const shortcuts = Object.keys(handlers).flatMap(action => [...this._actionToShortcut.get(action)]);
    shortcuts.forEach(shortcut => {
      allowlistKeyMap.addKeyMapping(shortcut.descriptors.map(descriptor => descriptor.key), shortcut.action);
    });

    element.addEventListener('keydown', event => {
      const key = KeyboardShortcut.makeKeyFromEvent(/** @type {!KeyboardEvent} */ (event));
      let keyMap = allowlistKeyMap;
      if (this._activePrefixKey) {
        keyMap = keyMap.getNode(this._activePrefixKey.key());
        if (!keyMap) {
          return;
        }
      }
      if (keyMap.getNode(key)) {
        this.handleShortcut(/** @type {!KeyboardEvent} */ (event), handlers);
      }
    });
  }

  /**
   * @param {number} key
   * @param {string} domKey
   * @param {!KeyboardEvent=} event
   * @param {!Object.<string, function():Promise.<boolean>>=} handlers
   */
  async handleKey(key, domKey, event, handlers) {
    const keyModifiers = key >> 8;
    const hasHandlersOrPrefixKey = !!handlers || !!this._activePrefixKey;
    const keyMapNode = this._keyMap.getNode(key);
    const maybeHasActions = this._applicableActions(key, handlers).length > 0 || (keyMapNode && keyMapNode.hasChords());
    if ((!hasHandlersOrPrefixKey && isPossiblyInputKey()) || !maybeHasActions ||
        KeyboardShortcut.isModifier(KeyboardShortcut.keyCodeAndModifiersFromKey(key).keyCode)) {
      return;
    }
    if (event) {
      event.consume(true);
    }
    if (!hasHandlersOrPrefixKey && Dialog.hasInstance()) {
      return;
    }

    if (this._activePrefixTimeout) {
      clearTimeout(this._activePrefixTimeout);
      const handled = await maybeExecuteActionForKey.call(this);
      this._activePrefixKey = null;
      this._activePrefixTimeout = null;
      if (handled) {
        return;
      }
      if (this._consumePrefix) {
        await this._consumePrefix();
      }
    }
    if (keyMapNode && keyMapNode.hasChords()) {
      this._activePrefixKey = keyMapNode;
      this._consumePrefix = async () => {
        this._activePrefixKey = null;
        this._activePrefixTimeout = null;
        await maybeExecuteActionForKey.call(this);
      };
      this._activePrefixTimeout = setTimeout(this._consumePrefix, KeyTimeout);
    } else {
      await maybeExecuteActionForKey.call(this);
    }

    /**
     * @return {boolean}
     */
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
        if (KeyboardShortcut.makeKey('z', modifiers.Meta) === key) {
          return true;
        }
        if (KeyboardShortcut.makeKey('z', modifiers.Meta | modifiers.Shift) === key) {
          return true;
        }
      } else {
        if (KeyboardShortcut.makeKey('z', modifiers.Ctrl) === key) {
          return true;
        }
        if (KeyboardShortcut.makeKey('y', modifiers.Ctrl) === key) {
          return true;
        }
        if (!Host.Platform.isWin() && KeyboardShortcut.makeKey('z', modifiers.Ctrl | modifiers.Shift) === key) {
          return true;
        }
      }

      if ((keyModifiers & (modifiers.Ctrl | modifiers.Alt)) === (modifiers.Ctrl | modifiers.Alt)) {
        return Host.Platform.isWin();
      }

      return !hasModifier(modifiers.Ctrl) && !hasModifier(modifiers.Alt) && !hasModifier(modifiers.Meta);
    }

    /**
     * @param {number} mod
     * @return {boolean}
     */
    function hasModifier(mod) {
      return !!(keyModifiers & mod);
    }

    /**
   * @return {!Promise.<boolean>};
   * @this {!ShortcutRegistry}
   */
    async function maybeExecuteActionForKey() {
      const actions = this._applicableActions(key, handlers);
      if (!actions.length) {
        return false;
      }
      for (const action of actions) {
        let handled;
        if (handlers && handlers[action.id()]) {
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

  /**
   * @param {!KeyboardShortcut} shortcut
   */
  registerUserShortcut(shortcut) {
    for (const otherShortcut of this._disabledDefaultShortcutsForAction.get(shortcut.action)) {
      if (otherShortcut.descriptorsMatch(shortcut.descriptors) &&
          otherShortcut.hasKeybindSet(this._keybindSetSetting.get())) {
        // this user shortcut is the same as a disabled default shortcut,
        // so we should just enable the default
        this.removeShortcut(otherShortcut);
        return;
      }
    }
    for (const otherShortcut of this._actionToShortcut.get(shortcut.action)) {
      if (otherShortcut.descriptorsMatch(shortcut.descriptors) &&
          otherShortcut.hasKeybindSet(this._keybindSetSetting.get())) {
        // don't allow duplicate shortcuts
        return;
      }
    }
    this._addShortcutToSetting(shortcut);
  }

  /**
    * @param {!KeyboardShortcut} shortcut
    */
  removeShortcut(shortcut) {
    if (shortcut.type === Type.DefaultShortcut || shortcut.type === Type.KeybindSetShortcut) {
      this._addShortcutToSetting(shortcut.changeType(Type.DisabledDefault));
    } else {
      this._removeShortcutFromSetting(shortcut);
    }
  }

  /**
   * @param {!KeyboardShortcut} shortcut
   */
  _addShortcutToSetting(shortcut) {
    const userShortcuts = this._userShortcutsSetting.get();
    userShortcuts.push(shortcut);
    this._userShortcutsSetting.set(userShortcuts);
  }

  /**
   * @param {!KeyboardShortcut} shortcut
   */
  _removeShortcutFromSetting(shortcut) {
    const userShortcuts = this._userShortcutsSetting.get();
    const index = userShortcuts.findIndex(shortcut.equals, shortcut);
    if (index !== -1) {
      userShortcuts.splice(index, 1);
      this._userShortcutsSetting.set(userShortcuts);
    }
  }

  /**
   * @param {!KeyboardShortcut} shortcut
   */
  _registerShortcut(shortcut) {
    this._actionToShortcut.set(shortcut.action, shortcut);
    this._keyMap.addKeyMapping(shortcut.descriptors.map(descriptor => descriptor.key), shortcut.action);
  }

  _registerBindings() {
    this._actionToShortcut.clear();
    this._keyMap.clear();
    const keybindSet = this._keybindSetSetting.get();
    const extensions = Root.Runtime.Runtime.instance().extensions('action');
    this._disabledDefaultShortcutsForAction.clear();
    this._devToolsDefaultShortcutActions.clear();
    const forwardedKeys = [];
    if (Root.Runtime.experiments.isEnabled('keyboardShortcutEditor')) {
      const userShortcuts = this._userShortcutsSetting.get();
      userShortcuts.forEach(userShortcut => {
        const shortcut = KeyboardShortcut.createShortcutFromSettingObject(userShortcut);
        if (shortcut.type === Type.DisabledDefault) {
          this._disabledDefaultShortcutsForAction.set(shortcut.action, shortcut);
        } else {
          if (ForwardedActions.has(shortcut.action)) {
            forwardedKeys.push(
                shortcut.descriptors.map(descriptor => KeyboardShortcut.keyCodeAndModifiersFromKey(descriptor.key)));
          }
          this._registerShortcut(shortcut);
        }
      }, this);
    }
    extensions.forEach(registerExtension, this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setWhitelistedShortcuts(JSON.stringify(forwardedKeys));

    /**
     * @param {!Root.Runtime.Extension} extension
     * @this {ShortcutRegistry}
     */
    function registerExtension(extension) {
      const descriptor = extension.descriptor();
      const bindings = descriptor.bindings;
      for (let i = 0; bindings && i < bindings.length; ++i) {
        const keybindSets = bindings[i].keybindSets;
        if (!platformMatches(bindings[i].platform) || !keybindSetsMatch(keybindSets)) {
          continue;
        }
        const keys = bindings[i].shortcut.split(/\s+/);
        const shortcutDescriptors = keys.map(KeyboardShortcut.makeDescriptorFromBindingShortcut);
        if (shortcutDescriptors.length > 0) {
          const actionId = /** @type {string} */ (descriptor.actionId);

          if (this._isDisabledDefault(shortcutDescriptors, actionId)) {
            this._devToolsDefaultShortcutActions.add(actionId);
            continue;
          }

          if (ForwardedActions.has(actionId)) {
            forwardedKeys.push(
                ...shortcutDescriptors.map(shortcut => KeyboardShortcut.keyCodeAndModifiersFromKey(shortcut.key)));
          }
          if (!keybindSets) {
            this._devToolsDefaultShortcutActions.add(actionId);
            this._registerShortcut(new KeyboardShortcut(shortcutDescriptors, actionId, Type.DefaultShortcut));
          } else {
            if (keybindSets.includes(DefaultShortcutSetting)) {
              this._devToolsDefaultShortcutActions.add(actionId);
            }
            this._registerShortcut(
                new KeyboardShortcut(shortcutDescriptors, actionId, Type.KeybindSetShortcut, new Set(keybindSets)));
          }
        }
      }
    }

    /**
     * @param {string=} platformsString
     * @return {boolean}
     */
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

    /**
     * @param {!Array<string>=} keybindSets
     */
    function keybindSetsMatch(keybindSets) {
      if (!keybindSets) {
        return true;
      }
      return keybindSets.includes(keybindSet);
    }
  }

  _isDisabledDefault(shortcutDescriptors, action) {
    const disabledDefaults = this._disabledDefaultShortcutsForAction.get(action);
    for (const disabledDefault of disabledDefaults) {
      if (disabledDefault.descriptorsMatch(shortcutDescriptors)) {
        return true;
      }
    }
    return false;
  }
}

export class ShortcutTreeNode {
  /**
   * @param {number} key
   * @param {number=} depth
   */
  constructor(key, depth = 0) {
    this._key = key;
    /** @type {!Array.<string>} */
    this._actions = [];
    this._chords = new Map();
    this._depth = depth;
  }

  /**
   * @param {string} action
   */
  addAction(action) {
    this._actions.push(action);
  }

  /**
   * @return {number}
   */
  key() {
    return this._key;
  }

  /**
   * @return {!Map.<number, !ShortcutTreeNode>}
   */
  chords() {
    return this._chords;
  }

  /**
   * @return {boolean}
   */
  hasChords() {
    return this._chords.size > 0;
  }

  /**
   * @param {!Array.<number>} keys
   * @param {string} action
   */
  addKeyMapping(keys, action) {
    if (keys.length < this._depth) {
      return;
    }

    if (keys.length === this._depth) {
      this.addAction(action);
    } else {
      const key = keys[this._depth];
      if (!this._chords.has(key)) {
        this._chords.set(key, new ShortcutTreeNode(key, this._depth + 1));
      }
      this._chords.get(key).addKeyMapping(keys, action);
    }
  }

  /**
   * @param {number} key
   * @return {?ShortcutTreeNode}
   */
  getNode(key) {
    return this._chords.get(key) || null;
  }

  /**
   * @return {!Array.<string>}
   */
  actions() {
    return this._actions;
  }

  clear() {
    this._actions = [];
    this._chords = new Map();
  }
}


export class ForwardedShortcut {}

ForwardedShortcut.instance = new ForwardedShortcut();

export const ForwardedActions = new Set([
  'main.toggle-dock', 'debugger.toggle-breakpoints-active', 'debugger.toggle-pause', 'commandMenu.show', 'console.show'
]);
export const KeyTimeout = 1000;
export const DefaultShortcutSetting = 'devToolsDefault';
