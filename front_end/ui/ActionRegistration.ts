// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';

import {Context} from './Context.js';

class ActionRuntimeExtensionDescriptor extends Root.Runtime.RuntimeExtensionDescriptor {
  iconClass?: string;
  toggledIconClass?: string;
  toggleWithRedColor?: boolean;
  toggleable?: boolean;

  constructor() {
    super();
  }
}

export interface Action extends Common.EventTarget.EventTarget {
  id(): string;

  execute(): Promise<boolean>;

  icon(): string|undefined;

  toggledIcon(): string|undefined;

  toggleWithRedColor(): boolean;

  setEnabled(_enabled: boolean): void;

  enabled(): boolean;

  category(): string;

  tags(): string|void;

  toggleable(): boolean;

  title(): string;

  toggled(): boolean;

  setToggled(_toggled: boolean): void
}

export class LegacyActionRegistration extends Common.ObjectWrapper.ObjectWrapper implements Action {
  _extension: Root.Runtime.Extension;
  _enabled: boolean;
  _toggled: boolean;

  constructor(extension: Root.Runtime.Extension) {
    super();
    this._extension = extension;
    this._enabled = true;
    this._toggled = false;
  }

  id(): string {
    return this.actionDescriptor().actionId || '';
  }

  extension(): Root.Runtime.Extension {
    return this._extension;
  }

  async execute(): Promise<boolean> {
    if (!this._extension.canInstantiate()) {
      return false;
    }
    const delegate = await this._extension.instance() as ActionDelegate;
    const actionId = this.id();
    return delegate.handleAction(Context.instance(), actionId);
  }

  icon(): string {
    return this.actionDescriptor().iconClass || '';
  }

  toggledIcon(): string {
    return this.actionDescriptor().toggledIconClass || '';
  }

  toggleWithRedColor(): boolean {
    return Boolean(this.actionDescriptor().toggleWithRedColor);
  }

  setEnabled(enabled: boolean): void {
    if (this._enabled === enabled) {
      return;
    }

    this._enabled = enabled;
    this.dispatchEventToListeners(Events.Enabled, enabled);
  }

  enabled(): boolean {
    return this._enabled;
  }

  category(): string {
    return ls`${this.actionDescriptor().category || ''}`;
  }

  tags(): string {
    const keys = this.actionDescriptor().tags || '';
    // Get localized keys and separate by null character to prevent fuzzy matching from matching across them.
    const keyList = keys.split(',');
    let key = '';
    keyList.forEach(k => {
      key += (ls(k.trim()) + '\0');
    });
    return key;
  }

  toggleable(): boolean {
    return Boolean(this.actionDescriptor().toggleable);
  }

  title(): string {
    let title = this._extension.title() || '';
    const options = this.actionDescriptor().options;
    if (options) {
      for (const pair of options) {
        if (pair.value !== this._toggled) {
          title = ls`${pair.title}`;
        }
      }
    }
    return title;
  }

  toggled(): boolean {
    return this._toggled;
  }

  setToggled(toggled: boolean): void {
    console.assert(this.toggleable(), 'Shouldn\'t be toggling an untoggleable action', this.id());
    if (this._toggled === toggled) {
      return;
    }

    this._toggled = toggled;
    this.dispatchEventToListeners(Events.Toggled, toggled);
  }

  private actionDescriptor(): ActionRuntimeExtensionDescriptor {
    return this._extension.descriptor() as ActionRuntimeExtensionDescriptor;
  }
}

export interface ActionDelegate {
  handleAction(_context: Context, _actionId: string): boolean;
}

export class PreRegisteredAction extends Common.ObjectWrapper.ObjectWrapper implements Action {
  _enabled = true;
  _toggled = false;
  private actionRegistration: ActionRegistration;
  constructor(actionRegistration: ActionRegistration) {
    super();
    this.actionRegistration = actionRegistration;
  }

  id(): string {
    return this.actionRegistration.actionId;
  }

  async execute(): Promise<boolean> {
    if (!this.actionRegistration.loadActionDelegate) {
      return false;
    }
    const delegate = await this.actionRegistration.loadActionDelegate();
    const actionId = this.id();
    return delegate.handleAction(Context.instance(), actionId);
  }

  icon(): string|undefined {
    return this.actionRegistration.iconClass;
  }

  toggledIcon(): string|undefined {
    return this.actionRegistration.toggledIconClass;
  }

  toggleWithRedColor(): boolean {
    return Boolean(this.actionRegistration.toggleWithRedColor);
  }

