// Copyright (c) 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';                         // eslint-disable-line no-unused-vars
import * as Workspace from '../workspace/workspace.js';

import {NetworkPersistenceManager} from './NetworkPersistenceManager.js';
import {PersistenceImpl} from './PersistenceImpl.js';

export const UIStrings = {
  /**
  *@description Text to save content as a specific file type
  */
  saveAs: 'Save as...',
  /**
  *@description Context menu item for saving an image
  */
  saveImage: 'Save image',
  /**
  *@description A context menu item in the Persistence Actions of the Workspace settings in Settings
  */
  saveForOverrides: 'Save for overrides',
  /**
  *@description A context menu item in the Persistence Actions of the Workspace settings in Settings
  */
  openInContainingFolder: 'Open in containing folder',
};
const str_ = i18n.i18n.registerUIStrings('persistence/PersistenceActions.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * @type {ContextMenuProvider}
 */
let contextMenuProviderInstance;

/**
 * @implements {UI.ContextMenu.Provider}
 */
export class ContextMenuProvider {
  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!contextMenuProviderInstance || forceNew) {
      contextMenuProviderInstance = new ContextMenuProvider();
    }

    return contextMenuProviderInstance;
  }

  /**
   * @override
   * @param {!Event} event
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!Object} target
   */
  appendApplicableItems(event, contextMenu, target) {
    const contentProvider = /** @type {!TextUtils.ContentProvider.ContentProvider} */ (target);

    async function saveAs() {
      if (contentProvider instanceof Workspace.UISourceCode.UISourceCode) {
        /** @type {!Workspace.UISourceCode.UISourceCode} */ (contentProvider).commitWorkingCopy();
      }
      let content = (await contentProvider.requestContent()).content || '';
      if (await contentProvider.contentEncoded()) {
        content = window.atob(content);
      }
      const url = contentProvider.contentURL();
      Workspace.FileManager.FileManager.instance().save(url, /** @type {string} */ (content), true);
      Workspace.FileManager.FileManager.instance().close(url);
    }

    async function saveImage() {
      const targetObject = /** @type {!SDK.Resource.Resource} */ (contentProvider);
      const content = (await targetObject.requestContent()).content || '';
      const link = document.createElement('a');
      link.download = targetObject.displayName;
      link.href = 'data:' + targetObject.mimeType + ';base64,' + content;
      link.click();
    }

    if (contentProvider.contentType().isDocumentOrScriptOrStyleSheet()) {
      contextMenu.saveSection().appendItem(i18nString(UIStrings.saveAs), saveAs);
    } else if (contentProvider instanceof SDK.Resource.Resource && contentProvider.contentType().isImage()) {
      contextMenu.saveSection().appendItem(i18nString(UIStrings.saveImage), saveImage);
    }

    // Retrieve uiSourceCode by URL to pick network resources everywhere.
    const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(contentProvider.contentURL());
    if (uiSourceCode && NetworkPersistenceManager.instance().canSaveUISourceCodeForOverrides(uiSourceCode)) {
      contextMenu.saveSection().appendItem(i18nString(UIStrings.saveForOverrides), () => {
        uiSourceCode.commitWorkingCopy();
        NetworkPersistenceManager.instance().saveUISourceCodeForOverrides(
            /** @type {!Workspace.UISourceCode.UISourceCode} */ (uiSourceCode));
        Common.Revealer.reveal(uiSourceCode);
      });
    }

    const binding = uiSourceCode && PersistenceImpl.instance().binding(uiSourceCode);
    const fileURL = binding ? binding.fileSystem.contentURL() : contentProvider.contentURL();
    if (fileURL.startsWith('file://')) {
      const path = Common.ParsedURL.ParsedURL.urlToPlatformPath(fileURL, Host.Platform.isWin());
      contextMenu.revealSection().appendItem(
          i18nString(UIStrings.openInContainingFolder),
          () => Host.InspectorFrontendHost.InspectorFrontendHostInstance.showItemInFolder(path));
    }
  }
}
