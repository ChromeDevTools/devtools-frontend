// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Persistence from '../persistence/persistence.js';
import * as Platform from '../platform/platform.js';
import * as QuickOpen from '../quick_open/quick_open.js';
import * as SourceFrame from '../source_frame/source_frame.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

import {EditingLocationHistoryManager} from './EditingLocationHistoryManager.js';
import {Events as TabbedEditorContainerEvents, TabbedEditorContainer, TabbedEditorContainerDelegate} from './TabbedEditorContainer.js';  // eslint-disable-line no-unused-vars
import {Events as UISourceCodeFrameEvents, UISourceCodeFrame} from './UISourceCodeFrame.js';

/**
 * @implements {TabbedEditorContainerDelegate}
 * @implements {UI.SearchableView.Searchable}
 * @implements {UI.SearchableView.Replaceable}
 * @unrestricted
 */
export class SourcesView extends UI.Widget.VBox {
  /**
   * @suppressGlobalPropertiesCheck
   */
  constructor() {
    super();
    this.registerRequiredCSS('sources/sourcesView.css');
    this.element.id = 'sources-panel-sources-view';
    this.setMinimumAndPreferredSizes(88, 52, 150, 100);

    const workspace = Workspace.Workspace.WorkspaceImpl.instance();

    this._searchableView = new UI.SearchableView.SearchableView(this, 'sourcesViewSearchConfig');
    this._searchableView.setMinimalSearchQuerySize(0);
    this._searchableView.show(this.element);

    /** @type {!Map.<!Workspace.UISourceCode.UISourceCode, !UI.Widget.Widget>} */
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
      this._toolbarEditorActions = new UI.Toolbar.Toolbar('', this._toolbarContainerElement);
      self.runtime.allInstances(EditorAction).then(appendButtonsForExtensions.bind(this));
    }
    /**
     * @param {!Array.<!EditorAction>} actions
     * @this {SourcesView}
     */
    function appendButtonsForExtensions(actions) {
      for (let i = 0; i < actions.length; ++i) {
        this._toolbarEditorActions.appendToolbarItem(actions[i].button(this));
      }
    }
    this._scriptViewToolbar = new UI.Toolbar.Toolbar('', this._toolbarContainerElement);
    this._scriptViewToolbar.element.style.flex = 'auto';
    this._bottomToolbar = new UI.Toolbar.Toolbar('', this._toolbarContainerElement);

    /** @type {?Common.EventTarget.EventDescriptor} */
    this._toolbarChangedListener = null;

