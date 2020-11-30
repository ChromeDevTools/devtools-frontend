// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';

import {Context} from './Context.js';

class ActionRuntimeExtensionDescriptor extends  // eslint-disable-line no-unused-vars
    Root.Runtime.RuntimeExtensionDescriptor {
  constructor() {
    super();

    /** @type {string|null} */
    this.iconClass;

    /** @type {string|null} */
    this.toggledIconClass;

    /** @type {boolean|null} */
    this.toggleWithRedColor;

    /** @type {string|null} */
    this.category;

    /** @type {string|null} */
    this.tags;

    /** @type {boolean|null} */
    this.toggleable;

    /**
     * @type {!Array<{
     *   value: boolean,
     *   title: string,
     *   raw: undefined,
     *   text: string,
     * }>|undefined}
     */
    this.options;
  }
}

/**
 * @interface
 */
export class Action extends Common.EventTarget.EventTarget {
  /**
   * @return {string}
   */
  id() {
    throw new Error('not implemented');
  }

  /**
   * @return {!Promise.<boolean>}
   */
  async execute() {
    throw new Error('not implemented');
  }

  /**
   * @return {string|undefined}
   */
  icon() {
    throw new Error('not implemented');
  }

  /**
   * @return {string|undefined}
   */
  toggledIcon() {
    throw new Error('not implemented');
  }

  /**
   * @return {boolean}
   */
  toggleWithRedColor() {
    throw new Error('not implemented');
  }

  /**
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    throw new Error('not implemented');
  }

  /**
   * @return {boolean}
   */
  enabled() {
    throw new Error('not implemented');
  }

  /**
   * @return {string}
   */
  category() {
    throw new Error('not implemented');
  }

  /**
   * @return {string|undefined}
   */
  tags() {
    throw new Error('not implemented');
  }

  /**
   * @return {boolean}
   */
  toggleable() {
    throw new Error('not implemented');
  }

  /**
   * @return {string}
   */
  title() {
    throw new Error('not implemented');
  }

  /**
   * @return {boolean}
   */
  toggled() {
    throw new Error('not implemented');
  }

  /**
   * @param {boolean} toggled
   */
  setToggled(toggled) {
    throw new Error('not implemented');
  }
}

/**
 * @implements {Action}
 */
export class LegacyActionRegistration extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {!Root.Runtime.Extension} extension
   */
  constructor(extension) {
    super();
    this._extension = extension;
    /** @type {boolean} */
    this._enabled = true;
    /** @type {boolean} */
    this._toggled = false;
  }

  /**
   * @override
   * @return {string}
   */
  id() {
    return this._actionDescriptor().actionId || '';
  }

  /**
   * @return {!Root.Runtime.Extension}
   */
  extension() {
    return this._extension;
  }

  /**
   * @override
   * @return {!Promise.<boolean>}
   */
  async execute() {
    if (!this._extension.canInstantiate()) {
      return false;
    }
    const delegate = /** @type {!ActionDelegate} */ (await this._extension.instance());
    const actionId = this.id();
    return delegate.handleAction(Context.instance(), actionId);
  }

  /**
   * @override
   * @return {string}
   */
  icon() {
    return this._actionDescriptor().iconClass || '';
  }

  /**
   * @override
   * @return {string}
   */
  toggledIcon() {
    return this._actionDescriptor().toggledIconClass || '';
  }

  /**
   * @override
   * @return {boolean}
   */
  toggleWithRedColor() {
    return !!this._actionDescriptor().toggleWithRedColor;
  }

  /**
   * @override
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    if (this._enabled === enabled) {
      return;
    }

    this._enabled = enabled;
    this.dispatchEventToListeners(Events.Enabled, enabled);
  }

  /**
   * @override
   * @return {boolean}
   */
  enabled() {
    return this._enabled;
  }

  /**
   * @override
   * @return {string}
   */
  category() {
    return ls`${this._actionDescriptor().category || ''}`;
  }

  /**
   * @override
   * @return {string}
   */
  tags() {
    const keys = this._actionDescriptor().tags || '';
    // Get localized keys and separate by null character to prevent fuzzy matching from matching across them.
    const keyList = keys.split(',');
    let key = '';
    keyList.forEach(k => {
      key += (ls(k.trim()) + '\0');
    });
    return key;
  }

  /**
   * @override
   * @return {boolean}
   */
  toggleable() {
    return !!this._actionDescriptor().toggleable;
  }

  /**
   * @override
   * @return {string}
   */
  title() {
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

  /**
   * @override
   * @return {boolean}
   */
  toggled() {
    return this._toggled;
  }

  /**
   * @override
   * @param {boolean} toggled
   */
  setToggled(toggled) {
    console.assert(this.toggleable(), 'Shouldn\'t be toggling an untoggleable action', this.id());
    if (this._toggled === toggled) {
      return;
    }

    this._toggled = toggled;
    this.dispatchEventToListeners(Events.Toggled, toggled);
  }

  /**
   * @return {!ActionRuntimeExtensionDescriptor}
   */
  _actionDescriptor() {
    return /** @type {!ActionRuntimeExtensionDescriptor} */ (this._extension.descriptor());
  }
}

