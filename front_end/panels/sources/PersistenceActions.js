// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
const UIStrings = {
    /**
     * @description Text to save content as a specific file type
     */
    saveAs: 'Save as…',
    /**
     * @description Context menu item for saving an image
     */
    saveImage: 'Save image',
    /**
     * @description Context menu item for showing all overridden files
     */
    showOverrides: 'Show all overrides',
    /**
     * @description A context menu item in the Persistence Actions of the Workspace settings in Settings
     */
    overrideContent: 'Override content',
    /**
     * @description A context menu item in the Persistence Actions of the Workspace settings in Settings
     */
    openInContainingFolder: 'Open in containing folder',
    /**
     * @description A message in a confirmation dialog in the Persistence Actions
     * @example {bundle.min.js} PH1
     */
    overrideSourceMappedFileWarning: 'Override ‘{PH1}’ instead?',
    /**
     * @description A message in a confirmation dialog to explain why the action is failed in the Persistence Actions
     * @example {index.ts} PH1
     */
    overrideSourceMappedFileExplanation: '‘{PH1}’ is a source mapped file and cannot be overridden.',
    /**
     * @description An error message shown in the DevTools console after the user clicked "Save as" in
     * the context menu of a page resource.
     */
    saveFailed: 'Failed to save file to disk.',
    /**
     * @description An error message shown in the DevTools console after the user clicked "Save as" in
     * the context menu of a WebAssembly file.
     */
    saveWasmFailed: 'Unable to save WASM module to disk. Most likely the module is too large.',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/PersistenceActions.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ContextMenuProvider {
    appendApplicableItems(_event, contextMenu, contentProvider) {
        async function saveAs() {
            if (contentProvider instanceof Workspace.UISourceCode.UISourceCode) {
                (contentProvider).commitWorkingCopy();
            }
            const url = contentProvider.contentURL();
            let contentData;
            const maybeScript = getScript(contentProvider);
            if (maybeScript?.isWasm()) {
                try {
                    const base64 = await maybeScript.getWasmBytecode().then(Common.Base64.encode);
                    contentData = new TextUtils.ContentData.ContentData(base64, /* isBase64=*/ true, 'application/wasm');
                }
                catch (e) {
                    console.error(`Unable to convert WASM byte code for ${url} to base64. Not saving to disk`, e.stack);
                    Common.Console.Console.instance().error(i18nString(UIStrings.saveWasmFailed), /* show=*/ false);
                    return;
                }
            }
            else {
                const contentDataOrError = await contentProvider.requestContentData();
                if (TextUtils.ContentData.ContentData.isError(contentDataOrError)) {
                    console.error(`Failed to retrieve content for ${url}: ${contentDataOrError}`);
                    Common.Console.Console.instance().error(i18nString(UIStrings.saveFailed), /* show=*/ false);
                    return;
                }
                contentData = contentDataOrError;
            }
            await Workspace.FileManager.FileManager.instance().save(url, contentData, /* forceSaveAs=*/ true);
            Workspace.FileManager.FileManager.instance().close(url);
        }
        async function saveImage() {
            const targetObject = contentProvider;
            const contentDataOrError = await targetObject.requestContentData();
            const content = TextUtils.ContentData.ContentData.textOr(contentDataOrError, '');
            /* eslint-disable-next-line @devtools/no-imperative-dom-api */
            const link = document.createElement('a');
            link.download = targetObject.displayName;
            link.href = 'data:' + targetObject.mimeType + ';base64,' + content;
            link.click();
        }
        if (contentProvider.contentType().isDocumentOrScriptOrStyleSheet()) {
            contextMenu.saveSection().appendItem(i18nString(UIStrings.saveAs), saveAs, { jslogContext: 'save-as' });
        }
        else if (contentProvider instanceof SDK.Resource.Resource && contentProvider.contentType().isImage()) {
            contextMenu.saveSection().appendItem(i18nString(UIStrings.saveImage), saveImage, { jslogContext: 'save-image' });
        }
        // Retrieve uiSourceCode by URL to pick network resources everywhere.
        const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(contentProvider.contentURL());
        const networkPersistenceManager = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance();
        const binding = uiSourceCode && Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
        const fileURL = binding ? binding.fileSystem.contentURL() : contentProvider.contentURL();
        if (Common.ParsedURL.schemeIs(fileURL, 'file:')) {
            const path = Common.ParsedURL.ParsedURL.urlToRawPathString(fileURL, Host.Platform.isWin());
            contextMenu.revealSection().appendItem(i18nString(UIStrings.openInContainingFolder), () => Host.InspectorFrontendHost.InspectorFrontendHostInstance.showItemInFolder(path), { jslogContext: 'open-in-containing-folder' });
        }
        if (contentProvider instanceof Workspace.UISourceCode.UISourceCode &&
            (contentProvider.project().type() === Workspace.Workspace.projectTypes.FileSystem)) {
            // Do not append in Sources > Workspace & Overrides tab
            return;
        }
        let disabled = true;
        let handler = () => { };
        if (uiSourceCode && networkPersistenceManager.isUISourceCodeOverridable(uiSourceCode)) {
            if (!uiSourceCode.contentType().isFromSourceMap()) {
                disabled = false;
                handler = this.handleOverrideContent.bind(this, uiSourceCode, contentProvider);
            }
            else {
                // show redirect dialog for source mapped file
                const deployedUiSourceCode = this.getDeployedUiSourceCode(uiSourceCode);
                if (deployedUiSourceCode) {
                    disabled = false;
                    handler = this.redirectOverrideToDeployedUiSourceCode.bind(this, deployedUiSourceCode, uiSourceCode);
                }
            }
        }
        contextMenu.overrideSection().appendItem(i18nString(UIStrings.overrideContent), handler, { disabled, jslogContext: 'override-content' });
        if (contentProvider instanceof SDK.NetworkRequest.NetworkRequest) {
            contextMenu.overrideSection().appendItem(i18nString(UIStrings.showOverrides), async () => {
                await UI.ViewManager.ViewManager.instance().showView('navigator-overrides');
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.ShowAllOverridesFromNetworkContextMenu);
            }, { jslogContext: 'show-overrides' });
        }
    }
    async handleOverrideContent(uiSourceCode, contentProvider) {
        const networkPersistenceManager = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance();
        const isSuccess = await networkPersistenceManager.setupAndStartLocalOverrides(uiSourceCode);
        if (isSuccess) {
            await Common.Revealer.reveal(uiSourceCode);
        }
        // Collect metrics: Context menu access point
        if (contentProvider instanceof SDK.NetworkRequest.NetworkRequest) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideContentFromNetworkContextMenu);
        }
        else if (contentProvider instanceof Workspace.UISourceCode.UISourceCode) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideContentFromSourcesContextMenu);
        }
        // Collect metrics: Content type
        if (uiSourceCode.isFetchXHR()) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideFetchXHR);
        }
        else if (contentProvider.contentType().isScript()) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideScript);
        }
        else if (contentProvider.contentType().isDocument()) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideDocument);
        }
        else if (contentProvider.contentType().isStyleSheet()) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideStyleSheet);
        }
        else if (contentProvider.contentType().isImage()) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideImage);
        }
        else if (contentProvider.contentType().isFont()) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideFont);
        }
    }
    async redirectOverrideToDeployedUiSourceCode(deployedUiSourceCode, originalUiSourceCode) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideContentContextMenuSourceMappedWarning);
        const deployedUrl = deployedUiSourceCode.url();
        const deployedName = Bindings.ResourceUtils.displayNameForURL(deployedUrl);
        const originalUrl = originalUiSourceCode.url();
        const originalName = Bindings.ResourceUtils.displayNameForURL(originalUrl);
        const shouldJumpToDeployedFile = await UI.UIUtils.ConfirmDialog.show(i18nString(UIStrings.overrideSourceMappedFileExplanation, { PH1: originalName }), i18nString(UIStrings.overrideSourceMappedFileWarning, { PH1: deployedName }), undefined, { jslogContext: 'override-source-mapped-file-warning' });
        if (shouldJumpToDeployedFile) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideContentContextMenuRedirectToDeployed);
            await this.handleOverrideContent(deployedUiSourceCode, deployedUiSourceCode);
        }
    }
    getDeployedUiSourceCode(uiSourceCode) {
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
            Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(Common.ParsedURL.ParsedURL.urlWithoutHash(deployedStylesUrl));
        return deployedUiSourceCode;
    }
}
/**
 * @returns The script if the content provider is a UISourceCode and the DebuggerModel actually created one for the UISourceCode.
 */
function getScript(contentProvider) {
    if (!(contentProvider instanceof Workspace.UISourceCode.UISourceCode)) {
        return null;
    }
    // First we try to resolve the target and use that to get the script.
    const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(contentProvider);
    const model = target?.model(SDK.DebuggerModel.DebuggerModel);
    if (model) {
        const resourceFile = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().scriptFile(contentProvider, model);
        if (resourceFile?.script) {
            return resourceFile.script;
        }
    }
    // Otherwise we'll check all possible scripts for this UISourceCode and take the first one.
    return Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().scriptsForUISourceCode(contentProvider)[0] ??
        null;
}
//# sourceMappingURL=PersistenceActions.js.map