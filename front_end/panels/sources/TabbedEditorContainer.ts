/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Extensions from '../../models/extensions/extensions.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import type * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as Snippets from '../snippets/snippets.js';

import {SourcesView} from './SourcesView.js';
import {UISourceCodeFrame} from './UISourceCodeFrame.js';

const UIStrings = {
  /**
   *@description Text in Tabbed Editor Container of the Sources panel
   *@example {example.file} PH1
   */
  areYouSureYouWantToCloseUnsaved: 'Are you sure you want to close unsaved file: {PH1}?',
  /**
   *@description Error message for tooltip showing that a file in Sources could not be loaded
   */
  unableToLoadThisContent: 'Unable to load this content.',
  /**
   *@description Icon title in Tabbed Editor Container of the Sources panel
   */
  changesToThisFileWereNotSavedTo: 'Changes to this file were not saved to file system.',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/TabbedEditorContainer.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export interface TabbedEditorContainerDelegate {
  viewForFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget;

  recycleUISourceCodeFrame(sourceFrame: UISourceCodeFrame, uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
}

let tabId = 0;

export class TabbedEditorContainer extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private readonly delegate: TabbedEditorContainerDelegate;
  private readonly tabbedPane: UI.TabbedPane.TabbedPane;
  private tabIds: Map<Workspace.UISourceCode.UISourceCode, string>;
  private readonly files: Map<string, Workspace.UISourceCode.UISourceCode>;
  private readonly previouslyViewedFilesSetting: Common.Settings.Setting<SerializedHistoryItem[]>;
  private readonly history: History;
  private readonly uriToUISourceCode: Map<Platform.DevToolsPath.UrlString, Workspace.UISourceCode.UISourceCode>;
  private readonly idToUISourceCode: Map<string, Workspace.UISourceCode.UISourceCode>;
  private currentFileInternal!: Workspace.UISourceCode.UISourceCode|null;
  private currentView!: UI.Widget.Widget|null;
  private scrollTimer?: number;
  private reentrantShow: boolean;
  constructor(
      delegate: TabbedEditorContainerDelegate, setting: Common.Settings.Setting<SerializedHistoryItem[]>,
      placeholderElement: Element, focusedPlaceholderElement?: Element) {
    super();
    this.delegate = delegate;

    this.tabbedPane = new UI.TabbedPane.TabbedPane();
    this.tabbedPane.setPlaceholderElement(placeholderElement, focusedPlaceholderElement);
    this.tabbedPane.setTabDelegate(new EditorContainerTabDelegate(this));

    this.tabbedPane.setCloseableTabs(true);
    this.tabbedPane.setAllowTabReorder(true, true);

    this.tabbedPane.addEventListener(UI.TabbedPane.Events.TabClosed, this.tabClosed, this);
    this.tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, this.tabSelected, this);

    this.tabbedPane.headerElement().setAttribute(
        'jslog',
        `${VisualLogging.toolbar('top').track({keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space'})}`);

    Persistence.Persistence.PersistenceImpl.instance().addEventListener(
        Persistence.Persistence.Events.BindingCreated, this.onBindingCreated, this);
    Persistence.Persistence.PersistenceImpl.instance().addEventListener(
        Persistence.Persistence.Events.BindingRemoved, this.onBindingRemoved, this);
    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().addEventListener(
        Persistence.NetworkPersistenceManager.Events.REQUEST_FOR_HEADER_OVERRIDES_FILE_CHANGED,
        this.#onRequestsForHeaderOverridesFileChanged, this);

    this.tabIds = new Map();
    this.files = new Map();

    this.previouslyViewedFilesSetting = setting;
    this.history = History.fromObject(this.previouslyViewedFilesSetting.get());
    this.uriToUISourceCode = new Map();
    this.idToUISourceCode = new Map();
    this.reentrantShow = false;
  }

  private onBindingCreated(event: Common.EventTarget.EventTargetEvent<Persistence.Persistence.PersistenceBinding>):
      void {
    const binding = event.data;
    this.updateFileTitle(binding.fileSystem);

    const networkTabId = this.tabIds.get(binding.network);
    let fileSystemTabId = this.tabIds.get(binding.fileSystem);

    const wasSelectedInNetwork = this.currentFileInternal === binding.network;
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
      } else {
        fileSystemTabId = this.appendFileTab(binding.fileSystem, false, tabIndex);
        const fileSystemTabView = (this.tabbedPane.tabView(fileSystemTabId) as UI.Widget.Widget);
        this.restoreEditorProperties(fileSystemTabView, currentSelectionRange, currentScrollLineNumber);
      }
    }

    this.closeTabs([networkTabId], true);
    if (wasSelectedInNetwork) {
      this.tabbedPane.selectTab(fileSystemTabId, false);
    }

    this.updateHistory();
  }

  #onRequestsForHeaderOverridesFileChanged(
      event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    this.updateFileTitle(event.data);
  }

  private onBindingRemoved(event: Common.EventTarget.EventTargetEvent<Persistence.Persistence.PersistenceBinding>):
      void {
    const binding = event.data;
    this.updateFileTitle(binding.fileSystem);
  }

  get view(): UI.Widget.Widget {
    return this.tabbedPane;
  }

  get visibleView(): UI.Widget.Widget|null {
    return this.tabbedPane.visibleView;
  }

  fileViews(): UI.Widget.Widget[] {
    return this.tabbedPane.tabViews();
  }

  leftToolbar(): UI.Toolbar.Toolbar {
    return this.tabbedPane.leftToolbar();
  }

  rightToolbar(): UI.Toolbar.Toolbar {
    return this.tabbedPane.rightToolbar();
  }

  show(parentElement: Element): void {
    this.tabbedPane.show(parentElement);
  }

  showFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
    uiSourceCode = binding ? binding.fileSystem : uiSourceCode;

    const frame = UI.Context.Context.instance().flavor(SourcesView);
    // If the content has already been set and the current frame is showing
    // the incoming uiSourceCode, then fire the event that the file has been loaded.
    // Otherwise, this event will fire as soon as the content has been set.
    if (frame?.currentSourceFrame()?.contentSet && this.currentFileInternal === uiSourceCode &&
        frame?.currentUISourceCode() === uiSourceCode) {
      Common.EventTarget.fireEvent('source-file-loaded', uiSourceCode.displayName(true));
    } else {
      this.innerShowFile(uiSourceCode, true);
    }
  }

  closeFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const tabId = this.tabIds.get(uiSourceCode);
    if (!tabId) {
      return;
    }
    this.closeTabs([tabId]);
  }

  closeAllFiles(): void {
    this.closeTabs(this.tabbedPane.tabIds());
  }

  historyUISourceCodes(): Workspace.UISourceCode.UISourceCode[] {
    const result = [];
    for (const {url, resourceType} of this.history.keys()) {
      const uiSourceCode = this.uriToUISourceCode.get(url);
      if (uiSourceCode !== undefined && uiSourceCode.contentType() === resourceType) {
        result.push(uiSourceCode);
      }
    }
    return result;
  }

  selectNextTab(): void {
    this.tabbedPane.selectNextTab();
  }

  selectPrevTab(): void {
    this.tabbedPane.selectPrevTab();
  }

  private addViewListeners(): void {
    if (!this.currentView || !(this.currentView instanceof SourceFrame.SourceFrame.SourceFrameImpl)) {
      return;
    }
    this.currentView.addEventListener(SourceFrame.SourceFrame.Events.EDITOR_UPDATE, this.onEditorUpdate, this);
    this.currentView.addEventListener(SourceFrame.SourceFrame.Events.EDITOR_SCROLL, this.onScrollChanged, this);
  }

  private removeViewListeners(): void {
    if (!this.currentView || !(this.currentView instanceof SourceFrame.SourceFrame.SourceFrameImpl)) {
      return;
    }
    this.currentView.removeEventListener(SourceFrame.SourceFrame.Events.EDITOR_UPDATE, this.onEditorUpdate, this);
    this.currentView.removeEventListener(SourceFrame.SourceFrame.Events.EDITOR_SCROLL, this.onScrollChanged, this);
  }

  private onScrollChanged(): void {
    if (this.currentView instanceof SourceFrame.SourceFrame.SourceFrameImpl) {
      if (this.scrollTimer) {
        clearTimeout(this.scrollTimer);
      }
      this.scrollTimer = window.setTimeout(() => this.previouslyViewedFilesSetting.set(this.history.toObject()), 100);
      if (this.currentFileInternal) {
        const {editor} = this.currentView.textEditor;
        const topBlock = editor.lineBlockAtHeight(editor.scrollDOM.getBoundingClientRect().top - editor.documentTop);
        const topLine = editor.state.doc.lineAt(topBlock.from).number - 1;
        this.history.updateScrollLineNumber(historyItemKey(this.currentFileInternal), topLine);
      }
    }
  }

  private onEditorUpdate({data: update}: Common.EventTarget.EventTargetEvent<CodeMirror.ViewUpdate>): void {
    if (update.docChanged || update.selectionSet) {
      const {main} = update.state.selection;
      const lineFrom = update.state.doc.lineAt(main.from), lineTo = update.state.doc.lineAt(main.to);
      const range = new TextUtils.TextRange.TextRange(
          lineFrom.number - 1, main.from - lineFrom.from, lineTo.number - 1, main.to - lineTo.from);
      if (this.currentFileInternal) {
        this.history.updateSelectionRange(historyItemKey(this.currentFileInternal), range);
      }
      this.previouslyViewedFilesSetting.set(this.history.toObject());

      if (this.currentFileInternal) {
        Extensions.ExtensionServer.ExtensionServer.instance().sourceSelectionChanged(
            this.currentFileInternal.url(), range);
      }
    }
  }

  private innerShowFile(uiSourceCode: Workspace.UISourceCode.UISourceCode, userGesture?: boolean): void {
    if (this.reentrantShow) {
      return;
    }
    const canonicalSourceCode = this.canonicalUISourceCode(uiSourceCode);
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
    uiSourceCode = binding ? binding.fileSystem : uiSourceCode;
    if (this.currentFileInternal === uiSourceCode) {
      return;
    }

    this.removeViewListeners();
    this.currentFileInternal = uiSourceCode;

    try {
      // Selecting the tab may cause showFile to be called again, but with the canonical source code,
      // which is not what we want, so we prevent reentrant calls.
      this.reentrantShow = true;
      const tabId = this.tabIds.get(canonicalSourceCode) || this.appendFileTab(canonicalSourceCode, userGesture);

      this.tabbedPane.selectTab(tabId, userGesture);
    } finally {
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
      currentFile: this.currentFileInternal,
      currentView: this.currentView,
      previousView,
      userGesture,
    };
    this.dispatchEventToListeners(Events.EDITOR_SELECTED, eventData);
  }

  private titleForFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): string {
    const maxDisplayNameLength = 30;
    let title = Platform.StringUtilities.trimMiddle(uiSourceCode.displayName(true), maxDisplayNameLength);
    if (uiSourceCode.isDirty()) {
      title += '*';
    }
    return title;
  }

  private maybeCloseTab(id: string, nextTabId: string|null): boolean {
    const uiSourceCode = this.files.get(id);
    if (!uiSourceCode) {
      return false;
    }
    const shouldPrompt = uiSourceCode.isDirty() && uiSourceCode.project().canSetFileContent();
    // FIXME: this should be replaced with common Save/Discard/Cancel dialog.
    if (!shouldPrompt || confirm(i18nString(UIStrings.areYouSureYouWantToCloseUnsaved, {PH1: uiSourceCode.name()}))) {
      uiSourceCode.resetWorkingCopy();
      if (nextTabId) {
        this.tabbedPane.selectTab(nextTabId, true);
      }
      this.tabbedPane.closeTab(id, true);
      return true;
    }
    return false;
  }

  closeTabs(ids: string[], forceCloseDirtyTabs?: boolean): void {
    const dirtyTabs = [];
    const cleanTabs = [];
    for (let i = 0; i < ids.length; ++i) {
      const id = ids[i];
      const uiSourceCode = this.files.get(id);
      if (uiSourceCode) {
        if (!forceCloseDirtyTabs && uiSourceCode.isDirty()) {
          dirtyTabs.push(id);
        } else {
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

  onContextMenu(tabId: string, contextMenu: UI.ContextMenu.ContextMenu): void {
    const uiSourceCode = this.files.get(tabId);
    if (uiSourceCode) {
      contextMenu.appendApplicableItems(uiSourceCode);
    }
  }

  private canonicalUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode):
      Workspace.UISourceCode.UISourceCode {
    // Check if we have already a UISourceCode for this url
    const existingSourceCode = this.idToUISourceCode.get(uiSourceCode.canononicalScriptId());
    if (existingSourceCode) {
      // Ignore incoming uiSourceCode, we already have this file.
      return existingSourceCode;
    }
    this.idToUISourceCode.set(uiSourceCode.canononicalScriptId(), uiSourceCode);
    this.uriToUISourceCode.set(uiSourceCode.url(), uiSourceCode);
    return uiSourceCode;
  }

  addUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const canonicalSourceCode = this.canonicalUISourceCode(uiSourceCode);
    const duplicated = canonicalSourceCode !== uiSourceCode;
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(canonicalSourceCode);
    uiSourceCode = binding ? binding.fileSystem : canonicalSourceCode;

    if (duplicated && uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.FileSystem) {
      uiSourceCode.disableEdit();
    }

    if (this.currentFileInternal?.canononicalScriptId() === uiSourceCode.canononicalScriptId()) {
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
      this.innerShowFile(uiSourceCode, false);
      return;
    }

    if (!this.currentFileInternal) {
      return;
    }

    const currentProjectIsSnippets = Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(this.currentFileInternal);
    const addedProjectIsSnippets = Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(uiSourceCode);
    if (this.history.index(historyItemKey(this.currentFileInternal)) && currentProjectIsSnippets &&
        !addedProjectIsSnippets) {
      this.innerShowFile(uiSourceCode, false);
    }
  }

  removeUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    this.removeUISourceCodes([uiSourceCode]);
  }

  removeUISourceCodes(uiSourceCodes: Workspace.UISourceCode.UISourceCode[]): void {
    const tabIds = [];
    for (const uiSourceCode of uiSourceCodes) {
      const tabId = this.tabIds.get(uiSourceCode);
      if (tabId) {
        tabIds.push(tabId);
      }
      if (this.uriToUISourceCode.get(uiSourceCode.url()) === uiSourceCode) {
        this.uriToUISourceCode.delete(uiSourceCode.url());
      }
      if (this.idToUISourceCode.get(uiSourceCode.canononicalScriptId()) === uiSourceCode) {
        this.idToUISourceCode.delete(uiSourceCode.canononicalScriptId());
      }
    }
    this.tabbedPane.closeTabs(tabIds);
  }

  private editorClosedByUserAction(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    this.history.remove(historyItemKey(uiSourceCode));
    this.updateHistory();
  }

  private editorSelectedByUserAction(): void {
    this.updateHistory();
  }

  private updateHistory(): void {
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

  private tooltipForFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): string {
    uiSourceCode = Persistence.Persistence.PersistenceImpl.instance().network(uiSourceCode) || uiSourceCode;
    return uiSourceCode.url();
  }

  private appendFileTab(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, userGesture?: boolean, index?: number,
      replaceView?: UI.Widget.Widget): string {
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
    } else if (!uiSourceCode.contentLoaded()) {
      void uiSourceCode.requestContent().then(_content => {
        if (uiSourceCode.loadError()) {
          this.addLoadErrorIcon(tabId);
        }
      });
    }
    return tabId;
  }

  private addLoadErrorIcon(tabId: string): void {
    const icon = new IconButton.Icon.Icon();
    icon.data = {iconName: 'cross-circle-filled', color: 'var(--icon-error)', width: '14px', height: '14px'};
    UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.unableToLoadThisContent));
    if (this.tabbedPane.tabView(tabId)) {
      this.tabbedPane.setTabIcon(tabId, icon);
    }
  }

  private restoreEditorProperties(
      editorView: UI.Widget.Widget, selection?: TextUtils.TextRange.TextRange, firstLineNumber?: number): void {
    const sourceFrame = editorView instanceof SourceFrame.SourceFrame.SourceFrameImpl ?
        editorView as SourceFrame.SourceFrame.SourceFrameImpl :
        null;
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

  private tabClosed(event: Common.EventTarget.EventTargetEvent<UI.TabbedPane.EventData>): void {
    const {tabId, isUserGesture} = event.data;
    const uiSourceCode = this.files.get(tabId);
    if (this.currentFileInternal &&
        this.currentFileInternal.canononicalScriptId() === uiSourceCode?.canononicalScriptId()) {
      this.removeViewListeners();
      this.currentView = null;
      this.currentFileInternal = null;
    }
    if (uiSourceCode) {
      this.tabIds.delete(uiSourceCode);
    }
    this.files.delete(tabId);

    if (uiSourceCode) {
      this.removeUISourceCodeListeners(uiSourceCode);

      this.dispatchEventToListeners(Events.EDITOR_CLOSED, uiSourceCode);

      if (isUserGesture) {
        this.editorClosedByUserAction(uiSourceCode);
      }
    }
  }

  private tabSelected(event: Common.EventTarget.EventTargetEvent<UI.TabbedPane.EventData>): void {
    const {tabId, isUserGesture} = event.data;

    const uiSourceCode = this.files.get(tabId);
    if (uiSourceCode) {
      this.innerShowFile(uiSourceCode, isUserGesture);
    }
  }

  private addUISourceCodeListeners(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, this.uiSourceCodeTitleChanged, this);
    uiSourceCode.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this.uiSourceCodeWorkingCopyChanged, this);
    uiSourceCode.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this.uiSourceCodeWorkingCopyCommitted, this);
  }

  private removeUISourceCodeListeners(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.TitleChanged, this.uiSourceCodeTitleChanged, this);
    uiSourceCode.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this.uiSourceCodeWorkingCopyChanged, this);
    uiSourceCode.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this.uiSourceCodeWorkingCopyCommitted, this);
  }

  private updateFileTitle(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const tabId = this.tabIds.get(uiSourceCode);
    if (tabId) {
      const title = this.titleForFile(uiSourceCode);
      const tooltip = this.tooltipForFile(uiSourceCode);
      this.tabbedPane.changeTabTitle(tabId, title, tooltip);
      let icon: IconButton.Icon.Icon|null = null;
      if (uiSourceCode.loadError()) {
        icon = new IconButton.Icon.Icon();
        icon.data = {iconName: 'cross-circle-filled', color: 'var(--icon-error)', width: '14px', height: '14px'};
        UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.unableToLoadThisContent));
      } else if (Persistence.Persistence.PersistenceImpl.instance().hasUnsavedCommittedChanges(uiSourceCode)) {
        icon = new IconButton.Icon.Icon();
        icon.data = {iconName: 'warning-filled', color: 'var(--icon-warning)', width: '14px', height: '14px'};
        UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.changesToThisFileWereNotSavedTo));
      } else {
        icon = Persistence.PersistenceUtils.PersistenceUtils.iconForUISourceCode(uiSourceCode);
      }
      this.tabbedPane.setTabIcon(tabId, icon);
    }
  }

  private uiSourceCodeTitleChanged(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>):
      void {
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
      if (v === uiSourceCode && k !== v.canononicalScriptId()) {
        this.idToUISourceCode.delete(k);
      }
    }
    // Ensure it is mapped under current url and id.
    this.canonicalUISourceCode(uiSourceCode);
  }

  private uiSourceCodeWorkingCopyChanged(
      event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    const uiSourceCode = event.data;
    this.updateFileTitle(uiSourceCode);
  }

  private uiSourceCodeWorkingCopyCommitted(
      event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.WorkingCopyCommitedEvent>): void {
    const uiSourceCode = event.data.uiSourceCode;
    this.updateFileTitle(uiSourceCode);
  }

  private generateTabId(): Lowercase<string> {
    return 'tab-' + (tabId++) as Lowercase<string>;
  }

  currentFile(): Workspace.UISourceCode.UISourceCode|null {
    return this.currentFileInternal || null;
  }
}