/**
 * @interface
 */
export class ActionDelegate {
  /**
   * @param {!Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    throw new Error('not implemented');
  }
}

/**
 * @implements {Action}
 */
export class PreRegisteredAction extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {!ActionRegistration} actionRegistration
   */
  constructor(actionRegistration) {
    super();
    this._actionRegistration = actionRegistration;
    /** @type {boolean} */
    this._enabled = true;
    /** @type {boolean} */
    this._toggled = false;
  }

  /**
   * @override
   * @return {string}
   */
  id() {
    return this._actionRegistration.actionId;
  }

  /**
   * @override
   * @return {!Promise<boolean>}
   */
  async execute() {
    if (!this._actionRegistration.loadActionDelegate) {
      return false;
    }
    const delegate = await this._actionRegistration.loadActionDelegate();
    const actionId = this.id();
    return delegate.handleAction(Context.instance(), actionId);
  }

  /**
   * @override
   * @return {string|undefined}
   */
  icon() {
    return this._actionRegistration.iconClass;
  }

  /**
   * @override
   * @return {string|undefined}
   */
  toggledIcon() {
    return this._actionRegistration.toggledIconClass;
  }

  /**
   * @override
   * @return {boolean}
   */
  toggleWithRedColor() {
    return !!this._actionRegistration.toggleWithRedColor;
  }

  /**
   * @override
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    if (this._enabled === enabled) {
      return;
    }

    this._enabled = enabled;
    this.dispatchEventToListeners(Events.Enabled, enabled);
  }

  /**
   * @override
   * @return {boolean}
   */
  enabled() {
    return this._enabled;
  }

  /**
   * @override
   * @return {string}
   */
  category() {
    return this._actionRegistration.category;
  }

  /**
   * @override
   * @return {string|undefined}
   */
  tags() {
    return this._actionRegistration.tags;
  }

  /**
   * @override
   * @return {boolean}
   */
  toggleable() {
    return !!this._actionRegistration.toggleable;
  }

