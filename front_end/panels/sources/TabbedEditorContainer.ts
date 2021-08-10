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

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Extensions from '../../models/extensions/extensions.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
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
/**
 * @interface
 */
export interface TabbedEditorContainerDelegate {
  viewForFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget;

  recycleUISourceCodeFrame(sourceFrame: UISourceCodeFrame, uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
}

export class TabbedEditorContainer extends Common.ObjectWrapper.ObjectWrapper {
  _delegate: TabbedEditorContainerDelegate;
  _tabbedPane: UI.TabbedPane.TabbedPane;
  _tabIds: Map<Workspace.UISourceCode.UISourceCode, string>;
  _files: Map<string, Workspace.UISourceCode.UISourceCode>;
  _previouslyViewedFilesSetting: Common.Settings.Setting<SerializedHistoryItem[]>;
  _history: History;
  _uriToUISourceCode: Map<string, Workspace.UISourceCode.UISourceCode>;
  _currentFile!: Workspace.UISourceCode.UISourceCode|null;
  _currentView!: UI.Widget.Widget|null;
  _scrollTimer?: number;
  constructor(
      delegate: TabbedEditorContainerDelegate, setting: Common.Settings.Setting<SerializedHistoryItem[]>,
      placeholderElement: Element, focusedPlaceholderElement?: Element) {
    super();
    this._delegate = delegate;

    this._tabbedPane = new UI.TabbedPane.TabbedPane();
    this._tabbedPane.setPlaceholderElement(placeholderElement, focusedPlaceholderElement);
    this._tabbedPane.setTabDelegate(new EditorContainerTabDelegate(this));

    this._tabbedPane.setCloseableTabs(true);
    this._tabbedPane.setAllowTabReorder(true, true);

    this._tabbedPane.addEventListener(UI.TabbedPane.Events.TabClosed, this._tabClosed, this);
    this._tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, this._tabSelected, this);

    Persistence.Persistence.PersistenceImpl.instance().addEventListener(
        Persistence.Persistence.Events.BindingCreated, this._onBindingCreated, this);
    Persistence.Persistence.PersistenceImpl.instance().addEventListener(
        Persistence.Persistence.Events.BindingRemoved, this._onBindingRemoved, this);

    this._tabIds = new Map();
    this._files = new Map();

    this._previouslyViewedFilesSetting = setting;
    this._history = History.fromObject(this._previouslyViewedFilesSetting.get());
    this._uriToUISourceCode = new Map();
  }

  _onBindingCreated(event: Common.EventTarget.EventTargetEvent): void {
    const binding = (event.data as Persistence.Persistence.PersistenceBinding);
    this._updateFileTitle(binding.fileSystem);

    const networkTabId = this._tabIds.get(binding.network);
    let fileSystemTabId = this._tabIds.get(binding.fileSystem);

    const wasSelectedInNetwork = this._currentFile === binding.network;
    const currentSelectionRange = this._history.selectionRange(binding.network.url());
    const currentScrollLineNumber = this._history.scrollLineNumber(binding.network.url());
    this._history.remove(binding.network.url());

    if (!networkTabId) {
      return;
    }

    if (!fileSystemTabId) {
      const networkView = this._tabbedPane.tabView(networkTabId);
      const tabIndex = this._tabbedPane.tabIndex(networkTabId);
      if (networkView instanceof UISourceCodeFrame) {
        this._delegate.recycleUISourceCodeFrame(networkView, binding.fileSystem);
        fileSystemTabId = this._appendFileTab(binding.fileSystem, false, tabIndex, networkView);
      } else {
        fileSystemTabId = this._appendFileTab(binding.fileSystem, false, tabIndex);
        const fileSystemTabView = (this._tabbedPane.tabView(fileSystemTabId) as UI.Widget.Widget);
        this._restoreEditorProperties(fileSystemTabView, currentSelectionRange, currentScrollLineNumber);
      }
    }

    this._closeTabs([networkTabId], true);
    if (wasSelectedInNetwork) {
      this._tabbedPane.selectTab(fileSystemTabId, false);
    }

    this._updateHistory();
  }

  _onBindingRemoved(event: Common.EventTarget.EventTargetEvent): void {
    const binding = (event.data as Persistence.Persistence.PersistenceBinding);
    this._updateFileTitle(binding.fileSystem);
  }

