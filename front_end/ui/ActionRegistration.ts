// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
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

  tags(): string|undefined;

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
    return this._actionDescriptor().actionId || '';
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
    return this._actionDescriptor().iconClass || '';
  }

  toggledIcon(): string {
    return this._actionDescriptor().toggledIconClass || '';
  }

  toggleWithRedColor(): boolean {
    return !!this._actionDescriptor().toggleWithRedColor;
  }

  setEnabled(enabled: boolean) {
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
    return ls`${this._actionDescriptor().category || ''}`;
  }

  tags(): string {
    const keys = this._actionDescriptor().tags || '';
    // Get localized keys and separate by null character to prevent fuzzy matching from matching across them.
    const keyList = keys.split(',');
    let key = '';
    keyList.forEach(k => {
      key += (ls(k.trim()) + '\0');
    });
    return key;
  }

  toggleable(): boolean {
    return !!this._actionDescriptor().toggleable;
  }

  title(): string {
    let title = this._extension.title() || '';
    const options = this._actionDescriptor().options;
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

  setToggled(toggled: boolean) {
    console.assert(this.toggleable(), 'Shouldn\'t be toggling an untoggleable action', this.id());
    if (this._toggled === toggled) {
      return;
    }

    this._toggled = toggled;
    this.dispatchEventToListeners(Events.Toggled, toggled);
  }

  _actionDescriptor(): ActionRuntimeExtensionDescriptor {
    return this._extension.descriptor() as ActionRuntimeExtensionDescriptor;
  }
}

export interface ActionDelegate {
  handleAction(_context: Context, _actionId: string): boolean;
}

export class PreRegisteredAction extends Common.ObjectWrapper.ObjectWrapper implements Action {
  _enabled = true;
  _toggled = false;
  _actionRegistration: ActionRegistration;
  constructor(actionRegistration: ActionRegistration) {
    super();
    this._actionRegistration = actionRegistration;
  }

  id(): string {
    return this._actionRegistration.actionId;
  }

  async execute(): Promise<boolean> {
    if (!this._actionRegistration.loadActionDelegate) {
      return false;
    }
    const delegate = await this._actionRegistration.loadActionDelegate();
    const actionId = this.id();
    return delegate.handleAction(Context.instance(), actionId);
  }

  icon(): string|undefined {
    return this._actionRegistration.iconClass;
  }

  toggledIcon(): string|undefined {
    return this._actionRegistration.toggledIconClass;
  }

  toggleWithRedColor(): boolean {
    return !!this._actionRegistration.toggleWithRedColor;
  }

  setEnabled(enabled: boolean) {
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
    return this._actionRegistration.category;
  }

  tags(): string|undefined {
    return this._actionRegistration.tags;
  }

  toggleable(): boolean {
    return !!this._actionRegistration.toggleable;
  }

  title(): string {
    let title = this._actionRegistration.title || '';
    const options = this._actionRegistration.options;
    if (options) {
      // Actions with an 'options' property don't have a title field. Instead, the displayed
      // title is taken from the 'title' property of the option that is not active. Only one of the
      // two options can be active at a given moment and the 'toggled' property of the action along
      // with the 'value' of the options are used to determine which one it is.

      for (const pair of options) {
        if (pair.value !== this._toggled) {
          title = pair.title;
        }
      }
    }
    return title;
  }

  toggled(): boolean {
    return this._toggled;
  }

  setToggled(toggled: boolean) {
    console.assert(this.toggleable(), 'Shouldn\'t be toggling an untoggleable action', this.id());
    if (this._toggled === toggled) {
      return;
    }

    this._toggled = toggled;
    this.dispatchEventToListeners(Events.Toggled, toggled);
  }

  options(): undefined|Array<ExtensionOption> {
    return this._actionRegistration.options;
  }

  contextTypes(): undefined|Array<unknown> {
    if (this._actionRegistration.contextTypes) {
      return this._actionRegistration.contextTypes();
    }
    return undefined;
  }

  canInstantiate(): boolean {
    return !!this._actionRegistration.loadActionDelegate;
  }

  bindings(): Array<Binding>|undefined {
    return this._actionRegistration.bindings;
  }

  experiment(): string|undefined {
    return this._actionRegistration.experiment;
  }

  condition(): string|undefined {
    return this._actionRegistration.condition;
  }
}

const registeredActionExtensions: Array<PreRegisteredAction> = [];

const actionIdSet = new Set<string>();

export function registerActionExtension(registration: ActionRegistration) {
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

export const enum Platform {
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
};

type ActionCategory = typeof ActionCategory[keyof typeof ActionCategory];

export const enum IconClass {
  LARGEICON_NODE_SEARCH = 'largeicon-node-search',
}

export const enum KeybindSet {
  DEVTOOLS_DEFAULT = 'devToolsDefault',
  VS_CODE = 'vsCode',
}

export interface ExtensionOption {
  value: boolean;
  title: string;
  text?: string;
}

export interface Binding {
  platform?: Platform;
  shortcut: string;
  keybindSets?: Array<KeybindSet>;
}

export interface ActionRegistration {
  actionId: string;
  category: ActionCategory;
  title?: string;
  iconClass?: string;
  toggledIconClass?: string;
  toggleWithRedColor?: boolean;
  tags?: string;
  toggleable?: boolean;
  loadActionDelegate?: () => Promise<ActionDelegate>;
  contextTypes?: () => Array<unknown>;
  options?: Array<ExtensionOption>;
  bindings?: Array<Binding>;
  experiment?: Root.Runtime.ExperimentName;
  condition?: Root.Runtime.ConditionName;
}