    UI.UIUtils.startBatchUpdate();
    workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));
    UI.UIUtils.endBatchUpdate();

    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);
    workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this._projectRemoved.bind(this), this);

    /**
     * @param {!Event} event
     */
    function handleBeforeUnload(event) {
      if (event.returnValue) {
        return;
      }

      let unsavedSourceCodes = [];
      const projects =
          Workspace.Workspace.WorkspaceImpl.instance().projectsForType(Workspace.Workspace.projectTypes.FileSystem);
      for (let i = 0; i < projects.length; ++i) {
        unsavedSourceCodes =
            unsavedSourceCodes.concat(projects[i].uiSourceCodes().filter(sourceCode => sourceCode.isDirty()));
      }

      if (!unsavedSourceCodes.length) {
        return;
      }

      event.returnValue = Common.UIString.UIString('DevTools have unsaved changes that will be permanently lost.');
      UI.ViewManager.ViewManager.instance().showView('sources');
      for (let i = 0; i < unsavedSourceCodes.length; ++i) {
        Common.Revealer.reveal(unsavedSourceCodes[i]);
      }
    }

    if (!window.opener) {
      window.addEventListener('beforeunload', handleBeforeUnload, true);
    }

    this._shortcuts = {};
    this.element.addEventListener('keydown', this._handleKeyDown.bind(this), false);
  }

  /**
   * @return {!Element}
   */
  _placeholderElement() {
    /** @type {!Array.<{element: !Element, handler: !Function}>} */
    this._placeholderOptionArray = [];

    const shortcuts = [
      {actionId: 'quickOpen.show', description: ls`Open file`},
      {actionId: 'commandMenu.show', description: ls`Run command`},
      {actionId: 'sources.add-folder-to-workspace', description: ls`Drop in a folder to add to workspace`}
    ];

    const element = createElementWithClass('div');
    const list = element.createChild('div', 'tabbed-pane-placeholder');
    list.addEventListener('keydown', this._placeholderOnKeyDown.bind(this), false);
    UI.ARIAUtils.markAsList(list);
    UI.ARIAUtils.setAccessibleName(list, ls`Source View Actions`);

    for (let i = 0; i < shortcuts.length; i++) {
      const shortcut = shortcuts[i];
      const shortcutKeyText = self.UI.shortcutRegistry.shortcutTitleForAction(shortcut.actionId);
      const listItemElement = list.createChild('div');
      UI.ARIAUtils.markAsListitem(listItemElement);
      const row = listItemElement.createChild('div', 'tabbed-pane-placeholder-row');
      row.tabIndex = -1;
      UI.ARIAUtils.markAsButton(row);
      if (shortcutKeyText) {
        row.createChild('div', 'tabbed-pane-placeholder-key').textContent = shortcutKeyText;
        row.createChild('div', 'tabbed-pane-placeholder-value').textContent = shortcut.description;
      } else {
        row.createChild('div', 'tabbed-pane-no-shortcut').textContent = shortcut.description;
      }
      const action = self.UI.actionRegistry.action(shortcut.actionId);
      const actionHandler = action.execute.bind(action);
      this._placeholderOptionArray.push({element: row, handler: actionHandler});
    }

    const firstElement = this._placeholderOptionArray[0].element;
    firstElement.tabIndex = 0;
    this._focusedPlaceholderElement = firstElement;
    this._selectedIndex = 0;

    element.appendChild(UI.XLink.XLink.create(
        'https://developers.google.com/web/tools/chrome-devtools/sources?utm_source=devtools&utm_campaign=2018Q1',
        'Learn more'));

    return element;
  }

  /**
   * @param {!Event} event
   */
  _placeholderOnKeyDown(event) {
    if (isEnterOrSpaceKey(event)) {
      this._placeholderOptionArray[this._selectedIndex].handler.call();
      return;
    }

    let offset = 0;
    if (event.key === 'ArrowDown') {
      offset = 1;
    } else if (event.key === 'ArrowUp') {
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

  _resetPlaceholderState() {
    this._placeholderOptionArray[this._selectedIndex].element.tabIndex = -1;
    this._placeholderOptionArray[0].element.tabIndex = 0;
    this._selectedIndex = 0;
  }

  /**
   * @return {!Map.<!Workspace.UISourceCode.UISourceCode, number>}
   */
  static defaultUISourceCodeScores() {
    /** @type {!Map.<!Workspace.UISourceCode.UISourceCode, number>} */
    const defaultScores = new Map();
    const sourcesView = self.UI.context.flavor(SourcesView);
    if (sourcesView) {
      const uiSourceCodes = sourcesView._editorContainer.historyUISourceCodes();
      for (let i = 1; i < uiSourceCodes.length; ++i)  // Skip current element
      {
        defaultScores.set(uiSourceCodes[i], uiSourceCodes.length - i);
      }
    }
    return defaultScores;
  }

  /**
   * @return {!UI.Toolbar.Toolbar}
   */
  leftToolbar() {
    return this._editorContainer.leftToolbar();
  }

  /**
   * @return {!UI.Toolbar.Toolbar}
   */
  rightToolbar() {
    return this._editorContainer.rightToolbar();
  }

  /**
   * @return {!UI.Toolbar.Toolbar}
   */
  bottomToolbar() {
    return this._bottomToolbar;
  }

  /**
   * @param {!Array.<!UI.KeyboardShortcut.Descriptor>} keys
   * @param {function(!Event=):boolean} handler
   */
  _registerShortcuts(keys, handler) {
    for (let i = 0; i < keys.length; ++i) {
      this._shortcuts[keys[i].key] = handler;
    }
  }

  _handleKeyDown(event) {
    const shortcutKey = UI.KeyboardShortcut.KeyboardShortcut.makeKeyFromEvent(event);
    const handler = this._shortcuts[shortcutKey];
    if (handler && handler()) {
      event.consume(true);
    }
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    self.UI.context.setFlavor(SourcesView, this);
  }

  /**
   * @override
   */
  willHide() {
    self.UI.context.setFlavor(SourcesView, null);
    this._resetPlaceholderState();
    super.willHide();
  }

  /**
   * @return {!Element}
   */
  toolbarContainerElement() {
    return this._toolbarContainerElement;
  }

  /**
   * @return {!UI.SearchableView.SearchableView}
   */
  searchableView() {
    return this._searchableView;
  }

  /**
   * @return {?UI.Widget.Widget}
   */
  visibleView() {
    return this._editorContainer.visibleView;
  }

  /**
   * @return {?UISourceCodeFrame}
   */
  currentSourceFrame() {
    const view = this.visibleView();
    if (!(view instanceof UISourceCodeFrame)) {
      return null;
    }
    return (
        /** @type {!UISourceCodeFrame} */ (view));
  }

  /**
   * @return {?Workspace.UISourceCode.UISourceCode}
   */
  currentUISourceCode() {
    return this._editorContainer.currentFile();
  }

  /**
   * @return {boolean}
   */
  _onCloseEditorTab() {
    const uiSourceCode = this._editorContainer.currentFile();
    if (!uiSourceCode) {
      return false;
    }
    this._editorContainer.closeFile(uiSourceCode);
    return true;
  }

  _onJumpToPreviousLocation() {
    this._historyManager.rollback();
  }

  _onJumpToNextLocation() {
    this._historyManager.rollover();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _uiSourceCodeAdded(event) {
    const uiSourceCode = /** @type {!Workspace.UISourceCode.UISourceCode} */ (event.data);
    this._addUISourceCode(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  _addUISourceCode(uiSourceCode) {
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

  _uiSourceCodeRemoved(event) {
    const uiSourceCode = /** @type {!Workspace.UISourceCode.UISourceCode} */ (event.data);
    this._removeUISourceCodes([uiSourceCode]);
  }

  /**
   * @param {!Array.<!Workspace.UISourceCode.UISourceCode>} uiSourceCodes
   */
  _removeUISourceCodes(uiSourceCodes) {
    this._editorContainer.removeUISourceCodes(uiSourceCodes);
    for (let i = 0; i < uiSourceCodes.length; ++i) {
      this._removeSourceFrame(uiSourceCodes[i]);
      this._historyManager.removeHistoryForSourceCode(uiSourceCodes[i]);
    }
  }

  _projectRemoved(event) {
    const project = event.data;
    const uiSourceCodes = project.uiSourceCodes();
    this._removeUISourceCodes(uiSourceCodes);
  }

  _updateScriptViewToolbarItems() {
    this._scriptViewToolbar.removeToolbarItems();
    const view = this.visibleView();
    if (view instanceof UI.View.SimpleView) {
      (/** @type {?UI.View.SimpleView} */ (view)).toolbarItems().then(items => {
        items.map(item => this._scriptViewToolbar.appendToolbarItem(item));
      });
    }
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {number=} lineNumber 0-based
   * @param {number=} columnNumber
   * @param {boolean=} omitFocus
   * @param {boolean=} omitHighlight
   */
  showSourceLocation(uiSourceCode, lineNumber, columnNumber, omitFocus, omitHighlight) {
    this._historyManager.updateCurrentState();
    this._editorContainer.showFile(uiSourceCode);
    const currentSourceFrame = this.currentSourceFrame();
    if (currentSourceFrame && typeof lineNumber === 'number') {
      currentSourceFrame.revealPosition(lineNumber, columnNumber, !omitHighlight);
    }
    this._historyManager.pushNewState();
    if (!omitFocus) {
      this.visibleView().focus();
    }
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {!UI.Widget.Widget}
   */
  _createSourceView(uiSourceCode) {
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

    const widget = /** @type {!UI.Widget.Widget} */ (sourceFrame || sourceView);
    this._sourceViewByUISourceCode.set(uiSourceCode, widget);
    return widget;
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {!UI.Widget.Widget}
   */
  _getOrCreateSourceView(uiSourceCode) {
    return this._sourceViewByUISourceCode.get(uiSourceCode) || this._createSourceView(uiSourceCode);
  }

  /**
   * @override
   * @param {!UISourceCodeFrame} sourceFrame
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  recycleUISourceCodeFrame(sourceFrame, uiSourceCode) {
    this._sourceViewByUISourceCode.delete(sourceFrame.uiSourceCode());
    sourceFrame.setUISourceCode(uiSourceCode);
    this._sourceViewByUISourceCode.set(uiSourceCode, sourceFrame);
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {!UI.Widget.Widget}
   */
  viewForFile(uiSourceCode) {
    return this._getOrCreateSourceView(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  _removeSourceFrame(uiSourceCode) {
    const sourceView = this._sourceViewByUISourceCode.get(uiSourceCode);
    this._sourceViewByUISourceCode.delete(uiSourceCode);
    if (sourceView && sourceView instanceof UISourceCodeFrame) {
      /** @type {!UISourceCodeFrame} */ (sourceView).dispose();
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _editorClosed(event) {
    const uiSourceCode = /** @type {!Workspace.UISourceCode.UISourceCode} */ (event.data);
    this._historyManager.removeHistoryForSourceCode(uiSourceCode);

    let wasSelected = false;
    if (!this._editorContainer.currentFile()) {
      wasSelected = true;
    }

    // SourcesNavigator does not need to update on EditorClosed.
    this._removeToolbarChangedListener();
    this._updateScriptViewToolbarItems();
    this._searchableView.resetSearch();

    const data = {};
    data.uiSourceCode = uiSourceCode;
    data.wasSelected = wasSelected;
    this.dispatchEventToListeners(Events.EditorClosed, data);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _editorSelected(event) {
    const previousSourceFrame = event.data.previousView instanceof UISourceCodeFrame ? event.data.previousView : null;
    if (previousSourceFrame) {
      previousSourceFrame.setSearchableView(null);
    }
    const currentSourceFrame = event.data.currentView instanceof UISourceCodeFrame ? event.data.currentView : null;
    if (currentSourceFrame) {
      currentSourceFrame.setSearchableView(this._searchableView);
    }

    this._searchableView.setReplaceable(!!currentSourceFrame && currentSourceFrame.canEditSource());
    this._searchableView.refreshSearch();
    this._updateToolbarChangedListener();
    this._updateScriptViewToolbarItems();

    this.dispatchEventToListeners(Events.EditorSelected, this._editorContainer.currentFile());
  }

  _removeToolbarChangedListener() {
    if (this._toolbarChangedListener) {
      Common.EventTarget.EventTarget.removeEventListeners([this._toolbarChangedListener]);
    }
    this._toolbarChangedListener = null;
  }

  _updateToolbarChangedListener() {
    this._removeToolbarChangedListener();
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      return;
    }
    this._toolbarChangedListener = sourceFrame.addEventListener(
        UISourceCodeFrameEvents.ToolbarItemsChanged, this._updateScriptViewToolbarItems, this);
  }

  /**
   * @override
   */
  searchCanceled() {
    if (this._searchView) {
      this._searchView.searchCanceled();
    }

    delete this._searchView;
    delete this._searchConfig;
  }

  /**
   * @override
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @param {boolean} shouldJump
   * @param {boolean=} jumpBackwards
   */
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      return;
    }

    this._searchView = sourceFrame;
    this._searchConfig = searchConfig;

    this._searchView.performSearch(this._searchConfig, shouldJump, jumpBackwards);
  }

  /**
   * @override
   */
  jumpToNextSearchResult() {
    if (!this._searchView) {
      return;
    }

    if (this._searchView !== this.currentSourceFrame()) {
      this.performSearch(this._searchConfig, true);
      return;
    }

    this._searchView.jumpToNextSearchResult();
  }

  /**
   * @override
   */
  jumpToPreviousSearchResult() {
    if (!this._searchView) {
      return;
    }

    if (this._searchView !== this.currentSourceFrame()) {
      this.performSearch(this._searchConfig, true);
      if (this._searchView) {
        this._searchView.jumpToLastSearchResult();
      }
      return;
    }

    this._searchView.jumpToPreviousSearchResult();
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsCaseSensitiveSearch() {
    return true;
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsRegexSearch() {
    return true;
  }

  /**
   * @override
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @param {string} replacement
   */
  replaceSelectionWith(searchConfig, replacement) {
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      console.assert(sourceFrame);
      return;
    }
    sourceFrame.replaceSelectionWith(searchConfig, replacement);
  }

  /**
   * @override
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @param {string} replacement
   */
  replaceAllWith(searchConfig, replacement) {
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      console.assert(sourceFrame);
      return;
    }
    sourceFrame.replaceAllWith(searchConfig, replacement);
  }

  _showOutlineQuickOpen() {
    QuickOpen.QuickOpen.QuickOpenImpl.show('@');
  }

  _showGoToLineQuickOpen() {
    if (this._editorContainer.currentFile()) {
      QuickOpen.QuickOpen.QuickOpenImpl.show(':');
    }
  }

  _save() {
    this._saveSourceFrame(this.currentSourceFrame());
  }

  _saveAll() {
    const sourceFrames = this._editorContainer.fileViews();
    sourceFrames.forEach(this._saveSourceFrame.bind(this));
  }

  /**
   * @param {?UI.Widget.Widget} sourceFrame
   */
  _saveSourceFrame(sourceFrame) {
    if (!(sourceFrame instanceof UISourceCodeFrame)) {
      return;
    }
    const uiSourceCodeFrame = /** @type {!UISourceCodeFrame} */ (sourceFrame);
    uiSourceCodeFrame.commitEditing();
  }

  /**
   * @param {boolean} active
   */
  toggleBreakpointsActiveState(active) {
    this._editorContainer.view.element.classList.toggle('breakpoints-deactivated', !active);
  }
}

/** @enum {symbol} */
export const Events = {
  EditorClosed: Symbol('EditorClosed'),
  EditorSelected: Symbol('EditorSelected'),
};

/**
 * @interface
 */
export class EditorAction {
  /**
   * @param {!SourcesView} sourcesView
   * @return {!UI.Toolbar.ToolbarButton}
   */
  button(sourcesView) {}
}

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 * @unrestricted
 */
export class SwitchFileActionDelegate {
  /**
   * @param {!Workspace.UISourceCode.UISourceCode} currentUISourceCode
   * @return {?Workspace.UISourceCode.UISourceCode}
   */
  static _nextFile(currentUISourceCode) {
    /**
     * @param {string} name
     * @return {string}
     */
    function fileNamePrefix(name) {
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
    candidates.sort(String.naturalOrderComparator);
    const index = Platform.NumberUtilities.mod(candidates.indexOf(name) + 1, candidates.length);
    const fullURL = (url ? url + '/' : '') + candidates[index];
    const nextUISourceCode = currentUISourceCode.project().uiSourceCodeForURL(fullURL);
    return nextUISourceCode !== currentUISourceCode ? nextUISourceCode : null;
  }

  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    const sourcesView = self.UI.context.flavor(SourcesView);
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

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 * @unrestricted
 */
export class ActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    const sourcesView = self.UI.context.flavor(SourcesView);
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