  get view(): UI.Widget.Widget {
    return this._tabbedPane;
  }

  get visibleView(): UI.Widget.Widget|null {
    return this._tabbedPane.visibleView;
  }

  fileViews(): UI.Widget.Widget[] {
    return /** @type {!Array.<!UI.Widget.Widget>} */ this._tabbedPane.tabViews() as UI.Widget.Widget[];
  }

  leftToolbar(): UI.Toolbar.Toolbar {
    return this._tabbedPane.leftToolbar();
  }

  rightToolbar(): UI.Toolbar.Toolbar {
    return this._tabbedPane.rightToolbar();
  }

  show(parentElement: Element): void {
    this._tabbedPane.show(parentElement);
  }

  showFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
    uiSourceCode = binding ? binding.fileSystem : uiSourceCode;

    const frame = UI.Context.Context.instance().flavor(SourcesView);
    // If the content has already been set and the current frame is showing
    // the incoming uiSourceCode, then fire the event that the file has been loaded.
    // Otherwise, this event will fire as soon as the content has been set.
    if (frame?.currentSourceFrame()?.contentSet && this._currentFile === uiSourceCode &&
        frame?.currentUISourceCode() === uiSourceCode) {
      Common.EventTarget.fireEvent('source-file-loaded', uiSourceCode.displayName(true));
    } else {
      this._innerShowFile(this._canonicalUISourceCode(uiSourceCode), true);
    }
  }

  closeFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const tabId = this._tabIds.get(uiSourceCode);
    if (!tabId) {
      return;
    }
    this._closeTabs([tabId]);
  }

  closeAllFiles(): void {
    this._closeTabs(this._tabbedPane.tabIds());
  }

  historyUISourceCodes(): Workspace.UISourceCode.UISourceCode[] {
    const result = [];
    const uris = this._history._urls();
    for (const uri of uris) {
      const uiSourceCode = this._uriToUISourceCode.get(uri);
      if (uiSourceCode) {
        result.push(uiSourceCode);
      }
    }
    return result;
  }

  _addViewListeners(): void {
    if (!this._currentView || !(this._currentView instanceof SourceFrame.SourceFrame.SourceFrameImpl)) {
      return;
    }
    this._currentView.textEditor.addEventListener(
        SourceFrame.SourcesTextEditor.Events.ScrollChanged, this._scrollChanged, this);
    this._currentView.textEditor.addEventListener(
        SourceFrame.SourcesTextEditor.Events.SelectionChanged, this._selectionChanged, this);
  }

  _removeViewListeners(): void {
    if (!this._currentView || !(this._currentView instanceof SourceFrame.SourceFrame.SourceFrameImpl)) {
      return;
    }
    this._currentView.textEditor.removeEventListener(
        SourceFrame.SourcesTextEditor.Events.ScrollChanged, this._scrollChanged, this);
    this._currentView.textEditor.removeEventListener(
        SourceFrame.SourcesTextEditor.Events.SelectionChanged, this._selectionChanged, this);
  }

  _scrollChanged(event: Common.EventTarget.EventTargetEvent): void {
    if (this._scrollTimer) {
      clearTimeout(this._scrollTimer);
    }
    const lineNumber = (event.data as number);
    this._scrollTimer = window.setTimeout(saveHistory.bind(this), 100);
    if (this._currentFile) {
      this._history.updateScrollLineNumber(this._currentFile.url(), lineNumber);
    }

    function saveHistory(this: TabbedEditorContainer): void {
      this._history.save(this._previouslyViewedFilesSetting);
    }
  }

  _selectionChanged(event: Common.EventTarget.EventTargetEvent): void {
    const range = (event.data as TextUtils.TextRange.TextRange);
    if (this._currentFile) {
      this._history.updateSelectionRange(this._currentFile.url(), range);
    }
    this._history.save(this._previouslyViewedFilesSetting);

    if (this._currentFile) {
      Extensions.ExtensionServer.ExtensionServer.instance().sourceSelectionChanged(this._currentFile.url(), range);
    }
  }

  _innerShowFile(uiSourceCode: Workspace.UISourceCode.UISourceCode, userGesture?: boolean): void {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
    uiSourceCode = binding ? binding.fileSystem : uiSourceCode;
    if (this._currentFile === uiSourceCode) {
      return;
    }

    this._removeViewListeners();
    this._currentFile = uiSourceCode;

    const tabId = this._tabIds.get(uiSourceCode) || this._appendFileTab(uiSourceCode, userGesture);

    this._tabbedPane.selectTab(tabId, userGesture);
    if (userGesture) {
      this._editorSelectedByUserAction();
    }

    const previousView = this._currentView;
    this._currentView = this.visibleView;
    this._addViewListeners();

    const eventData = {
      currentFile: this._currentFile,
      currentView: this._currentView,
      previousView: previousView,
      userGesture: userGesture,
    };
    this.dispatchEventToListeners(Events.EditorSelected, eventData);
  }

  _titleForFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): string {
    const maxDisplayNameLength = 30;
    let title = Platform.StringUtilities.trimMiddle(uiSourceCode.displayName(true), maxDisplayNameLength);
    if (uiSourceCode.isDirty()) {
      title += '*';
    }
    return title;
  }

  _maybeCloseTab(id: string, nextTabId: string|null): boolean {
    const uiSourceCode = this._files.get(id);
    if (!uiSourceCode) {
      return false;
    }
    const shouldPrompt = uiSourceCode.isDirty() && uiSourceCode.project().canSetFileContent();
    // FIXME: this should be replaced with common Save/Discard/Cancel dialog.
    if (!shouldPrompt || confirm(i18nString(UIStrings.areYouSureYouWantToCloseUnsaved, {PH1: uiSourceCode.name()}))) {
      uiSourceCode.resetWorkingCopy();
      if (nextTabId) {
        this._tabbedPane.selectTab(nextTabId, true);
      }
      this._tabbedPane.closeTab(id, true);
      return true;
    }
    return false;
  }

  _closeTabs(ids: string[], forceCloseDirtyTabs?: boolean): void {
    const dirtyTabs = [];
    const cleanTabs = [];
    for (let i = 0; i < ids.length; ++i) {
      const id = ids[i];
      const uiSourceCode = this._files.get(id);
      if (uiSourceCode) {
        if (!forceCloseDirtyTabs && uiSourceCode.isDirty()) {
          dirtyTabs.push(id);
        } else {
          cleanTabs.push(id);
        }
      }
    }
    if (dirtyTabs.length) {
      this._tabbedPane.selectTab(dirtyTabs[0], true);
    }
    this._tabbedPane.closeTabs(cleanTabs, true);
    for (let i = 0; i < dirtyTabs.length; ++i) {
      const nextTabId = i + 1 < dirtyTabs.length ? dirtyTabs[i + 1] : null;
      if (!this._maybeCloseTab(dirtyTabs[i], nextTabId)) {
        break;
      }
    }
  }

  _onContextMenu(tabId: string, contextMenu: UI.ContextMenu.ContextMenu): void {
    const uiSourceCode = this._files.get(tabId);
    if (uiSourceCode) {
      contextMenu.appendApplicableItems(uiSourceCode);
    }
  }

  _canonicalUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): Workspace.UISourceCode.UISourceCode {
    // Check if we have already a UISourceCode for this url
    const existingSourceCode = this._uriToUISourceCode.get(uiSourceCode.url());
    if (existingSourceCode) {
      // Ignore incoming uiSourceCode, we already have this file.
      return existingSourceCode;
    }
    this._uriToUISourceCode.set(uiSourceCode.url(), uiSourceCode);
    return uiSourceCode;
  }

  addUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const canonicalSourceCode = this._canonicalUISourceCode(uiSourceCode);
    const duplicated = canonicalSourceCode !== uiSourceCode;
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(canonicalSourceCode);
    uiSourceCode = binding ? binding.fileSystem : canonicalSourceCode;

    if (duplicated && uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.FileSystem) {
      uiSourceCode.disableEdit();
    }

    if (this._currentFile === uiSourceCode) {
      return;
    }

    const uri = uiSourceCode.url();
    const index = this._history.index(uri);
    if (index === -1) {
      return;
    }

    if (!this._tabIds.has(uiSourceCode)) {
      this._appendFileTab(uiSourceCode, false);
    }

    // Select tab if this file was the last to be shown.
    if (!index) {
      this._innerShowFile(uiSourceCode, false);
      return;
    }

    if (!this._currentFile) {
      return;
    }

    const currentProjectIsSnippets = Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(this._currentFile);
    const addedProjectIsSnippets = Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(uiSourceCode);
    if (this._history.index(this._currentFile.url()) && currentProjectIsSnippets && !addedProjectIsSnippets) {
      this._innerShowFile(uiSourceCode, false);
    }
  }

  removeUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    this.removeUISourceCodes([uiSourceCode]);
  }

  removeUISourceCodes(uiSourceCodes: Workspace.UISourceCode.UISourceCode[]): void {
    const tabIds = [];
    for (const uiSourceCode of uiSourceCodes) {
      const tabId = this._tabIds.get(uiSourceCode);
      if (tabId) {
        tabIds.push(tabId);
      }
      if (this._uriToUISourceCode.get(uiSourceCode.url()) === uiSourceCode) {
        this._uriToUISourceCode.delete(uiSourceCode.url());
      }
    }
    this._tabbedPane.closeTabs(tabIds);
  }

  _editorClosedByUserAction(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    this._history.remove(uiSourceCode.url());
    this._updateHistory();
  }

  _editorSelectedByUserAction(): void {
    this._updateHistory();
  }

  _updateHistory(): void {
    const tabIds = this._tabbedPane.lastOpenedTabIds(maximalPreviouslyViewedFilesCount);

    function tabIdToURI(this: TabbedEditorContainer, tabId: string): string {
      const tab = this._files.get(tabId);
      if (!tab) {
        return '';
      }
      return tab.url();
    }

    this._history.update(tabIds.map(tabIdToURI.bind(this)));
    this._history.save(this._previouslyViewedFilesSetting);
  }

  _tooltipForFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): string {
    uiSourceCode = Persistence.Persistence.PersistenceImpl.instance().network(uiSourceCode) || uiSourceCode;
    return uiSourceCode.url();
  }

  _appendFileTab(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, userGesture?: boolean, index?: number,
      replaceView?: UI.Widget.Widget): string {
    const view = replaceView || this._delegate.viewForFile(uiSourceCode);
    const title = this._titleForFile(uiSourceCode);
    const tooltip = this._tooltipForFile(uiSourceCode);

    const tabId = this._generateTabId();
    this._tabIds.set(uiSourceCode, tabId);
    this._files.set(tabId, uiSourceCode);

    if (!replaceView) {
      const savedSelectionRange = this._history.selectionRange(uiSourceCode.url());
      const savedScrollLineNumber = this._history.scrollLineNumber(uiSourceCode.url());
      this._restoreEditorProperties(view, savedSelectionRange, savedScrollLineNumber);
    }

    this._tabbedPane.appendTab(tabId, title, view, tooltip, userGesture, undefined, index);

    this._updateFileTitle(uiSourceCode);
    this._addUISourceCodeListeners(uiSourceCode);
    if (uiSourceCode.loadError()) {
      this._addLoadErrorIcon(tabId);
    } else if (!uiSourceCode.contentLoaded()) {
      uiSourceCode.requestContent().then(_content => {
        if (uiSourceCode.loadError()) {
          this._addLoadErrorIcon(tabId);
        }
      });
    }
    return tabId;
  }

  _addLoadErrorIcon(tabId: string): void {
    const icon = UI.Icon.Icon.create('smallicon-error');
    UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.unableToLoadThisContent));
    if (this._tabbedPane.tabView(tabId)) {
      this._tabbedPane.setTabIcon(tabId, icon);
    }
  }

  _restoreEditorProperties(
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

  _tabClosed(event: Common.EventTarget.EventTargetEvent): void {
    const tabId = (event.data.tabId as string);
    const userGesture = (event.data.isUserGesture as boolean);

    const uiSourceCode = this._files.get(tabId);
    if (this._currentFile === uiSourceCode) {
      this._removeViewListeners();
      this._currentView = null;
      this._currentFile = null;
    }
    if (uiSourceCode) {
      this._tabIds.delete(uiSourceCode);
    }
    this._files.delete(tabId);

    if (uiSourceCode) {
      this._removeUISourceCodeListeners(uiSourceCode);

      this.dispatchEventToListeners(Events.EditorClosed, uiSourceCode);

      if (userGesture) {
        this._editorClosedByUserAction(uiSourceCode);
      }
    }
  }

  _tabSelected(event: Common.EventTarget.EventTargetEvent): void {
    const tabId = (event.data.tabId as string);
    const userGesture = (event.data.isUserGesture as boolean);

    const uiSourceCode = this._files.get(tabId);
    if (uiSourceCode) {
      this._innerShowFile(uiSourceCode, userGesture);
    }
  }

  _addUISourceCodeListeners(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, this._uiSourceCodeTitleChanged, this);
    uiSourceCode.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this._uiSourceCodeWorkingCopyChanged, this);
    uiSourceCode.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._uiSourceCodeWorkingCopyCommitted, this);
  }

  _removeUISourceCodeListeners(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.TitleChanged, this._uiSourceCodeTitleChanged, this);
    uiSourceCode.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this._uiSourceCodeWorkingCopyChanged, this);
    uiSourceCode.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._uiSourceCodeWorkingCopyCommitted, this);
  }

  _updateFileTitle(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const tabId = this._tabIds.get(uiSourceCode);
    if (tabId) {
      const title = this._titleForFile(uiSourceCode);
      const tooltip = this._tooltipForFile(uiSourceCode);
      this._tabbedPane.changeTabTitle(tabId, title, tooltip);
      let icon: UI.Icon.Icon|(UI.Icon.Icon | null)|null = null;
      if (uiSourceCode.loadError()) {
        icon = UI.Icon.Icon.create('smallicon-error');
        UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.unableToLoadThisContent));
      } else if (Persistence.Persistence.PersistenceImpl.instance().hasUnsavedCommittedChanges(uiSourceCode)) {
        icon = UI.Icon.Icon.create('smallicon-warning');
        UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.changesToThisFileWereNotSavedTo));
      } else {
        icon = Persistence.PersistenceUtils.PersistenceUtils.iconForUISourceCode(uiSourceCode);
      }
      this._tabbedPane.setTabIcon(tabId, icon);
    }
  }

  _uiSourceCodeTitleChanged(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    const uiSourceCode = event.data;
    this._updateFileTitle(uiSourceCode);
    this._updateHistory();
  }

  _uiSourceCodeWorkingCopyChanged(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>):
      void {
    const uiSourceCode = event.data;
    this._updateFileTitle(uiSourceCode);
  }

  _uiSourceCodeWorkingCopyCommitted(
      event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.WorkingCopyCommitedEvent>): void {
    const uiSourceCode = event.data.uiSourceCode;
    this._updateFileTitle(uiSourceCode);
  }

  _generateTabId(): string {
    return 'tab_' + (tabId++);
  }

  /** uiSourceCode
     */
  currentFile(): Workspace.UISourceCode.UISourceCode|null {
    return this._currentFile || null;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  EditorSelected = 'EditorSelected',
  EditorClosed = 'EditorClosed',
}

