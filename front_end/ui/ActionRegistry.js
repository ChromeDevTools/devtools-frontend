// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
export default class ActionRegistry {
  constructor() {
    /** @type {!Map.<string, !UI.Action>} */
    this._actionsById = new Map();
    this._registerActions();
  }

  _registerActions() {
    self.runtime.extensions('action').forEach(registerExtension, this);

    /**
     * @param {!Root.Runtime.Extension} extension
     * @this {UI.ActionRegistry}
     */
    function registerExtension(extension) {
      if (!extension.canInstantiate()) {
        return;
      }
      const actionId = extension.descriptor()['actionId'];
      console.assert(actionId);
      console.assert(!this._actionsById.get(actionId));

      const action = new UI.Action(extension);
      if (!action.category() || action.title()) {
        this._actionsById.set(actionId, action);
      } else {
        console.error(`Category actions require a title for command menu: ${actionId}`);
      }
    }
  }

  /**
   * @return {!Array.<!UI.Action>}
   */
  availableActions() {
    return this.applicableActions(this._actionsById.keysArray(), UI.context);
  }

  /**
   * @param {!Array.<string>} actionIds
   * @param {!UI.Context} context
   * @return {!Array.<!UI.Action>}
   */
  applicableActions(actionIds, context) {
    const extensions = [];
    actionIds.forEach(function(actionId) {
      const action = this._actionsById.get(actionId);
      if (action) {
        extensions.push(action.extension());
      }
    }, this);
    return context.applicableExtensions(extensions).valuesArray().map(extensionToAction.bind(this));

    /**
     * @param {!Root.Runtime.Extension} extension
     * @return {!UI.Action}
     * @this {UI.ActionRegistry}
     */
    function extensionToAction(extension) {
      return /** @type {!UI.Action} */ (this.action(extension.descriptor()['actionId']));
    }
  }

  /**
   * @param {string} actionId
   * @return {?UI.Action}
   */
  action(actionId) {
    return this._actionsById.get(actionId) || null;
  }
}

/* Legacy exported object*/
self.UI = self.UI || {};

/* Legacy exported object*/
UI = UI || {};

/** @constructor */
UI.ActionRegistry = ActionRegistry;

/** @type {!UI.ActionRegistry} */
UI.actionRegistry;
