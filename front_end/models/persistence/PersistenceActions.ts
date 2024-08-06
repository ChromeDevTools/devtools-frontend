// Copyright (c) 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Bindings from '../bindings/bindings.js';
import type * as TextUtils from '../text_utils/text_utils.js';
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
   *@description Context menu item for showing all overridden files
   */
  showOverrides: 'Show all overrides',
  /**
   *@description A context menu item in the Persistence Actions of the Workspace settings in Settings
   */
  overrideContent: 'Override content',
  /**
   *@description A context menu item in the Persistence Actions of the Workspace settings in Settings
   */
  openInContainingFolder: 'Open in containing folder',
  /**
   *@description A message in a confirmation dialog in the Persistence Actions
   * @example {bundle.min.js} PH1
   */
  overrideSourceMappedFileWarning: 'Override ‘{PH1}’ instead?',
  /**
   *@description A message in a confirmation dialog to explain why the action is failed in the Persistence Actions
   * @example {index.ts} PH1
   */
  overrideSourceMappedFileExplanation: '‘{PH1}’ is a source mapped file and cannot be overridden.',
  /**
   * @description An error message shown in the DevTools console after the user clicked "Save as" in
   * the context menu of a WebAssembly file.
   */
  saveWasmFailed: 'Unable to save WASM module to disk. Most likely the module is too large.',
};
const str_ = i18n.i18n.registerUIStrings('models/persistence/PersistenceActions.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ContextMenuProvider implements
    UI.ContextMenu
        .Provider<Workspace.UISourceCode.UISourceCode|SDK.Resource.Resource|SDK.NetworkRequest.NetworkRequest> {
  appendApplicableItems(
      _event: Event, contextMenu: UI.ContextMenu.ContextMenu,
      contentProvider: TextUtils.ContentProvider.ContentProvider): void {
    async function saveAs(): Promise<void> {
      if (contentProvider instanceof Workspace.UISourceCode.UISourceCode) {
        (contentProvider as Workspace.UISourceCode.UISourceCode).commitWorkingCopy();
      }
      const url = contentProvider.contentURL();
      let content: TextUtils.ContentProvider.DeferredContent;
      const maybeScript = getScript(contentProvider);
      if (maybeScript?.isWasm()) {
        try {
          const byteCode = await maybeScript.getWasmBytecode();
          const base64 = await Common.Base64.encode(byteCode);
          content = {isEncoded: true, content: base64};
        } catch (e) {
          console.error(`Unable to convert WASM byte code for ${url} to base64. Not saving to disk`, e.stack);
          Common.Console.Console.instance().error(i18nString(UIStrings.saveWasmFailed), /* show=*/ false);
          return;
        }
      } else {
        content = await contentProvider.requestContent();
      }
      await Workspace.FileManager.FileManager.instance().save(url, content.content ?? '', true, content.isEncoded);
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
      contextMenu.saveSection().appendItem(i18nString(UIStrings.saveAs), saveAs, {jslogContext: 'save-as'});
    } else if (contentProvider instanceof SDK.Resource.Resource && contentProvider.contentType().isImage()) {
      contextMenu.saveSection().appendItem(i18nString(UIStrings.saveImage), saveImage, {jslogContext: 'save-image'});
    }

    // Retrieve uiSourceCode by URL to pick network resources everywhere.
    const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(contentProvider.contentURL());
    const networkPersistenceManager = NetworkPersistenceManager.instance();

    const binding = uiSourceCode && PersistenceImpl.instance().binding(uiSourceCode);
    const fileURL = binding ? binding.fileSystem.contentURL() : contentProvider.contentURL();

    if (Common.ParsedURL.schemeIs(fileURL, 'file:')) {
      const path = Common.ParsedURL.ParsedURL.urlToRawPathString(fileURL, Host.Platform.isWin());
      contextMenu.revealSection().appendItem(
          i18nString(UIStrings.openInContainingFolder),
          () => Host.InspectorFrontendHost.InspectorFrontendHostInstance.showItemInFolder(path),
          {jslogContext: 'open-in-containing-folder'});
    }

    if (contentProvider instanceof Workspace.UISourceCode.UISourceCode &&
        (contentProvider.project().type() === Workspace.Workspace.projectTypes.FileSystem)) {
      // Do not append in Sources > Workspace & Overrides tab
      return;
    }

    let disabled = true;
    let handler = (): void => {};
    if (uiSourceCode && networkPersistenceManager.isUISourceCodeOverridable(uiSourceCode)) {
      if (!uiSourceCode.contentType().isFromSourceMap()) {
        disabled = false;
        handler = this.handleOverrideContent.bind(this, uiSourceCode, contentProvider);
      } else {
        // show redirect dialog for source mapped file
        const deployedUiSourceCode = this.getDeployedUiSourceCode(uiSourceCode);
        if (deployedUiSourceCode) {
          disabled = false;
          handler = this.redirectOverrideToDeployedUiSourceCode.bind(this, deployedUiSourceCode, uiSourceCode);
        }
      }
    }
    contextMenu.overrideSection().appendItem(
        i18nString(UIStrings.overrideContent), handler, {disabled, jslogContext: 'override-content'});

    if (contentProvider instanceof SDK.NetworkRequest.NetworkRequest) {
      contextMenu.overrideSection().appendItem(i18nString(UIStrings.showOverrides), async () => {
        await UI.ViewManager.ViewManager.instance().showView('navigator-overrides');
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.ShowAllOverridesFromNetworkContextMenu);
      }, {jslogContext: 'show-overrides'});
    }
  }

  private async handleOverrideContent(
      uiSourceCode: Workspace.UISourceCode.UISourceCode,
      contentProvider: TextUtils.ContentProvider.ContentProvider): Promise<void> {
    const networkPersistenceManager = NetworkPersistenceManager.instance();
    const isSuccess = await networkPersistenceManager.setupAndStartLocalOverrides(uiSourceCode);
    if (isSuccess) {
      await Common.Revealer.reveal(uiSourceCode);
    }

    // Collect metrics: Context menu access point
    if (contentProvider instanceof SDK.NetworkRequest.NetworkRequest) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideContentFromNetworkContextMenu);
    } else if (contentProvider instanceof Workspace.UISourceCode.UISourceCode) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideContentFromSourcesContextMenu);
    }
    // Collect metrics: Content type
    if (uiSourceCode.isFetchXHR()) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideFetchXHR);
    } else if (contentProvider.contentType().isScript()) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideScript);
    } else if (contentProvider.contentType().isDocument()) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideDocument);
    } else if (contentProvider.contentType().isStyleSheet()) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideStyleSheet);
    } else if (contentProvider.contentType().isImage()) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideImage);
    } else if (contentProvider.contentType().isFont()) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideFont);
    }
  }

  private async redirectOverrideToDeployedUiSourceCode(
      deployedUiSourceCode: Workspace.UISourceCode.UISourceCode,
      originalUiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideContentContextMenuSourceMappedWarning);
    const deployedUrl = deployedUiSourceCode.url();
    const deployedName = Bindings.ResourceUtils.displayNameForURL(deployedUrl);

    const originalUrl = originalUiSourceCode.url();
    const originalName = Bindings.ResourceUtils.displayNameForURL(originalUrl);

    const warningMessage = i18nString(UIStrings.overrideSourceMappedFileWarning, {PH1: deployedName}) + '\n' +
        i18nString(UIStrings.overrideSourceMappedFileExplanation, {PH1: originalName});

    const shouldJumpToDeployedFile = await UI.UIUtils.ConfirmDialog.show(
        warningMessage, undefined, {jslogContext: 'override-source-mapped-file-warning'});

    if (shouldJumpToDeployedFile) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideContentContextMenuRedirectToDeployed);
      await this.handleOverrideContent(deployedUiSourceCode, deployedUiSourceCode);
    }
  }

  private getDeployedUiSourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode):
      Workspace.UISourceCode.UISourceCode|null {
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();

    for (const deployedScript of debuggerWorkspaceBinding.scriptsForUISourceCode(uiSourceCode)) {
      const deployedUiSourceCode = debuggerWorkspaceBinding.uiSourceCodeForScript(deployedScript);
      if (deployedUiSourceCode) {
        return deployedUiSourceCode;
      }
    }

    const [deployedStylesUrl] = Bindings.SASSSourceMapping.SASSSourceMapping.uiSourceOrigin(uiSourceCode);

    if (!deployedStylesUrl) {
      return null;
    }

    const deployedUiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(deployedStylesUrl) ||
        Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(
            Common.ParsedURL.ParsedURL.urlWithoutHash(deployedStylesUrl) as Platform.DevToolsPath.UrlString);

    return deployedUiSourceCode;
  }
}

/**
 * @returns The script if the content provider is a UISourceCode and the DebuggerModel actually created one for the UISourceCode.
 */
function getScript(contentProvider: TextUtils.ContentProvider.ContentProvider): SDK.Script.Script|null {
  if (!(contentProvider instanceof Workspace.UISourceCode.UISourceCode)) {
    return null;
  }

  // First we try to resolve the target and use that to get the script.
  const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(contentProvider);
  const model = target?.model(SDK.DebuggerModel.DebuggerModel);
  if (model) {
    const resourceFile =
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().scriptFile(contentProvider, model);
    if (resourceFile?.script) {
      return resourceFile.script;
    }
  }

  // Otherwise we'll check all possible scripts for this UISourceCode and take the first one.
  return Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().scriptsForUISourceCode(
             contentProvider)[0] ??
      null;
}
