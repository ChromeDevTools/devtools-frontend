// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Persistence.PersistenceUtils = class {
  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {string}
   */
  static tooltipForUISourceCode(uiSourceCode) {
    var binding = Persistence.persistence.binding(uiSourceCode);
    if (!binding)
      return '';
    if (uiSourceCode === binding.network)
      return Common.UIString('Persisted to file system: %s', binding.fileSystem.url().trimMiddle(150));
    if (binding.network.contentType().isFromSourceMap())
      return Common.UIString('Linked to source map: %s', binding.network.url().trimMiddle(150));
    return Common.UIString('Linked to %s', binding.network.url().trimMiddle(150));
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {?UI.Icon}
   */
  static iconForUISourceCode(uiSourceCode) {
    if (!Runtime.experiments.isEnabled('persistence2'))
      return null;
    var binding = Persistence.persistence.binding(uiSourceCode);
    if (binding) {
      var icon = UI.Icon.create('mediumicon-file-sync');
      icon.title = Persistence.PersistenceUtils.tooltipForUISourceCode(binding.fileSystem);
      // TODO(allada) This will not work properly with dark theme.
      if (Persistence.networkPersistenceManager.projects().has(binding.fileSystem.project()))
        icon.style.filter = 'hue-rotate(160deg)';
      return icon;
    }
    if (uiSourceCode.project().type() !== Workspace.projectTypes.FileSystem)
      return null;
    var icon = UI.Icon.create('mediumicon-file');
    icon.title = Persistence.PersistenceUtils.tooltipForUISourceCode(uiSourceCode);
    return icon;
  }
};

/**
 * @extends {Common.Object}
 * @implements {Components.LinkDecorator}
 */
Persistence.PersistenceUtils.LinkDecorator = class extends Common.Object {
  /**
   * @param {!Persistence.Persistence} persistence
   */
  constructor(persistence) {
    super();
    persistence.addEventListener(Persistence.Persistence.Events.BindingCreated, this._bindingChanged, this);
    persistence.addEventListener(Persistence.Persistence.Events.BindingRemoved, this._bindingChanged, this);
  }

  /**
   * @param {!Common.Event} event
   */
  _bindingChanged(event) {
    var binding = /** @type {!Persistence.PersistenceBinding} */ (event.data);
    this.dispatchEventToListeners(Components.LinkDecorator.Events.LinkIconChanged, binding.network);
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {?UI.Icon}
   */
  linkIcon(uiSourceCode) {
    return Persistence.PersistenceUtils.iconForUISourceCode(uiSourceCode);
  }
};