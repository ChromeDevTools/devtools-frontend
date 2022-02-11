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
export interface TabbedEditorContainerDelegate {
  viewForFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget;

  recycleUISourceCodeFrame(sourceFrame: UISourceCodeFrame, uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
}

export class TabbedEditorContainer extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private readonly delegate: TabbedEditorContainerDelegate;
  private readonly tabbedPane: UI.TabbedPane.TabbedPane;
  private tabIds: Map<Workspace.UISourceCode.UISourceCode, string>;
  private readonly files: Map<string, Workspace.UISourceCode.UISourceCode>;
  private readonly previouslyViewedFilesSetting: Common.Settings.Setting<SerializedHistoryItem[]>;
  private readonly history: History;
  private readonly uriToUISourceCode: Map<string, Workspace.UISourceCode.UISourceCode>;
  private currentFileInternal!: Workspace.UISourceCode.UISourceCode|null;
  private currentView!: UI.Widget.Widget|null;
  private scrollTimer?: number;
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

    Persistence.Persistence.PersistenceImpl.instance().addEventListener(
        Persistence.Persistence.Events.BindingCreated, this.onBindingCreated, this);
    Persistence.Persistence.PersistenceImpl.instance().addEventListener(
        Persistence.Persistence.Events.BindingRemoved, this.onBindingRemoved, this);

    this.tabIds = new Map();
    this.files = new Map();

