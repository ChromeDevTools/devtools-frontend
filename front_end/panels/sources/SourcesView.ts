// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as QuickOpen from '../../ui/legacy/components/quick_open/quick_open.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';

import {EditingLocationHistoryManager} from './EditingLocationHistoryManager.js';
import type {TabbedEditorContainerDelegate} from './TabbedEditorContainer.js';
import {Events as TabbedEditorContainerEvents, TabbedEditorContainer} from './TabbedEditorContainer.js';
import {Events as UISourceCodeFrameEvents, UISourceCodeFrame} from './UISourceCodeFrame.js';

const UIStrings = {
  /**
  *@description Text to open a file
  */
  openFile: 'Open file',
  /**
  *@description Text to run commands
  */
  runCommand: 'Run command',
  /**
  *@description Text in Sources View of the Sources panel
  */
  dropInAFolderToAddToWorkspace: 'Drop in a folder to add to workspace',
  /**
  *@description Accessible label for Sources placeholder view actions list
  */
  sourceViewActions: 'Source View Actions',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/SourcesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SourcesView extends UI.Widget.VBox implements TabbedEditorContainerDelegate, UI.SearchableView.Searchable,
                                                           UI.SearchableView.Replaceable {
  _placeholderOptionArray: {
    element: HTMLElement,
    handler: Function,
  }[];
  _selectedIndex: number;
  _searchableView: UI.SearchableView.SearchableView;
  _sourceViewByUISourceCode: Map<Workspace.UISourceCode.UISourceCode, UI.Widget.Widget>;
  _editorContainer: TabbedEditorContainer;
  _historyManager: EditingLocationHistoryManager;
  _toolbarContainerElement: HTMLElement;
  _scriptViewToolbar: UI.Toolbar.Toolbar;
  _bottomToolbar: UI.Toolbar.Toolbar;
  _toolbarChangedListener: Common.EventTarget.EventDescriptor|null;
  _shortcuts: Map<number, () => boolean>;
  _focusedPlaceholderElement?: HTMLElement;
  _searchView?: UISourceCodeFrame;
  _searchConfig?: UI.SearchableView.SearchConfig;

  constructor() {
    super();
    this.registerRequiredCSS('panels/sources/sourcesView.css');
    this.element.id = 'sources-panel-sources-view';
    this.setMinimumAndPreferredSizes(250, 52, 250, 100);

    this._placeholderOptionArray = [];
    this._selectedIndex = 0;

    const workspace = Workspace.Workspace.WorkspaceImpl.instance();

    this._searchableView = new UI.SearchableView.SearchableView(this, this, 'sourcesViewSearchConfig');
    this._searchableView.setMinimalSearchQuerySize(0);
    this._searchableView.show(this.element);

    this._sourceViewByUISourceCode = new Map();

    this._editorContainer = new TabbedEditorContainer(
        this, Common.Settings.Settings.instance().createLocalSetting('previouslyViewedFiles', []),
        this._placeholderElement(), this._focusedPlaceholderElement);
    this._editorContainer.show(this._searchableView.element);
    this._editorContainer.addEventListener(TabbedEditorContainerEvents.EditorSelected, this._editorSelected, this);
    this._editorContainer.addEventListener(TabbedEditorContainerEvents.EditorClosed, this._editorClosed, this);

    this._historyManager = new EditingLocationHistoryManager(this, this.currentSourceFrame.bind(this));

    this._toolbarContainerElement = this.element.createChild('div', 'sources-toolbar');
    if (!Root.Runtime.experiments.isEnabled('sourcesPrettyPrint')) {
      const toolbarEditorActions = new UI.Toolbar.Toolbar('', this._toolbarContainerElement);
      for (const action of getRegisteredEditorActions()) {
        toolbarEditorActions.appendToolbarItem(action.getOrCreateButton(this));
      }
    }
    this._scriptViewToolbar = new UI.Toolbar.Toolbar('', this._toolbarContainerElement);
    this._scriptViewToolbar.element.style.flex = 'auto';
    this._bottomToolbar = new UI.Toolbar.Toolbar('', this._toolbarContainerElement);

    this._toolbarChangedListener = null;

    UI.UIUtils.startBatchUpdate();
    workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));
    UI.UIUtils.endBatchUpdate();

    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);
    workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this._projectRemoved.bind(this), this);

    function handleBeforeUnload(event: Event): void {
      if (event.returnValue) {
        return;
      }

      const unsavedSourceCodes: Workspace.UISourceCode.UISourceCode[] = [];
      const projects =
          Workspace.Workspace.WorkspaceImpl.instance().projectsForType(Workspace.Workspace.projectTypes.FileSystem);
      for (const project of projects) {
        unsavedSourceCodes.push(...project.uiSourceCodes().filter(sourceCode => sourceCode.isDirty()));
      }

      if (!unsavedSourceCodes.length) {
        return;
      }

      event.returnValue = true;
      UI.ViewManager.ViewManager.instance().showView('sources');
      for (const sourceCode of unsavedSourceCodes) {
        Common.Revealer.reveal(sourceCode);
      }
    }

    if (!window.opener) {
      window.addEventListener('beforeunload', handleBeforeUnload, true);
    }

    this._shortcuts = new Map();
    this.element.addEventListener('keydown', this._handleKeyDown.bind(this), false);
  }

  _placeholderElement(): Element {
    this._placeholderOptionArray = [];

    const shortcuts = [
      {actionId: 'quickOpen.show', description: i18nString(UIStrings.openFile)},
      {actionId: 'commandMenu.show', description: i18nString(UIStrings.runCommand)},
      {actionId: 'sources.add-folder-to-workspace', description: i18nString(UIStrings.dropInAFolderToAddToWorkspace)},
    ];

    const element = document.createElement('div');
    const list = element.createChild('div', 'tabbed-pane-placeholder');
    list.addEventListener('keydown', this._placeholderOnKeyDown.bind(this), false);
    UI.ARIAUtils.markAsList(list);
    UI.ARIAUtils.setAccessibleName(list, i18nString(UIStrings.sourceViewActions));

    for (let i = 0; i < shortcuts.length; i++) {
      const shortcut = shortcuts[i];
      const shortcutKeyText = UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction(shortcut.actionId);
      const listItemElement = list.createChild('div');
      UI.ARIAUtils.markAsListitem(listItemElement);
      const row = (listItemElement.createChild('div', 'tabbed-pane-placeholder-row') as HTMLElement);
      row.tabIndex = -1;
      UI.ARIAUtils.markAsButton(row);
      if (shortcutKeyText) {
        row.createChild('div', 'tabbed-pane-placeholder-key').textContent = shortcutKeyText;
        row.createChild('div', 'tabbed-pane-placeholder-value').textContent = shortcut.description;
      } else {
        row.createChild('div', 'tabbed-pane-no-shortcut').textContent = shortcut.description;
      }
      const action = UI.ActionRegistry.ActionRegistry.instance().action(shortcut.actionId);
      if (action) {
        this._placeholderOptionArray.push({
          element: row,
          handler(): void {
            action.execute();
          },
        });
      }
    }

    element.appendChild(
        UI.XLink.XLink.create('https://developer.chrome.com/docs/devtools/workspaces/', 'Learn more about Workspaces'));

    return element;
  }

  _placeholderOnKeyDown(event: Event): void {
    const keyboardEvent = (event as KeyboardEvent);
    if (isEnterOrSpaceKey(keyboardEvent)) {
      this._placeholderOptionArray[this._selectedIndex].handler();
      return;
    }

    let offset = 0;
    if (keyboardEvent.key === 'ArrowDown') {
      offset = 1;
    } else if (keyboardEvent.key === 'ArrowUp') {
      offset = -1;
    }

    const newIndex = Math.max(Math.min(this._placeholderOptionArray.length - 1, this._selectedIndex + offset), 0);
    const newElement = this._placeholderOptionArray[newIndex].element;
    const oldElement = this._placeholderOptionArray[this._selectedIndex].element;
    if (newElement !== oldElement) {
      oldElement.tabIndex = -1;
      newElement.tabIndex = 0;
      UI.ARIAUtils.setSelected(oldElement, false);
      UI.ARIAUtils.setSelected(newElement, true);
      this._selectedIndex = newIndex;
      newElement.focus();
    }
  }

  static defaultUISourceCodeScores(): Map<Workspace.UISourceCode.UISourceCode, number> {
    const defaultScores = new Map<Workspace.UISourceCode.UISourceCode, number>();
    const sourcesView = UI.Context.Context.instance().flavor(SourcesView);
    if (sourcesView) {
      const uiSourceCodes = sourcesView._editorContainer.historyUISourceCodes();
      for (let i = 1; i < uiSourceCodes.length; ++i)  // Skip current element
      {
        defaultScores.set(uiSourceCodes[i], uiSourceCodes.length - i);
      }
    }
    return defaultScores;
  }

  leftToolbar(): UI.Toolbar.Toolbar {
    return this._editorContainer.leftToolbar();
  }

  rightToolbar(): UI.Toolbar.Toolbar {
    return this._editorContainer.rightToolbar();
  }

  bottomToolbar(): UI.Toolbar.Toolbar {
    return this._bottomToolbar;
  }

  _registerShortcuts(keys: UI.KeyboardShortcut.Descriptor[], handler: (arg0?: Event|undefined) => boolean): void {
    for (let i = 0; i < keys.length; ++i) {
      this._shortcuts.set(keys[i].key, handler);
    }
  }

  _handleKeyDown(event: Event): void {
    const shortcutKey = UI.KeyboardShortcut.KeyboardShortcut.makeKeyFromEvent((event as KeyboardEvent));
    const handler = this._shortcuts.get(shortcutKey);
    if (handler && handler()) {
      event.consume(true);
    }
  }

  wasShown(): void {
    super.wasShown();
    UI.Context.Context.instance().setFlavor(SourcesView, this);
  }

  willHide(): void {
    UI.Context.Context.instance().setFlavor(SourcesView, null);
    super.willHide();
  }

  toolbarContainerElement(): Element {
    return this._toolbarContainerElement;
  }

  searchableView(): UI.SearchableView.SearchableView {
    return this._searchableView;
  }

  visibleView(): UI.Widget.Widget|null {
    return this._editorContainer.visibleView;
  }

  currentSourceFrame(): UISourceCodeFrame|null {
    const view = this.visibleView();
    if (!(view instanceof UISourceCodeFrame)) {
      return null;
    }
    return (view as UISourceCodeFrame);
  }

  currentUISourceCode(): Workspace.UISourceCode.UISourceCode|null {
    return this._editorContainer.currentFile();
  }

  _onCloseEditorTab(): boolean {
    const uiSourceCode = this._editorContainer.currentFile();
    if (!uiSourceCode) {
      return false;
    }
    this._editorContainer.closeFile(uiSourceCode);
    return true;
  }

  _onJumpToPreviousLocation(): void {
    this._historyManager.rollback();
  }

  _onJumpToNextLocation(): void {
    this._historyManager.rollover();
  }

  _uiSourceCodeAdded(event: Common.EventTarget.EventTargetEvent): void {
    const uiSourceCode = (event.data as Workspace.UISourceCode.UISourceCode);
    this._addUISourceCode(uiSourceCode);
  }

  _addUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    if (uiSourceCode.project().isServiceProject()) {
      return;
    }
    if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.FileSystem &&
        Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(uiSourceCode.project()) ===
            'overrides') {
      return;
    }
    this._editorContainer.addUISourceCode(uiSourceCode);
  }

  _uiSourceCodeRemoved(event: Common.EventTarget.EventTargetEvent): void {
    const uiSourceCode = (event.data as Workspace.UISourceCode.UISourceCode);
    this._removeUISourceCodes([uiSourceCode]);
  }

  _removeUISourceCodes(uiSourceCodes: Workspace.UISourceCode.UISourceCode[]): void {
    this._editorContainer.removeUISourceCodes(uiSourceCodes);
    for (let i = 0; i < uiSourceCodes.length; ++i) {
      this._removeSourceFrame(uiSourceCodes[i]);
      this._historyManager.removeHistoryForSourceCode(uiSourceCodes[i]);
    }
  }

  _projectRemoved(event: Common.EventTarget.EventTargetEvent): void {
    const project = event.data;
    const uiSourceCodes = project.uiSourceCodes();
    this._removeUISourceCodes(uiSourceCodes);
  }

  _updateScriptViewToolbarItems(): void {
    const view = this.visibleView();
    if (view instanceof UI.View.SimpleView) {
      view.toolbarItems().then(items => {
        this._scriptViewToolbar.removeToolbarItems();
        items.map(item => this._scriptViewToolbar.appendToolbarItem(item));
      });
    }
  }

  showSourceLocation(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, lineNumber?: number, columnNumber?: number,
      omitFocus?: boolean, omitHighlight?: boolean): void {
    this._historyManager.updateCurrentState();
    this._editorContainer.showFile(uiSourceCode);
    const currentSourceFrame = this.currentSourceFrame();
    if (currentSourceFrame && typeof lineNumber === 'number') {
      currentSourceFrame.revealPosition(lineNumber, columnNumber, !omitHighlight);
    }
    this._historyManager.pushNewState();
    const visibleView = this.visibleView();
    if (!omitFocus && visibleView) {
      visibleView.focus();
    }
  }

  _createSourceView(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget {
    let sourceFrame;
    let sourceView;
    const contentType = uiSourceCode.contentType();

    if (contentType === Common.ResourceType.resourceTypes.Image) {
      sourceView = new SourceFrame.ImageView.ImageView(uiSourceCode.mimeType(), uiSourceCode);
    } else if (contentType === Common.ResourceType.resourceTypes.Font) {
      sourceView = new SourceFrame.FontView.FontView(uiSourceCode.mimeType(), uiSourceCode);
    } else {
      sourceFrame = new UISourceCodeFrame(uiSourceCode);
    }

    if (sourceFrame) {
      this._historyManager.trackSourceFrameCursorJumps(sourceFrame);
    }

    const widget = (sourceFrame || sourceView as UI.Widget.Widget);
    this._sourceViewByUISourceCode.set(uiSourceCode, widget);
    return widget;
  }

  _getOrCreateSourceView(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget {
    return this._sourceViewByUISourceCode.get(uiSourceCode) || this._createSourceView(uiSourceCode);
  }

  recycleUISourceCodeFrame(sourceFrame: UISourceCodeFrame, uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    this._sourceViewByUISourceCode.delete(sourceFrame.uiSourceCode());
    sourceFrame.setUISourceCode(uiSourceCode);
    this._sourceViewByUISourceCode.set(uiSourceCode, sourceFrame);
  }

  viewForFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget {
    return this._getOrCreateSourceView(uiSourceCode);
  }

  _removeSourceFrame(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const sourceView = this._sourceViewByUISourceCode.get(uiSourceCode);
    this._sourceViewByUISourceCode.delete(uiSourceCode);
    if (sourceView && sourceView instanceof UISourceCodeFrame) {
      (sourceView as UISourceCodeFrame).dispose();
    }
  }

  _editorClosed(event: Common.EventTarget.EventTargetEvent): void {
    const uiSourceCode = (event.data as Workspace.UISourceCode.UISourceCode);
    this._historyManager.removeHistoryForSourceCode(uiSourceCode);

    let wasSelected = false;
    if (!this._editorContainer.currentFile()) {
      wasSelected = true;
    }

    // SourcesNavigator does not need to update on EditorClosed.
    this._removeToolbarChangedListener();
    this._updateScriptViewToolbarItems();
    this._searchableView.resetSearch();

    const data = {
      uiSourceCode: uiSourceCode,
      wasSelected: wasSelected,
    };
    this.dispatchEventToListeners(Events.EditorClosed, data);
  }

  _editorSelected(event: Common.EventTarget.EventTargetEvent): void {
    const previousSourceFrame = event.data.previousView instanceof UISourceCodeFrame ? event.data.previousView : null;
    if (previousSourceFrame) {
      previousSourceFrame.setSearchableView(null);
    }
    const currentSourceFrame = event.data.currentView instanceof UISourceCodeFrame ? event.data.currentView : null;
    if (currentSourceFrame) {
      currentSourceFrame.setSearchableView(this._searchableView);
    }

    this._searchableView.setReplaceable(Boolean(currentSourceFrame) && currentSourceFrame.canEditSource());
    this._searchableView.refreshSearch();
    this._updateToolbarChangedListener();
    this._updateScriptViewToolbarItems();

    this.dispatchEventToListeners(Events.EditorSelected, this._editorContainer.currentFile());
  }

  _removeToolbarChangedListener(): void {
    if (this._toolbarChangedListener) {
      Common.EventTarget.removeEventListeners([this._toolbarChangedListener]);
    }
    this._toolbarChangedListener = null;
  }

  _updateToolbarChangedListener(): void {
    this._removeToolbarChangedListener();
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      return;
    }
    this._toolbarChangedListener = sourceFrame.addEventListener(
        UISourceCodeFrameEvents.ToolbarItemsChanged, this._updateScriptViewToolbarItems, this);
  }

  searchCanceled(): void {
    if (this._searchView) {
      this._searchView.searchCanceled();
    }

    delete this._searchView;
    delete this._searchConfig;
  }

  performSearch(searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void {
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      return;
    }

    this._searchView = sourceFrame;
    this._searchConfig = searchConfig;

    this._searchView.performSearch(this._searchConfig, shouldJump, jumpBackwards);
  }

  jumpToNextSearchResult(): void {
    if (!this._searchView) {
      return;
    }

    if (this._searchConfig && this._searchView !== this.currentSourceFrame()) {
      this.performSearch(this._searchConfig, true);
      return;
    }

    this._searchView.jumpToNextSearchResult();
  }

  jumpToPreviousSearchResult(): void {
    if (!this._searchView) {
      return;
    }

    if (this._searchConfig && this._searchView !== this.currentSourceFrame()) {
      this.performSearch(this._searchConfig, true);
      if (this._searchView) {
        this._searchView.jumpToLastSearchResult();
      }
      return;
    }

    this._searchView.jumpToPreviousSearchResult();
  }

  supportsCaseSensitiveSearch(): boolean {
    return true;
  }

  supportsRegexSearch(): boolean {
    return true;
  }

  replaceSelectionWith(searchConfig: UI.SearchableView.SearchConfig, replacement: string): void {
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      console.assert(Boolean(sourceFrame));
      return;
    }
    sourceFrame.replaceSelectionWith(searchConfig, replacement);
  }

  replaceAllWith(searchConfig: UI.SearchableView.SearchConfig, replacement: string): void {
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      console.assert(Boolean(sourceFrame));
      return;
    }
    sourceFrame.replaceAllWith(searchConfig, replacement);
  }

  _showOutlineQuickOpen(): void {
    QuickOpen.QuickOpen.QuickOpenImpl.show('@');
  }

  _showGoToLineQuickOpen(): void {
    if (this._editorContainer.currentFile()) {
      QuickOpen.QuickOpen.QuickOpenImpl.show(':');
    }
  }

  _save(): void {
    this._saveSourceFrame(this.currentSourceFrame());
  }

  _saveAll(): void {
    const sourceFrames = this._editorContainer.fileViews();
    sourceFrames.forEach(this._saveSourceFrame.bind(this));
  }

  _saveSourceFrame(sourceFrame: UI.Widget.Widget|null): void {
    if (!(sourceFrame instanceof UISourceCodeFrame)) {
      return;
    }
    const uiSourceCodeFrame = (sourceFrame as UISourceCodeFrame);
    uiSourceCodeFrame.commitEditing();
  }

  toggleBreakpointsActiveState(active: boolean): void {
    this._editorContainer.view.element.classList.toggle('breakpoints-deactivated', !active);
  }
}

