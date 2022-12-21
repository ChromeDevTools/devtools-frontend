// Copyright (c) 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';

import type * as TextUtils from '../text_utils/text_utils.js';
import type * as UI from '../../ui/legacy/legacy.js';
import * as Workspace from '../workspace/workspace.js';

import {NetworkPersistenceManager} from './NetworkPersistenceManager.js';
import {PersistenceImpl} from './PersistenceImpl.js';

const UIStrings = {
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
const str_ = i18n.i18n.registerUIStrings('models/persistence/PersistenceActions.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let contextMenuProviderInstance: ContextMenuProvider;

export class ContextMenuProvider implements UI.ContextMenu.Provider {
  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): ContextMenuProvider {
    const {forceNew} = opts;
    if (!contextMenuProviderInstance || forceNew) {
      contextMenuProviderInstance = new ContextMenuProvider();
    }

    return contextMenuProviderInstance;
  }

  appendApplicableItems(event: Event, contextMenu: UI.ContextMenu.ContextMenu, target: Object): void {
    const contentProvider = target as TextUtils.ContentProvider.ContentProvider;

    async function saveAs(): Promise<void> {
      if (contentProvider instanceof Workspace.UISourceCode.UISourceCode) {
        (contentProvider as Workspace.UISourceCode.UISourceCode).commitWorkingCopy();
      }
      const content = await contentProvider.requestContent();
      let decodedContent = content.content || '';
      if (content.isEncoded) {
        decodedContent = window.atob(decodedContent);
      }
      const url = contentProvider.contentURL();
      void Workspace.FileManager.FileManager.instance().save(url, decodedContent, true);
      Workspace.FileManager.FileManager.instance().close(url);
    }

    async function saveImage(): Promise<void> {
      const targetObject = contentProvider as SDK.Resource.Resource;
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
        void NetworkPersistenceManager.instance().saveUISourceCodeForOverrides(
            uiSourceCode as Workspace.UISourceCode.UISourceCode);
        void Common.Revealer.reveal(uiSourceCode);
      });
    }

    const binding = uiSourceCode && PersistenceImpl.instance().binding(uiSourceCode);
    const fileURL = binding ? binding.fileSystem.contentURL() : contentProvider.contentURL();
    if (fileURL.startsWith('file://')) {
      const path = Common.ParsedURL.ParsedURL.urlToRawPathString(fileURL, Host.Platform.isWin());
      contextMenu.revealSection().appendItem(
          i18nString(UIStrings.openInContainingFolder),
          () => Host.InspectorFrontendHost.InspectorFrontendHostInstance.showItemInFolder(path));
    }
  }
}