    this.previouslyViewedFilesSetting = setting;
    this.history = History.fromObject(this.previouslyViewedFilesSetting.get());
    this.uriToUISourceCode = new Map();
  }

  private onBindingCreated(event: Common.EventTarget.EventTargetEvent<Persistence.Persistence.PersistenceBinding>):
      void {
    const binding = event.data;
    this.updateFileTitle(binding.fileSystem);

    const networkTabId = this.tabIds.get(binding.network);
    let fileSystemTabId = this.tabIds.get(binding.fileSystem);

    const wasSelectedInNetwork = this.currentFileInternal === binding.network;
    const currentSelectionRange = this.history.selectionRange(binding.network.url());
    const currentScrollLineNumber = this.history.scrollLineNumber(binding.network.url());
    this.history.remove(binding.network.url());

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
      this.innerShowFile(this.canonicalUISourceCode(uiSourceCode), true);
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
    const uris = this.history.urls();
    for (const uri of uris) {
      const uiSourceCode = this.uriToUISourceCode.get(uri);
      if (uiSourceCode) {
        result.push(uiSourceCode);
      }
    }
    return result;
  }

  private addViewListeners(): void {
    if (!this.currentView || !(this.currentView instanceof SourceFrame.SourceFrame.SourceFrameImpl)) {
      return;
    }
    this.currentView.addEventListener(SourceFrame.SourceFrame.Events.EditorUpdate, this.onEditorUpdate, this);
    this.currentView.addEventListener(SourceFrame.SourceFrame.Events.EditorScroll, this.onScrollChanged, this);
  }

  private removeViewListeners(): void {
    if (!this.currentView || !(this.currentView instanceof SourceFrame.SourceFrame.SourceFrameImpl)) {
      return;
    }
    this.currentView.removeEventListener(SourceFrame.SourceFrame.Events.EditorUpdate, this.onEditorUpdate, this);
    this.currentView.removeEventListener(SourceFrame.SourceFrame.Events.EditorScroll, this.onScrollChanged, this);
  }

  private onScrollChanged(): void {
    if (this.currentView instanceof SourceFrame.SourceFrame.SourceFrameImpl) {
      if (this.scrollTimer) {
        clearTimeout(this.scrollTimer);
      }
      this.scrollTimer = window.setTimeout(() => this.history.save(this.previouslyViewedFilesSetting), 100);
      if (this.currentFileInternal) {
        const {editor} = this.currentView.textEditor;
        const topBlock = editor.blockAtHeight(editor.scrollDOM.getBoundingClientRect().top);
        const topLine = editor.state.doc.lineAt(topBlock.from).number - 1;
        this.history.updateScrollLineNumber(this.currentFileInternal.url(), topLine);
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
        this.history.updateSelectionRange(this.currentFileInternal.url(), range);
      }
      this.history.save(this.previouslyViewedFilesSetting);

      if (this.currentFileInternal) {
        Extensions.ExtensionServer.ExtensionServer.instance().sourceSelectionChanged(
            this.currentFileInternal.url(), range);
      }
    }
  }

  private innerShowFile(uiSourceCode: Workspace.UISourceCode.UISourceCode, userGesture?: boolean): void {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
    uiSourceCode = binding ? binding.fileSystem : uiSourceCode;
    if (this.currentFileInternal === uiSourceCode) {
      return;
    }

    this.removeViewListeners();
    this.currentFileInternal = uiSourceCode;

    const tabId = this.tabIds.get(uiSourceCode) || this.appendFileTab(uiSourceCode, userGesture);

    this.tabbedPane.selectTab(tabId, userGesture);
    if (userGesture) {
      this.editorSelectedByUserAction();
    }

    const previousView = this.currentView;
    this.currentView = this.visibleView;
    this.addViewListeners();

    const eventData = {
      currentFile: this.currentFileInternal,
      currentView: this.currentView,
      previousView: previousView,
      userGesture: userGesture,
    };
    this.dispatchEventToListeners(Events.EditorSelected, eventData);
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
    const existingSourceCode = this.uriToUISourceCode.get(uiSourceCode.url());
    if (existingSourceCode) {
      // Ignore incoming uiSourceCode, we already have this file.
      return existingSourceCode;
    }
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

    if (this.currentFileInternal === uiSourceCode) {
      return;
    }

    const uri = uiSourceCode.url();
    const index = this.history.index(uri);
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
    if (this.history.index(this.currentFileInternal.url()) && currentProjectIsSnippets && !addedProjectIsSnippets) {
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
    }
    this.tabbedPane.closeTabs(tabIds);
  }

  private editorClosedByUserAction(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    this.history.remove(uiSourceCode.url());
    this.updateHistory();
  }

  private editorSelectedByUserAction(): void {
    this.updateHistory();
  }

  private updateHistory(): void {
    const tabIds = this.tabbedPane.lastOpenedTabIds(maximalPreviouslyViewedFilesCount);

    function tabIdToURI(this: TabbedEditorContainer, tabId: string): string {
      const tab = this.files.get(tabId);
      if (!tab) {
        return '';
      }
      return tab.url();
    }

    this.history.update(tabIds.map(tabIdToURI.bind(this)));
    this.history.save(this.previouslyViewedFilesSetting);
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
      const savedSelectionRange = this.history.selectionRange(uiSourceCode.url());
      const savedScrollLineNumber = this.history.scrollLineNumber(uiSourceCode.url());
      this.restoreEditorProperties(view, savedSelectionRange, savedScrollLineNumber);
    }

    this.tabbedPane.appendTab(tabId, title, view, tooltip, userGesture, undefined, undefined, index);

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
    const icon = UI.Icon.Icon.create('smallicon-error');
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
    if (this.currentFileInternal === uiSourceCode) {
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

      this.dispatchEventToListeners(Events.EditorClosed, uiSourceCode);

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
    // Ensure it is mapped under current url.
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

  private generateTabId(): string {
    return 'tab_' + (tabId++);
  }

  currentFile(): Workspace.UISourceCode.UISourceCode|null {
    return this.currentFileInternal || null;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  EditorSelected = 'EditorSelected',
  EditorClosed = 'EditorClosed',
}

export interface EditorSelectedEvent {
  currentFile: Workspace.UISourceCode.UISourceCode;
  currentView: UI.Widget.Widget|null;
  previousView: UI.Widget.Widget|null;
  userGesture: boolean|undefined;
}

export type EventTypes = {
  [Events.EditorSelected]: EditorSelectedEvent,
  [Events.EditorClosed]: Workspace.UISourceCode.UISourceCode,
};

export let tabId = 0;
export const maximalPreviouslyViewedFilesCount = 30;

interface SerializedHistoryItem {
  url: string;
  selectionRange?: TextUtils.TextRange.SerializedTextRange;
  scrollLineNumber?: number;
}

export class HistoryItem {
  url: string;
  private isSerializable: boolean;
  selectionRange: TextUtils.TextRange.TextRange|undefined;
  scrollLineNumber: number|undefined;

  constructor(url: string, selectionRange?: TextUtils.TextRange.TextRange, scrollLineNumber?: number) {
    this.url = url;
    this.isSerializable = url.length < HistoryItem.serializableUrlLengthLimit;
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
    if (!this.isSerializable) {
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
  private items: HistoryItem[];
  private itemsIndex: Map<string, number>;

  constructor(items: HistoryItem[]) {
    this.items = items;
    this.itemsIndex = new Map();
    this.rebuildItemIndex();
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
    const index = this.itemsIndex.get(url);
    if (index !== undefined) {
      return index;
    }
    return -1;
  }

  private rebuildItemIndex(): void {
    this.itemsIndex = new Map();
    for (let i = 0; i < this.items.length; ++i) {
      console.assert(!this.itemsIndex.has(this.items[i].url));
      this.itemsIndex.set(this.items[i].url, i);
    }
  }

  selectionRange(url: string): TextUtils.TextRange.TextRange|undefined {
    const index = this.index(url);
    return index !== -1 ? this.items[index].selectionRange : undefined;
  }

  updateSelectionRange(url: string, selectionRange?: TextUtils.TextRange.TextRange): void {
    if (!selectionRange) {
      return;
    }
    const index = this.index(url);
    if (index === -1) {
      return;
    }
    this.items[index].selectionRange = selectionRange;
  }

  scrollLineNumber(url: string): number|undefined {
    const index = this.index(url);
    return index !== -1 ? this.items[index].scrollLineNumber : undefined;
  }

  updateScrollLineNumber(url: string, scrollLineNumber: number): void {
    const index = this.index(url);
    if (index === -1) {
      return;
    }
    this.items[index].scrollLineNumber = scrollLineNumber;
  }

  update(urls: string[]): void {
    for (let i = urls.length - 1; i >= 0; --i) {
      const index = this.index(urls[i]);
      let item;
      if (index !== -1) {
        item = this.items[index];
        this.items.splice(index, 1);
      } else {
        item = new HistoryItem(urls[i]);
      }
      this.items.unshift(item);
      this.rebuildItemIndex();
    }
  }

  remove(url: string): void {
    const index = this.index(url);
    if (index !== -1) {
      this.items.splice(index, 1);
      this.rebuildItemIndex();
    }
  }

  save(setting: Common.Settings.Setting<SerializedHistoryItem[]>): void {
    setting.set(this.serializeToObject());
  }

  private serializeToObject(): SerializedHistoryItem[] {
    const serializedHistory = [];
    for (let i = 0; i < this.items.length; ++i) {
      const serializedItem = this.items[i].serializeToObject();
      if (serializedItem) {
        serializedHistory.push(serializedItem);
      }
      if (serializedHistory.length === maximalPreviouslyViewedFilesCount) {
        break;
      }
    }
    return serializedHistory;
  }

  urls(): string[] {
    const result = [];
    for (let i = 0; i < this.items.length; ++i) {
      result.push(this.items[i].url);
    }
    return result;
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
