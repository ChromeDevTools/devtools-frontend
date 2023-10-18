// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';

import {type Action, getRegisteredActionExtensions, KeybindSet} from './ActionRegistration.js';
import {type ActionRegistry} from './ActionRegistry.js';
import {Context} from './Context.js';
import {Dialog} from './Dialog.js';
import {KeyboardShortcut, Modifiers, Type} from './KeyboardShortcut.js';
import {isEditing} from './UIUtils.js';

let shortcutRegistryInstance: ShortcutRegistry|undefined;

export class ShortcutRegistry {
  private readonly actionRegistry: ActionRegistry;
  private readonly actionToShortcut: Platform.MapUtilities.Multimap<string, KeyboardShortcut>;
  private readonly keyMap: ShortcutTreeNode;
  private activePrefixKey: ShortcutTreeNode|null;
  private activePrefixTimeout: number|null;
  private consumePrefix: (() => Promise<void>)|null;
  private readonly devToolsDefaultShortcutActions: Set<string>;
  private readonly disabledDefaultShortcutsForAction: Platform.MapUtilities.Multimap<string, KeyboardShortcut>;
  private readonly keybindSetSetting: Common.Settings.Setting<string>;
  private readonly userShortcutsSetting: Common.Settings.Setting<KeyboardShortcut[]>;

  constructor(actionRegistry: ActionRegistry) {
    this.actionRegistry = actionRegistry;
    this.actionToShortcut = new Platform.MapUtilities.Multimap();
    this.keyMap = new ShortcutTreeNode(0, 0);
    this.activePrefixKey = null;
    this.activePrefixTimeout = null;
    this.consumePrefix = null;
    this.devToolsDefaultShortcutActions = new Set();
    this.disabledDefaultShortcutsForAction = new Platform.MapUtilities.Multimap();
    this.keybindSetSetting = Common.Settings.Settings.instance().moduleSetting('activeKeybindSet');
    this.keybindSetSetting.addChangeListener(event => {
      Host.userMetrics.keybindSetSettingChanged(event.data);
      this.registerBindings();
    });
    this.userShortcutsSetting = Common.Settings.Settings.instance().moduleSetting('userShortcuts');
    this.userShortcutsSetting.addChangeListener(this.registerBindings, this);

    this.registerBindings();
  }

  static instance(opts: {
    forceNew: boolean|null,
    actionRegistry: ActionRegistry|null,
  } = {forceNew: null, actionRegistry: null}): ShortcutRegistry {
    const {forceNew, actionRegistry} = opts;
    if (!shortcutRegistryInstance || forceNew) {
      if (!actionRegistry) {
        throw new Error('Missing actionRegistry for shortcutRegistry');
      }
      shortcutRegistryInstance = new ShortcutRegistry(actionRegistry);
    }

    return shortcutRegistryInstance;
  }

  static removeInstance(): void {
    shortcutRegistryInstance = undefined;
  }
  private applicableActions(key: number, handlers: {
    [x: string]: () => Promise<boolean>,
  }|undefined = {}): Action[] {
    let actions: string[] = [];
    const keyMap = this.activePrefixKey || this.keyMap;
    const keyNode = keyMap.getNode(key);
    if (keyNode) {
      actions = keyNode.actions();
    }
    const applicableActions = this.actionRegistry.applicableActions(actions, Context.instance());
    if (keyNode) {
      for (const actionId of Object.keys(handlers)) {
        if (keyNode.actions().indexOf(actionId) >= 0) {
          const action = this.actionRegistry.action(actionId);
          if (action) {
            applicableActions.push(action);
          }
        }
      }
    }
    return applicableActions;
  }

  shortcutsForAction(action: string): KeyboardShortcut[] {
    return [...this.actionToShortcut.get(action)];
  }

  actionsForDescriptors(descriptors: {
    key: number,
    name: string,
  }[]): string[] {
    let keyMapNode: (ShortcutTreeNode|null)|ShortcutTreeNode = this.keyMap;
    for (const {key} of descriptors) {
      if (!keyMapNode) {
        return [];
      }
      keyMapNode = keyMapNode.getNode(key);
    }
    return keyMapNode ? keyMapNode.actions() : [];
  }