export  // TODO(crbug.com/1167717): Make this a const enum again
    // eslint-disable-next-line rulesdir/const_enum
    enum Events {
      EditorClosed = 'EditorClosed',
      EditorSelected = 'EditorSelected',
    }

/**
 * @interface
 */
export interface EditorAction {
  getOrCreateButton(sourcesView: SourcesView): UI.Toolbar.ToolbarButton;
}

const registeredEditorActions: (() => EditorAction)[] = [];

export function registerEditorAction(editorAction: () => EditorAction): void {
  registeredEditorActions.push(editorAction);
}

export function getRegisteredEditorActions(): EditorAction[] {
  return registeredEditorActions.map(editorAction => editorAction());
}

let switchFileActionDelegateInstance: SwitchFileActionDelegate;

export class SwitchFileActionDelegate implements UI.ActionRegistration.ActionDelegate {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): SwitchFileActionDelegate {
    const {forceNew} = opts;
    if (!switchFileActionDelegateInstance || forceNew) {
      switchFileActionDelegateInstance = new SwitchFileActionDelegate();
    }

    return switchFileActionDelegateInstance;
  }

  static _nextFile(currentUISourceCode: Workspace.UISourceCode.UISourceCode): Workspace.UISourceCode.UISourceCode|null {
    function fileNamePrefix(name: string): string {
      const lastDotIndex = name.lastIndexOf('.');
      const namePrefix = name.substr(0, lastDotIndex !== -1 ? lastDotIndex : name.length);
      return namePrefix.toLowerCase();
    }

    const uiSourceCodes = currentUISourceCode.project().uiSourceCodes();
    const candidates = [];
    const url = currentUISourceCode.parentURL();
    const name = currentUISourceCode.name();
    const namePrefix = fileNamePrefix(name);
    for (let i = 0; i < uiSourceCodes.length; ++i) {
      const uiSourceCode = uiSourceCodes[i];
      if (url !== uiSourceCode.parentURL()) {
        continue;
      }
      if (fileNamePrefix(uiSourceCode.name()) === namePrefix) {
        candidates.push(uiSourceCode.name());
      }
    }
    candidates.sort(Platform.StringUtilities.naturalOrderComparator);
    const index = Platform.NumberUtilities.mod(candidates.indexOf(name) + 1, candidates.length);
    const fullURL = (url ? url + '/' : '') + candidates[index];
    const nextUISourceCode = currentUISourceCode.project().uiSourceCodeForURL(fullURL);
    return nextUISourceCode !== currentUISourceCode ? nextUISourceCode : null;
  }

  handleAction(_context: UI.Context.Context, _actionId: string): boolean {
    const sourcesView = UI.Context.Context.instance().flavor(SourcesView);
    if (!sourcesView) {
      return false;
    }
    const currentUISourceCode = sourcesView.currentUISourceCode();
    if (!currentUISourceCode) {
      return false;
    }
    const nextUISourceCode = SwitchFileActionDelegate._nextFile(currentUISourceCode);
    if (!nextUISourceCode) {
      return false;
    }
    sourcesView.showSourceLocation(nextUISourceCode);
    return true;
  }
}

