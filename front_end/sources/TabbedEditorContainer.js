/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * 1. Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY GOOGLE INC. AND ITS CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GOOGLE INC.
 * OR ITS CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @interface
 */
WebInspector.TabbedEditorContainerDelegate = function() {};

WebInspector.TabbedEditorContainerDelegate.prototype = {
  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @return {!WebInspector.Widget}
   */
  viewForFile: function(uiSourceCode) {},
};

/**
 * @unrestricted
 */
WebInspector.TabbedEditorContainer = class extends WebInspector.Object {
  /**
   * @param {!WebInspector.TabbedEditorContainerDelegate} delegate
   * @param {!WebInspector.Setting} setting
   * @param {string} placeholderText
   */
  constructor(delegate, setting, placeholderText) {
    super();
    this._delegate = delegate;

    this._tabbedPane = new WebInspector.TabbedPane();
    this._tabbedPane.setPlaceholderText(placeholderText);
    this._tabbedPane.setTabDelegate(new WebInspector.EditorContainerTabDelegate(this));

    this._tabbedPane.setCloseableTabs(true);
    this._tabbedPane.setAllowTabReorder(true, true);

    this._tabbedPane.addEventListener(WebInspector.TabbedPane.Events.TabClosed, this._tabClosed, this);
    this._tabbedPane.addEventListener(WebInspector.TabbedPane.Events.TabSelected, this._tabSelected, this);

    WebInspector.persistence.addEventListener(
        WebInspector.Persistence.Events.BindingCreated, this._onBindingCreated, this);
    WebInspector.persistence.addEventListener(
        WebInspector.Persistence.Events.BindingRemoved, this._onBindingRemoved, this);

    this._tabIds = new Map();
    this._files = {};

    this._previouslyViewedFilesSetting = setting;
    this._history = WebInspector.TabbedEditorContainer.History.fromObject(this._previouslyViewedFilesSetting.get());
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onBindingCreated(event) {
    var binding = /** @type {!WebInspector.PersistenceBinding} */ (event.data);
    var networkTabId = this._tabIds.get(binding.network);
    var fileSystemTabId = this._tabIds.get(binding.fileSystem);

    if (networkTabId)
      this._tabbedPane.changeTabTitle(
          networkTabId, this._titleForFile(binding.fileSystem), this._tooltipForFile(binding.fileSystem));
    if (!fileSystemTabId)
      return;

    var wasSelectedInFileSystem = this._currentFile === binding.fileSystem;
    var currentSelectionRange = this._history.selectionRange(binding.fileSystem.url());
    var currentScrollLineNumber = this._history.scrollLineNumber(binding.fileSystem.url());

    var tabIndex = this._tabbedPane.tabIndex(fileSystemTabId);
    var tabsToClose = [fileSystemTabId];
    if (networkTabId)
      tabsToClose.push(networkTabId);
    this._closeTabs(tabsToClose, true);
    networkTabId = this._appendFileTab(binding.network, false, tabIndex);
    this._updateHistory();

    if (wasSelectedInFileSystem)
      this._tabbedPane.selectTab(networkTabId, false);

    var networkTabView = /** @type {!WebInspector.Widget} */ (this._tabbedPane.tabView(networkTabId));
    this._restoreEditorProperties(networkTabView, currentSelectionRange, currentScrollLineNumber);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onBindingRemoved(event) {
    var binding = /** @type {!WebInspector.PersistenceBinding} */ (event.data);
    var networkTabId = this._tabIds.get(binding.network);
    if (!networkTabId)
      return;
    var tabIndex = this._tabbedPane.tabIndex(networkTabId);
    var wasSelected = this._currentFile === binding.network;
    var fileSystemTabId = this._appendFileTab(binding.fileSystem, false, tabIndex);
    this._updateHistory();

    if (wasSelected)
      this._tabbedPane.selectTab(fileSystemTabId, false);

    var fileSystemTabView = /** @type {!WebInspector.Widget} */ (this._tabbedPane.tabView(fileSystemTabId));
    var savedSelectionRange = this._history.selectionRange(binding.network.url());
    var savedScrollLineNumber = this._history.scrollLineNumber(binding.network.url());
    this._restoreEditorProperties(fileSystemTabView, savedSelectionRange, savedScrollLineNumber);
  }

  /**
   * @return {!WebInspector.Widget}
   */
  get view() {
    return this._tabbedPane;
  }

  /**
   * @return {?WebInspector.Widget}
   */
  get visibleView() {
    return this._tabbedPane.visibleView;
  }

  /**
   * @return {!Array.<!WebInspector.Widget>}
   */
  fileViews() {
    return /** @type {!Array.<!WebInspector.Widget>} */ (this._tabbedPane.tabViews());
  }

  /**
   * @return {!WebInspector.Toolbar}
   */
  leftToolbar() {
    return this._tabbedPane.leftToolbar();
  }

  /**
   * @return {!WebInspector.Toolbar}
   */
  rightToolbar() {
    return this._tabbedPane.rightToolbar();
  }

  /**
   * @param {!Element} parentElement
   */
  show(parentElement) {
    this._tabbedPane.show(parentElement);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  showFile(uiSourceCode) {
    this._innerShowFile(uiSourceCode, true);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  closeFile(uiSourceCode) {
    var tabId = this._tabIds.get(uiSourceCode);
    if (!tabId)
      return;
    this._closeTabs([tabId]);
  }

  closeAllFiles() {
    this._closeTabs(this._tabbedPane.allTabs());
  }

  /**
   * @return {!Array.<!WebInspector.UISourceCode>}
   */
  historyUISourceCodes() {
    // FIXME: there should be a way to fetch UISourceCode for its uri.
    var uriToUISourceCode = {};
    for (var id in this._files) {
      var uiSourceCode = this._files[id];
      uriToUISourceCode[uiSourceCode.url()] = uiSourceCode;
    }

    var result = [];
    var uris = this._history._urls();
    for (var i = 0; i < uris.length; ++i) {
      var uiSourceCode = uriToUISourceCode[uris[i]];
      if (uiSourceCode)
        result.push(uiSourceCode);
    }
    return result;
  }

  _addViewListeners() {
    if (!this._currentView || !this._currentView.textEditor)
      return;
    this._currentView.textEditor.addEventListener(
        WebInspector.SourcesTextEditor.Events.ScrollChanged, this._scrollChanged, this);
    this._currentView.textEditor.addEventListener(
        WebInspector.SourcesTextEditor.Events.SelectionChanged, this._selectionChanged, this);
  }

  _removeViewListeners() {
    if (!this._currentView || !this._currentView.textEditor)
      return;
    this._currentView.textEditor.removeEventListener(
        WebInspector.SourcesTextEditor.Events.ScrollChanged, this._scrollChanged, this);
    this._currentView.textEditor.removeEventListener(
        WebInspector.SourcesTextEditor.Events.SelectionChanged, this._selectionChanged, this);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _scrollChanged(event) {
    if (this._scrollTimer)
      clearTimeout(this._scrollTimer);
    var lineNumber = /** @type {number} */ (event.data);
    this._scrollTimer = setTimeout(saveHistory.bind(this), 100);
    this._history.updateScrollLineNumber(this._currentFile.url(), lineNumber);

    /**
     * @this {WebInspector.TabbedEditorContainer}
     */
    function saveHistory() {
      this._history.save(this._previouslyViewedFilesSetting);
    }
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _selectionChanged(event) {
    var range = /** @type {!WebInspector.TextRange} */ (event.data);
    this._history.updateSelectionRange(this._currentFile.url(), range);
    this._history.save(this._previouslyViewedFilesSetting);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @param {boolean=} userGesture
   */
  _innerShowFile(uiSourceCode, userGesture) {
    var binding = WebInspector.persistence.binding(uiSourceCode);
    uiSourceCode = binding ? binding.network : uiSourceCode;
    if (this._currentFile === uiSourceCode)
      return;

    this._removeViewListeners();
    this._currentFile = uiSourceCode;

    var tabId = this._tabIds.get(uiSourceCode) || this._appendFileTab(uiSourceCode, userGesture);

    this._tabbedPane.selectTab(tabId, userGesture);
    if (userGesture)
      this._editorSelectedByUserAction();

    var previousView = this._currentView;
    this._currentView = this.visibleView;
    this._addViewListeners();

    var eventData = {
      currentFile: this._currentFile,
      currentView: this._currentView,
      previousView: previousView,
      userGesture: userGesture
    };
    this.dispatchEventToListeners(WebInspector.TabbedEditorContainer.Events.EditorSelected, eventData);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @return {string}
   */
  _titleForFile(uiSourceCode) {
    var binding = WebInspector.persistence.binding(uiSourceCode);
    var titleUISourceCode = binding ? binding.fileSystem : uiSourceCode;
    var maxDisplayNameLength = 30;
    var title = titleUISourceCode.displayName(true).trimMiddle(maxDisplayNameLength);
    if (uiSourceCode.isDirty() || WebInspector.persistence.hasUnsavedCommittedChanges(uiSourceCode))
      title += '*';
    return title;
  }

  /**
   * @param {string} id
   * @param {string} nextTabId
   */
  _maybeCloseTab(id, nextTabId) {
    var uiSourceCode = this._files[id];
    var shouldPrompt = uiSourceCode.isDirty() && uiSourceCode.project().canSetFileContent();
    // FIXME: this should be replaced with common Save/Discard/Cancel dialog.
    if (!shouldPrompt ||
        confirm(WebInspector.UIString('Are you sure you want to close unsaved file: %s?', uiSourceCode.name()))) {
      uiSourceCode.resetWorkingCopy();
      var previousView = this._currentView;
      if (nextTabId)
        this._tabbedPane.selectTab(nextTabId, true);
      this._tabbedPane.closeTab(id, true);
      return true;
    }
    return false;
  }

  /**
   * @param {!Array.<string>} ids
   * @param {boolean=} forceCloseDirtyTabs
   */
  _closeTabs(ids, forceCloseDirtyTabs) {
    var dirtyTabs = [];
    var cleanTabs = [];
    for (var i = 0; i < ids.length; ++i) {
      var id = ids[i];
      var uiSourceCode = this._files[id];
      if (!forceCloseDirtyTabs && uiSourceCode.isDirty())
        dirtyTabs.push(id);
      else
        cleanTabs.push(id);
    }
    if (dirtyTabs.length)
      this._tabbedPane.selectTab(dirtyTabs[0], true);
    this._tabbedPane.closeTabs(cleanTabs, true);
    for (var i = 0; i < dirtyTabs.length; ++i) {
      var nextTabId = i + 1 < dirtyTabs.length ? dirtyTabs[i + 1] : null;
      if (!this._maybeCloseTab(dirtyTabs[i], nextTabId))
        break;
    }
  }

  /**
   * @param {string} tabId
   * @param {!WebInspector.ContextMenu} contextMenu
   */
  _onContextMenu(tabId, contextMenu) {
    var uiSourceCode = this._files[tabId];
    if (uiSourceCode)
      contextMenu.appendApplicableItems(uiSourceCode);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  addUISourceCode(uiSourceCode) {
    var uri = uiSourceCode.url();
    var index = this._history.index(uri);
    if (index === -1)
      return;

    if (!this._tabIds.has(uiSourceCode))
      this._appendFileTab(uiSourceCode, false);

    // Select tab if this file was the last to be shown.
    if (!index) {
      this._innerShowFile(uiSourceCode, false);
      return;
    }

    if (!this._currentFile)
      return;
    var currentProjectType = this._currentFile.project().type();
    var addedProjectType = uiSourceCode.project().type();
    var snippetsProjectType = WebInspector.projectTypes.Snippets;
    if (this._history.index(this._currentFile.url()) && currentProjectType === snippetsProjectType &&
        addedProjectType !== snippetsProjectType)
      this._innerShowFile(uiSourceCode, false);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  removeUISourceCode(uiSourceCode) {
    this.removeUISourceCodes([uiSourceCode]);
  }

  /**
   * @param {!Array.<!WebInspector.UISourceCode>} uiSourceCodes
   */
  removeUISourceCodes(uiSourceCodes) {
    var tabIds = [];
    for (var i = 0; i < uiSourceCodes.length; ++i) {
      var uiSourceCode = uiSourceCodes[i];
      var tabId = this._tabIds.get(uiSourceCode);
      if (tabId)
        tabIds.push(tabId);
    }
    this._tabbedPane.closeTabs(tabIds);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  _editorClosedByUserAction(uiSourceCode) {
    this._history.remove(uiSourceCode.url());
    this._updateHistory();
  }

  _editorSelectedByUserAction() {
    this._updateHistory();
  }

  _updateHistory() {
    var tabIds =
        this._tabbedPane.lastOpenedTabIds(WebInspector.TabbedEditorContainer.maximalPreviouslyViewedFilesCount);

    /**
     * @param {string} tabId
     * @this {WebInspector.TabbedEditorContainer}
     */
    function tabIdToURI(tabId) {
      return this._files[tabId].url();
    }

    this._history.update(tabIds.map(tabIdToURI.bind(this)));
    this._history.save(this._previouslyViewedFilesSetting);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @return {string}
   */
  _tooltipForFile(uiSourceCode) {
    uiSourceCode = WebInspector.persistence.fileSystem(uiSourceCode) || uiSourceCode;
    return uiSourceCode.url();
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @param {boolean=} userGesture
   * @param {number=} index
   * @return {string}
   */
  _appendFileTab(uiSourceCode, userGesture, index) {
    var view = this._delegate.viewForFile(uiSourceCode);
    var title = this._titleForFile(uiSourceCode);
    var tooltip = this._tooltipForFile(uiSourceCode);

    var tabId = this._generateTabId();
    this._tabIds.set(uiSourceCode, tabId);
    this._files[tabId] = uiSourceCode;

    var savedSelectionRange = this._history.selectionRange(uiSourceCode.url());
    var savedScrollLineNumber = this._history.scrollLineNumber(uiSourceCode.url());
    this._restoreEditorProperties(view, savedSelectionRange, savedScrollLineNumber);

    this._tabbedPane.appendTab(tabId, title, view, tooltip, userGesture, undefined, index);

    this._updateFileTitle(uiSourceCode);
    this._addUISourceCodeListeners(uiSourceCode);
    return tabId;
  }

  /**
   * @param {!WebInspector.Widget} editorView
   * @param {!WebInspector.TextRange=} selection
   * @param {number=} firstLineNumber
   */
  _restoreEditorProperties(editorView, selection, firstLineNumber) {
    var sourceFrame =
        editorView instanceof WebInspector.SourceFrame ? /** @type {!WebInspector.SourceFrame} */ (editorView) : null;
    if (!sourceFrame)
      return;
    if (selection)
      sourceFrame.setSelection(selection);
    if (typeof firstLineNumber === 'number')
      sourceFrame.scrollToLine(firstLineNumber);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _tabClosed(event) {
    var tabId = /** @type {string} */ (event.data.tabId);
    var userGesture = /** @type {boolean} */ (event.data.isUserGesture);

    var uiSourceCode = this._files[tabId];
    if (this._currentFile === uiSourceCode) {
      this._removeViewListeners();
      delete this._currentView;
      delete this._currentFile;
    }
    this._tabIds.remove(uiSourceCode);
    delete this._files[tabId];

    this._removeUISourceCodeListeners(uiSourceCode);

    this.dispatchEventToListeners(WebInspector.TabbedEditorContainer.Events.EditorClosed, uiSourceCode);

    if (userGesture)
      this._editorClosedByUserAction(uiSourceCode);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _tabSelected(event) {
    var tabId = /** @type {string} */ (event.data.tabId);
    var userGesture = /** @type {boolean} */ (event.data.isUserGesture);

    var uiSourceCode = this._files[tabId];
    this._innerShowFile(uiSourceCode, userGesture);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  _addUISourceCodeListeners(uiSourceCode) {
    uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.TitleChanged, this._uiSourceCodeTitleChanged, this);
    uiSourceCode.addEventListener(
        WebInspector.UISourceCode.Events.WorkingCopyChanged, this._uiSourceCodeWorkingCopyChanged, this);
    uiSourceCode.addEventListener(
        WebInspector.UISourceCode.Events.WorkingCopyCommitted, this._uiSourceCodeWorkingCopyCommitted, this);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  _removeUISourceCodeListeners(uiSourceCode) {
    uiSourceCode.removeEventListener(
        WebInspector.UISourceCode.Events.TitleChanged, this._uiSourceCodeTitleChanged, this);
    uiSourceCode.removeEventListener(
        WebInspector.UISourceCode.Events.WorkingCopyChanged, this._uiSourceCodeWorkingCopyChanged, this);
    uiSourceCode.removeEventListener(
        WebInspector.UISourceCode.Events.WorkingCopyCommitted, this._uiSourceCodeWorkingCopyCommitted, this);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  _updateFileTitle(uiSourceCode) {
    var tabId = this._tabIds.get(uiSourceCode);
    if (tabId) {
      var title = this._titleForFile(uiSourceCode);
      this._tabbedPane.changeTabTitle(tabId, title);
      if (WebInspector.persistence.hasUnsavedCommittedChanges(uiSourceCode))
        this._tabbedPane.setTabIcon(
            tabId, 'warning-icon', WebInspector.UIString('Changes to this file were not saved to file system.'));
      else
        this._tabbedPane.setTabIcon(tabId, '');
    }
  }

  _uiSourceCodeTitleChanged(event) {
    var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.target);
    this._updateFileTitle(uiSourceCode);
    this._updateHistory();
  }

  _uiSourceCodeWorkingCopyChanged(event) {
    var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.target);
    this._updateFileTitle(uiSourceCode);
  }

  _uiSourceCodeWorkingCopyCommitted(event) {
    var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.target);
    this._updateFileTitle(uiSourceCode);
  }

  /**
   * @return {string}
   */
  _generateTabId() {
    return 'tab_' + (WebInspector.TabbedEditorContainer._tabId++);
  }

  /**
   * @return {?WebInspector.UISourceCode} uiSourceCode
   */
  currentFile() {
    return this._currentFile || null;
  }
};

/** @enum {symbol} */
WebInspector.TabbedEditorContainer.Events = {
  EditorSelected: Symbol('EditorSelected'),
  EditorClosed: Symbol('EditorClosed')
};

WebInspector.TabbedEditorContainer._tabId = 0;

WebInspector.TabbedEditorContainer.maximalPreviouslyViewedFilesCount = 30;

/**
 * @unrestricted
 */
WebInspector.TabbedEditorContainer.HistoryItem = class {
  /**
   * @param {string} url
   * @param {!WebInspector.TextRange=} selectionRange
   * @param {number=} scrollLineNumber
   */
  constructor(url, selectionRange, scrollLineNumber) {
    /** @const */ this.url = url;
    /** @const */ this._isSerializable =
        url.length < WebInspector.TabbedEditorContainer.HistoryItem.serializableUrlLengthLimit;
    this.selectionRange = selectionRange;
    this.scrollLineNumber = scrollLineNumber;
  }

  /**
   * @param {!Object} serializedHistoryItem
   * @return {!WebInspector.TabbedEditorContainer.HistoryItem}
   */
  static fromObject(serializedHistoryItem) {
    var selectionRange = serializedHistoryItem.selectionRange ?
        WebInspector.TextRange.fromObject(serializedHistoryItem.selectionRange) :
        undefined;
    return new WebInspector.TabbedEditorContainer.HistoryItem(
        serializedHistoryItem.url, selectionRange, serializedHistoryItem.scrollLineNumber);
  }

  /**
   * @return {?Object}
   */
  serializeToObject() {
    if (!this._isSerializable)
      return null;
    var serializedHistoryItem = {};
    serializedHistoryItem.url = this.url;
    serializedHistoryItem.selectionRange = this.selectionRange;
    serializedHistoryItem.scrollLineNumber = this.scrollLineNumber;
    return serializedHistoryItem;
  }
};

WebInspector.TabbedEditorContainer.HistoryItem.serializableUrlLengthLimit = 4096;


/**
 * @unrestricted
 */
WebInspector.TabbedEditorContainer.History = class {
  /**
   * @param {!Array.<!WebInspector.TabbedEditorContainer.HistoryItem>} items
   */
  constructor(items) {
    this._items = items;
    this._rebuildItemIndex();
  }

  /**
   * @param {!Array.<!Object>} serializedHistory
   * @return {!WebInspector.TabbedEditorContainer.History}
   */
  static fromObject(serializedHistory) {
    var items = [];
    for (var i = 0; i < serializedHistory.length; ++i)
      items.push(WebInspector.TabbedEditorContainer.HistoryItem.fromObject(serializedHistory[i]));
    return new WebInspector.TabbedEditorContainer.History(items);
  }

  /**
   * @param {string} url
   * @return {number}
   */
  index(url) {
    return this._itemsIndex.has(url) ? /** @type {number} */ (this._itemsIndex.get(url)) : -1;
  }

  _rebuildItemIndex() {
    /** @type {!Map<string, number>} */
    this._itemsIndex = new Map();
    for (var i = 0; i < this._items.length; ++i) {
      console.assert(!this._itemsIndex.has(this._items[i].url));
      this._itemsIndex.set(this._items[i].url, i);
    }
  }

  /**
   * @param {string} url
   * @return {!WebInspector.TextRange|undefined}
   */
  selectionRange(url) {
    var index = this.index(url);
    return index !== -1 ? this._items[index].selectionRange : undefined;
  }

  /**
   * @param {string} url
   * @param {!WebInspector.TextRange=} selectionRange
   */
  updateSelectionRange(url, selectionRange) {
    if (!selectionRange)
      return;
    var index = this.index(url);
    if (index === -1)
      return;
    this._items[index].selectionRange = selectionRange;
  }

  /**
   * @param {string} url
   * @return {number|undefined}
   */
  scrollLineNumber(url) {
    var index = this.index(url);
    return index !== -1 ? this._items[index].scrollLineNumber : undefined;
  }

  /**
   * @param {string} url
   * @param {number} scrollLineNumber
   */
  updateScrollLineNumber(url, scrollLineNumber) {
    var index = this.index(url);
    if (index === -1)
      return;
    this._items[index].scrollLineNumber = scrollLineNumber;
  }

  /**
   * @param {!Array.<string>} urls
   */
  update(urls) {
    for (var i = urls.length - 1; i >= 0; --i) {
      var index = this.index(urls[i]);
      var item;
      if (index !== -1) {
        item = this._items[index];
        this._items.splice(index, 1);
      } else
        item = new WebInspector.TabbedEditorContainer.HistoryItem(urls[i]);
      this._items.unshift(item);
      this._rebuildItemIndex();
    }
  }

  /**
   * @param {string} url
   */
  remove(url) {
    var index = this.index(url);
    if (index !== -1) {
      this._items.splice(index, 1);
      this._rebuildItemIndex();
    }
  }

  /**
   * @param {!WebInspector.Setting} setting
   */
  save(setting) {
    setting.set(this._serializeToObject());
  }

  /**
   * @return {!Array.<!Object>}
   */
  _serializeToObject() {
    var serializedHistory = [];
    for (var i = 0; i < this._items.length; ++i) {
      var serializedItem = this._items[i].serializeToObject();
      if (serializedItem)
        serializedHistory.push(serializedItem);
      if (serializedHistory.length === WebInspector.TabbedEditorContainer.maximalPreviouslyViewedFilesCount)
        break;
    }
    return serializedHistory;
  }

  /**
   * @return {!Array.<string>}
   */
  _urls() {
    var result = [];
    for (var i = 0; i < this._items.length; ++i)
      result.push(this._items[i].url);
    return result;
  }
};


/**
 * @implements {WebInspector.TabbedPaneTabDelegate}
 * @unrestricted
 */
WebInspector.EditorContainerTabDelegate = class {
  /**
   * @param {!WebInspector.TabbedEditorContainer} editorContainer
   */
  constructor(editorContainer) {
    this._editorContainer = editorContainer;
  }

  /**
   * @override
   * @param {!WebInspector.TabbedPane} tabbedPane
   * @param {!Array.<string>} ids
   */
  closeTabs(tabbedPane, ids) {
    this._editorContainer._closeTabs(ids);
  }

  /**
   * @override
   * @param {string} tabId
   * @param {!WebInspector.ContextMenu} contextMenu
   */
  onContextMenu(tabId, contextMenu) {
    this._editorContainer._onContextMenu(tabId, contextMenu);
  }
};