export const enum Events {
  EDITOR_SELECTED = 'EditorSelected',
  EDITOR_CLOSED = 'EditorClosed',
}

export interface EditorSelectedEvent {
  currentFile: Workspace.UISourceCode.UISourceCode;
  currentView: UI.Widget.Widget|null;
  previousView: UI.Widget.Widget|null;
  userGesture: boolean|undefined;
}

export type EventTypes = {
  [Events.EDITOR_SELECTED]: EditorSelectedEvent,
  [Events.EDITOR_CLOSED]: Workspace.UISourceCode.UISourceCode,
};

const MAX_PREVIOUSLY_VIEWED_FILES_COUNT = 30;
const MAX_SERIALIZABLE_URL_LENGTH = 4096;

interface SerializedHistoryItem {
  url: string;
  resourceTypeName: string;
  selectionRange?: TextUtils.TextRange.SerializedTextRange;
  scrollLineNumber?: number;
}

interface HistoryItemKey {
  url: Platform.DevToolsPath.UrlString;
  resourceType: Common.ResourceType.ResourceType;
}

function historyItemKey(uiSourceCode: Workspace.UISourceCode.UISourceCode): HistoryItemKey {
  return {url: uiSourceCode.url(), resourceType: uiSourceCode.contentType()};
}

export class HistoryItem implements HistoryItemKey {
  url: Platform.DevToolsPath.UrlString;
  resourceType: Common.ResourceType.ResourceType;
  selectionRange: TextUtils.TextRange.TextRange|undefined;
  scrollLineNumber: number|undefined;

