// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Root from '../root/root.js';

import {ActionDelegate} from './ActionDelegate.js';  // eslint-disable-line no-unused-vars
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
     * @type {?Array<{
     *   value: boolean,
     *   title: string,
     * }>}
     */
    this.options;
  }
}

export class Action extends Common.ObjectWrapper.ObjectWrapper {
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
   * @return {string}
   */
  icon() {
    return this._actionDescriptor().iconClass || '';
  }

  /**
   * @return {string}
   */
  toggledIcon() {
    return this._actionDescriptor().toggledIconClass || '';
  }

  /**
   * @return {boolean}
   */
  toggleWithRedColor() {
    return !!this._actionDescriptor().toggleWithRedColor;
  }

  /**
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
   * @return {boolean}
   */
  enabled() {
    return this._enabled;
  }

  /**
   * @return {string}
   */
  category() {
    return ls`${this._actionDescriptor().category || ''}`;
  }

  /**
   * @return {string}
   */
  tags() {
    return this._actionDescriptor().tags || '';
  }

  /**
   * @return {boolean}
   */
  toggleable() {
    return !!this._actionDescriptor().toggleable;
  }

  /**
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
   * @return {boolean}
   */
  toggled() {
    return this._toggled;
  }

  /**
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