  globalShortcutKeys(): number[] {
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

  keysForActions(actionIds: string[]): number[] {
    const keys = actionIds.flatMap(
        action => [...this.actionToShortcut.get(action)].flatMap(
            shortcut => shortcut.descriptors.map(descriptor => descriptor.key)));
    return [...(new Set(keys))];
  }

  shortcutTitleForAction(actionId: string): string|undefined {
    for (const shortcut of this.actionToShortcut.get(actionId)) {
      return shortcut.title();
    }
    return undefined;
  }

  handleShortcut(event: KeyboardEvent, handlers?: {
    [x: string]: () => Promise<boolean>,
  }): void {
    void this.handleKey(KeyboardShortcut.makeKeyFromEvent(event), event.key, event, handlers);
  }

  actionHasDefaultShortcut(actionId: string): boolean {
    return this.devToolsDefaultShortcutActions.has(actionId);
  }

  getShortcutListener(handlers: {[x: string]: () => Promise<boolean>}): (event: KeyboardEvent) => void {
    const shortcuts = Object.keys(handlers).flatMap(action => [...this.actionToShortcut.get(action)]);
    // We only want keys for these specific actions to get handled this
    // way; all others should be allowed to bubble up.
    const allowlistKeyMap = new ShortcutTreeNode(0, 0);
    shortcuts.forEach(shortcut => {
      allowlistKeyMap.addKeyMapping(shortcut.descriptors.map(descriptor => descriptor.key), shortcut.action);
    });

    return (event: KeyboardEvent): void => {
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

  addShortcutListener(element: Element, handlers: {
    [x: string]: () => Promise<boolean>,
  }): (arg0: Event) => void {
    const listener = this.getShortcutListener(handlers) as (event: Event) => void;
    element.addEventListener('keydown', listener);
    return listener;
  }

  async handleKey(key: number, domKey: string, event?: KeyboardEvent, handlers?: {
    [x: string]: () => Promise<boolean>,
  }): Promise<void> {
    const keyModifiers = key >> 8;
    const hasHandlersOrPrefixKey = Boolean(handlers) || Boolean(this.activePrefixKey);
    const keyMapNode = this.keyMap.getNode(key);
    const maybeHasActions =
        (this.applicableActions(key, handlers)).length > 0 || (keyMapNode && keyMapNode.hasChords());
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

    if (this.activePrefixTimeout) {
      clearTimeout(this.activePrefixTimeout);
      const handled = await maybeExecuteActionForKey.call(this);
      this.activePrefixKey = null;
      this.activePrefixTimeout = null;
      if (handled) {
        return;
      }
      if (this.consumePrefix) {
        await this.consumePrefix();
      }
    }
    if (keyMapNode && keyMapNode.hasChords()) {
      this.activePrefixKey = keyMapNode;
      this.consumePrefix = async(): Promise<void> => {
        this.activePrefixKey = null;
        this.activePrefixTimeout = null;
        await maybeExecuteActionForKey.call(this);
      };
      this.activePrefixTimeout = window.setTimeout(this.consumePrefix, KeyTimeout);
    } else {
      await maybeExecuteActionForKey.call(this);
    }

    function isPossiblyInputKey(): boolean {
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

    function hasModifier(mod: number): boolean {
      return Boolean(keyModifiers & mod);
    }

    /** ;
     */
    async function maybeExecuteActionForKey(this: ShortcutRegistry): Promise<boolean> {
      const actions = this.applicableActions(key, handlers);
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

  registerUserShortcut(shortcut: KeyboardShortcut): void {
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
      if (otherShortcut.descriptorsMatch(shortcut.descriptors) &&
          otherShortcut.hasKeybindSet(this.keybindSetSetting.get())) {
        // don't allow duplicate shortcuts
        return;
      }
    }
    this.addShortcutToSetting(shortcut);
  }

  removeShortcut(shortcut: KeyboardShortcut): void {
    if (shortcut.type === Type.DefaultShortcut || shortcut.type === Type.KeybindSetShortcut) {
      this.addShortcutToSetting(shortcut.changeType(Type.DisabledDefault));
    } else {
      this.removeShortcutFromSetting(shortcut);
    }
  }

  disabledDefaultsForAction(actionId: string): Set<KeyboardShortcut> {
    return this.disabledDefaultShortcutsForAction.get(actionId);
  }

  private addShortcutToSetting(shortcut: KeyboardShortcut): void {
    const userShortcuts = this.userShortcutsSetting.get();
    userShortcuts.push(shortcut);
    this.userShortcutsSetting.set(userShortcuts);
  }

  private removeShortcutFromSetting(shortcut: KeyboardShortcut): void {
    const userShortcuts = this.userShortcutsSetting.get();
    const index = userShortcuts.findIndex(shortcut.equals, shortcut);
    if (index !== -1) {
      userShortcuts.splice(index, 1);
      this.userShortcutsSetting.set(userShortcuts);
    }
  }

  private registerShortcut(shortcut: KeyboardShortcut): void {
    this.actionToShortcut.set(shortcut.action, shortcut);
    this.keyMap.addKeyMapping(shortcut.descriptors.map(descriptor => descriptor.key), shortcut.action);
  }

  private registerBindings(): void {
    this.actionToShortcut.clear();
    this.keyMap.clear();
    const keybindSet = this.keybindSetSetting.get();
    this.disabledDefaultShortcutsForAction.clear();
    this.devToolsDefaultShortcutActions.clear();
    const forwardedKeys: {
      keyCode: number,
      modifiers: number,
    }[] = [];
    const userShortcuts = this.userShortcutsSetting.get();
    for (const userShortcut of userShortcuts) {
      const shortcut = KeyboardShortcut.createShortcutFromSettingObject(userShortcut);
      if (shortcut.type === Type.DisabledDefault) {
        this.disabledDefaultShortcutsForAction.set(shortcut.action, shortcut);
      } else {
        if (ForwardedActions.has(shortcut.action)) {
          forwardedKeys.push(
              ...shortcut.descriptors.map(descriptor => KeyboardShortcut.keyCodeAndModifiersFromKey(descriptor.key)));
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
            forwardedKeys.push(
                ...shortcutDescriptors.map(shortcut => KeyboardShortcut.keyCodeAndModifiersFromKey(shortcut.key)));
          }
          if (!keybindSets) {
            this.devToolsDefaultShortcutActions.add(actionId);
            this.registerShortcut(new KeyboardShortcut(shortcutDescriptors, actionId, Type.DefaultShortcut));
          } else {
            if (keybindSets.includes(KeybindSet.DEVTOOLS_DEFAULT)) {
              this.devToolsDefaultShortcutActions.add(actionId);
            }
            this.registerShortcut(
                new KeyboardShortcut(shortcutDescriptors, actionId, Type.KeybindSetShortcut, new Set(keybindSets)));
          }
        }
      }
    }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setWhitelistedShortcuts(JSON.stringify(forwardedKeys));

    function platformMatches(platformsString?: string): boolean {
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

    function keybindSetsMatch(keybindSets?: string[]): boolean {
      if (!keybindSets) {
        return true;
      }
      return keybindSets.includes(keybindSet);
    }
  }

  private isDisabledDefault(
      shortcutDescriptors: {
        key: number,
        name: string,
      }[],
      action: string): boolean {
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
  private readonly keyInternal: number;
  private actionsInternal: string[];
  private chordsInternal: Map<number, ShortcutTreeNode>;
  private readonly depth: number;

  constructor(key: number, depth: number = 0) {
    this.keyInternal = key;
    this.actionsInternal = [];
    this.chordsInternal = new Map();
    this.depth = depth;
  }

  addAction(action: string): void {
    this.actionsInternal.push(action);
  }

  key(): number {
    return this.keyInternal;
  }

  chords(): Map<number, ShortcutTreeNode> {
    return this.chordsInternal;
  }

  hasChords(): boolean {
    return this.chordsInternal.size > 0;
  }

  addKeyMapping(keys: number[], action: string): void {
    if (keys.length < this.depth) {
      return;
    }

    if (keys.length === this.depth) {
      this.addAction(action);
    } else {
      const key = keys[this.depth];
      if (!this.chordsInternal.has(key)) {
        this.chordsInternal.set(key, new ShortcutTreeNode(key, this.depth + 1));
      }
      (this.chordsInternal.get(key) as ShortcutTreeNode).addKeyMapping(keys, action);
    }
  }

  getNode(key: number): ShortcutTreeNode|null {
    return this.chordsInternal.get(key) || null;
  }

  actions(): string[] {
    return this.actionsInternal;
  }

  clear(): void {
    this.actionsInternal = [];
    this.chordsInternal = new Map();
  }
}

export class ForwardedShortcut {
  static instance = new ForwardedShortcut();
}

export const ForwardedActions = new Set<string>([
  'main.toggle-dock',
  'debugger.toggle-breakpoints-active',
  'debugger.toggle-pause',
  'commandMenu.show',
  'console.show',
]);
export const KeyTimeout = 1000;
export const DefaultShortcutSetting = 'devToolsDefault';