export let tabId = 0;
export const maximalPreviouslyViewedFilesCount = 30;

interface SerializedHistoryItem {
  url: string;
  selectionRange?: TextUtils.TextRange.SerializedTextRange;
  scrollLineNumber?: number;
}

export class HistoryItem {
  url: string;
  _isSerializable: boolean;
  selectionRange: TextUtils.TextRange.TextRange|undefined;
  scrollLineNumber: number|undefined;

  constructor(url: string, selectionRange?: TextUtils.TextRange.TextRange, scrollLineNumber?: number) {
    this.url = url;
    this._isSerializable = url.length < HistoryItem.serializableUrlLengthLimit;
    this.selectionRange = selectionRange;
    this.scrollLineNumber = scrollLineNumber;
  }

  static fromObject(serializedHistoryItem: SerializedHistoryItem): HistoryItem {
    const selectionRange = serializedHistoryItem.selectionRange ?
        TextUtils.TextRange.TextRange.fromObject(serializedHistoryItem.selectionRange) :
        undefined;
    return new HistoryItem(serializedHistoryItem.url, selectionRange, serializedHistoryItem.scrollLineNumber);
  }

  serializeToObject(): SerializedHistoryItem|null {
    if (!this._isSerializable) {
      return null;
    }
    const serializedHistoryItem = {
      url: this.url,
      selectionRange: this.selectionRange,
      scrollLineNumber: this.scrollLineNumber,
    };
    return serializedHistoryItem;
  }

