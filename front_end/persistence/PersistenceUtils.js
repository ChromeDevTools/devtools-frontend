// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

WebInspector.PersistenceUtils = class {
  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @return {string}
   */
  static tooltipForUISourceCode(uiSourceCode) {
    var binding = WebInspector.persistence.binding(uiSourceCode);
    if (!binding)
      return '';
    if (uiSourceCode === binding.network)
      return WebInspector.UIString('Persisted to file system: %s', binding.fileSystem.url().trimMiddle(150));
    if (binding.network.contentType().isFromSourceMap())
      return WebInspector.UIString('Linked to source map: %s', binding.network.url().trimMiddle(150));
    return WebInspector.UIString('Linked to %s', binding.network.url().trimMiddle(150));
  }
};

/**
 * @extends {WebInspector.Object}
 * @implements {WebInspector.LinkDecorator}
 */
WebInspector.PersistenceUtils.LinkDecorator = class extends WebInspector.Object {
  /**
   * @param {!WebInspector.Persistence} persistence
   */
  constructor(persistence) {
    super();
    persistence.addEventListener(WebInspector.Persistence.Events.BindingCreated, this._bindingChanged, this);
    persistence.addEventListener(WebInspector.Persistence.Events.BindingRemoved, this._bindingChanged, this);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _bindingChanged(event) {
    var binding = /** @type {!WebInspector.PersistenceBinding} */(event.data);
    this.dispatchEventToListeners(WebInspector.LinkDecorator.Events.LinkIconChanged, binding.network);
  }

  /**
   * @override
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @return {?WebInspector.Icon}
   */
  linkIcon(uiSourceCode) {
    var binding = WebInspector.persistence.binding(uiSourceCode);
    if (!binding)
      return null;
    var icon = WebInspector.Icon.create('smallicon-green-checkmark');
    icon.title = WebInspector.PersistenceUtils.tooltipForUISourceCode(uiSourceCode);
    return icon;
  }
};