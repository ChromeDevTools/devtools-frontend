// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as i18n from '../i18n/i18n.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

import {FileSystemWorkspaceBinding} from './FileSystemWorkspaceBinding.js';
import {NetworkPersistenceManager} from './NetworkPersistenceManager.js';
import {Events, PersistenceBinding, PersistenceImpl} from './PersistenceImpl.js';  // eslint-disable-line no-unused-vars

export const UIStrings = {
  /**
  *@description Text in Persistence Utils of the Workspace settings in Settings
  *@example {example.url} PH1
  */
  linkedToSourceMapS: 'Linked to source map: {PH1}',
  /**
  *@description Text to show something is linked to another
  *@example {example.url} PH1
  */
  linkedToS: 'Linked to {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('persistence/PersistenceUtils.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class PersistenceUtils {
  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {string}
   */
  static tooltipForUISourceCode(uiSourceCode) {
    const binding = PersistenceImpl.instance().binding(uiSourceCode);
    if (!binding) {
      return '';
    }
    if (uiSourceCode === binding.network) {
      return FileSystemWorkspaceBinding.tooltipForUISourceCode(binding.fileSystem);
    }
    if (binding.network.contentType().isFromSourceMap()) {
      return i18nString(UIStrings.linkedToSourceMapS, {PH1: binding.network.url().trimMiddle(150)});
    }
    return i18nString(UIStrings.linkedToS, {PH1: binding.network.url().trimMiddle(150)});
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {?UI.Icon.Icon}
   */
  static iconForUISourceCode(uiSourceCode) {
    const binding = PersistenceImpl.instance().binding(uiSourceCode);
    if (binding) {
      if (!binding.fileSystem.url().startsWith('file://')) {
        return null;
      }
      const icon = UI.Icon.Icon.create('mediumicon-file-sync');
      UI.Tooltip.Tooltip.install(icon, PersistenceUtils.tooltipForUISourceCode(binding.network));
      // TODO(allada) This will not work properly with dark theme.
      if (NetworkPersistenceManager.instance().project() === binding.fileSystem.project()) {
        icon.style.filter = 'hue-rotate(160deg)';
      }
      return icon;
    }
    if (uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.FileSystem ||
        !uiSourceCode.url().startsWith('file://')) {
      return null;
    }

    const icon = UI.Icon.Icon.create('mediumicon-file');
    UI.Tooltip.Tooltip.install(icon, PersistenceUtils.tooltipForUISourceCode(uiSourceCode));
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