let actionDelegateInstance: ActionDelegate;
export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  static instance(opts: {
    forceNew: boolean|null,
  }|undefined = {forceNew: null}): ActionDelegate {
    const {forceNew} = opts;
    if (!actionDelegateInstance || forceNew) {
      actionDelegateInstance = new ActionDelegate();
    }

    return actionDelegateInstance;
  }

  handleAction(context: UI.Context.Context, actionId: string): boolean {
    const sourcesView = UI.Context.Context.instance().flavor(SourcesView);
    if (!sourcesView) {
      return false;
    }

    switch (actionId) {
      case 'sources.close-all':
        sourcesView._editorContainer.closeAllFiles();
        return true;
      case 'sources.jump-to-previous-location':
        sourcesView._onJumpToPreviousLocation();
        return true;
      case 'sources.jump-to-next-location':
        sourcesView._onJumpToNextLocation();
        return true;
      case 'sources.close-editor-tab':
        return sourcesView._onCloseEditorTab();
      case 'sources.go-to-line':
        sourcesView._showGoToLineQuickOpen();
        return true;
      case 'sources.go-to-member':
        sourcesView._showOutlineQuickOpen();
        return true;
      case 'sources.save':
        sourcesView._save();
        return true;
      case 'sources.save-all':
        sourcesView._saveAll();
        return true;
    }

    return false;
  }
}
