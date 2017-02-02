// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {UI.ContextFlavorListener}
 * @unrestricted
 */
Sources.JavaScriptBreakpointsSidebarPane = class extends UI.ThrottledWidget {
  constructor() {
    super(true);
    this.registerRequiredCSS('components/breakpointsList.css');

    this._breakpointManager = Bindings.breakpointManager;
    this._breakpointManager.addEventListener(Bindings.BreakpointManager.Events.BreakpointAdded, this.update, this);
    this._breakpointManager.addEventListener(Bindings.BreakpointManager.Events.BreakpointRemoved, this.update, this);
    this._breakpointManager.addEventListener(
        Bindings.BreakpointManager.Events.BreakpointsActiveStateChanged, this.update, this);

    /** @type {?Element} */
    this._listElement = null;
    this.update();
  }

  /**
   * @override
   * @return {!Promise<?>}
   */
  doUpdate() {
    var breakpointLocations = this._breakpointManager.allBreakpointLocations();
    if (!breakpointLocations.length) {
      this._listElement = null;
      this.contentElement.removeChildren();
      var emptyElement = this.contentElement.createChild('div', 'gray-info-message');
      emptyElement.textContent = Common.UIString('No Breakpoints');
      this.contentElement.appendChild(emptyElement);
      this._didUpdateForTest();
      return Promise.resolve();
    }

    if (!this._listElement) {
      this.contentElement.removeChildren();
      this._listElement = this.contentElement.createChild('div');
      this.contentElement.appendChild(this._listElement);
    }

    breakpointLocations.sort((item1, item2) => item1.uiLocation.compareTo(item2.uiLocation));

    /** @type {!Multimap<string, !{breakpoint: !Bindings.BreakpointManager.Breakpoint, uiLocation: !Workspace.UILocation}>} */
    var locationForEntry = new Multimap();
    for (var breakpointLocation of breakpointLocations) {
      var uiLocation = breakpointLocation.uiLocation;
      var entryDescriptor = uiLocation.uiSourceCode.url() + ':' + uiLocation.lineNumber;
      locationForEntry.set(entryDescriptor, breakpointLocation);
    }

    var details = UI.context.flavor(SDK.DebuggerPausedDetails);
    var selectedUILocation = details && details.callFrames.length ?
        Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(details.callFrames[0].location()) :
        null;

    var shouldShowView = false;
    var entry = this._listElement.firstChild;
    var promises = [];
    for (var descriptor of locationForEntry.keysArray()) {
      if (!entry) {
        entry = this._listElement.createChild('div', 'breakpoint-entry');
        entry.addEventListener('contextmenu', this._breakpointContextMenu.bind(this), true);
        entry.addEventListener('click', this._revealLocation.bind(this), false);
        var checkboxLabel = UI.createCheckboxLabel('');
        checkboxLabel.addEventListener('click', this._breakpointCheckboxClicked.bind(this), false);
        entry.appendChild(checkboxLabel);
        entry[Sources.JavaScriptBreakpointsSidebarPane._checkboxLabelSymbol] = checkboxLabel;
        var snippetElement = entry.createChild('div', 'source-text monospace');
        entry[Sources.JavaScriptBreakpointsSidebarPane._snippetElementSymbol] = snippetElement;
      }

      var locations = Array.from(locationForEntry.get(descriptor));
      var uiLocation = locations[0].uiLocation;
      var isSelected =
          !!selectedUILocation && locations.some(location => location.uiLocation.id() === selectedUILocation.id());
      var hasEnabled = locations.some(location => location.breakpoint.enabled());
      var hasDisabled = locations.some(location => !location.breakpoint.enabled());
      promises.push(this._resetEntry(/** @type {!Element}*/ (entry), uiLocation, isSelected, hasEnabled, hasDisabled));

      if (isSelected)
        shouldShowView = true;
      entry = entry.nextSibling;
    }
    while (entry) {
      var next = entry.nextSibling;
      entry.remove();
      entry = next;
    }
    if (shouldShowView)
      UI.viewManager.showView('sources.jsBreakpoints');
    this._listElement.classList.toggle('breakpoints-list-deactivated', !this._breakpointManager.breakpointsActive());
    Promise.all(promises).then(() => this._didUpdateForTest());
    return Promise.resolve();
  }

  /**
   * @param {!Element} element
   * @param {!Workspace.UILocation} uiLocation
   * @param {boolean} isSelected
   * @param {boolean} hasEnabled
   * @param {boolean} hasDisabled
   * @return {!Promise<undefined>}
   */
  _resetEntry(element, uiLocation, isSelected, hasEnabled, hasDisabled) {
    element[Sources.JavaScriptBreakpointsSidebarPane._locationSymbol] = uiLocation;
    element.classList.toggle('breakpoint-hit', isSelected);

    var checkboxLabel = element[Sources.JavaScriptBreakpointsSidebarPane._checkboxLabelSymbol];
    checkboxLabel.textElement.textContent = uiLocation.linkText();
    checkboxLabel.checkboxElement.checked = hasEnabled;
    checkboxLabel.checkboxElement.indeterminate = hasEnabled && hasDisabled;

    var snippetElement = element[Sources.JavaScriptBreakpointsSidebarPane._snippetElementSymbol];
    return uiLocation.uiSourceCode.requestContent().then(fillSnippetElement.bind(null, snippetElement));

    /**
     * @param {!Element} snippetElement
     * @param {?string} content
     */
    function fillSnippetElement(snippetElement, content) {
      var lineNumber = uiLocation.lineNumber;
      var text = new Common.Text(content || '');
      if (lineNumber < text.lineCount()) {
        var lineText = text.lineAt(lineNumber);
        var maxSnippetLength = 200;
        snippetElement.textContent = lineText.trimEnd(maxSnippetLength);
      }
    }
  }

  /**
   * @param {!Event} event
   * @return {?Workspace.UILocation}
   */
  _uiLocationFromEvent(event) {
    var node = event.target.enclosingNodeOrSelfWithClass('breakpoint-entry');
    if (!node)
      return null;
    return node[Sources.JavaScriptBreakpointsSidebarPane._locationSymbol] || null;
  }

  /**
   * @param {!Event} event
   */
  _breakpointCheckboxClicked(event) {
    var uiLocation = this._uiLocationFromEvent(event);
    if (!uiLocation)
      return;

    var breakpoints = this._breakpointManager.findBreakpoints(uiLocation.uiSourceCode, uiLocation.lineNumber);
    var newState = event.target.checkboxElement.checked;
    for (var breakpoint of breakpoints)
      breakpoint.setEnabled(newState);
    event.consume();
  }

  /**
   * @param {!Event} event
   */
  _revealLocation(event) {
    var uiLocation = this._uiLocationFromEvent(event);
    if (uiLocation)
      Common.Revealer.reveal(uiLocation);
  }

  /**
   * @param {!Event} event
   */
  _breakpointContextMenu(event) {
    var uiLocation = this._uiLocationFromEvent(event);
    if (!uiLocation)
      return;

    var breakpoints = this._breakpointManager.findBreakpoints(uiLocation.uiSourceCode, uiLocation.lineNumber);

    var contextMenu = new UI.ContextMenu(event);
    var removeEntryTitle = breakpoints.length > 1 ? Common.UIString('Remove all breakpoints in line') :
                                                    Common.UIString('Remove breakpoint');
    contextMenu.appendItem(removeEntryTitle, () => breakpoints.map(breakpoint => breakpoint.remove()));

    contextMenu.appendSeparator();
    var breakpointActive = this._breakpointManager.breakpointsActive();
    var breakpointActiveTitle =
        breakpointActive ? Common.UIString('Deactivate breakpoints') : Common.UIString('Activate breakpoints');
    contextMenu.appendItem(
        breakpointActiveTitle,
        this._breakpointManager.setBreakpointsActive.bind(this._breakpointManager, !breakpointActive));

    contextMenu.appendSeparator();
    if (breakpoints.some(breakpoint => !breakpoint.enabled())) {
      var enableTitle = Common.UIString('Enable all breakpoints');
      contextMenu.appendItem(
          enableTitle, this._breakpointManager.toggleAllBreakpoints.bind(this._breakpointManager, true));
    }
    if (breakpoints.some(breakpoint => breakpoint.enabled())) {
      var disableTitle = Common.UIString('Disable all breakpoints');
      contextMenu.appendItem(
          disableTitle, this._breakpointManager.toggleAllBreakpoints.bind(this._breakpointManager, false));
    }
    var removeAllTitle = Common.UIString('Remove all breakpoints');
    contextMenu.appendItem(removeAllTitle, this._breakpointManager.removeAllBreakpoints.bind(this._breakpointManager));
    var removeOtherTitle = Common.UIString('Remove other breakpoints');
    contextMenu.appendItem(
        removeOtherTitle,
        this._breakpointManager.removeOtherBreakpoints.bind(this._breakpointManager, new Set(breakpoints)));
    contextMenu.show();
  }

  /**
   * @override
   * @param {?Object} object
   */
  flavorChanged(object) {
    this.update();
  }

  _didUpdateForTest() {
  }
};

Sources.JavaScriptBreakpointsSidebarPane._locationSymbol = Symbol('location');
Sources.JavaScriptBreakpointsSidebarPane._checkboxLabelSymbol = Symbol('checkbox-label');
Sources.JavaScriptBreakpointsSidebarPane._snippetElementSymbol = Symbol('snippet-element');