  static readonly serializableUrlLengthLimit = 4096;
}

export class History {
  _items: HistoryItem[];
  _itemsIndex: Map<string, number>;

  constructor(items: HistoryItem[]) {
    this._items = items;
    this._itemsIndex = new Map();
    this._rebuildItemIndex();
  }

  static fromObject(serializedHistory: SerializedHistoryItem[]): History {
    const items = [];
    for (let i = 0; i < serializedHistory.length; ++i) {
      // crbug.com/876265 Old versions of DevTools don't have urls set in their localStorage
      if ('url' in serializedHistory[i] && serializedHistory[i].url) {
        items.push(HistoryItem.fromObject(serializedHistory[i]));
      }
    }
    return new History(items);
  }

  index(url: string): number {
    const index = this._itemsIndex.get(url);
    if (index !== undefined) {
      return index;
    }
    return -1;
  }

  _rebuildItemIndex(): void {
    this._itemsIndex = new Map();
    for (let i = 0; i < this._items.length; ++i) {
      console.assert(!this._itemsIndex.has(this._items[i].url));
      this._itemsIndex.set(this._items[i].url, i);
    }
  }

  selectionRange(url: string): TextUtils.TextRange.TextRange|undefined {
    const index = this.index(url);
    return index !== -1 ? this._items[index].selectionRange : undefined;
  }

