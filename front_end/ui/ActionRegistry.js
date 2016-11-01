// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.ActionRegistry = class {
  constructor() {
    /** @type {!Map.<string, !WebInspector.Action>} */
    this._actionsById = new Map();
    this._registerActions();
  }

  _registerActions() {
    self.runtime.extensions(WebInspector.ActionDelegate).forEach(registerExtension, this);

    /**
     * @param {!Runtime.Extension} extension
     * @this {WebInspector.ActionRegistry}
     */
    function registerExtension(extension) {
      var actionId = extension.descriptor()['actionId'];
      console.assert(actionId);
      console.assert(!this._actionsById.get(actionId));
      this._actionsById.set(actionId, new WebInspector.Action(extension));
    }
  }

  /**
   * @return {!Array.<!WebInspector.Action>}
   */
  availableActions() {
    return this.applicableActions(this._actionsById.keysArray(), WebInspector.context);
  }

  /**
   * @param {!Array.<string>} actionIds
   * @param {!WebInspector.Context} context
   * @return {!Array.<!WebInspector.Action>}
   */
  applicableActions(actionIds, context) {
    var extensions = [];
    actionIds.forEach(function(actionId) {
      var action = this._actionsById.get(actionId);
      if (action)
        extensions.push(action._extension);
    }, this);
    return context.applicableExtensions(extensions).valuesArray().map(extensionToAction.bind(this));

    /**
     * @param {!Runtime.Extension} extension
     * @return {!WebInspector.Action}
     * @this {WebInspector.ActionRegistry}
     */
    function extensionToAction(extension) {
      return /** @type {!WebInspector.Action} */ (this.action(extension.descriptor()['actionId']));
    }
  }

  /**
   * @param {string} actionId
   * @return {?WebInspector.Action}
   */
  action(actionId) {
    return this._actionsById.get(actionId) || null;
  }
};

/**
 * @unrestricted
 */
WebInspector.Action = class extends WebInspector.Object {
  /**
   * @param {!Runtime.Extension} extension
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
   * @return {!Promise.<boolean>}
   */
  execute() {
    return this._extension.instance().then(handleAction.bind(this));

    /**
     * @param {!Object} actionDelegate
     * @return {boolean}
     * @this {WebInspector.Action}
     */
    function handleAction(actionDelegate) {
      var actionId = this._extension.descriptor()['actionId'];
      var delegate = /** @type {!WebInspector.ActionDelegate} */ (actionDelegate);
      return delegate.handleAction(WebInspector.context, actionId);
    }
  }

  /**
   * @return {string}
   */
  icon() {
    return this._extension.descriptor()['iconClass'] || '';
  }

  /**
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    if (this._enabled === enabled)
      return;

    this._enabled = enabled;
    this.dispatchEventToListeners(WebInspector.Action.Events.Enabled, enabled);
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
    return this._extension.descriptor()['category'] || '';
  }

  /**
   * @return {string}
   */
  tags() {
    return this._extension.descriptor()['tags'] || '';
  }

  /**
   * @return {string}
   */
  title() {
    var title = this._extension.title();
    var options = this._extension.descriptor()['options'];
    if (options) {
      for (var pair of options) {
        if (pair['value'] !== this._toggled)
          title = pair['title'];
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
    if (this._toggled === toggled)
      return;

    this._toggled = toggled;
    this.dispatchEventToListeners(WebInspector.Action.Events.Toggled, toggled);
  }
};

/** @enum {symbol} */
WebInspector.Action.Events = {
  Enabled: Symbol('Enabled'),
  Toggled: Symbol('Toggled')
};

/**
 * @interface
 */
WebInspector.ActionDelegate = function() {};

WebInspector.ActionDelegate.prototype = {
  /**
   * @param {!WebInspector.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction: function(context, actionId) {}
};

/** @type {!WebInspector.ActionRegistry} */
WebInspector.actionRegistry;