  setEnabled(enabled: boolean): void {
    if (this._enabled === enabled) {
      return;
    }

    this._enabled = enabled;
    this.dispatchEventToListeners(Events.Enabled, enabled);
  }

  enabled(): boolean {
    return this._enabled;
  }

  category(): string {
    return this.actionRegistration.category;
  }

  tags(): string|void {
    if (this.actionRegistration.tags) {
      // Get localized keys and separate by null character to prevent fuzzy matching from matching across them.
      return this.actionRegistration.tags.map(tag => tag()).join('\0');
    }
  }

  toggleable(): boolean {
    return Boolean(this.actionRegistration.toggleable);
  }

  title(): string {
    let title = this.actionRegistration.title ? this.actionRegistration.title() : '';
    const options = this.actionRegistration.options;
    if (options) {
      // Actions with an 'options' property don't have a title field. Instead, the displayed
      // title is taken from the 'title' property of the option that is not active. Only one of the
      // two options can be active at a given moment and the 'toggled' property of the action along
      // with the 'value' of the options are used to determine which one it is.

      for (const pair of options) {
        if (pair.value !== this._toggled) {
          title = pair.title();
        }
      }
    }
    return title;
  }

  toggled(): boolean {
    return this._toggled;
  }

  setToggled(toggled: boolean): void {
    console.assert(this.toggleable(), 'Shouldn\'t be toggling an untoggleable action', this.id());
    if (this._toggled === toggled) {
      return;
    }

    this._toggled = toggled;
    this.dispatchEventToListeners(Events.Toggled, toggled);
  }

  options(): undefined|Array<ExtensionOption> {
    return this.actionRegistration.options;
  }

  contextTypes(): undefined|Array<unknown> {
    if (this.actionRegistration.contextTypes) {
      return this.actionRegistration.contextTypes();
    }
    return undefined;
  }

  canInstantiate(): boolean {
    return Boolean(this.actionRegistration.loadActionDelegate);
  }

  bindings(): Array<Binding>|undefined {
    return this.actionRegistration.bindings;
  }

  experiment(): string|undefined {
    return this.actionRegistration.experiment;
  }

  condition(): string|undefined {
    return this.actionRegistration.condition;
  }
}

const registeredActionExtensions: Array<PreRegisteredAction> = [];

const actionIdSet = new Set<string>();

export function registerActionExtension(registration: ActionRegistration): void {
  const actionId = registration.actionId;
  if (actionIdSet.has(actionId)) {
    throw new Error(`Duplicate Action id '${actionId}': ${new Error().stack}`);
  }
  actionIdSet.add(actionId);
  registeredActionExtensions.push(new PreRegisteredAction(registration));
}

export function getRegisteredActionExtensions(): Array<PreRegisteredAction> {
  return registeredActionExtensions.filter(
      action =>
          Root.Runtime.Runtime.isDescriptorEnabled({experiment: action.experiment(), condition: action.condition()}));
}

export const enum Platforms {
  All = 'All platforms',
  Mac = 'mac',
  WindowsLinux = 'windows,linux',
  Android = 'Android',
}

export const Events = {
  Enabled: Symbol('Enabled'),
  Toggled: Symbol('Toggled'),
};

export const ActionCategory = {
  ELEMENTS: ls`Elements`,
  SCREENSHOT: ls`Screenshot`,
  NETWORK: ls`Network`,
  MEMORY: ls`Memory`,
  JAVASCRIPT_PROFILER: ls`JavaScript Profiler`,
  CONSOLE: ls`Console`,
  PERFORMANCE: ls`Performance`,
  MOBILE: ls`Mobile`,
  SENSORS: ls`Sensors`,
  HELP: ls`Help`,
  INPUTS: ls`Inputs`,
  LAYERS: ls`Layers`,
};

type ActionCategory = typeof ActionCategory[keyof typeof ActionCategory];

export const enum IconClass {
  LARGEICON_NODE_SEARCH = 'largeicon-node-search',
  LARGEICON_START_RECORDING = 'largeicon-start-recording',
  LARGEICON_STOP_RECORDING = 'largeicon-stop-recording',
  LARGEICON_REFRESH = 'largeicon-refresh',
  LARGEICON_CLEAR = 'largeicon-clear',
  LARGEICON_VISIBILITY = 'largeicon-visibility',
  LARGEICON_PHONE = 'largeicon-phone',
}

export const enum KeybindSet {
  DEVTOOLS_DEFAULT = 'devToolsDefault',
  VS_CODE = 'vsCode',
}

export interface ExtensionOption {
  value: boolean;
  title: () => Platform.UIString.LocalizedString;
  text?: string;
}