  updateSelectionRange(url: string, selectionRange?: TextUtils.TextRange.TextRange): void {
    if (!selectionRange) {
      return;
    }
    const index = this.index(url);
    if (index === -1) {
      return;
    }
    this._items[index].selectionRange = selectionRange;
  }

  scrollLineNumber(url: string): number|undefined {
    const index = this.index(url);
    return index !== -1 ? this._items[index].scrollLineNumber : undefined;
  }

  updateScrollLineNumber(url: string, scrollLineNumber: number): void {
    const index = this.index(url);
    if (index === -1) {
      return;
    }
    this._items[index].scrollLineNumber = scrollLineNumber;
  }

  update(urls: string[]): void {
    for (let i = urls.length - 1; i >= 0; --i) {
      const index = this.index(urls[i]);
      let item;
      if (index !== -1) {
        item = this._items[index];
        this._items.splice(index, 1);
      } else {
        item = new HistoryItem(urls[i]);
      }
      this._items.unshift(item);
      this._rebuildItemIndex();
    }
  }

  remove(url: string): void {
    const index = this.index(url);
    if (index !== -1) {
      this._items.splice(index, 1);
      this._rebuildItemIndex();
    }
  }

  save(setting: Common.Settings.Setting<SerializedHistoryItem[]>): void {
    setting.set(this._serializeToObject());
  }

  _serializeToObject(): SerializedHistoryItem[] {
    const serializedHistory = [];
    for (let i = 0; i < this._items.length; ++i) {
      const serializedItem = this._items[i].serializeToObject();
      if (serializedItem) {
        serializedHistory.push(serializedItem);
      }
      if (serializedHistory.length === maximalPreviouslyViewedFilesCount) {
        break;
      }
    }
    return serializedHistory;
  }

  _urls(): string[] {
    const result = [];
    for (let i = 0; i < this._items.length; ++i) {
      result.push(this._items[i].url);
    }
    return result;
  }
}

export class EditorContainerTabDelegate implements UI.TabbedPane.TabbedPaneTabDelegate {
  _editorContainer: TabbedEditorContainer;

  constructor(editorContainer: TabbedEditorContainer) {
    this._editorContainer = editorContainer;
  }

  closeTabs(_tabbedPane: UI.TabbedPane.TabbedPane, ids: string[]): void {
    this._editorContainer._closeTabs(ids);
  }

  onContextMenu(tabId: string, contextMenu: UI.ContextMenu.ContextMenu): void {
    this._editorContainer._onContextMenu(tabId, contextMenu);
  }
}
