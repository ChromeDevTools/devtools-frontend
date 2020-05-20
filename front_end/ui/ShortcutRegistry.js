// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as Host from '../host/host.js';
import * as Platform from '../platform/platform.js';

import {Action} from './Action.js';                  // eslint-disable-line no-unused-vars
import {ActionRegistry} from './ActionRegistry.js';  // eslint-disable-line no-unused-vars
import {Context} from './Context.js';
import {Dialog} from './Dialog.js';
import {Descriptor, KeyboardShortcut, Modifiers, Type} from './KeyboardShortcut.js';  // eslint-disable-line no-unused-vars
import {isEditing} from './UIUtils.js';


export class ShortcutRegistry {
  /**
   * @param {!ActionRegistry} actionRegistry
   */
  constructor(actionRegistry) {
    this._actionRegistry = actionRegistry;
    /** @type {!Platform.Multimap.<number, !KeyboardShortcut>} */
    this._keyToShortcut = new Platform.Multimap();
    /** @type {!Platform.Multimap.<string, !KeyboardShortcut>} */
    this._actionToShortcut = new Platform.Multimap();
    this._keyMap = new ShortcutTreeNode(0, 0);
    /** @type {?ShortcutTreeNode} */
    this._activePrefixKey = null;
    /** @type {?number} */
    this._activePrefixTimeout = null;
    /** @type {?function():Promise<void>} */
    this._consumePrefix = null;
    const keybindSetSetting = self.Common.settings.moduleSetting('activeKeybindSet');
    if (!Root.Runtime.experiments.isEnabled('customKeyboardShortcuts') &&
        keybindSetSetting.get() !== DefaultShortcutSetting) {
      keybindSetSetting.set(DefaultShortcutSetting);
    }
    keybindSetSetting.addChangeListener(this._registerBindings, this);

    this._registerBindings();
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
    const applicableActions = this._actionRegistry.applicableActions(actions, self.UI.context);
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
   * @return {!Array<number>}
   */
  globalShortcutKeys() {
    const keys = [];
    for (const node of this._keyMap.chords().values()) {
      const actions = node.actions();
      const applicableActions = this._actionRegistry.applicableActions(actions, new Context());
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
   * @param {!Element} element
   * @param {!Object.<string, function():Promise.<boolean>>} handlers
   */
  addShortcutListener(element, handlers) {
    // We only want keys for these specific actions to get handled this
    // way; all others should be allowed to bubble up
    const whitelistKeyMap = new ShortcutTreeNode(0, 0);
    const shortcuts = Object.keys(handlers).flatMap(action => [...this._actionToShortcut.get(action)]);
    shortcuts.forEach(shortcut => {
      whitelistKeyMap.addKeyMapping(shortcut.descriptors.map(descriptor => descriptor.key), shortcut.action);
    });

    element.addEventListener('keydown', event => {
      const key = KeyboardShortcut.makeKeyFromEvent(/** @type {!KeyboardEvent} */ (event));
      let keyMap = whitelistKeyMap;
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
  _registerShortcut(shortcut) {
    this._actionToShortcut.set(shortcut.action, shortcut);
    this._keyMap.addKeyMapping(shortcut.descriptors.map(descriptor => descriptor.key), shortcut.action);
  }

  _registerBindings() {
    this._keyToShortcut.clear();
    this._actionToShortcut.clear();
    this._keyMap.clear();
    const keybindSet = self.Common.settings.moduleSetting('activeKeybindSet').get();
    const extensions = self.runtime.extensions('action');
    extensions.forEach(registerExtension, this);

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
          if (!keybindSets) {
            this._registerShortcut(new KeyboardShortcut(shortcutDescriptors, actionId, Type.DefaultShortcut));
          } else {
            this._registerShortcut(
                new KeyboardShortcut(shortcutDescriptors, actionId, Type.KeybindSetShortcut, keybindSet));
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

export const KeyTimeout = 1000;
export const DefaultShortcutSetting = 'devToolsDefault';