  constructor(
      url: Platform.DevToolsPath.UrlString, resourceType: Common.ResourceType.ResourceType,
      selectionRange?: TextUtils.TextRange.TextRange, scrollLineNumber?: number) {
    this.url = url;
    this.resourceType = resourceType;
    this.selectionRange = selectionRange;
    this.scrollLineNumber = scrollLineNumber;
  }

  static fromObject(serializedHistoryItem: SerializedHistoryItem): HistoryItem {
    const resourceType = Common.ResourceType.ResourceType.fromName(serializedHistoryItem.resourceTypeName);
    if (resourceType === null) {
      throw new TypeError(`Invalid resource type name "${serializedHistoryItem.resourceTypeName}"`);
    }
    const selectionRange = serializedHistoryItem.selectionRange ?
        TextUtils.TextRange.TextRange.fromObject(serializedHistoryItem.selectionRange) :
        undefined;
    return new HistoryItem(
        serializedHistoryItem.url as Platform.DevToolsPath.UrlString,
        resourceType,
        selectionRange,
        serializedHistoryItem.scrollLineNumber,
    );
  }

  toObject(): SerializedHistoryItem|null {
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
  private items: HistoryItem[];

  constructor(items: HistoryItem[]) {
    this.items = items;
  }

  static fromObject(serializedHistoryItems: SerializedHistoryItem[]): History {
    const items = [];
    for (const serializedHistoryItem of serializedHistoryItems) {
      try {
        items.push(HistoryItem.fromObject(serializedHistoryItem));
      } catch {
      }
    }
    return new History(items);
  }

  index({url, resourceType}: HistoryItemKey): number {
    return this.items.findIndex(item => item.url === url && item.resourceType === resourceType);
  }

  selectionRange(key: HistoryItemKey): TextUtils.TextRange.TextRange|undefined {
    const index = this.index(key);
    if (index === -1) {
      return undefined;
    }
    return this.items[index].selectionRange;
  }

  updateSelectionRange(key: HistoryItemKey, selectionRange?: TextUtils.TextRange.TextRange): void {
    if (!selectionRange) {
      return;
    }
    const index = this.index(key);
    if (index === -1) {
      return;
    }
    this.items[index].selectionRange = selectionRange;
  }

  scrollLineNumber(key: HistoryItemKey): number|undefined {
    const index = this.index(key);
    if (index === -1) {
      return;
    }
    return this.items[index].scrollLineNumber;
  }

  updateScrollLineNumber(key: HistoryItemKey, scrollLineNumber: number): void {
    const index = this.index(key);
    if (index === -1) {
      return;
    }
    this.items[index].scrollLineNumber = scrollLineNumber;
  }

  update(keys: HistoryItemKey[]): void {
    for (let i = keys.length - 1; i >= 0; --i) {
      const index = this.index(keys[i]);
      let item;
      if (index !== -1) {
        item = this.items[index];
        this.items.splice(index, 1);
      } else {
        item = new HistoryItem(keys[i].url, keys[i].resourceType);
      }
      this.items.unshift(item);
    }
  }

  remove(key: HistoryItemKey): void {
    const index = this.index(key);
    if (index === -1) {
      return;
    }
    this.items.splice(index, 1);
  }

  toObject(): SerializedHistoryItem[] {
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

  // eslint-disable-next-line rulesdir/prefer_readonly_keyword
  keys(): ReadonlyArray<HistoryItemKey> {
    return this.items;
  }
}

export class EditorContainerTabDelegate implements UI.TabbedPane.TabbedPaneTabDelegate {
  private readonly editorContainer: TabbedEditorContainer;

  constructor(editorContainer: TabbedEditorContainer) {
    this.editorContainer = editorContainer;
  }

  closeTabs(_tabbedPane: UI.TabbedPane.TabbedPane, ids: string[]): void {
    this.editorContainer.closeTabs(ids);
  }

  onContextMenu(tabId: string, contextMenu: UI.ContextMenu.ContextMenu): void {
    this.editorContainer.onContextMenu(tabId, contextMenu);
  }
}