  /**
   * @override
   * @return {string}
   */
  title() {
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

  /**
   * @override
   * @return {boolean}
   */
  toggled() {
    return this._toggled;
  }

  /**
   * @override
   * @param {boolean} toggled
   */
  setToggled(toggled) {
    console.assert(this.toggleable(), 'Shouldn\'t be toggling an untoggleable action', this.id());
    if (this._toggled === toggled) {
      return;
    }

    this._toggled = toggled;
    this.dispatchEventToListeners(Events.Toggled, toggled);
  }

  /**
   * @return {undefined|!Array<!ExtensionOption>}
   */
  options() {
    return this._actionRegistration.options;
  }

  /**
   * @return {(undefined|!Array<function(new:Object, ...*):void>)}
   */
  contextTypes() {
    if (this._actionRegistration.contextTypes) {
      return this._actionRegistration.contextTypes();
    }
    return undefined;
  }

  /**
   * @return {boolean}
   */
  canInstantiate() {
    return !!this._actionRegistration.loadActionDelegate;
  }

  /**
   * @return {!Array<!Binding>|undefined}
   */
  bindings() {
    return this._actionRegistration.bindings;
  }

  /**
   * @return {(string|undefined)}
   */
  experiment() {
    return this._actionRegistration.experiment;
  }

  /**
   * @return {(string|undefined)}
   */
  condition() {
    return this._actionRegistration.condition;
  }
}

/** @type {!Array<!PreRegisteredAction>} */
const registeredActionExtensions = [];

/** @type {!Map<string,!Set<string>>} */
const shortcutsByPlatformMap = new Map();

/** @type {!Set<string>} */
const actionIdSet = new Set();

/**
 * @enum {string}
 */
export const Platform = {
  All: 'All platforms',
  Mac: 'mac',
  WindowsLinux: 'windows,linux',
  Android: 'Android',
};

/**
 * @param {!ActionRegistration} registration
 */
export function registerActionExtension(registration) {
  const actionId = registration.actionId;
  if (actionIdSet.has(actionId)) {
    throw new Error(`Duplicate Action id '${actionId}': ${new Error().stack}`);
  }
  actionIdSet.add(actionId);
  const preRegisteredAction = new PreRegisteredAction(registration);
  const bindings = preRegisteredAction.bindings();
  for (let i = 0; bindings && i < bindings.length; i++) {
    const shortcut = bindings[i].shortcut;
    const platform = bindings[i].platform || Platform.All;
    const currentPlatformShortcuts = shortcutsByPlatformMap.get(platform) || new Set();
    const allPlatformsShortcuts = shortcutsByPlatformMap.get(Platform.All) || new Set();
    if (allPlatformsShortcuts.has(shortcut) || currentPlatformShortcuts.has(shortcut)) {
      throw new Error(`Duplicate shortcut binding for shortcut '${shortcut}' on platform '${platform}'`);
    }
    currentPlatformShortcuts.add(shortcut);
    shortcutsByPlatformMap.set(platform, currentPlatformShortcuts);
  }
  registeredActionExtensions.push(preRegisteredAction);
}

/**
 * @return {!Array.<!PreRegisteredAction>}
 */
export function getRegisteredActionExtensions() {
  return registeredActionExtensions.filter(
      action =>
          Root.Runtime.Runtime.isDescriptorEnabled({experiment: action.experiment(), condition: action.condition()}));
}


/** @enum {symbol} */
export const Events = {
  Enabled: Symbol('Enabled'),
  Toggled: Symbol('Toggled')
};

/** @enum {string} */
export const ActionCategory = {
  ELEMENTS: ls`Elements`
};


/**
 * @typedef {{
  *  value: boolean,
  *  title: string,
  *  text: (string|undefined),
  * }}
  */
// @ts-ignore typedef
export let ExtensionOption;

/**
 * @typedef {{
  *  platform: (Platform|undefined),
  *  shortcut: string,
  *  keybindSets: (!Array<string>|undefined),
  * }}
  */
// @ts-ignore typedef
export let Binding;

/**
 * @typedef {{
  *  actionId: string,
  *  category: !ActionCategory,
  *  title: (string|undefined),
  *  iconClass: (string|undefined),
  *  toggledIconClass: (string|undefined),
  *  toggleWithRedColor: (boolean|undefined),
  *  tags: (string|undefined),
  *  toggleable: (boolean|undefined),
  *  loadActionDelegate: (undefined|function():!Promise<!ActionDelegate>),
  *  contextTypes: (undefined|function():!Array<function(new:Object, ...*):void>),
  *  options: (undefined|!Array<!ExtensionOption>),
  *  bindings: (!Array<!Binding>|undefined),
  *  experiment: (string|undefined),
  *  condition: (string|undefined)
  * }}
  */
// @ts-ignore typedef
export let ActionRegistration;
