// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {Sources.TabbedEditorContainerDelegate}
 * @implements {UI.Searchable}
 * @implements {UI.Replaceable}
 * @unrestricted
 */
Sources.SourcesView = class extends UI.VBox {
  /**
   * @suppressGlobalPropertiesCheck
   */
  constructor() {
    super();
    this.registerRequiredCSS('sources/sourcesView.css');
    this.element.id = 'sources-panel-sources-view';
    this.setMinimumAndPreferredSizes(80, 52, 150, 100);

    var workspace = Workspace.workspace;

    this._searchableView = new UI.SearchableView(this, 'sourcesViewSearchConfig');
    this._searchableView.setMinimalSearchQuerySize(0);
    this._searchableView.show(this.element);

    /** @type {!Map.<!Workspace.UISourceCode, !UI.Widget>} */
    this._sourceViewByUISourceCode = new Map();

    this._editorContainer = new Sources.TabbedEditorContainer(
        this, Common.settings.createLocalSetting('previouslyViewedFiles', []), this._placeholderElement());
    this._editorContainer.show(this._searchableView.element);
    this._editorContainer.addEventListener(
        Sources.TabbedEditorContainer.Events.EditorSelected, this._editorSelected, this);
    this._editorContainer.addEventListener(Sources.TabbedEditorContainer.Events.EditorClosed, this._editorClosed, this);

    this._historyManager = new Sources.EditingLocationHistoryManager(this, this.currentSourceFrame.bind(this));

    this._toolbarContainerElement = this.element.createChild('div', 'sources-toolbar');
    this._toolbarEditorActions = new UI.Toolbar('', this._toolbarContainerElement);

    self.runtime.allInstances(Sources.SourcesView.EditorAction).then(appendButtonsForExtensions.bind(this));
    /**
     * @param {!Array.<!Sources.SourcesView.EditorAction>} actions
     * @this {Sources.SourcesView}
     */
    function appendButtonsForExtensions(actions) {
      for (var i = 0; i < actions.length; ++i)
        this._toolbarEditorActions.appendToolbarItem(actions[i].button(this));
    }
    this._scriptViewToolbar = new UI.Toolbar('', this._toolbarContainerElement);
    this._scriptViewToolbar.element.style.flex = 'auto';
    this._bottomToolbar = new UI.Toolbar('', this._toolbarContainerElement);
    this._bindingChangeBound = this._onBindingChanged.bind(this);

    UI.startBatchUpdate();
    workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));
    UI.endBatchUpdate();

    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);
    workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this._projectRemoved.bind(this), this);

    /**
     * @param {!Event} event
     */
    function handleBeforeUnload(event) {
      if (event.returnValue)
        return;

      var unsavedSourceCodes = [];
      var projects = Workspace.workspace.projectsForType(Workspace.projectTypes.FileSystem);
      for (var i = 0; i < projects.length; ++i) {
        unsavedSourceCodes =
            unsavedSourceCodes.concat(projects[i].uiSourceCodes().filter(sourceCode => sourceCode.isDirty()));
      }

      if (!unsavedSourceCodes.length)
        return;

      event.returnValue = Common.UIString('DevTools have unsaved changes that will be permanently lost.');
      UI.viewManager.showView('sources');
      for (var i = 0; i < unsavedSourceCodes.length; ++i)
        Common.Revealer.reveal(unsavedSourceCodes[i]);
    }

    if (!window.opener)
      window.addEventListener('beforeunload', handleBeforeUnload, true);

    this._shortcuts = {};
    this.element.addEventListener('keydown', this._handleKeyDown.bind(this), false);
  }

  /**
   * @return {!Element}
   */
  _placeholderElement() {
    var shortcuts = [
      {actionId: 'quickOpen.show', description: Common.UIString('Open file')},
      {actionId: 'commandMenu.show', description: Common.UIString('Run command')}
    ];

    var element = createElementWithClass('span', 'tabbed-pane-placeholder');
    for (var shortcut of shortcuts) {
      var shortcutKeyText = UI.shortcutRegistry.shortcutTitleForAction(shortcut.actionId);
      var row = element.createChild('div', 'tabbed-pane-placeholder-row');
      row.createChild('div', 'tabbed-pane-placeholder-key').textContent = shortcutKeyText;
      row.createChild('div', 'tabbed-pane-placeholder-value').textContent = shortcut.description;
    }
    if (Runtime.experiments.isEnabled('persistence2'))
      element.createChild('div').textContent = Common.UIString('Drop in a folder to add to workspace');

    return element;
  }

  /**
   * @return {!Map.<!Workspace.UISourceCode, number>}
   */
  static defaultUISourceCodeScores() {
    /** @type {!Map.<!Workspace.UISourceCode, number>} */
    var defaultScores = new Map();
    var sourcesView = UI.context.flavor(Sources.SourcesView);
    if (sourcesView) {
      var uiSourceCodes = sourcesView._editorContainer.historyUISourceCodes();
      for (var i = 1; i < uiSourceCodes.length; ++i)  // Skip current element
        defaultScores.set(uiSourceCodes[i], uiSourceCodes.length - i);
    }
    return defaultScores;
  }

  /**
   * @param {function(!Array.<!UI.KeyboardShortcut.Descriptor>, function(!Event=):boolean)} registerShortcutDelegate
   */
  registerShortcuts(registerShortcutDelegate) {
    /**
     * @this {Sources.SourcesView}
     * @param {!Array.<!UI.KeyboardShortcut.Descriptor>} shortcuts
     * @param {function(!Event=):boolean} handler
     */
    function registerShortcut(shortcuts, handler) {
      registerShortcutDelegate(shortcuts, handler);
      this._registerShortcuts(shortcuts, handler);
    }

    registerShortcut.call(
        this, UI.ShortcutsScreen.SourcesPanelShortcuts.JumpToPreviousLocation,
        this._onJumpToPreviousLocation.bind(this));
    registerShortcut.call(
        this, UI.ShortcutsScreen.SourcesPanelShortcuts.JumpToNextLocation, this._onJumpToNextLocation.bind(this));
    registerShortcut.call(
        this, UI.ShortcutsScreen.SourcesPanelShortcuts.CloseEditorTab, this._onCloseEditorTab.bind(this));
    registerShortcut.call(
        this, UI.ShortcutsScreen.SourcesPanelShortcuts.GoToLine, this._showGoToLineQuickOpen.bind(this));
    registerShortcut.call(
        this, UI.ShortcutsScreen.SourcesPanelShortcuts.GoToMember, this._showOutlineQuickOpen.bind(this));
    registerShortcut.call(
        this, UI.ShortcutsScreen.SourcesPanelShortcuts.ToggleBreakpoint, this._toggleBreakpoint.bind(this));
    registerShortcut.call(this, UI.ShortcutsScreen.SourcesPanelShortcuts.Save, this._save.bind(this));
    registerShortcut.call(this, UI.ShortcutsScreen.SourcesPanelShortcuts.SaveAll, this._saveAll.bind(this));
  }

  /**
   * @return {!UI.Toolbar}
   */
  leftToolbar() {
    return this._editorContainer.leftToolbar();
  }

  /**
   * @return {!UI.Toolbar}
   */
  rightToolbar() {
    return this._editorContainer.rightToolbar();
  }

  /**
   * @return {!UI.Toolbar}
   */
  bottomToolbar() {
    return this._bottomToolbar;
  }

  /**
   * @param {!Array.<!UI.KeyboardShortcut.Descriptor>} keys
   * @param {function(!Event=):boolean} handler
   */
  _registerShortcuts(keys, handler) {
    for (var i = 0; i < keys.length; ++i)
      this._shortcuts[keys[i].key] = handler;
  }

  _handleKeyDown(event) {
    var shortcutKey = UI.KeyboardShortcut.makeKeyFromEvent(event);
    var handler = this._shortcuts[shortcutKey];
    if (handler && handler())
      event.consume(true);
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    UI.context.setFlavor(Sources.SourcesView, this);
  }

  /**
   * @override
   */
  willHide() {
    UI.context.setFlavor(Sources.SourcesView, null);
    super.willHide();
  }

  /**
   * @return {!Element}
   */
  toolbarContainerElement() {
    return this._toolbarContainerElement;
  }

  /**
   * @return {!UI.SearchableView}
   */
  searchableView() {
    return this._searchableView;
  }

  /**
   * @return {?UI.Widget}
   */
  visibleView() {
    return this._editorContainer.visibleView;
  }

  /**
   * @return {?SourceFrame.UISourceCodeFrame}
   */
  currentSourceFrame() {
    var view = this.visibleView();
    if (!(view instanceof SourceFrame.UISourceCodeFrame))
      return null;
    return /** @type {!SourceFrame.UISourceCodeFrame} */ (view);
  }

  /**
   * @return {?Workspace.UISourceCode}
   */
  currentUISourceCode() {
    return this._editorContainer.currentFile();
  }

  /**
   * @param {!Event=} event
   */
  _onCloseEditorTab(event) {
    var uiSourceCode = this._editorContainer.currentFile();
    if (!uiSourceCode)
      return false;
    this._editorContainer.closeFile(uiSourceCode);
    return true;
  }

  /**
   * @param {!Event=} event
   */
  _onJumpToPreviousLocation(event) {
    this._historyManager.rollback();
    return true;
  }

  /**
   * @param {!Event=} event
   */
  _onJumpToNextLocation(event) {
    this._historyManager.rollover();
    return true;
  }

  /**
   * @param {!Common.Event} event
   */
  _uiSourceCodeAdded(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    this._addUISourceCode(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _addUISourceCode(uiSourceCode) {
    if (uiSourceCode.project().isServiceProject())
      return;
    this._editorContainer.addUISourceCode(uiSourceCode);
  }

  _uiSourceCodeRemoved(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    this._removeUISourceCodes([uiSourceCode]);
  }

  /**
   * @param {!Array.<!Workspace.UISourceCode>} uiSourceCodes
   */
  _removeUISourceCodes(uiSourceCodes) {
    this._editorContainer.removeUISourceCodes(uiSourceCodes);
    for (var i = 0; i < uiSourceCodes.length; ++i) {
      this._removeSourceFrame(uiSourceCodes[i]);
      this._historyManager.removeHistoryForSourceCode(uiSourceCodes[i]);
    }
  }

  _projectRemoved(event) {
    var project = event.data;
    var uiSourceCodes = project.uiSourceCodes();
    this._removeUISourceCodes(uiSourceCodes);
  }

  _updateScriptViewToolbarItems() {
    this._scriptViewToolbar.removeToolbarItems();
    var view = this.visibleView();
    if (view instanceof UI.SimpleView) {
      for (var item of (/** @type {?UI.SimpleView} */ (view)).syncToolbarItems())
        this._scriptViewToolbar.appendToolbarItem(item);
    }
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number=} lineNumber 0-based
   * @param {number=} columnNumber
   * @param {boolean=} omitFocus
   * @param {boolean=} omitHighlight
   */
  showSourceLocation(uiSourceCode, lineNumber, columnNumber, omitFocus, omitHighlight) {
    this._historyManager.updateCurrentState();
    this._editorContainer.showFile(uiSourceCode);
    var currentSourceFrame = this.currentSourceFrame();
    if (currentSourceFrame && typeof lineNumber === 'number')
      currentSourceFrame.revealPosition(lineNumber, columnNumber, !omitHighlight);
    this._historyManager.pushNewState();
    if (!omitFocus)
      this.visibleView().focus();
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {!UI.Widget}
   */
  _createSourceView(uiSourceCode) {
    var sourceFrame;
    var sourceView;
    var contentType = uiSourceCode.contentType();

    if (contentType.hasScripts())
      sourceFrame = new Sources.JavaScriptSourceFrame(uiSourceCode);
    else if (contentType.isStyleSheet())
      sourceFrame = new Sources.CSSSourceFrame(uiSourceCode);
    else if (contentType === Common.resourceTypes.Image)
      sourceView = new SourceFrame.ImageView(uiSourceCode.mimeType(), uiSourceCode);
    else if (contentType === Common.resourceTypes.Font)
      sourceView = new SourceFrame.FontView(uiSourceCode.mimeType(), uiSourceCode);
    else
      sourceFrame = new SourceFrame.UISourceCodeFrame(uiSourceCode);

    if (sourceFrame) {
      sourceFrame.setHighlighterType(uiSourceCode.mimeType());
      this._historyManager.trackSourceFrameCursorJumps(sourceFrame);
    }
    var widget = /** @type {!UI.Widget} */ (sourceFrame || sourceView);
    this._sourceViewByUISourceCode.set(uiSourceCode, widget);
    uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, this._uiSourceCodeTitleChanged, this);
    return widget;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {!UI.Widget}
   */
  _getOrCreateSourceView(uiSourceCode) {
    return this._sourceViewByUISourceCode.get(uiSourceCode) || this._createSourceView(uiSourceCode);
  }

  /**
   * @param {!SourceFrame.UISourceCodeFrame} sourceFrame
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  _sourceFrameMatchesUISourceCode(sourceFrame, uiSourceCode) {
    if (uiSourceCode.contentType().hasScripts())
      return sourceFrame instanceof Sources.JavaScriptSourceFrame;
    if (uiSourceCode.contentType().isStyleSheet())
      return sourceFrame instanceof Sources.CSSSourceFrame;
    return !(sourceFrame instanceof Sources.JavaScriptSourceFrame);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _recreateSourceFrameIfNeeded(uiSourceCode) {
    var oldSourceView = this._sourceViewByUISourceCode.get(uiSourceCode);
    if (!oldSourceView || !(oldSourceView instanceof SourceFrame.UISourceCodeFrame))
      return;
    var oldSourceFrame = /** @type {!SourceFrame.UISourceCodeFrame} */ (oldSourceView);
    if (this._sourceFrameMatchesUISourceCode(oldSourceFrame, uiSourceCode)) {
      oldSourceFrame.setHighlighterType(uiSourceCode.mimeType());
    } else {
      this._editorContainer.removeUISourceCode(uiSourceCode);
      this._removeSourceFrame(uiSourceCode);
    }
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {!UI.Widget}
   */
  viewForFile(uiSourceCode) {
    return this._getOrCreateSourceView(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _removeSourceFrame(uiSourceCode) {
    var sourceView = this._sourceViewByUISourceCode.get(uiSourceCode);
    this._sourceViewByUISourceCode.remove(uiSourceCode);
    uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.TitleChanged, this._uiSourceCodeTitleChanged, this);
    if (sourceView && sourceView instanceof SourceFrame.UISourceCodeFrame)
      /** @type {!SourceFrame.UISourceCodeFrame} */ (sourceView).dispose();
  }

  _onBindingChanged() {
    this.setExecutionLocation(this._executionLocation);
    this.showSourceLocation(
        this._executionLocation.uiSourceCode, this._executionLocation.lineNumber, this._executionLocation.columnNumber);
  }

  clearCurrentExecutionLine() {
    if (!this._executionLocation)
      return;
    Persistence.persistence.unsubscribeFromBindingEvent(this._executionLocation.uiSourceCode, this._bindingChangeBound);
    this._executionSourceFrame.clearExecutionLine();
    this._executionSourceFrame = null;
    this._executionLocation = null;
  }

  /**
   * @param {!Workspace.UILocation} uiLocation
   */
  setExecutionLocation(uiLocation) {
    this.clearCurrentExecutionLine();
    var binding = Persistence.persistence.binding(uiLocation.uiSourceCode);
    var uiSourceCode = binding ? binding.fileSystem : uiLocation.uiSourceCode;
    var sourceView = this._getOrCreateSourceView(uiSourceCode);
    if (!(sourceView instanceof SourceFrame.UISourceCodeFrame))
      return;
    Persistence.persistence.subscribeForBindingEvent(uiLocation.uiSourceCode, this._bindingChangeBound);
    var sourceFrame = /** @type {!Sources.JavaScriptSourceFrame} */ (sourceView);
    sourceFrame.setExecutionLocation(
        new Workspace.UILocation(uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber));
    this._executionSourceFrame = sourceFrame;
    this._executionLocation = uiLocation;
  }

  /**
   * @param {!Common.Event} event
   */
  _editorClosed(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    this._historyManager.removeHistoryForSourceCode(uiSourceCode);

    var wasSelected = false;
    if (!this._editorContainer.currentFile())
      wasSelected = true;

    // SourcesNavigator does not need to update on EditorClosed.
    this._updateScriptViewToolbarItems();
    this._searchableView.resetSearch();

    var data = {};
    data.uiSourceCode = uiSourceCode;
    data.wasSelected = wasSelected;
    this.dispatchEventToListeners(Sources.SourcesView.Events.EditorClosed, data);
  }

  /**
   * @param {!Common.Event} event
   */
  _editorSelected(event) {
    var previousSourceFrame =
        event.data.previousView instanceof SourceFrame.UISourceCodeFrame ? event.data.previousView : null;
    if (previousSourceFrame)
      previousSourceFrame.setSearchableView(null);
    var currentSourceFrame =
        event.data.currentView instanceof SourceFrame.UISourceCodeFrame ? event.data.currentView : null;
    if (currentSourceFrame)
      currentSourceFrame.setSearchableView(this._searchableView);

    this._searchableView.setReplaceable(!!currentSourceFrame && currentSourceFrame.canEditSource());
    this._searchableView.refreshSearch();
    this._updateScriptViewToolbarItems();

    this.dispatchEventToListeners(Sources.SourcesView.Events.EditorSelected, this._editorContainer.currentFile());
  }

  /**
   * @param {!Common.Event} event
   */
  _uiSourceCodeTitleChanged(event) {
    this._recreateSourceFrameIfNeeded(/** @type {!Workspace.UISourceCode} */ (event.data));
  }

  /**
   * @override
   */
  searchCanceled() {
    if (this._searchView)
      this._searchView.searchCanceled();

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
    var sourceFrame = this.currentSourceFrame();
    if (!sourceFrame)
      return;

    this._searchView = sourceFrame;
    this._searchConfig = searchConfig;

    this._searchView.performSearch(this._searchConfig, shouldJump, jumpBackwards);
  }

  /**
   * @override
   */
  jumpToNextSearchResult() {
    if (!this._searchView)
      return;

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
    if (!this._searchView)
      return;

    if (this._searchView !== this.currentSourceFrame()) {
      this.performSearch(this._searchConfig, true);
      if (this._searchView)
        this._searchView.jumpToLastSearchResult();
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
    var sourceFrame = this.currentSourceFrame();
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
    var sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      console.assert(sourceFrame);
      return;
    }
    sourceFrame.replaceAllWith(searchConfig, replacement);
  }

  /**
   * @param {!Event=} event
   */
  _showOutlineQuickOpen(event) {
    QuickOpen.QuickOpen.show('@');
    return true;
  }

  /**
   * @param {!Event=} event
   * @return {boolean}
   */
  _showGoToLineQuickOpen(event) {
    if (this._editorContainer.currentFile())
      QuickOpen.QuickOpen.show(':');
    return true;
  }

  /**
   * @return {boolean}
   */
  _save() {
    this._saveSourceFrame(this.currentSourceFrame());
    return true;
  }

  /**
   * @return {boolean}
   */
  _saveAll() {
    var sourceFrames = this._editorContainer.fileViews();
    sourceFrames.forEach(this._saveSourceFrame.bind(this));
    return true;
  }

  /**
   * @param {?UI.Widget} sourceFrame
   */
  _saveSourceFrame(sourceFrame) {
    if (!(sourceFrame instanceof SourceFrame.UISourceCodeFrame))
      return;
    var uiSourceCodeFrame = /** @type {!SourceFrame.UISourceCodeFrame} */ (sourceFrame);
    uiSourceCodeFrame.commitEditing();
  }

  /**
   * @return {boolean}
   */
  _toggleBreakpoint() {
    var sourceFrame = this.currentSourceFrame();
    if (!sourceFrame)
      return false;

    if (sourceFrame instanceof Sources.JavaScriptSourceFrame) {
      var javaScriptSourceFrame = /** @type {!Sources.JavaScriptSourceFrame} */ (sourceFrame);
      javaScriptSourceFrame.toggleBreakpointOnCurrentLine();
      return true;
    }
    return false;
  }

  /**
   * @param {boolean} active
   */
  toggleBreakpointsActiveState(active) {
    this._editorContainer.view.element.classList.toggle('breakpoints-deactivated', !active);
  }
};

/** @enum {symbol} */
Sources.SourcesView.Events = {
  EditorClosed: Symbol('EditorClosed'),
  EditorSelected: Symbol('EditorSelected'),
};

/**
 * @interface
 */
Sources.SourcesView.EditorAction = function() {};

Sources.SourcesView.EditorAction.prototype = {
  /**
   * @param {!Sources.SourcesView} sourcesView
   * @return {!UI.ToolbarButton}
   */
  button(sourcesView) {}
};

/**
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
Sources.SourcesView.SwitchFileActionDelegate = class {
  /**
   * @param {!Workspace.UISourceCode} currentUISourceCode
   * @return {?Workspace.UISourceCode}
   */
  static _nextFile(currentUISourceCode) {
    /**
     * @param {string} name
     * @return {string}
     */
    function fileNamePrefix(name) {
      var lastDotIndex = name.lastIndexOf('.');
      var namePrefix = name.substr(0, lastDotIndex !== -1 ? lastDotIndex : name.length);
      return namePrefix.toLowerCase();
    }

    var uiSourceCodes = currentUISourceCode.project().uiSourceCodes();
    var candidates = [];
    var url = currentUISourceCode.parentURL();
    var name = currentUISourceCode.name();
    var namePrefix = fileNamePrefix(name);
    for (var i = 0; i < uiSourceCodes.length; ++i) {
      var uiSourceCode = uiSourceCodes[i];
      if (url !== uiSourceCode.parentURL())
        continue;
      if (fileNamePrefix(uiSourceCode.name()) === namePrefix)
        candidates.push(uiSourceCode.name());
    }
    candidates.sort(String.naturalOrderComparator);
    var index = mod(candidates.indexOf(name) + 1, candidates.length);
    var fullURL = (url ? url + '/' : '') + candidates[index];
    var nextUISourceCode = currentUISourceCode.project().uiSourceCodeForURL(fullURL);
    return nextUISourceCode !== currentUISourceCode ? nextUISourceCode : null;
  }

  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    var sourcesView = UI.context.flavor(Sources.SourcesView);
    var currentUISourceCode = sourcesView.currentUISourceCode();
    if (!currentUISourceCode)
      return false;
    var nextUISourceCode = Sources.SourcesView.SwitchFileActionDelegate._nextFile(currentUISourceCode);
    if (!nextUISourceCode)
      return false;
    sourcesView.showSourceLocation(nextUISourceCode);
    return true;
  }
};


/**
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
Sources.SourcesView.CloseAllActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    var sourcesView = UI.context.flavor(Sources.SourcesView);
    if (!sourcesView)
      return false;
    sourcesView._editorContainer.closeAllFiles();
    return true;
  }
};
