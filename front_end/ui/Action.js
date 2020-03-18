// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import {ActionDelegate} from './ActionDelegate.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class Action extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {!Root.Runtime.Extension} extension
   */
  constructor(extension) {
    super();
    this._extension = extension;
    this._enabled = true;
    this._toggled = false;
  }

  /**
   * @return {string}
   */
  id() {
    return this._extension.descriptor()['actionId'];
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
  execute() {
    return this._extension.instance().then(handleAction.bind(this));

    /**
     * @param {!Object} actionDelegate
     * @return {boolean}
     * @this {Action}
     */
    function handleAction(actionDelegate) {
      const actionId = this._extension.descriptor()['actionId'];
      const delegate = /** @type {!ActionDelegate} */ (actionDelegate);
      return delegate.handleAction(self.UI.context, actionId);
    }
  }

  /**
   * @return {string}
   */
  icon() {
    return this._extension.descriptor()['iconClass'] || '';
  }

  /**
   * @return {string}
   */
  toggledIcon() {
    return this._extension.descriptor()['toggledIconClass'] || '';
  }

  /**
   * @return {boolean}
   */
  toggleWithRedColor() {
    return !!this._extension.descriptor()['toggleWithRedColor'];
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
    return ls(this._extension.descriptor()['category'] || '');
  }

  /**
   * @return {string}
   */
  tags() {
    return this._extension.descriptor()['tags'] || '';
  }

  /**
   * @return {boolean}
   */
  toggleable() {
    return !!this._extension.descriptor()['toggleable'];
  }

  /**
   * @return {string}
   */
  title() {
    let title = this._extension.title() || '';
    const options = this._extension.descriptor()['options'];
    if (options) {
      for (const pair of options) {
        if (pair['value'] !== this._toggled) {
          title = ls(pair['title']);
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
}

/** @enum {symbol} */
export const Events = {
  Enabled: Symbol('Enabled'),
  Toggled: Symbol('Toggled')
};
