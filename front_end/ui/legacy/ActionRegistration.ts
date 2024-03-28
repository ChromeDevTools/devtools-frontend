// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';

import {Context} from './Context.js';

const UIStrings = {
  /**
   *@description Title of the keybind category 'Elements' in Settings' Shortcuts pannel.
   */
  elements: 'Elements',
  /**
   *@description Title of the keybind category 'Screenshot' in Settings' Shortcuts pannel.
   */
  screenshot: 'Screenshot',
  /**
   *@description Title of the keybind category 'Network' in Settings' Shortcuts pannel.
   */
  network: 'Network',
  /**
   *@description Title of the keybind category 'Memory' in Settings' Shortcuts pannel.
   */
  memory: 'Memory',
  /**
   *@description Title of the keybind category 'JavaScript Profiler' in Settings' Shortcuts pannel.
   */
  javascript_profiler: 'JavaScript Profiler',
  /**
   *@description Title of the keybind category 'Console' in Settings' Shortcuts pannel.
   */
  console: 'Console',
  /**
   *@description Title of the keybind category 'Performance' in Settings' Shortcuts pannel.
   */
  performance: 'Performance',
  /**
   *@description Title of the keybind category 'Mobile' in Settings' Shortcuts pannel.
   */
  mobile: 'Mobile',
  /**
   *@description Title of the keybind category 'Help' in Settings' Shortcuts pannel.
   */
  help: 'Help',
  /**
   *@description Title of the keybind category 'Layers' in Settings' Shortcuts pannel.
   */
  layers: 'Layers',
  /**
   *@description Title of the keybind category 'Navigation' in Settings' Shortcuts pannel.
   */
  navigation: 'Navigation',
  /**
   *@description Title of the keybind category 'Drawer' in Settings' Shortcuts pannel.
   */
  drawer: 'Drawer',
  /**
   *@description Title of the keybind category 'Global' in Settings' Shortcuts pannel.
   */
  global: 'Global',
  /**
   *@description Title of the keybind category 'Resources' in Settings' Shortcuts pannel.
   */
  resources: 'Resources',
  /**
   *@description Title of the keybind category 'Background Services' in Settings' Shortcuts pannel.
   */
  background_services: 'Background Services',
  /**
   *@description Title of the keybind category 'Settings' in Settings' Shortcuts pannel.
   */
  settings: 'Settings',
  /**
   *@description Title of the keybind category 'Debugger' in Settings' Shortcuts pannel.
   */
  debugger: 'Debugger',
  /**
   *@description Title of the keybind category 'Sources' in Settings' Shortcuts pannel.
   */
  sources: 'Sources',
  /**
   *@description Title of the keybind category 'Rendering' in Settings' Shortcuts pannel.
   */
  rendering: 'Rendering',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/ActionRegistration.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ActionDelegate {
  handleAction(_context: Context, _actionId: string): boolean;
}

export class Action extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private enabledInternal = true;
  private toggledInternal = false;
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
    if (this.enabledInternal === enabled) {
      return;
    }

    this.enabledInternal = enabled;
    this.dispatchEventToListeners(Events.Enabled, enabled);
  }

  enabled(): boolean {
    return this.enabledInternal;
  }

  category(): ActionCategory {
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

  title(): Common.UIString.LocalizedString {
    let title = this.actionRegistration.title ? this.actionRegistration.title() : i18n.i18n.lockedString('');
    const options = this.actionRegistration.options;
    if (options) {
      // Actions with an 'options' property don't have a title field. Instead, the displayed
      // title is taken from the 'title' property of the option that is not active. Only one of the
      // two options can be active at a given moment and the 'toggled' property of the action along
      // with the 'value' of the options are used to determine which one it is.

      for (const pair of options) {
        if (pair.value !== this.toggledInternal) {
          title = pair.title();
        }
      }
    }
    return title;
  }

  toggled(): boolean {
    return this.toggledInternal;
  }

  setToggled(toggled: boolean): void {
    console.assert(this.toggleable(), 'Shouldn\'t be toggling an untoggleable action', this.id());
    if (this.toggledInternal === toggled) {
      return;
    }

    this.toggledInternal = toggled;
    this.dispatchEventToListeners(Events.Toggled, toggled);
  }

  options(): undefined|Array<ExtensionOption> {
    return this.actionRegistration.options;
  }

  contextTypes(): undefined|Array<Function> {
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

  order(): number|undefined {
    return this.actionRegistration.order;
  }
}

const registeredActionExtensions: Array<Action> = [];

const actionIdSet = new Set<string>();

export function registerActionExtension(registration: ActionRegistration): void {
  const actionId = registration.actionId;
  if (actionIdSet.has(actionId)) {
    throw new Error(`Duplicate Action id '${actionId}': ${new Error().stack}`);
  }
  actionIdSet.add(actionId);
  registeredActionExtensions.push(new Action(registration));
}

export function reset(): void {
  actionIdSet.clear();
  registeredActionExtensions.length = 0;
}

export function getRegisteredActionExtensions(): Array<Action> {
  return registeredActionExtensions
      .filter(
          action => Root.Runtime.Runtime.isDescriptorEnabled(
              {experiment: action.experiment(), condition: action.condition()}))
      .sort((firstAction, secondAction) => {
        const order1 = firstAction.order() || 0;
        const order2 = secondAction.order() || 0;
        return order1 - order2;
      });
}

export function maybeRemoveActionExtension(actionId: string): boolean {
  const actionIndex = registeredActionExtensions.findIndex(action => action.id() === actionId);
  if (actionIndex < 0 || !actionIdSet.delete(actionId)) {
    return false;
  }
  registeredActionExtensions.splice(actionIndex, 1);
  return true;
}

export const enum Platforms {
  All = 'All platforms',
  Mac = 'mac',
  WindowsLinux = 'windows,linux',
  Android = 'Android',
  Windows = 'windows',
}

export const enum Events {
  Enabled = 'Enabled',
  Toggled = 'Toggled',
}

export type EventTypes = {
  [Events.Enabled]: boolean,
  [Events.Toggled]: boolean,
};

// eslint-disable-next-line rulesdir/const_enum
export enum ActionCategory {
  NONE = '',  // `NONE` must be a falsy value. Legacy code uses if-checks for the category.
  ELEMENTS = 'ELEMENTS',
  SCREENSHOT = 'SCREENSHOT',
  NETWORK = 'NETWORK',
  MEMORY = 'MEMORY',
  JAVASCRIPT_PROFILER = 'JAVASCRIPT_PROFILER',
  CONSOLE = 'CONSOLE',
  PERFORMANCE = 'PERFORMANCE',
  MOBILE = 'MOBILE',
  HELP = 'HELP',
  LAYERS = 'LAYERS',
  NAVIGATION = 'NAVIGATION',
  DRAWER = 'DRAWER',
  GLOBAL = 'GLOBAL',
  RESOURCES = 'RESOURCES',
  BACKGROUND_SERVICES = 'BACKGROUND_SERVICES',
  SETTINGS = 'SETTINGS',
  DEBUGGER = 'DEBUGGER',
  SOURCES = 'SOURCES',
  RENDERING = 'RENDERING',
}

export function getLocalizedActionCategory(category: ActionCategory): Platform.UIString.LocalizedString {
  switch (category) {
    case ActionCategory.ELEMENTS:
      return i18nString(UIStrings.elements);
    case ActionCategory.SCREENSHOT:
      return i18nString(UIStrings.screenshot);
    case ActionCategory.NETWORK:
      return i18nString(UIStrings.network);
    case ActionCategory.MEMORY:
      return i18nString(UIStrings.memory);
    case ActionCategory.JAVASCRIPT_PROFILER:
      return i18nString(UIStrings.javascript_profiler);
    case ActionCategory.CONSOLE:
      return i18nString(UIStrings.console);
    case ActionCategory.PERFORMANCE:
      return i18nString(UIStrings.performance);
    case ActionCategory.MOBILE:
      return i18nString(UIStrings.mobile);
    case ActionCategory.HELP:
      return i18nString(UIStrings.help);
    case ActionCategory.LAYERS:
      return i18nString(UIStrings.layers);
    case ActionCategory.NAVIGATION:
      return i18nString(UIStrings.navigation);
    case ActionCategory.DRAWER:
      return i18nString(UIStrings.drawer);
    case ActionCategory.GLOBAL:
      return i18nString(UIStrings.global);
    case ActionCategory.RESOURCES:
      return i18nString(UIStrings.resources);
    case ActionCategory.BACKGROUND_SERVICES:
      return i18nString(UIStrings.background_services);
    case ActionCategory.SETTINGS:
      return i18nString(UIStrings.settings);
    case ActionCategory.DEBUGGER:
      return i18nString(UIStrings.debugger);
    case ActionCategory.SOURCES:
      return i18nString(UIStrings.sources);
    case ActionCategory.RENDERING:
      return i18nString(UIStrings.rendering);
    case ActionCategory.NONE:
      return i18n.i18n.lockedString('');
  }
  // Not all categories are cleanly typed yet. Return the category as-is in this case.
  return i18n.i18n.lockedString(category);
}

export const enum IconClass {
  LARGEICON_NODE_SEARCH = 'select-element',
  START_RECORDING = 'record-start',
  STOP_RECORDING = 'record-stop',
  REFRESH = 'refresh',
  CLEAR = 'clear',
  EYE = 'eye',
  LARGEICON_PHONE = 'devices',
  PLAY = 'play',
  DOWNLOAD = 'download',
  LARGEICON_PAUSE = 'pause',
  LARGEICON_RESUME = 'resume',
  BIN = 'bin',
  LARGEICON_SETTINGS_GEAR = 'gear',
  LARGEICON_STEP_OVER = 'step-over',
  LARGE_ICON_STEP_INTO = 'step-into',
  LARGE_ICON_STEP = 'step',
  LARGE_ICON_STEP_OUT = 'step-out',
  BREAKPOINT_CROSSED_FILLED = 'breakpoint-crossed-filled',
  BREAKPOINT_CROSSED = 'breakpoint-crossed',
  PLUS = 'plus',
  BUG = 'bug',
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
  contextTypes?: () => Array<Function>;
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
  /**
   * Used to sort actions when all registered actions are queried.
   */
  order?: number;
}
