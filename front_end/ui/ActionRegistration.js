// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
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
   * @return {string}
   */
  icon() {
    throw new Error('not implemented');
  }

  /**
   * @return {string}
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
   * @return {string}
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
    return this._actionDescriptor().tags || '';
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

/** @enum {symbol} */
export const Events = {
  Enabled: Symbol('Enabled'),
  Toggled: Symbol('Toggled')
};

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
