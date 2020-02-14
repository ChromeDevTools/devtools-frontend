// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

import {FileSystemWorkspaceBinding} from './FileSystemWorkspaceBinding.js';
import {Events, PersistenceBinding, PersistenceImpl} from './PersistenceImpl.js';  // eslint-disable-line no-unused-vars

export class PersistenceUtils {
  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {string}
   */
  static tooltipForUISourceCode(uiSourceCode) {
    const binding = self.Persistence.persistence.binding(uiSourceCode);
    if (!binding) {
      return '';
    }
    if (uiSourceCode === binding.network) {
      return FileSystemWorkspaceBinding.tooltipForUISourceCode(binding.fileSystem);
    }
    if (binding.network.contentType().isFromSourceMap()) {
      return Common.UIString.UIString('Linked to source map: %s', binding.network.url().trimMiddle(150));
    }
    return Common.UIString.UIString('Linked to %s', binding.network.url().trimMiddle(150));
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {?UI.Icon.Icon}
   */
  static iconForUISourceCode(uiSourceCode) {
    const binding = self.Persistence.persistence.binding(uiSourceCode);
    if (binding) {
      if (!binding.fileSystem.url().startsWith('file://')) {
        return null;
      }
      const icon = UI.Icon.Icon.create('mediumicon-file-sync');
      icon.title = PersistenceUtils.tooltipForUISourceCode(binding.network);
      // TODO(allada) This will not work properly with dark theme.
      if (self.Persistence.networkPersistenceManager.project() === binding.fileSystem.project()) {
        icon.style.filter = 'hue-rotate(160deg)';
      }
      return icon;
    }
    if (uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.FileSystem ||
        !uiSourceCode.url().startsWith('file://')) {
      return null;
    }

    const icon = UI.Icon.Icon.create('mediumicon-file');
    icon.title = PersistenceUtils.tooltipForUISourceCode(uiSourceCode);
    return icon;
  }
}

/**
 * @extends {Common.ObjectWrapper.ObjectWrapper}
 * @implements {Components.Linkifier.LinkDecorator}
 */
export class LinkDecorator extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {!PersistenceImpl} persistence
   */
  constructor(persistence) {
    super();
    persistence.addEventListener(Events.BindingCreated, this._bindingChanged, this);
    persistence.addEventListener(Events.BindingRemoved, this._bindingChanged, this);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _bindingChanged(event) {
    const binding = /** @type {!PersistenceBinding} */ (event.data);
    this.dispatchEventToListeners(Components.Linkifier.LinkDecorator.Events.LinkIconChanged, binding.network);
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {?UI.Icon.Icon}
   */
  linkIcon(uiSourceCode) {
    return PersistenceUtils.iconForUISourceCode(uiSourceCode);
  }
}
