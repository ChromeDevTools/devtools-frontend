// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Tooltips from '../../ui/components/tooltips/tooltips.js';
import * as uiI18n from '../../ui/i18n/i18n.js';
import { Icon } from '../../ui/kit/kit.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as PanelCommon from '../common/common.js';
import * as Snippets from '../snippets/snippets.js';
import { SourcesView } from './SourcesView.js';
import { UISourceCodeFrame } from './UISourceCodeFrame.js';
const UIStrings = {
    /**
     * @description Text in Tabbed Editor Container of the Sources panel
     * @example {example.file} PH1
     */
    areYouSureYouWantToCloseUnsaved: 'Are you sure you want to close unsaved file: {PH1}?',
    /**
     * @description Error message for tooltip showing that a file in Sources could not be loaded
     */
    unableToLoadThisContent: 'Unable to load this content.',
    /**
     * @description Tooltip shown for the warning icon on an editor tab in the Sources panel
     *              when the developer saved changes via Ctrl+S/Cmd+S, while there was an
     *              automatic workspace detected, but not connected.
     * @example {FolderName} PH1
     */
    changesWereNotSavedToFileSystemToSaveAddFolderToWorkspace: 'Changes weren\'t saved to file system. To save, add {PH1} to your Workspace.',
    /**
     * @description Tooltip shown for the warning icon on an editor tab in the Sources panel
     *              when the developer saved changes via Ctrl+S/Cmd+S, but didn't have a Workspace
     *              set up, or the Workspace didn't have a match for this file, and therefore the
     *              changes couldn't be persisted.
     * @example {Workspace} PH1
     */
    changesWereNotSavedToFileSystemToSaveSetUpYourWorkspace: 'Changes weren\'t saved to file system. To save, set up your {PH1}.',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/TabbedEditorContainer.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let tabId = 0;
export class TabbedEditorContainer extends Common.ObjectWrapper.ObjectWrapper {
    delegate;
    tabbedPane;
    tabIds;
    files;
    previouslyViewedFilesSetting;
    history;
    uriToUISourceCode;
    idToUISourceCode;
    #currentFile;
    currentView;
    scrollTimer;
    reentrantShow;
    constructor(delegate, setting, placeholderElement, focusedPlaceholderElement) {
        super();
        this.delegate = delegate;
        this.tabbedPane = new UI.TabbedPane.TabbedPane();
        this.tabbedPane.setPlaceholderElement(placeholderElement, focusedPlaceholderElement);
        this.tabbedPane.setTabDelegate(new EditorContainerTabDelegate(this));
        this.tabbedPane.setCloseableTabs(true);
        this.tabbedPane.setAllowTabReorder(true, true);
        this.tabbedPane.addEventListener(UI.TabbedPane.Events.TabClosed, this.tabClosed, this);
        this.tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, this.tabSelected, this);
        this.tabbedPane.headerElement().setAttribute('jslog', `${VisualLogging.toolbar('top').track({ keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space' })}`);
        Persistence.Persistence.PersistenceImpl.instance().addEventListener(Persistence.Persistence.Events.BindingCreated, this.onBindingCreated, this);
        Persistence.Persistence.PersistenceImpl.instance().addEventListener(Persistence.Persistence.Events.BindingRemoved, this.onBindingRemoved, this);
        Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().addEventListener("RequestsForHeaderOverridesFileChanged" /* Persistence.NetworkPersistenceManager.Events.REQUEST_FOR_HEADER_OVERRIDES_FILE_CHANGED */, this.#onRequestsForHeaderOverridesFileChanged, this);
        this.tabIds = new Map();
        this.files = new Map();
        this.previouslyViewedFilesSetting = setting;
        this.history = History.fromObject(this.previouslyViewedFilesSetting.get());
        this.uriToUISourceCode = new Map();
        this.idToUISourceCode = new Map();
        this.reentrantShow = false;
    }
    onBindingCreated(event) {
        const binding = event.data;
        this.updateFileTitle(binding.fileSystem);
        const networkTabId = this.tabIds.get(binding.network);
        let fileSystemTabId = this.tabIds.get(binding.fileSystem);
        const wasSelectedInNetwork = this.#currentFile === binding.network;
        const networkKey = historyItemKey(binding.network);
        const currentSelectionRange = this.history.selectionRange(networkKey);
        const currentScrollLineNumber = this.history.scrollLineNumber(networkKey);
        this.history.remove(networkKey);
        if (!networkTabId) {
            return;
        }
        if (!fileSystemTabId) {
            const networkView = this.tabbedPane.tabView(networkTabId);
            const tabIndex = this.tabbedPane.tabIndex(networkTabId);
            if (networkView instanceof UISourceCodeFrame) {
                this.delegate.recycleUISourceCodeFrame(networkView, binding.fileSystem);
                fileSystemTabId = this.appendFileTab(binding.fileSystem, false, tabIndex, networkView);
            }
            else {
                fileSystemTabId = this.appendFileTab(binding.fileSystem, false, tabIndex);
                const fileSystemTabView = this.tabbedPane.tabView(fileSystemTabId);
                this.restoreEditorProperties(fileSystemTabView, currentSelectionRange, currentScrollLineNumber);
            }
        }
        this.closeTabs([networkTabId], true);
        if (wasSelectedInNetwork) {
            this.tabbedPane.selectTab(fileSystemTabId, false);
        }
        this.updateHistory();
    }
    #onRequestsForHeaderOverridesFileChanged(event) {
        this.updateFileTitle(event.data);
    }
    onBindingRemoved(event) {
        const binding = event.data;
        this.updateFileTitle(binding.fileSystem);
    }
    get view() {
        return this.tabbedPane;
    }
    get visibleView() {
        return this.tabbedPane.visibleView;
    }
    fileViews() {
        return this.tabbedPane.tabViews();
    }
    leftToolbar() {
        return this.tabbedPane.leftToolbar();
    }
    rightToolbar() {
        return this.tabbedPane.rightToolbar();
    }
    show(parentElement) {
        this.tabbedPane.show(parentElement);
    }
    showFile(uiSourceCode) {
        const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
        uiSourceCode = binding ? binding.fileSystem : uiSourceCode;
        const frame = UI.Context.Context.instance().flavor(SourcesView);
        // If the content has already been set and the current frame is showing
        // the incoming uiSourceCode, then fire the event that the file has been loaded.
        // Otherwise, this event will fire as soon as the content has been set.
        if (frame?.currentSourceFrame()?.contentSet && this.#currentFile === uiSourceCode &&
            frame?.currentUISourceCode() === uiSourceCode) {
            Common.EventTarget.fireEvent('source-file-loaded', uiSourceCode.displayName(true));
        }
        else {
            this.#showFile(uiSourceCode, true);
        }
    }
    closeFile(uiSourceCode) {
        const tabId = this.tabIds.get(uiSourceCode);
        if (!tabId) {
            return;
        }
        this.closeTabs([tabId]);
    }
    closeAllFiles() {
        this.closeTabs(this.tabbedPane.tabIds());
    }
    historyUISourceCodes() {
        const result = [];
        for (const { url, resourceType } of this.history.keys()) {
            const uiSourceCode = this.uriToUISourceCode.get(url);
            if (uiSourceCode !== undefined && uiSourceCode.contentType() === resourceType) {
                result.push(uiSourceCode);
            }
        }
        return result;
    }
    selectNextTab() {
        this.tabbedPane.selectNextTab();
    }
    selectPrevTab() {
        this.tabbedPane.selectPrevTab();
    }
    addViewListeners() {
        if (!this.currentView || !(this.currentView instanceof SourceFrame.SourceFrame.SourceFrameImpl)) {
            return;
        }
        this.currentView.addEventListener("EditorUpdate" /* SourceFrame.SourceFrame.Events.EDITOR_UPDATE */, this.onEditorUpdate, this);
        this.currentView.addEventListener("EditorScroll" /* SourceFrame.SourceFrame.Events.EDITOR_SCROLL */, this.onScrollChanged, this);
    }
    removeViewListeners() {
        if (!this.currentView || !(this.currentView instanceof SourceFrame.SourceFrame.SourceFrameImpl)) {
            return;
        }
        this.currentView.removeEventListener("EditorUpdate" /* SourceFrame.SourceFrame.Events.EDITOR_UPDATE */, this.onEditorUpdate, this);
        this.currentView.removeEventListener("EditorScroll" /* SourceFrame.SourceFrame.Events.EDITOR_SCROLL */, this.onScrollChanged, this);
    }
    onScrollChanged() {
        if (this.currentView instanceof SourceFrame.SourceFrame.SourceFrameImpl) {
            if (this.scrollTimer) {
                clearTimeout(this.scrollTimer);
            }
            this.scrollTimer = window.setTimeout(() => this.previouslyViewedFilesSetting.set(this.history.toObject()), 100);
            if (this.#currentFile) {
                const { editor } = this.currentView.textEditor;
                const topBlock = editor.lineBlockAtHeight(editor.scrollDOM.getBoundingClientRect().top - editor.documentTop);
                const topLine = editor.state.doc.lineAt(topBlock.from).number - 1;
                this.history.updateScrollLineNumber(historyItemKey(this.#currentFile), topLine);
            }
        }
    }
    onEditorUpdate({ data: update }) {
        if (update.docChanged || update.selectionSet) {
            const { main } = update.state.selection;
            const lineFrom = update.state.doc.lineAt(main.from), lineTo = update.state.doc.lineAt(main.to);
            const range = new TextUtils.TextRange.TextRange(lineFrom.number - 1, main.from - lineFrom.from, lineTo.number - 1, main.to - lineTo.from);
            if (this.#currentFile) {
                this.history.updateSelectionRange(historyItemKey(this.#currentFile), range);
            }
            this.previouslyViewedFilesSetting.set(this.history.toObject());
            if (this.#currentFile) {
                PanelCommon.ExtensionServer.ExtensionServer.instance().sourceSelectionChanged(this.#currentFile.url(), range);
            }
        }
    }
    #showFile(uiSourceCode, userGesture) {
        if (this.reentrantShow) {
            return;
        }
        const canonicalSourceCode = this.canonicalUISourceCode(uiSourceCode);
        const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
        uiSourceCode = binding ? binding.fileSystem : uiSourceCode;
        if (this.#currentFile === uiSourceCode) {
            return;
        }
        this.removeViewListeners();
        this.#currentFile = uiSourceCode;
        try {
            // Selecting the tab may cause showFile to be called again, but with the canonical source code,
            // which is not what we want, so we prevent reentrant calls.
            this.reentrantShow = true;
            const tabId = this.tabIds.get(canonicalSourceCode) || this.appendFileTab(canonicalSourceCode, userGesture);
            this.tabbedPane.selectTab(tabId, userGesture);
        }
        finally {
            this.reentrantShow = false;
        }
        if (userGesture) {
            this.editorSelectedByUserAction();
        }
        const previousView = this.currentView;
        this.currentView = this.visibleView;
        this.addViewListeners();
        if (this.currentView instanceof UISourceCodeFrame && this.currentView.uiSourceCode() !== uiSourceCode) {
            // We are showing a different UISourceCode in the same tab (because it has the same URL). This
            // commonly happens when switching between workers or iframes containing the same code, and while the
            // contents are usually identical they may not be and it is important to show users when they aren't.
            this.delegate.recycleUISourceCodeFrame(this.currentView, uiSourceCode);
            if (uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.FileSystem) {
                // Disable editing, because it may confuse users that only one of the copies of this code changes.
                uiSourceCode.disableEdit();
            }
        }
        const eventData = {
            currentFile: this.#currentFile,
            currentView: this.currentView,
            previousView,
            userGesture,
        };
        this.dispatchEventToListeners("EditorSelected" /* Events.EDITOR_SELECTED */, eventData);
    }
    titleForFile(uiSourceCode) {
        const maxDisplayNameLength = 30;
        let title = Platform.StringUtilities.trimMiddle(uiSourceCode.displayName(true), maxDisplayNameLength);
        if (uiSourceCode.isDirty()) {
            title += '*';
        }
        return title;
    }
    maybeCloseTab(id, nextTabId) {
        const uiSourceCode = this.files.get(id);
        if (!uiSourceCode) {
            return false;
        }
        const shouldPrompt = uiSourceCode.isDirty() && uiSourceCode.project().canSetFileContent();
        // FIXME: this should be replaced with common Save/Discard/Cancel dialog.
        if (!shouldPrompt || confirm(i18nString(UIStrings.areYouSureYouWantToCloseUnsaved, { PH1: uiSourceCode.name() }))) {
            uiSourceCode.resetWorkingCopy();
            if (nextTabId) {
                this.tabbedPane.selectTab(nextTabId, true);
            }
            this.tabbedPane.closeTab(id, true);
            return true;
        }
        return false;
    }
    closeTabs(ids, forceCloseDirtyTabs) {
        const dirtyTabs = [];
        const cleanTabs = [];
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            const uiSourceCode = this.files.get(id);
            if (uiSourceCode) {
                if (!forceCloseDirtyTabs && uiSourceCode.isDirty()) {
                    dirtyTabs.push(id);
                }
                else {
                    cleanTabs.push(id);
                }
            }
        }
        if (dirtyTabs.length) {
            this.tabbedPane.selectTab(dirtyTabs[0], true);
        }
        this.tabbedPane.closeTabs(cleanTabs, true);
        for (let i = 0; i < dirtyTabs.length; ++i) {
            const nextTabId = i + 1 < dirtyTabs.length ? dirtyTabs[i + 1] : null;
            if (!this.maybeCloseTab(dirtyTabs[i], nextTabId)) {
                break;
            }
        }
    }
    onContextMenu(tabId, contextMenu) {
        const uiSourceCode = this.files.get(tabId);
        if (uiSourceCode) {
            contextMenu.appendApplicableItems(uiSourceCode);
        }
    }
    canonicalUISourceCode(uiSourceCode) {
        // Check if we have already a UISourceCode for this url
        const existingSourceCode = this.idToUISourceCode.get(uiSourceCode.canonicalScriptId());
        if (existingSourceCode) {
            // Ignore incoming uiSourceCode, we already have this file.
            return existingSourceCode;
        }
        this.idToUISourceCode.set(uiSourceCode.canonicalScriptId(), uiSourceCode);
        this.uriToUISourceCode.set(uiSourceCode.url(), uiSourceCode);
        return uiSourceCode;
    }
    addUISourceCode(uiSourceCode) {
        const canonicalSourceCode = this.canonicalUISourceCode(uiSourceCode);
        const duplicated = canonicalSourceCode !== uiSourceCode;
        const binding = Persistence.Persistence.PersistenceImpl.instance().binding(canonicalSourceCode);
        uiSourceCode = binding ? binding.fileSystem : canonicalSourceCode;
        if (duplicated && uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.FileSystem) {
            uiSourceCode.disableEdit();
        }
        if (this.#currentFile?.canonicalScriptId() === uiSourceCode.canonicalScriptId()) {
            return;
        }
        const index = this.history.index(historyItemKey(uiSourceCode));
        if (index === -1) {
            return;
        }
        if (!this.tabIds.has(uiSourceCode)) {
            this.appendFileTab(uiSourceCode, false);
        }
        // Select tab if this file was the last to be shown.
        if (!index) {
            this.#showFile(uiSourceCode, false);
            return;
        }
        if (!this.#currentFile) {
            return;
        }
        const currentProjectIsSnippets = Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(this.#currentFile);
        const addedProjectIsSnippets = Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(uiSourceCode);
        if (this.history.index(historyItemKey(this.#currentFile)) && currentProjectIsSnippets && !addedProjectIsSnippets) {
            this.#showFile(uiSourceCode, false);
        }
    }
    removeUISourceCode(uiSourceCode) {
        this.removeUISourceCodes([uiSourceCode]);
    }
    removeUISourceCodes(uiSourceCodes) {
        const tabIds = [];
        for (const uiSourceCode of uiSourceCodes) {
            const tabId = this.tabIds.get(uiSourceCode);
            if (tabId) {
                tabIds.push(tabId);
            }
            if (this.uriToUISourceCode.get(uiSourceCode.url()) === uiSourceCode) {
                this.uriToUISourceCode.delete(uiSourceCode.url());
            }
            if (this.idToUISourceCode.get(uiSourceCode.canonicalScriptId()) === uiSourceCode) {
                this.idToUISourceCode.delete(uiSourceCode.canonicalScriptId());
            }
        }
        this.tabbedPane.closeTabs(tabIds);
    }
    editorClosedByUserAction(uiSourceCode) {
        this.history.remove(historyItemKey(uiSourceCode));
        this.updateHistory();
    }
    editorSelectedByUserAction() {
        this.updateHistory();
    }
    updateHistory() {
        const historyItemKeys = [];
        for (const tabId of this.tabbedPane.lastOpenedTabIds(MAX_PREVIOUSLY_VIEWED_FILES_COUNT)) {
            const uiSourceCode = this.files.get(tabId);
            if (uiSourceCode !== undefined) {
                historyItemKeys.push(historyItemKey(uiSourceCode));
            }
        }
        this.history.update(historyItemKeys);
        this.previouslyViewedFilesSetting.set(this.history.toObject());
    }
    tooltipForFile(uiSourceCode) {
        uiSourceCode = Persistence.Persistence.PersistenceImpl.instance().network(uiSourceCode) || uiSourceCode;
        return uiSourceCode.url();
    }
    appendFileTab(uiSourceCode, userGesture, index, replaceView) {
        const view = replaceView || this.delegate.viewForFile(uiSourceCode);
        const title = this.titleForFile(uiSourceCode);
        const tooltip = this.tooltipForFile(uiSourceCode);
        const tabId = this.generateTabId();
        this.tabIds.set(uiSourceCode, tabId);
        this.files.set(tabId, uiSourceCode);
        if (!replaceView) {
            const savedSelectionRange = this.history.selectionRange(historyItemKey(uiSourceCode));
            const savedScrollLineNumber = this.history.scrollLineNumber(historyItemKey(uiSourceCode));
            this.restoreEditorProperties(view, savedSelectionRange, savedScrollLineNumber);
        }
        this.tabbedPane.appendTab(tabId, title, view, tooltip, userGesture, undefined, undefined, index, 'editor');
        this.updateFileTitle(uiSourceCode);
        this.addUISourceCodeListeners(uiSourceCode);
        if (uiSourceCode.loadError()) {
            this.addLoadErrorIcon(tabId);
        }
        else if (!uiSourceCode.contentLoaded()) {
            void uiSourceCode.requestContentData().then(contentDataOrError => {
                if (TextUtils.ContentData.ContentData.isError(contentDataOrError)) {
                    this.addLoadErrorIcon(tabId);
                }
            });
        }
        return tabId;
    }
    addLoadErrorIcon(tabId) {
        const icon = new Icon();
        icon.name = 'cross-circle-filled';
        icon.classList.add('small');
        UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.unableToLoadThisContent));
        if (this.tabbedPane.tabView(tabId)) {
            this.tabbedPane.setTrailingTabIcon(tabId, icon);
        }
    }
    restoreEditorProperties(editorView, selection, firstLineNumber) {
        const sourceFrame = editorView instanceof SourceFrame.SourceFrame.SourceFrameImpl ? editorView : null;
        if (!sourceFrame) {
            return;
        }
        if (selection) {
            sourceFrame.setSelection(selection);
        }
        if (typeof firstLineNumber === 'number') {
            sourceFrame.scrollToLine(firstLineNumber);
        }
    }
    tabClosed(event) {
        const { tabId, isUserGesture } = event.data;
        const uiSourceCode = this.files.get(tabId);
        if (this.#currentFile && this.#currentFile.canonicalScriptId() === uiSourceCode?.canonicalScriptId()) {
            this.removeViewListeners();
            this.currentView = null;
            this.#currentFile = null;
        }
        if (uiSourceCode) {
            this.tabIds.delete(uiSourceCode);
        }
        this.files.delete(tabId);
        if (uiSourceCode) {
            this.removeUISourceCodeListeners(uiSourceCode);
            this.dispatchEventToListeners("EditorClosed" /* Events.EDITOR_CLOSED */, uiSourceCode);
            if (isUserGesture) {
                this.editorClosedByUserAction(uiSourceCode);
            }
        }
    }
    tabSelected(event) {
        const { tabId, isUserGesture } = event.data;
        const uiSourceCode = this.files.get(tabId);
        if (uiSourceCode) {
            this.#showFile(uiSourceCode, isUserGesture);
        }
    }
    addUISourceCodeListeners(uiSourceCode) {
        uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, this.uiSourceCodeTitleChanged, this);
        uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, this.uiSourceCodeWorkingCopyChanged, this);
        uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, this.uiSourceCodeWorkingCopyCommitted, this);
    }
    removeUISourceCodeListeners(uiSourceCode) {
        uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.TitleChanged, this.uiSourceCodeTitleChanged, this);
        uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, this.uiSourceCodeWorkingCopyChanged, this);
        uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, this.uiSourceCodeWorkingCopyCommitted, this);
    }
    updateFileTitle(uiSourceCode) {
        const tabId = this.tabIds.get(uiSourceCode);
        if (tabId) {
            const title = this.titleForFile(uiSourceCode);
            const tooltip = this.tooltipForFile(uiSourceCode);
            this.tabbedPane.changeTabTitle(tabId, title, tooltip);
            if (uiSourceCode.loadError()) {
                const icon = new Icon();
                icon.name = 'cross-circle-filled';
                icon.classList.add('small');
                UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.unableToLoadThisContent));
                this.tabbedPane.setTrailingTabIcon(tabId, icon);
            }
            else if (Persistence.Persistence.PersistenceImpl.instance().hasUnsavedCommittedChanges(uiSourceCode)) {
                /* eslint-disable @devtools/no-imperative-dom-api --
                 * This is a temporary solution using the <devtools-tooltip>
                 * and we will use a toast instead once available.
                 **/
                const suffixElement = document.createElement('div');
                const icon = new Icon();
                icon.name = 'warning-filled';
                icon.classList.add('small');
                const id = `tab-tooltip-${nextTooltipId++}`;
                icon.setAttribute('aria-describedby', id);
                const tooltip = new Tooltips.Tooltip.Tooltip({ id, anchor: icon, variant: 'rich' });
                const automaticFileSystemManager = Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager.instance();
                const { automaticFileSystem } = automaticFileSystemManager;
                if (automaticFileSystem?.state === 'disconnected') {
                    const link = document.createElement('a');
                    link.className = 'devtools-link';
                    link.textContent = Common.ParsedURL.ParsedURL.extractName(automaticFileSystem.root);
                    link.addEventListener('click', async (event) => {
                        event.consume();
                        await UI.ViewManager.ViewManager.instance().showView('navigator-files');
                        await automaticFileSystemManager.connectAutomaticFileSystem(/* addIfMissing= */ true);
                    });
                    tooltip.append(uiI18n.getFormatLocalizedString(str_, UIStrings.changesWereNotSavedToFileSystemToSaveAddFolderToWorkspace, { PH1: link }));
                }
                else {
                    const link = UI.XLink.XLink.create('https://developer.chrome.com/docs/devtools/workspaces/', 'Workspace');
                    tooltip.append(uiI18n.getFormatLocalizedString(str_, UIStrings.changesWereNotSavedToFileSystemToSaveSetUpYourWorkspace, { PH1: link }));
                }
                suffixElement.append(icon, tooltip);
                /* eslint-enable @devtools/no-imperative-dom-api */
                this.tabbedPane.setSuffixElement(tabId, suffixElement);
            }
            else {
                const icon = PanelCommon.PersistenceUtils.PersistenceUtils.iconForUISourceCode(uiSourceCode);
                this.tabbedPane.setTrailingTabIcon(tabId, icon);
            }
        }
    }
    uiSourceCodeTitleChanged(event) {
        const uiSourceCode = event.data;
        this.updateFileTitle(uiSourceCode);
        this.updateHistory();
        // Remove from map under old url if it has changed.
        for (const [k, v] of this.uriToUISourceCode) {
            if (v === uiSourceCode && k !== v.url()) {
                this.uriToUISourceCode.delete(k);
            }
        }
        // Remove from map under old id if it has changed.
        for (const [k, v] of this.idToUISourceCode) {
            if (v === uiSourceCode && k !== v.canonicalScriptId()) {
                this.idToUISourceCode.delete(k);
            }
        }
        // Ensure it is mapped under current url and id.
        this.canonicalUISourceCode(uiSourceCode);
    }
    uiSourceCodeWorkingCopyChanged(event) {
        const uiSourceCode = event.data;
        this.updateFileTitle(uiSourceCode);
    }
    uiSourceCodeWorkingCopyCommitted(event) {
        const uiSourceCode = event.data.uiSourceCode;
        this.updateFileTitle(uiSourceCode);
    }
    generateTabId() {
        return 'tab-' + (tabId++);
    }
    currentFile() {
        return this.#currentFile || null;
    }
}
let nextTooltipId = 1;
const MAX_PREVIOUSLY_VIEWED_FILES_COUNT = 30;
const MAX_SERIALIZABLE_URL_LENGTH = 4096;
function historyItemKey(uiSourceCode) {
    return { url: uiSourceCode.url(), resourceType: uiSourceCode.contentType() };
}
export class HistoryItem {
    url;
    resourceType;
    selectionRange;
    scrollLineNumber;
    constructor(url, resourceType, selectionRange, scrollLineNumber) {
        this.url = url;
        this.resourceType = resourceType;
        this.selectionRange = selectionRange;
        this.scrollLineNumber = scrollLineNumber;
    }
    static fromObject(serializedHistoryItem) {
        const resourceType = Common.ResourceType.ResourceType.fromName(serializedHistoryItem.resourceTypeName);
        if (resourceType === null) {
            throw new TypeError(`Invalid resource type name "${serializedHistoryItem.resourceTypeName}"`);
        }
        const selectionRange = serializedHistoryItem.selectionRange ?
            TextUtils.TextRange.TextRange.fromObject(serializedHistoryItem.selectionRange) :
            undefined;
        return new HistoryItem(serializedHistoryItem.url, resourceType, selectionRange, serializedHistoryItem.scrollLineNumber);
    }
    toObject() {
        if (this.url.length >= MAX_SERIALIZABLE_URL_LENGTH) {
            return null;
        }
        return {
            url: this.url,
            resourceTypeName: this.resourceType.name(),
            selectionRange: this.selectionRange,
            scrollLineNumber: this.scrollLineNumber,
        };
    }
}
export class History {
    items;
    constructor(items) {
        this.items = items;
    }
    static fromObject(serializedHistoryItems) {
        const items = [];
        for (const serializedHistoryItem of serializedHistoryItems) {
            try {
                items.push(HistoryItem.fromObject(serializedHistoryItem));
            }
            catch {
            }
        }
        return new History(items);
    }
    index({ url, resourceType }) {
        return this.items.findIndex(item => item.url === url && item.resourceType === resourceType);
    }
    selectionRange(key) {
        const index = this.index(key);
        if (index === -1) {
            return undefined;
        }
        return this.items[index].selectionRange;
    }
    updateSelectionRange(key, selectionRange) {
        if (!selectionRange) {
            return;
        }
        const index = this.index(key);
        if (index === -1) {
            return;
        }
        this.items[index].selectionRange = selectionRange;
    }
    scrollLineNumber(key) {
        const index = this.index(key);
        if (index === -1) {
            return;
        }
        return this.items[index].scrollLineNumber;
    }
    updateScrollLineNumber(key, scrollLineNumber) {
        const index = this.index(key);
        if (index === -1) {
            return;
        }
        this.items[index].scrollLineNumber = scrollLineNumber;
    }
    update(keys) {
        for (let i = keys.length - 1; i >= 0; --i) {
            const index = this.index(keys[i]);
            let item;
            if (index !== -1) {
                item = this.items[index];
                this.items.splice(index, 1);
            }
            else {
                item = new HistoryItem(keys[i].url, keys[i].resourceType);
            }
            this.items.unshift(item);
        }
    }
    remove(key) {
        const index = this.index(key);
        if (index === -1) {
            return;
        }
        this.items.splice(index, 1);
    }
    toObject() {
        const serializedHistoryItems = [];
        for (const item of this.items) {
            const serializedItem = item.toObject();
            if (serializedItem) {
                serializedHistoryItems.push(serializedItem);
            }
            if (serializedHistoryItems.length === MAX_PREVIOUSLY_VIEWED_FILES_COUNT) {
                break;
            }
        }
        return serializedHistoryItems;
    }
    keys() {
        return this.items;
    }
}
export class EditorContainerTabDelegate {
    editorContainer;
    constructor(editorContainer) {
        this.editorContainer = editorContainer;
    }
    closeTabs(_tabbedPane, ids) {
        this.editorContainer.closeTabs(ids);
    }
    onContextMenu(tabId, contextMenu) {
        this.editorContainer.onContextMenu(tabId, contextMenu);
    }
}
//# sourceMappingURL=TabbedEditorContainer.js.map