export interface Binding {
  platform?: Platforms;
  shortcut: string;
  keybindSets?: Array<KeybindSet>;
}

/**
 * The representation of an action extension to be registered.
 */
export interface ActionRegistration {
  /**
   * The unique id of an Action extension.
   */
  actionId: string;
  /**
   * The category with which the action is displayed in the UI.
   */
  category: ActionCategory;
  /**
   * The title with which the action is displayed in the UI.
   */
  title?: () => Platform.UIString.LocalizedString;
  /**
   * The type of the icon used to trigger the action.
   */
  iconClass?: IconClass;
  /**
   * Whether the style of the icon toggles on interaction.
   */
  toggledIconClass?: IconClass;
  /**
   * Whether the class 'toolbar-toggle-with-red-color' is toggled on the icon on interaction.
   */
  toggleWithRedColor?: boolean;
  /**
   * Words used to find an action in the Command Menu.
   */
  tags?: Array<() => Platform.UIString.LocalizedString>;
  /**
   * Whether the action is toggleable.
   */
  toggleable?: boolean;
  /**
   * Loads the class that handles the action when it is triggered. The common pattern for implementing
   * this function relies on having the module that contains the action’s handler lazily loaded. For example:
   * ```js
   *  let loadedElementsModule;
   *
   *  async function loadElementsModule() {
   *
   *    if (!loadedElementsModule) {
   *      loadedElementsModule = await import('./elements.js');
   *    }
   *    return loadedElementsModule;
   *  }
   *  UI.ActionRegistration.registerActionExtension({
   *   <...>
   *    async loadActionDelegate() {
   *      const Elements = await loadElementsModule();
   *      return Elements.ElementsPanel.ElementsActionDelegate.instance();
   *    },
   *   <...>
   *  });
   * ```
   */
  loadActionDelegate?: () => Promise<ActionDelegate>;
  /**
   * Returns the classes that represent the 'context flavors' under which the action is available for triggering.
   * The context of the application is described in 'flavors' that are usually views added and removed to the context
   * as the user interacts with the application (e.g when the user moves across views). (See UI.Context)
   * When the action is supposed to be available globally, that is, it does not depend on the application to have
   * a specific context, the value of this property should be undefined.
   *
   * Because the method is synchronous, context types should be already loaded when the method is invoked.
   * In the case that an action has context types it depends on, and they haven't been loaded yet, the function should
   * return an empty array. Once the context types have been loaded, the function should return an array with all types
   * that it depends on.
   *
   * The common pattern for implementing this function is relying on having the module with the corresponding context
   * types loaded and stored when the related 'view' extension is loaded asynchronously. As an example:
   *
   * ```js
   * let loadedElementsModule;
   *
   * async function loadElementsModule() {
   *
   *   if (!loadedElementsModule) {
   *     loadedElementsModule = await import('./elements.js');
   *   }
   *   return loadedElementsModule;
   * }
   * function maybeRetrieveContextTypes(getClassCallBack: (elementsModule: typeof Elements) => unknown[]): unknown[] {
   *
   *   if (loadedElementsModule === undefined) {
   *     return [];
   *   }
   *   return getClassCallBack(loadedElementsModule);
   * }
   * UI.ActionRegistration.registerActionExtension({
   *
   *   contextTypes() {
   *     return maybeRetrieveContextTypes(Elements => [Elements.ElementsPanel.ElementsPanel]);
   *   }
   *   <...>
   * });
   * ```
   */
  contextTypes?: () => Array<unknown>;
  /**
   * The descriptions for each of the two states in which a toggleable action can be.
   */
  options?: Array<ExtensionOption>;
  /**
   * The description of the variables (e.g. platform, keys and keybind sets) under which a keyboard shortcut triggers the action.
   * If a keybind must be available on all platforms, its 'platform' property must be undefined. The same applies to keybind sets
   * and the keybindSet property.
   *
   * Keybinds also depend on the context types of their corresponding action, and so they will only be available when such context types
   * are flavors of the current appliaction context.
   */
  bindings?: Array<Binding>;
  /**
   * The name of the experiment an action is associated with. Enabling and disabling the declared
   * experiment will enable and disable the action respectively.
   */
  experiment?: Root.Runtime.ExperimentName;
  /**
   * A condition represented as a string the action's availability depends on. Conditions come
   * from the queryParamsObject defined in Runtime and just as the experiment field, they determine the availability
   * of the setting. A condition can be negated by prepending a ‘!’ to the value of the condition
   * property and in that case the behaviour of the action's availability will be inverted.
   */
  condition?: Root.Runtime.ConditionName;
}
