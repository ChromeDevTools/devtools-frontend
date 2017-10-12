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

/**
 * @unrestricted
 */
Sources.JavaScriptSourceFrame = class extends SourceFrame.UISourceCodeFrame {
  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  constructor(uiSourceCode) {
    super(uiSourceCode);
    this._debuggerSourceCode = uiSourceCode;

    this._scriptsPanel = Sources.SourcesPanel.instance();
    this._breakpointManager = Bindings.breakpointManager;
    if (uiSourceCode.project().type() === Workspace.projectTypes.Debugger)
      this.element.classList.add('source-frame-debugger-script');

    this._popoverHelper = new UI.PopoverHelper(this._scriptsPanel.element, this._getPopoverRequest.bind(this));
    this._popoverHelper.setDisableOnClick(true);
    this._popoverHelper.setTimeout(250, 250);
    this._popoverHelper.setHasPadding(true);
    this._scriptsPanel.element.addEventListener(
        'scroll', this._popoverHelper.hidePopover.bind(this._popoverHelper), true);

    this.textEditor.element.addEventListener('keydown', this._onKeyDown.bind(this), true);
    this.textEditor.element.addEventListener('keyup', this._onKeyUp.bind(this), true);
    this.textEditor.element.addEventListener('mousemove', this._onMouseMove.bind(this), false);
    this.textEditor.element.addEventListener('mousedown', this._onMouseDown.bind(this), true);
    this.textEditor.element.addEventListener('focusout', this._onBlur.bind(this), false);
    if (Runtime.experiments.isEnabled('continueToLocationMarkers')) {
      this.textEditor.element.addEventListener('wheel', event => {
        if (UI.KeyboardShortcut.eventHasCtrlOrMeta(event))
          event.preventDefault();
      }, true);
    }

    this.textEditor.addEventListener(
        SourceFrame.SourcesTextEditor.Events.GutterClick, this._handleGutterClick.bind(this), this);

    this._breakpointManager.addEventListener(
        Bindings.BreakpointManager.Events.BreakpointAdded, this._breakpointAdded, this);
    this._breakpointManager.addEventListener(
        Bindings.BreakpointManager.Events.BreakpointRemoved, this._breakpointRemoved, this);

    this.uiSourceCode().addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this._workingCopyChanged, this);
    this.uiSourceCode().addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._workingCopyCommitted, this);
    this.uiSourceCode().addEventListener(
        Workspace.UISourceCode.Events.TitleChanged, this._showBlackboxInfobarIfNeeded, this);

    /** @type {!Set<!Sources.JavaScriptSourceFrame.BreakpointDecoration>} */
    this._breakpointDecorations = new Set();
    /** @type {!Map<!Bindings.BreakpointManager.Breakpoint, !Sources.JavaScriptSourceFrame.BreakpointDecoration>} */
    this._decorationByBreakpoint = new Map();
    /** @type {!Set<number>} */
    this._possibleBreakpointsRequested = new Set();

    /** @type {!Map.<!SDK.DebuggerModel, !Bindings.ResourceScriptFile>}*/
    this._scriptFileForDebuggerModel = new Map();

    Common.moduleSetting('skipStackFramesPattern').addChangeListener(this._showBlackboxInfobarIfNeeded, this);
    Common.moduleSetting('skipContentScripts').addChangeListener(this._showBlackboxInfobarIfNeeded, this);

    /** @type {!Map.<number, !Element>} */
    this._valueWidgets = new Map();
    this.onBindingChanged();
    /** @type {?Map<!Object, !Function>} */
    this._continueToLocationDecorations = null;
  }

  /**
   * @override
   * @return {!Array<!UI.ToolbarItem>}
   */
  syncToolbarItems() {
    var result = super.syncToolbarItems();
    var originURL = Bindings.CompilerScriptMapping.uiSourceCodeOrigin(this._debuggerSourceCode);
    if (originURL) {
      var parsedURL = originURL.asParsedURL();
      if (parsedURL)
        result.push(new UI.ToolbarText(Common.UIString('(source mapped from %s)', parsedURL.displayName)));
    }

    if (this.uiSourceCode().project().type() === Workspace.projectTypes.Snippets) {
      result.push(new UI.ToolbarSeparator(true));
      var runSnippet = UI.Toolbar.createActionButtonForId('debugger.run-snippet');
      runSnippet.setText(Host.isMac() ? Common.UIString('\u2318+Enter') : Common.UIString('Ctrl+Enter'));
      result.push(runSnippet);
    }

    return result;
  }

  _showBlackboxInfobarIfNeeded() {
    var uiSourceCode = this._debuggerSourceCode;
    if (!uiSourceCode.contentType().hasScripts())
      return;
    var projectType = uiSourceCode.project().type();
    if (!Bindings.blackboxManager.isBlackboxedUISourceCode(uiSourceCode)) {
      this._hideBlackboxInfobar();
      return;
    }

    if (this._blackboxInfobar)
      this._blackboxInfobar.dispose();

    var infobar = new UI.Infobar(UI.Infobar.Type.Warning, Common.UIString('This script is blackboxed in debugger'));
    this._blackboxInfobar = infobar;

    infobar.createDetailsRowMessage(
        Common.UIString('Debugger will skip stepping through this script, and will not stop on exceptions'));

    var scriptFile = this._scriptFileForDebuggerModel.size ? this._scriptFileForDebuggerModel.valuesArray()[0] : null;
    if (scriptFile && scriptFile.hasSourceMapURL())
      infobar.createDetailsRowMessage(Common.UIString('Source map found, but ignored for blackboxed file.'));
    infobar.createDetailsRowMessage();
    infobar.createDetailsRowMessage(Common.UIString('Possible ways to cancel this behavior are:'));

    infobar.createDetailsRowMessage(' - ').createTextChild(
        Common.UIString('Go to "%s" tab in settings', Common.UIString('Blackboxing')));
    var unblackboxLink = infobar.createDetailsRowMessage(' - ').createChild('span', 'link');
    unblackboxLink.textContent = Common.UIString('Unblackbox this script');
    unblackboxLink.addEventListener('click', unblackbox, false);

    function unblackbox() {
      Bindings.blackboxManager.unblackboxUISourceCode(uiSourceCode);
      if (projectType === Workspace.projectTypes.ContentScripts)
        Bindings.blackboxManager.unblackboxContentScripts();
    }

    this.attachInfobars([this._blackboxInfobar]);
  }

  _hideBlackboxInfobar() {
    if (!this._blackboxInfobar)
      return;
    this._blackboxInfobar.dispose();
    delete this._blackboxInfobar;
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    if (this._executionLocation && this.loaded) {
      // We need SourcesTextEditor to be initialized prior to this call. @see crbug.com/499889
      setImmediate(() => {
        this._generateValuesInSource();
      });
    }
  }

  /**
   * @override
   */
  willHide() {
    super.willHide();
    this._popoverHelper.hidePopover();
  }

  /**
   * @override
   */
  onUISourceCodeContentChanged() {
    for (var decoration of this._breakpointDecorations) {
      if (decoration.breakpoint)
        decoration.breakpoint.remove();
    }
    super.onUISourceCodeContentChanged();
  }

  /**
   * @override
   */
  onTextChanged(oldRange, newRange) {
    this._scriptsPanel.updateLastModificationTime();
    super.onTextChanged(oldRange, newRange);
    if (this._compiler)
      this._compiler.scheduleCompile();
  }

  /**
   * @override
   * @return {!Promise}
   */
  populateLineGutterContextMenu(contextMenu, lineNumber) {
    /**
     * @this {Sources.JavaScriptSourceFrame}
     */
    function populate(resolve, reject) {
      var uiLocation = new Workspace.UILocation(this._debuggerSourceCode, lineNumber, 0);
      this._scriptsPanel.appendUILocationItems(contextMenu, uiLocation);
      var breakpoints = this._lineBreakpointDecorations(lineNumber)
                            .map(decoration => decoration.breakpoint)
                            .filter(breakpoint => !!breakpoint);
      if (!breakpoints.length) {
        contextMenu.appendItem(
            Common.UIString('Add breakpoint'), this._createNewBreakpoint.bind(this, lineNumber, '', true));
        contextMenu.appendItem(
            Common.UIString('Add conditional breakpoint\u2026'),
            this._editBreakpointCondition.bind(this, lineNumber, null, null));
        contextMenu.appendItem(
            Common.UIString('Never pause here'), this._createNewBreakpoint.bind(this, lineNumber, 'false', true));
      } else {
        var hasOneBreakpoint = breakpoints.length === 1;
        var removeTitle =
            hasOneBreakpoint ? Common.UIString('Remove breakpoint') : Common.UIString('Remove all breakpoints in line');
        contextMenu.appendItem(removeTitle, () => breakpoints.map(breakpoint => breakpoint.remove()));
        if (hasOneBreakpoint) {
          contextMenu.appendItem(
              Common.UIString('Edit breakpoint\u2026'),
              this._editBreakpointCondition.bind(this, lineNumber, breakpoints[0], null));
        }
        var hasEnabled = breakpoints.some(breakpoint => breakpoint.enabled());
        if (hasEnabled) {
          var title = hasOneBreakpoint ? Common.UIString('Disable breakpoint') :
                                         Common.UIString('Disable all breakpoints in line');
          contextMenu.appendItem(title, () => breakpoints.map(breakpoint => breakpoint.setEnabled(false)));
        }
        var hasDisabled = breakpoints.some(breakpoint => !breakpoint.enabled());
        if (hasDisabled) {
          var title = hasOneBreakpoint ? Common.UIString('Enable breakpoint') :
                                         Common.UIString('Enabled all breakpoints in line');
          contextMenu.appendItem(title, () => breakpoints.map(breakpoint => breakpoint.setEnabled(true)));
        }
      }
      resolve();
    }
    return new Promise(populate.bind(this));
  }

  /**
   * @override
   * @return {!Promise}
   */
  populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber) {
    /**
     * @param {!Bindings.ResourceScriptFile} scriptFile
     */
    function addSourceMapURL(scriptFile) {
      Sources.AddSourceMapURLDialog.show(addSourceMapURLDialogCallback.bind(null, scriptFile));
    }

    /**
     * @param {!Bindings.ResourceScriptFile} scriptFile
     * @param {string} url
     */
    function addSourceMapURLDialogCallback(scriptFile, url) {
      if (!url)
        return;
      scriptFile.addSourceMapURL(url);
    }

    /**
     * @this {Sources.JavaScriptSourceFrame}
     */
    function populateSourceMapMembers() {
      if (this._debuggerSourceCode.project().type() === Workspace.projectTypes.Network &&
          Common.moduleSetting('jsSourceMapsEnabled').get() &&
          !Bindings.blackboxManager.isBlackboxedUISourceCode(this._debuggerSourceCode)) {
        if (this._scriptFileForDebuggerModel.size) {
          var scriptFile = this._scriptFileForDebuggerModel.valuesArray()[0];
          var addSourceMapURLLabel = Common.UIString('Add source map\u2026');
          contextMenu.appendItem(addSourceMapURLLabel, addSourceMapURL.bind(null, scriptFile));
          contextMenu.appendSeparator();
        }
      }
    }

    return super.populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber)
        .then(populateSourceMapMembers.bind(this));
  }

  /**
   * @param {!Common.Event} event
   */
  _workingCopyChanged(event) {
    if (this._supportsEnabledBreakpointsWhileEditing() || this._scriptFileForDebuggerModel.size)
      return;

    if (this.uiSourceCode().isDirty())
      this._muteBreakpointsWhileEditing();
    else
      this._restoreBreakpointsAfterEditing();
  }

  /**
   * @param {!Common.Event} event
   */
  _workingCopyCommitted(event) {
    this._scriptsPanel.updateLastModificationTime();
    if (this._supportsEnabledBreakpointsWhileEditing())
      return;

    if (!this._scriptFileForDebuggerModel.size)
      this._restoreBreakpointsAfterEditing();
  }

  _didMergeToVM() {
    if (this._supportsEnabledBreakpointsWhileEditing())
      return;
    this._restoreBreakpointsIfConsistentScripts();
  }

  _didDivergeFromVM() {
    if (this._supportsEnabledBreakpointsWhileEditing())
      return;
    this._muteBreakpointsWhileEditing();
  }

  _muteBreakpointsWhileEditing() {
    if (this._muted)
      return;
    for (var decoration of this._breakpointDecorations)
      this._updateBreakpointDecoration(decoration);
    this._muted = true;
  }

  _supportsEnabledBreakpointsWhileEditing() {
    return this.uiSourceCode().project().type() === Workspace.projectTypes.Snippets;
  }

  _restoreBreakpointsIfConsistentScripts() {
    var scriptFiles = this._scriptFileForDebuggerModel.valuesArray();
    for (var i = 0; i < scriptFiles.length; ++i) {
      if (scriptFiles[i].hasDivergedFromVM() || scriptFiles[i].isMergingToVM())
        return;
    }

    this._restoreBreakpointsAfterEditing();
  }

  _restoreBreakpointsAfterEditing() {
    delete this._muted;
    var decorations = Array.from(this._breakpointDecorations);
    this._breakpointDecorations.clear();
    this.textEditor.operation(() => decorations.map(decoration => decoration.hide()));
    for (var decoration of decorations) {
      if (!decoration.breakpoint)
        continue;
      var enabled = decoration.enabled;
      decoration.breakpoint.remove();
      var location = decoration.handle.resolve();
      if (location)
        this._setBreakpoint(location.lineNumber, location.columnNumber, decoration.condition, enabled);
    }
  }

  /**
   * @param {string}  tokenType
   * @return {boolean}
   */
  _isIdentifier(tokenType) {
    return tokenType.startsWith('js-variable') || tokenType.startsWith('js-property') || tokenType === 'js-def';
  }

  /**
   * @param {!MouseEvent} event
   * @return {?UI.PopoverRequest}
   */
  _getPopoverRequest(event) {
    if (UI.KeyboardShortcut.eventHasCtrlOrMeta(event))
      return null;
    var target = UI.context.flavor(SDK.Target);
    var debuggerModel = target ? target.model(SDK.DebuggerModel) : null;
    if (!debuggerModel || !debuggerModel.isPaused())
      return null;

    var textPosition = this.textEditor.coordinatesToCursorPosition(event.x, event.y);
    if (!textPosition)
      return null;

    var mouseLine = textPosition.startLine;
    var mouseColumn = textPosition.startColumn;
    var textSelection = this.textEditor.selection().normalize();
    var anchorBox;
    var lineNumber;
    var startHighlight;
    var endHighlight;

    if (textSelection && !textSelection.isEmpty()) {
      if (textSelection.startLine !== textSelection.endLine || textSelection.startLine !== mouseLine ||
          mouseColumn < textSelection.startColumn || mouseColumn > textSelection.endColumn)
        return null;

      var leftCorner = this.textEditor.cursorPositionToCoordinates(textSelection.startLine, textSelection.startColumn);
      var rightCorner = this.textEditor.cursorPositionToCoordinates(textSelection.endLine, textSelection.endColumn);
      anchorBox = new AnchorBox(leftCorner.x, leftCorner.y, rightCorner.x - leftCorner.x, leftCorner.height);
      lineNumber = textSelection.startLine;
      startHighlight = textSelection.startColumn;
      endHighlight = textSelection.endColumn - 1;
    } else {
      var token = this.textEditor.tokenAtTextPosition(textPosition.startLine, textPosition.startColumn);
      if (!token || !token.type)
        return null;
      lineNumber = textPosition.startLine;
      var line = this.textEditor.line(lineNumber);
      var tokenContent = line.substring(token.startColumn, token.endColumn);

      var isIdentifier = this._isIdentifier(token.type);
      if (!isIdentifier && (token.type !== 'js-keyword' || tokenContent !== 'this'))
        return null;

      var leftCorner = this.textEditor.cursorPositionToCoordinates(lineNumber, token.startColumn);
      var rightCorner = this.textEditor.cursorPositionToCoordinates(lineNumber, token.endColumn - 1);
      anchorBox = new AnchorBox(leftCorner.x, leftCorner.y, rightCorner.x - leftCorner.x, leftCorner.height);

      startHighlight = token.startColumn;
      endHighlight = token.endColumn - 1;
      while (startHighlight > 1 && line.charAt(startHighlight - 1) === '.') {
        var tokenBefore = this.textEditor.tokenAtTextPosition(lineNumber, startHighlight - 2);
        if (!tokenBefore || !tokenBefore.type)
          return null;
        startHighlight = tokenBefore.startColumn;
      }
    }

    var objectPopoverHelper;
    var highlightDescriptor;

    return {
      box: anchorBox,
      show: async popover => {
        var selectedCallFrame = UI.context.flavor(SDK.DebuggerModel.CallFrame);
        if (!selectedCallFrame)
          return false;
        var evaluationText = this.textEditor.line(lineNumber).substring(startHighlight, endHighlight + 1);
        var resolvedText = await Sources.SourceMapNamesResolver.resolveExpression(
            /** @type {!SDK.DebuggerModel.CallFrame} */ (selectedCallFrame), evaluationText, this._debuggerSourceCode,
            lineNumber, startHighlight, endHighlight);
        var result = await selectedCallFrame.evaluate({
          expression: resolvedText || evaluationText,
          objectGroup: 'popover',
          includeCommandLineAPI: false,
          silent: true,
          returnByValue: false,
          generatePreview: false
        });
        if (!result.object)
          return false;
        objectPopoverHelper = await ObjectUI.ObjectPopoverHelper.buildObjectPopover(result.object, popover);
        var potentiallyUpdatedCallFrame = UI.context.flavor(SDK.DebuggerModel.CallFrame);
        if (!objectPopoverHelper || selectedCallFrame !== potentiallyUpdatedCallFrame) {
          debuggerModel.runtimeModel().releaseObjectGroup('popover');
          if (objectPopoverHelper)
            objectPopoverHelper.dispose();
          return false;
        }
        var highlightRange = new TextUtils.TextRange(lineNumber, startHighlight, lineNumber, endHighlight);
        highlightDescriptor = this.textEditor.highlightRange(highlightRange, 'source-frame-eval-expression');
        return true;
      },
      hide: () => {
        objectPopoverHelper.dispose();
        debuggerModel.runtimeModel().releaseObjectGroup('popover');
        this.textEditor.removeHighlight(highlightDescriptor);
      }
    };
  }

  /**
   * @param {!KeyboardEvent} event
   */
  _onKeyDown(event) {
    this._clearControlDown();

    if (event.key === 'Escape') {
      if (this._popoverHelper.isPopoverVisible()) {
        this._popoverHelper.hidePopover();
        event.consume();
      }
      return;
    }

    if (UI.KeyboardShortcut.eventHasCtrlOrMeta(event) && this._executionLocation) {
      this._controlDown = true;
      if (event.key === (Host.isMac() ? 'Meta' : 'Control')) {
        this._controlTimeout = setTimeout(() => {
          if (this._executionLocation && this._controlDown)
            this._showContinueToLocations();
        }, 150);
      }
    }
  }

  /**
   * @param {!MouseEvent} event
   */
  _onMouseMove(event) {
    if (this._executionLocation && this._controlDown && UI.KeyboardShortcut.eventHasCtrlOrMeta(event)) {
      if (!this._continueToLocationDecorations)
        this._showContinueToLocations();
    }
    if (this._continueToLocationDecorations) {
      var textPosition = this.textEditor.coordinatesToCursorPosition(event.x, event.y);
      var hovering = !!event.target.enclosingNodeOrSelfWithClass('source-frame-async-step-in');
      this._setAsyncStepInHoveredLine(textPosition ? textPosition.startLine : null, hovering);
    }
  }

  /**
   * @param {?number} line
   * @param {boolean} hovered
   */
  _setAsyncStepInHoveredLine(line, hovered) {
    if (this._asyncStepInHoveredLine === line && this._asyncStepInHovered === hovered)
      return;
    if (this._asyncStepInHovered && this._asyncStepInHoveredLine)
      this.textEditor.toggleLineClass(this._asyncStepInHoveredLine, 'source-frame-async-step-in-hovered', false);
    this._asyncStepInHoveredLine = line;
    this._asyncStepInHovered = hovered;
    if (this._asyncStepInHovered && this._asyncStepInHoveredLine)
      this.textEditor.toggleLineClass(this._asyncStepInHoveredLine, 'source-frame-async-step-in-hovered', true);
  }

  /**
   * @param {!MouseEvent} event
   */
  _onMouseDown(event) {
    if (!this._executionLocation || !UI.KeyboardShortcut.eventHasCtrlOrMeta(event))
      return;
    if (!this._continueToLocationDecorations)
      return;
    event.consume();
    var textPosition = this.textEditor.coordinatesToCursorPosition(event.x, event.y);
    if (!textPosition)
      return;
    for (var decoration of this._continueToLocationDecorations.keys()) {
      var range = decoration.find();
      if (range.from.line !== textPosition.startLine || range.to.line !== textPosition.startLine)
        continue;
      if (range.from.ch <= textPosition.startColumn && textPosition.startColumn <= range.to.ch) {
        this._continueToLocationDecorations.get(decoration)();
        break;
      }
    }
  }

  /**
   * @param {!Event} event
   */
  _onBlur(event) {
    if (this.textEditor.element.isAncestor(event.target))
      return;
    this._clearControlDown();
  }

  /**
   * @param {!KeyboardEvent} event
   */
  _onKeyUp(event) {
    this._clearControlDown();
  }

  _clearControlDown() {
    this._controlDown = false;
    this._clearContinueToLocations();
    clearTimeout(this._controlTimeout);
  }

  /**
   * @param {number} lineNumber
   * @param {?Bindings.BreakpointManager.Breakpoint} breakpoint
   * @param {?{lineNumber: number, columnNumber: number}} location
   */
  _editBreakpointCondition(lineNumber, breakpoint, location) {
    this._conditionElement = this._createConditionElement(lineNumber);
    this.textEditor.addDecoration(this._conditionElement, lineNumber);

    /**
     * @this {Sources.JavaScriptSourceFrame}
     */
    function finishEditing(committed, element, newText) {
      this.textEditor.removeDecoration(this._conditionElement, lineNumber);
      delete this._conditionEditorElement;
      delete this._conditionElement;
      if (!committed)
        return;

      if (breakpoint)
        breakpoint.setCondition(newText);
      else if (location)
        this._setBreakpoint(location.lineNumber, location.columnNumber, newText, true);
      else
        this._createNewBreakpoint(lineNumber, newText, true);
    }

    var config = new UI.InplaceEditor.Config(finishEditing.bind(this, true), finishEditing.bind(this, false));
    UI.InplaceEditor.startEditing(this._conditionEditorElement, config);
    this._conditionEditorElement.value = breakpoint ? breakpoint.condition() : '';
    this._conditionEditorElement.select();
  }

  _createConditionElement(lineNumber) {
    var conditionElement = createElementWithClass('div', 'source-frame-breakpoint-condition');

    var labelElement = conditionElement.createChild('label', 'source-frame-breakpoint-message');
    labelElement.htmlFor = 'source-frame-breakpoint-condition';
    labelElement.createTextChild(
        Common.UIString('The breakpoint on line %d will stop only if this expression is true:', lineNumber + 1));

    var editorElement = UI.createInput('monospace', 'text');
    conditionElement.appendChild(editorElement);
    editorElement.id = 'source-frame-breakpoint-condition';
    this._conditionEditorElement = editorElement;

    return conditionElement;
  }

  /**
   * @param {!Workspace.UILocation} uiLocation
   */
  setExecutionLocation(uiLocation) {
    this._executionLocation = uiLocation;
    if (!this.loaded)
      return;

    this.textEditor.setExecutionLocation(uiLocation.lineNumber, uiLocation.columnNumber);
    if (this.isShowing()) {
      // We need SourcesTextEditor to be initialized prior to this call. @see crbug.com/506566
      setImmediate(() => {
        if (this._controlDown) {
          if (Runtime.experiments.isEnabled('continueToLocationMarkers'))
            this._showContinueToLocations();
        } else {
          this._generateValuesInSource();
        }
      });
    }
  }

  _generateValuesInSource() {
    if (!Common.moduleSetting('inlineVariableValues').get())
      return;
    var executionContext = UI.context.flavor(SDK.ExecutionContext);
    if (!executionContext)
      return;
    var callFrame = UI.context.flavor(SDK.DebuggerModel.CallFrame);
    if (!callFrame)
      return;

    var localScope = callFrame.localScope();
    var functionLocation = callFrame.functionLocation();
    if (localScope && functionLocation) {
      Sources.SourceMapNamesResolver.resolveScopeInObject(localScope)
          .getAllProperties(false, false, this._prepareScopeVariables.bind(this, callFrame));
    }

    if (this._clearValueWidgetsTimer) {
      clearTimeout(this._clearValueWidgetsTimer);
      delete this._clearValueWidgetsTimer;
    }
  }

  _showContinueToLocations() {
    if (!Runtime.experiments.isEnabled('continueToLocationMarkers'))
      return;
    this._popoverHelper.hidePopover();
    var executionContext = UI.context.flavor(SDK.ExecutionContext);
    if (!executionContext)
      return;
    var callFrame = UI.context.flavor(SDK.DebuggerModel.CallFrame);
    if (!callFrame)
      return;
    var localScope = callFrame.localScope();
    if (!localScope) {
      this._clearContinueToLocationsNoRestore();
      return;
    }
    var start = localScope.startLocation();
    var end = localScope.endLocation();
    if (!start || !end) {
      this._clearContinueToLocationsNoRestore();
      return;
    }
    var debuggerModel = callFrame.debuggerModel;
    debuggerModel.getPossibleBreakpoints(start, end, true)
        .then(locations => this.textEditor.operation(renderLocations.bind(this, locations)));

    /**
     * @param {!Array<!SDK.DebuggerModel.BreakLocation>} locations
     * @this {Sources.JavaScriptSourceFrame}
     */
    function renderLocations(locations) {
      this._clearContinueToLocationsNoRestore();
      this.textEditor.hideExecutionLineBackground();
      this._clearValueWidgets();
      this._continueToLocationDecorations = new Map();
      locations = locations.reverse();
      var previousCallLine = -1;
      for (var location of locations) {
        var lineNumber = location.lineNumber;
        var token = this.textEditor.tokenAtTextPosition(lineNumber, location.columnNumber);
        if (!token)
          continue;
        var line = this.textEditor.line(lineNumber);
        var tokenContent = line.substring(token.startColumn, token.endColumn);
        if (!token.type && tokenContent === '.') {
          token = this.textEditor.tokenAtTextPosition(lineNumber, token.endColumn + 1);
          tokenContent = line.substring(token.startColumn, token.endColumn);
        }
        if (!token.type)
          continue;
        var validKeyword = token.type === 'js-keyword' &&
            (tokenContent === 'this' || tokenContent === 'return' || tokenContent === 'new' ||
             tokenContent === 'continue' || tokenContent === 'break');
        if (!validKeyword && !this._isIdentifier(token.type))
          continue;
        if (previousCallLine === lineNumber && location.type !== Protocol.Debugger.BreakLocationType.Call)
          continue;

        var highlightRange = new TextUtils.TextRange(lineNumber, token.startColumn, lineNumber, token.endColumn - 1);
        var decoration = this.textEditor.highlightRange(highlightRange, 'source-frame-continue-to-location');
        this._continueToLocationDecorations.set(decoration, location.continueToLocation.bind(location));
        if (location.type === Protocol.Debugger.BreakLocationType.Call)
          previousCallLine = lineNumber;

        var isAsyncCall = (line[token.startColumn - 1] === '.' && tokenContent === 'then') ||
            tokenContent === 'setTimeout' || tokenContent === 'setInterval';
        var isCurrentPosition = this._executionLocation && lineNumber === this._executionLocation.lineNumber &&
            location.columnNumber === this._executionLocation.columnNumber;
        if (location.type === Protocol.Debugger.BreakLocationType.Call && isAsyncCall) {
          var asyncStepInRange = this._findAsyncStepInRange(this.textEditor, lineNumber, line, token.endColumn);
          if (asyncStepInRange) {
            highlightRange =
                new TextUtils.TextRange(lineNumber, asyncStepInRange.from, lineNumber, asyncStepInRange.to - 1);
            decoration = this.textEditor.highlightRange(highlightRange, 'source-frame-async-step-in');
            this._continueToLocationDecorations.set(
                decoration, this._asyncStepIn.bind(this, location, isCurrentPosition));
          }
        }
      }

      this._continueToLocationRenderedForTest();
    }
  }

  _continueToLocationRenderedForTest() {
  }

  /**
   * @param {!SourceFrame.SourcesTextEditor} textEditor
   * @param {number} lineNumber
   * @param {string} line
   * @param {number} column
   * @return {?{from: number, to: number}}
   */
  _findAsyncStepInRange(textEditor, lineNumber, line, column) {
    var token;
    var tokenText;
    var from = column;
    var to = line.length;

    var position = line.indexOf('(', column);
    if (position === -1)
      return null;
    position++;

    skipWhitespace();
    if (position >= line.length)
      return null;

    nextToken();
    if (!token)
      return null;
    from = token.startColumn;

    if (token.type === 'js-keyword' && tokenText === 'async') {
      skipWhitespace();
      if (position >= line.length)
        return {from: from, to: to};
      nextToken();
      if (!token)
        return {from: from, to: to};
    }

    if (token.type === 'js-keyword' && tokenText === 'function')
      return {from: from, to: to};

    if (token.type && this._isIdentifier(token.type))
      return {from: from, to: to};

    if (tokenText !== '(')
      return null;
    var closeParen = line.indexOf(')', position);
    if (closeParen === -1 || line.substring(position, closeParen).indexOf('(') !== -1)
      return {from: from, to: to};
    return {from: from, to: closeParen + 1};

    function nextToken() {
      token = textEditor.tokenAtTextPosition(lineNumber, position);
      if (token) {
        position = token.endColumn;
        to = token.endColumn;
        tokenText = line.substring(token.startColumn, token.endColumn);
      }
    }

    function skipWhitespace() {
      while (position < line.length) {
        if (line[position] === ' ') {
          position++;
          continue;
        }
        var token = textEditor.tokenAtTextPosition(lineNumber, position);
        if (token.type === 'js-comment') {
          position = token.endColumn;
          continue;
        }
        break;
      }
    }
  }

  /**
   * @param {!SDK.DebuggerModel.BreakLocation} location
   * @param {boolean} isCurrentPosition
   */
  _asyncStepIn(location, isCurrentPosition) {
    if (!isCurrentPosition)
      location.continueToLocation(asyncStepIn);
    else
      asyncStepIn();

    function asyncStepIn() {
      location.debuggerModel.scheduleStepIntoAsync();
      location.debuggerModel.stepInto();
    }
  }

  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @param {?Array.<!SDK.RemoteObjectProperty>} properties
   * @param {?Array.<!SDK.RemoteObjectProperty>} internalProperties
   */
  _prepareScopeVariables(callFrame, properties, internalProperties) {
    if (!properties || !properties.length || properties.length > 500 || !this.isShowing()) {
      this._clearValueWidgets();
      return;
    }

    var functionUILocation = Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(
        /** @type {!SDK.DebuggerModel.Location} */ (callFrame.functionLocation()));
    var executionUILocation = Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(callFrame.location());
    if (!functionUILocation || !executionUILocation || functionUILocation.uiSourceCode !== this._debuggerSourceCode ||
        executionUILocation.uiSourceCode !== this._debuggerSourceCode) {
      this._clearValueWidgets();
      return;
    }

    var fromLine = functionUILocation.lineNumber;
    var fromColumn = functionUILocation.columnNumber;
    var toLine = executionUILocation.lineNumber;

    // Make sure we have a chance to update all existing widgets.
    if (this._valueWidgets) {
      for (var line of this._valueWidgets.keys())
        toLine = Math.max(toLine, line + 1);
    }
    if (fromLine >= toLine || toLine - fromLine > 500 || fromLine < 0 || toLine >= this.textEditor.linesCount) {
      this._clearValueWidgets();
      return;
    }

    var valuesMap = new Map();
    for (var property of properties)
      valuesMap.set(property.name, property.value);

    /** @type {!Map.<number, !Set<string>>} */
    var namesPerLine = new Map();
    var skipObjectProperty = false;
    var tokenizer = new TextEditor.CodeMirrorUtils.TokenizerFactory().createTokenizer('text/javascript');
    tokenizer(this.textEditor.line(fromLine).substring(fromColumn), processToken.bind(this, fromLine));
    for (var i = fromLine + 1; i < toLine; ++i)
      tokenizer(this.textEditor.line(i), processToken.bind(this, i));

    /**
     * @param {number} lineNumber
     * @param {string} tokenValue
     * @param {?string} tokenType
     * @param {number} column
     * @param {number} newColumn
     * @this {Sources.JavaScriptSourceFrame}
     */
    function processToken(lineNumber, tokenValue, tokenType, column, newColumn) {
      if (!skipObjectProperty && tokenType && this._isIdentifier(tokenType) && valuesMap.get(tokenValue)) {
        var names = namesPerLine.get(lineNumber);
        if (!names) {
          names = new Set();
          namesPerLine.set(lineNumber, names);
        }
        names.add(tokenValue);
      }
      skipObjectProperty = tokenValue === '.';
    }
    this.textEditor.operation(this._renderDecorations.bind(this, valuesMap, namesPerLine, fromLine, toLine));
  }

  /**
   * @param {!Map.<string,!SDK.RemoteObject>} valuesMap
   * @param {!Map.<number, !Set<string>>} namesPerLine
   * @param {number} fromLine
   * @param {number} toLine
   */
  _renderDecorations(valuesMap, namesPerLine, fromLine, toLine) {
    var formatter = new ObjectUI.RemoteObjectPreviewFormatter();
    for (var i = fromLine; i < toLine; ++i) {
      var names = namesPerLine.get(i);
      var oldWidget = this._valueWidgets.get(i);
      if (!names) {
        if (oldWidget) {
          this._valueWidgets.delete(i);
          this.textEditor.removeDecoration(oldWidget, i);
        }
        continue;
      }

      var widget = createElementWithClass('div', 'text-editor-value-decoration');
      var base = this.textEditor.cursorPositionToCoordinates(i, 0);
      var offset = this.textEditor.cursorPositionToCoordinates(i, this.textEditor.line(i).length);
      var codeMirrorLinesLeftPadding = 4;
      var left = offset.x - base.x + codeMirrorLinesLeftPadding;
      widget.style.left = left + 'px';
      widget.__nameToToken = new Map();

      var renderedNameCount = 0;
      for (var name of names) {
        if (renderedNameCount > 10)
          break;
        if (namesPerLine.get(i - 1) && namesPerLine.get(i - 1).has(name))
          continue;  // Only render name once in the given continuous block.
        if (renderedNameCount)
          widget.createTextChild(', ');
        var nameValuePair = widget.createChild('span');
        widget.__nameToToken.set(name, nameValuePair);
        nameValuePair.createTextChild(name + ' = ');
        var value = valuesMap.get(name);
        var propertyCount = value.preview ? value.preview.properties.length : 0;
        var entryCount = value.preview && value.preview.entries ? value.preview.entries.length : 0;
        if (value.preview && propertyCount + entryCount < 10) {
          formatter.appendObjectPreview(nameValuePair, value.preview, false /* isEntry */);
        } else {
          nameValuePair.appendChild(ObjectUI.ObjectPropertiesSection.createValueElement(
              value, false /* wasThrown */, false /* showPreview */));
        }
        ++renderedNameCount;
      }

      var widgetChanged = true;
      if (oldWidget) {
        widgetChanged = false;
        for (var name of widget.__nameToToken.keys()) {
          var oldText = oldWidget.__nameToToken.get(name) ? oldWidget.__nameToToken.get(name).textContent : '';
          var newText = widget.__nameToToken.get(name) ? widget.__nameToToken.get(name).textContent : '';
          if (newText !== oldText) {
            widgetChanged = true;
            // value has changed, update it.
            UI.runCSSAnimationOnce(
                /** @type {!Element} */ (widget.__nameToToken.get(name)), 'source-frame-value-update-highlight');
          }
        }
        if (widgetChanged) {
          this._valueWidgets.delete(i);
          this.textEditor.removeDecoration(oldWidget, i);
        }
      }
      if (widgetChanged) {
        this._valueWidgets.set(i, widget);
        this.textEditor.addDecoration(widget, i);
      }
    }
  }

  clearExecutionLine() {
    this.textEditor.operation(() => {
      if (this.loaded && this._executionLocation)
        this.textEditor.clearExecutionLine();
      delete this._executionLocation;
      this._clearValueWidgetsTimer = setTimeout(this._clearValueWidgets.bind(this), 1000);
      this._clearContinueToLocationsNoRestore();
    });
  }

  _clearValueWidgets() {
    clearTimeout(this._clearValueWidgetsTimer);
    delete this._clearValueWidgetsTimer;
    this.textEditor.operation(() => {
      for (var line of this._valueWidgets.keys())
        this.textEditor.removeDecoration(this._valueWidgets.get(line), line);
      this._valueWidgets.clear();
    });
  }

  _clearContinueToLocationsNoRestore() {
    if (!this._continueToLocationDecorations)
      return;
    this.textEditor.operation(() => {
      for (var decoration of this._continueToLocationDecorations.keys())
        this.textEditor.removeHighlight(decoration);
      this._continueToLocationDecorations = null;
      this._setAsyncStepInHoveredLine(null, false);
    });
  }

  _clearContinueToLocations() {
    if (!this._continueToLocationDecorations)
      return;
    this.textEditor.operation(() => {
      this.textEditor.showExecutionLineBackground();
      this._generateValuesInSource();
      this._clearContinueToLocationsNoRestore();
    });
  }

  /**
   * @param {number} lineNumber
   * @return {!Array<!Sources.JavaScriptSourceFrame.BreakpointDecoration>}
   */
  _lineBreakpointDecorations(lineNumber) {
    return Array.from(this._breakpointDecorations)
        .filter(decoration => (decoration.handle.resolve() || {}).lineNumber === lineNumber);
  }

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?Sources.JavaScriptSourceFrame.BreakpointDecoration}
   */
  _breakpointDecoration(lineNumber, columnNumber) {
    for (var decoration of this._breakpointDecorations) {
      var location = decoration.handle.resolve();
      if (!location)
        continue;
      if (location.lineNumber === lineNumber && location.columnNumber === columnNumber)
        return decoration;
    }
    return null;
  }

  /**
   * @param {!Sources.JavaScriptSourceFrame.BreakpointDecoration} decoration
   */
  _updateBreakpointDecoration(decoration) {
    if (!this._scheduledBreakpointDecorationUpdates) {
      /** @type {!Set<!Sources.JavaScriptSourceFrame.BreakpointDecoration>} */
      this._scheduledBreakpointDecorationUpdates = new Set();
      setImmediate(() => this.textEditor.operation(update.bind(this)));
    }
    this._scheduledBreakpointDecorationUpdates.add(decoration);

    /**
     * @this {Sources.JavaScriptSourceFrame}
     */
    function update() {
      var lineNumbers = new Set();
      for (var decoration of this._scheduledBreakpointDecorationUpdates) {
        var location = decoration.handle.resolve();
        if (!location)
          continue;
        lineNumbers.add(location.lineNumber);
      }
      delete this._scheduledBreakpointDecorationUpdates;
      var waitingForInlineDecorations = false;
      for (var lineNumber of lineNumbers) {
        var decorations = this._lineBreakpointDecorations(lineNumber);
        updateGutter.call(this, lineNumber, decorations);
        if (this._possibleBreakpointsRequested.has(location.lineNumber)) {
          waitingForInlineDecorations = true;
          continue;
        }
        updateInlineDecorations.call(this, lineNumber, decorations);
      }
      if (!waitingForInlineDecorations)
        this._breakpointDecorationsUpdatedForTest();
    }

    /**
     * @param {number} lineNumber
     * @param {!Array<!Sources.JavaScriptSourceFrame.BreakpointDecoration>} decorations
     * @this {Sources.JavaScriptSourceFrame}
     */
    function updateGutter(lineNumber, decorations) {
      this.textEditor.toggleLineClass(lineNumber, 'cm-breakpoint', false);
      this.textEditor.toggleLineClass(lineNumber, 'cm-breakpoint-disabled', false);
      this.textEditor.toggleLineClass(lineNumber, 'cm-breakpoint-conditional', false);

      if (decorations.length) {
        decorations.sort(Sources.JavaScriptSourceFrame.BreakpointDecoration.mostSpecificFirst);
        this.textEditor.toggleLineClass(lineNumber, 'cm-breakpoint', true);
        this.textEditor.toggleLineClass(lineNumber, 'cm-breakpoint-disabled', !decorations[0].enabled || this._muted);
        this.textEditor.toggleLineClass(lineNumber, 'cm-breakpoint-conditional', !!decorations[0].condition);
      }
    }

    /**
     * @param {number} lineNumber
     * @param {!Array<!Sources.JavaScriptSourceFrame.BreakpointDecoration>} decorations
     * @this {Sources.JavaScriptSourceFrame}
     */
    function updateInlineDecorations(lineNumber, decorations) {
      var actualBookmarks = new Set(decorations.map(decoration => decoration.bookmark).filter(bookmark => !!bookmark));
      var lineEnd = this.textEditor.line(lineNumber).length;
      var bookmarks = this.textEditor.bookmarks(
          new TextUtils.TextRange(lineNumber, 0, lineNumber, lineEnd),
          Sources.JavaScriptSourceFrame.BreakpointDecoration.bookmarkSymbol);
      for (var bookmark of bookmarks) {
        if (!actualBookmarks.has(bookmark))
          bookmark.clear();
      }
      if (!decorations.length)
        return;
      if (decorations.length > 1) {
        for (var decoration of decorations) {
          decoration.update();
          if (!this._muted)
            decoration.show();
          else
            decoration.hide();
        }
      } else {
        decorations[0].update();
        decorations[0].hide();
      }
    }
  }

  _breakpointDecorationsUpdatedForTest() {
  }

  /**
   * @param {!Sources.JavaScriptSourceFrame.BreakpointDecoration} decoration
   * @param {!Event} event
   */
  _inlineBreakpointClick(decoration, event) {
    event.consume(true);
    if (decoration.breakpoint) {
      if (event.shiftKey)
        decoration.breakpoint.setEnabled(!decoration.breakpoint.enabled());
      else
        decoration.breakpoint.remove();
    } else {
      var location = decoration.handle.resolve();
      if (!location)
        return;
      this._setBreakpoint(location.lineNumber, location.columnNumber, decoration.condition, true);
    }
  }

  /**
   * @param {!Sources.JavaScriptSourceFrame.BreakpointDecoration} decoration
   * @param {!Event} event
   */
  _inlineBreakpointContextMenu(decoration, event) {
    event.consume(true);
    var location = decoration.handle.resolve();
    if (!location)
      return;
    var contextMenu = new UI.ContextMenu(event);
    if (decoration.breakpoint) {
      contextMenu.appendItem(
          Common.UIString('Edit breakpoint\u2026'),
          this._editBreakpointCondition.bind(this, location.lineNumber, decoration.breakpoint, null));
    } else {
      contextMenu.appendItem(
          Common.UIString('Add conditional breakpoint\u2026'),
          this._editBreakpointCondition.bind(this, location.lineNumber, null, location));
      contextMenu.appendItem(
          Common.UIString('Never pause here'),
          this._setBreakpoint.bind(this, location.lineNumber, location.columnNumber, 'false', true));
    }
    contextMenu.show();
  }

  /**
   * @param {!Common.Event} event
   * @return {boolean}
   */
  _shouldIgnoreExternalBreakpointEvents(event) {
    var uiLocation = /** @type {!Workspace.UILocation} */ (event.data.uiLocation);
    if (uiLocation.uiSourceCode !== this._debuggerSourceCode || !this.loaded)
      return true;
    if (this._supportsEnabledBreakpointsWhileEditing())
      return false;
    if (this._muted)
      return true;
    var scriptFiles = this._scriptFileForDebuggerModel.valuesArray();
    for (var i = 0; i < scriptFiles.length; ++i) {
      if (scriptFiles[i].isDivergingFromVM() || scriptFiles[i].isMergingToVM())
        return true;
    }
    return false;
  }

  /**
   * @param {!Common.Event} event
   */
  _breakpointAdded(event) {
    if (this._shouldIgnoreExternalBreakpointEvents(event))
      return;
    var uiLocation = /** @type {!Workspace.UILocation} */ (event.data.uiLocation);
    var breakpoint = /** @type {!Bindings.BreakpointManager.Breakpoint} */ (event.data.breakpoint);
    this._addBreakpoint(uiLocation, breakpoint);
  }

  /**
   * @param {!Workspace.UILocation} uiLocation
   * @param {!Bindings.BreakpointManager.Breakpoint} breakpoint
   */
  _addBreakpoint(uiLocation, breakpoint) {
    var lineDecorations = this._lineBreakpointDecorations(uiLocation.lineNumber);
    var decoration = this._breakpointDecoration(uiLocation.lineNumber, uiLocation.columnNumber);
    if (decoration) {
      decoration.breakpoint = breakpoint;
      decoration.condition = breakpoint.condition();
      decoration.enabled = breakpoint.enabled();
    } else {
      var handle = this.textEditor.textEditorPositionHandle(uiLocation.lineNumber, uiLocation.columnNumber);
      decoration = new Sources.JavaScriptSourceFrame.BreakpointDecoration(
          this.textEditor, handle, breakpoint.condition(), breakpoint.enabled(), breakpoint);
      decoration.element.addEventListener('click', this._inlineBreakpointClick.bind(this, decoration), true);
      decoration.element.addEventListener(
          'contextmenu', this._inlineBreakpointContextMenu.bind(this, decoration), true);
      this._breakpointDecorations.add(decoration);
    }
    this._decorationByBreakpoint.set(breakpoint, decoration);
    this._updateBreakpointDecoration(decoration);
    if (!lineDecorations.length) {
      this._possibleBreakpointsRequested.add(uiLocation.lineNumber);
      this._breakpointManager
          .possibleBreakpoints(
              this._debuggerSourceCode, new TextUtils.TextRange(uiLocation.lineNumber, 0, uiLocation.lineNumber + 1, 0))
          .then(addInlineDecorations.bind(this, uiLocation.lineNumber));
    }

    /**
     * @this {Sources.JavaScriptSourceFrame}
     * @param {number} lineNumber
     * @param {!Array<!Workspace.UILocation>} possibleLocations
     */
    function addInlineDecorations(lineNumber, possibleLocations) {
      this._possibleBreakpointsRequested.delete(lineNumber);
      var decorations = this._lineBreakpointDecorations(lineNumber);
      for (var decoration of decorations)
        this._updateBreakpointDecoration(decoration);
      if (!decorations.some(decoration => !!decoration.breakpoint))
        return;
      /** @type {!Set<number>} */
      var columns = new Set();
      for (var decoration of decorations) {
        var location = decoration.handle.resolve();
        if (!location)
          continue;
        columns.add(location.columnNumber);
      }
      for (var location of possibleLocations) {
        if (columns.has(location.columnNumber))
          continue;
        var handle = this.textEditor.textEditorPositionHandle(location.lineNumber, location.columnNumber);
        var decoration =
            new Sources.JavaScriptSourceFrame.BreakpointDecoration(this.textEditor, handle, '', false, null);
        decoration.element.addEventListener('click', this._inlineBreakpointClick.bind(this, decoration), true);
        decoration.element.addEventListener(
            'contextmenu', this._inlineBreakpointContextMenu.bind(this, decoration), true);
        this._breakpointDecorations.add(decoration);
        this._updateBreakpointDecoration(decoration);
      }
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _breakpointRemoved(event) {
    if (this._shouldIgnoreExternalBreakpointEvents(event))
      return;
    var uiLocation = /** @type {!Workspace.UILocation} */ (event.data.uiLocation);
    var breakpoint = /** @type {!Bindings.BreakpointManager.Breakpoint} */ (event.data.breakpoint);
    var decoration = this._decorationByBreakpoint.get(breakpoint);
    if (!decoration)
      return;
    this._decorationByBreakpoint.delete(breakpoint);

    decoration.breakpoint = null;
    decoration.enabled = false;

    var lineDecorations = this._lineBreakpointDecorations(uiLocation.lineNumber);
    if (!lineDecorations.some(decoration => !!decoration.breakpoint)) {
      for (var lineDecoration of lineDecorations) {
        this._breakpointDecorations.delete(lineDecoration);
        this._updateBreakpointDecoration(lineDecoration);
      }
    } else {
      this._updateBreakpointDecoration(decoration);
    }
  }

  /**
   * @override
   */
  onBindingChanged() {
    this._updateDebuggerSourceCode();
    this._updateScriptFiles();
    this._refreshBreakpoints();

    var canLiveCompileJavascript = this._scriptFileForDebuggerModel.size ||
        this._debuggerSourceCode.extension() === 'js' ||
        this._debuggerSourceCode.project().type() === Workspace.projectTypes.Snippets;
    if (!!canLiveCompileJavascript !== !!this._compiler)
      this._compiler = canLiveCompileJavascript ? new Sources.JavaScriptCompiler(this) : null;

    this._showBlackboxInfobarIfNeeded();
    this._updateLinesWithoutMappingHighlight();
  }

  _refreshBreakpoints() {
    if (!this.loaded)
      return;
    for (var lineDecoration of this._breakpointDecorations.valuesArray()) {
      this._breakpointDecorations.delete(lineDecoration);
      this._updateBreakpointDecoration(lineDecoration);
    }
    var breakpointLocations = this._breakpointManager.breakpointLocationsForUISourceCode(this._debuggerSourceCode);
    for (var breakpointLocation of breakpointLocations)
      this._addBreakpoint(breakpointLocation.uiLocation, breakpointLocation.breakpoint);
  }

  _updateDebuggerSourceCode() {
    var binding = Persistence.persistence.binding(this.uiSourceCode());
    this._debuggerSourceCode = binding ? binding.network : this.uiSourceCode();
  }

  _updateLinesWithoutMappingHighlight() {
    var isSourceMapSource = !!Bindings.CompilerScriptMapping.uiSourceCodeOrigin(this._debuggerSourceCode);
    if (!isSourceMapSource)
      return;
    var linesCount = this.textEditor.linesCount;
    for (var i = 0; i < linesCount; ++i) {
      var lineHasMapping = Bindings.CompilerScriptMapping.uiLineHasMapping(this._debuggerSourceCode, i);
      if (!lineHasMapping)
        this._hasLineWithoutMapping = true;
      if (this._hasLineWithoutMapping)
        this.textEditor.toggleLineClass(i, 'cm-line-without-source-mapping', !lineHasMapping);
    }
  }

  _updateScriptFiles() {
    for (var debuggerModel of SDK.targetManager.models(SDK.DebuggerModel)) {
      var scriptFile = Bindings.debuggerWorkspaceBinding.scriptFile(this._debuggerSourceCode, debuggerModel);
      if (scriptFile)
        this._updateScriptFile(debuggerModel);
    }
  }

  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  _updateScriptFile(debuggerModel) {
    var oldScriptFile = this._scriptFileForDebuggerModel.get(debuggerModel);
    var newScriptFile = Bindings.debuggerWorkspaceBinding.scriptFile(this._debuggerSourceCode, debuggerModel);
    this._scriptFileForDebuggerModel.delete(debuggerModel);
    if (oldScriptFile) {
      oldScriptFile.removeEventListener(Bindings.ResourceScriptFile.Events.DidMergeToVM, this._didMergeToVM, this);
      oldScriptFile.removeEventListener(
          Bindings.ResourceScriptFile.Events.DidDivergeFromVM, this._didDivergeFromVM, this);
      if (this._muted && !this.uiSourceCode().isDirty())
        this._restoreBreakpointsIfConsistentScripts();
    }
    if (!newScriptFile)
      return;
    this._scriptFileForDebuggerModel.set(debuggerModel, newScriptFile);
    newScriptFile.addEventListener(Bindings.ResourceScriptFile.Events.DidMergeToVM, this._didMergeToVM, this);
    newScriptFile.addEventListener(Bindings.ResourceScriptFile.Events.DidDivergeFromVM, this._didDivergeFromVM, this);
    if (this.loaded)
      newScriptFile.checkMapping();
    this._showSourceMapInfobar(newScriptFile.hasSourceMapURL());
  }

  /**
   * @param {boolean} show
   */
  _showSourceMapInfobar(show) {
    if (!show) {
      if (this._sourceMapInfobar) {
        this._sourceMapInfobar.dispose();
        delete this._sourceMapInfobar;
      }
      return;
    }
    if (this._sourceMapInfobar)
      return;
    this._sourceMapInfobar = UI.Infobar.create(
        UI.Infobar.Type.Info, Common.UIString('Source Map detected.'),
        Common.settings.createSetting('sourceMapInfobarDisabled', false));
    if (this._sourceMapInfobar) {
      this._sourceMapInfobar.createDetailsRowMessage(Common.UIString(
          'Associated files should be added to the file tree. You can debug these resolved source files as regular JavaScript files.'));
      this._sourceMapInfobar.createDetailsRowMessage(Common.UIString(
          'Associated files are available via file tree or %s.',
          UI.shortcutRegistry.shortcutTitleForAction('quickOpen.show')));
      this._sourceMapInfobar.setCloseCallback(() => delete this._sourceMapInfobar);
      this.attachInfobars([this._sourceMapInfobar]);
    }
  }

  /**
   * @override
   */
  onTextEditorContentSet() {
    super.onTextEditorContentSet();
    if (this._executionLocation)
      this.setExecutionLocation(this._executionLocation);

    var breakpointLocations = this._breakpointManager.breakpointLocationsForUISourceCode(this._debuggerSourceCode);
    for (var breakpointLocation of breakpointLocations)
      this._addBreakpoint(breakpointLocation.uiLocation, breakpointLocation.breakpoint);

    var scriptFiles = this._scriptFileForDebuggerModel.valuesArray();
    for (var i = 0; i < scriptFiles.length; ++i)
      scriptFiles[i].checkMapping();

    this._updateLinesWithoutMappingHighlight();
    this._detectMinified();
  }

  _detectMinified() {
    if (this._prettyPrintInfobar)
      return;

    if (!TextUtils.isMinified(/** @type {string} */ (this.uiSourceCode().content())))
      return;

    this._prettyPrintInfobar = UI.Infobar.create(
        UI.Infobar.Type.Info, Common.UIString('Pretty-print this minified file?'),
        Common.settings.createSetting('prettyPrintInfobarDisabled', false));
    if (!this._prettyPrintInfobar)
      return;

    this._prettyPrintInfobar.setCloseCallback(() => delete this._prettyPrintInfobar);
    var toolbar = new UI.Toolbar('');
    var button = new UI.ToolbarButton('', 'largeicon-pretty-print');
    toolbar.appendToolbarItem(button);
    toolbar.element.style.display = 'inline-block';
    toolbar.element.style.verticalAlign = 'middle';
    toolbar.element.style.marginBottom = '3px';
    toolbar.element.style.pointerEvents = 'none';
    var element = this._prettyPrintInfobar.createDetailsRowMessage();
    element.appendChild(UI.formatLocalized(
        'You can click the %s button on the bottom status bar, and continue debugging with the new formatted source.',
        [toolbar.element]));
    this.attachInfobars([this._prettyPrintInfobar]);
  }

  /**
   * @param {!Common.Event} event
   */
  _handleGutterClick(event) {
    if (this._muted)
      return;

    var eventData = /** @type {!SourceFrame.SourcesTextEditor.GutterClickEventData} */ (event.data);
    var lineNumber = eventData.lineNumber;
    var eventObject = eventData.event;

    if (eventObject.button !== 0 || eventObject.altKey || eventObject.ctrlKey || eventObject.metaKey)
      return;

    this._toggleBreakpoint(lineNumber, eventObject.shiftKey);
    eventObject.consume(true);
  }

  /**
   * @param {number} lineNumber
   * @param {boolean} onlyDisable
   */
  _toggleBreakpoint(lineNumber, onlyDisable) {
    var decorations = this._lineBreakpointDecorations(lineNumber);
    if (!decorations.length) {
      this._createNewBreakpoint(lineNumber, '', true);
      return;
    }
    var hasDisabled = this.textEditor.hasLineClass(lineNumber, 'cm-breakpoint-disabled');
    var breakpoints = decorations.map(decoration => decoration.breakpoint).filter(breakpoint => !!breakpoint);
    for (var breakpoint of breakpoints) {
      if (onlyDisable)
        breakpoint.setEnabled(hasDisabled);
      else
        breakpoint.remove();
    }
  }

  /**
   * @param {number} lineNumber
   * @param {string} condition
   * @param {boolean} enabled
   */
  _createNewBreakpoint(lineNumber, condition, enabled) {
    findPossibleBreakpoints.call(this, lineNumber)
        .then(checkNextLineIfNeeded.bind(this, lineNumber, 4))
        .then(setBreakpoint.bind(this, condition, enabled));

    /**
     * @this {!Sources.JavaScriptSourceFrame}
     * @param {number} lineNumber
     * @return {!Promise<?Array<!Workspace.UILocation>>}
     */
    function findPossibleBreakpoints(lineNumber) {
      const maxLengthToCheck = 1024;
      if (lineNumber >= this.textEditor.linesCount)
        return Promise.resolve(/** @type {?Array<!Workspace.UILocation>} */ ([]));
      var lineLength = this.textEditor.line(lineNumber).length;
      if (lineLength >= maxLengthToCheck)
        return Promise.resolve(/** @type {?Array<!Workspace.UILocation>} */ ([]));
      return this._breakpointManager
          .possibleBreakpoints(this._debuggerSourceCode, new TextUtils.TextRange(lineNumber, 0, lineNumber, lineLength))
          .then(locations => locations.length ? locations : null);
    }

    /**
     * @this {!Sources.JavaScriptSourceFrame}
     * @param {number} currentLineNumber
     * @param {number} linesToCheck
     * @param {?Array<!Workspace.UILocation>} locations
     * @return {!Promise<?Array<!Workspace.UILocation>>}
     */
    function checkNextLineIfNeeded(currentLineNumber, linesToCheck, locations) {
      if (locations || linesToCheck <= 0)
        return Promise.resolve(locations);
      return findPossibleBreakpoints.call(this, currentLineNumber + 1)
          .then(checkNextLineIfNeeded.bind(this, currentLineNumber + 1, linesToCheck - 1));
    }

    /**
     * @this {!Sources.JavaScriptSourceFrame}
     * @param {string} condition
     * @param {boolean} enabled
     * @param {?Array<!Workspace.UILocation>} locations
     */
    function setBreakpoint(condition, enabled, locations) {
      if (!locations || !locations.length)
        this._setBreakpoint(lineNumber, 0, condition, enabled);
      else
        this._setBreakpoint(locations[0].lineNumber, locations[0].columnNumber, condition, enabled);
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.ScriptsBreakpointSet);
    }
  }

  /**
   * @param {boolean} onlyDisable
   */
  toggleBreakpointOnCurrentLine(onlyDisable) {
    if (this._muted)
      return;

    var selection = this.textEditor.selection();
    if (!selection)
      return;
    this._toggleBreakpoint(selection.startLine, onlyDisable);
  }

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @param {string} condition
   * @param {boolean} enabled
   */
  _setBreakpoint(lineNumber, columnNumber, condition, enabled) {
    if (!Bindings.CompilerScriptMapping.uiLineHasMapping(this._debuggerSourceCode, lineNumber))
      return;

    this._breakpointManager.setBreakpoint(this._debuggerSourceCode, lineNumber, columnNumber, condition, enabled);
    this._breakpointWasSetForTest(lineNumber, columnNumber, condition, enabled);
  }

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @param {string} condition
   * @param {boolean} enabled
   */
  _breakpointWasSetForTest(lineNumber, columnNumber, condition, enabled) {
  }

  /**
   * @override
   */
  dispose() {
    this._breakpointManager.removeEventListener(
        Bindings.BreakpointManager.Events.BreakpointAdded, this._breakpointAdded, this);
    this._breakpointManager.removeEventListener(
        Bindings.BreakpointManager.Events.BreakpointRemoved, this._breakpointRemoved, this);
    this.uiSourceCode().removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this._workingCopyChanged, this);
    this.uiSourceCode().removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._workingCopyCommitted, this);
    this.uiSourceCode().removeEventListener(
        Workspace.UISourceCode.Events.TitleChanged, this._showBlackboxInfobarIfNeeded, this);

    Common.moduleSetting('skipStackFramesPattern').removeChangeListener(this._showBlackboxInfobarIfNeeded, this);
    Common.moduleSetting('skipContentScripts').removeChangeListener(this._showBlackboxInfobarIfNeeded, this);
    super.dispose();
  }
};

/**
 * @unrestricted
 */
Sources.JavaScriptSourceFrame.BreakpointDecoration = class {
  /**
   * @param {!TextEditor.CodeMirrorTextEditor} textEditor
   * @param {!TextEditor.TextEditorPositionHandle} handle
   * @param {string} condition
   * @param {boolean} enabled
   * @param {?Bindings.BreakpointManager.Breakpoint} breakpoint
   */
  constructor(textEditor, handle, condition, enabled, breakpoint) {
    this.textEditor = textEditor;
    this.handle = handle;
    this.condition = condition;
    this.enabled = enabled;
    this.breakpoint = breakpoint;
    this.element = UI.Icon.create('smallicon-inline-breakpoint');
    this.element.classList.toggle('cm-inline-breakpoint', true);

    /** @type {?TextEditor.TextEditorBookMark} */
    this.bookmark = null;
  }

  /**
   * @param {!Sources.JavaScriptSourceFrame.BreakpointDecoration} decoration1
   * @param {!Sources.JavaScriptSourceFrame.BreakpointDecoration} decoration2
   * @return {number}
   */
  static mostSpecificFirst(decoration1, decoration2) {
    if (decoration1.enabled !== decoration2.enabled)
      return decoration1.enabled ? -1 : 1;
    if (!!decoration1.condition !== !!decoration2.condition)
      return !!decoration1.condition ? -1 : 1;
    return 0;
  }

  update() {
    if (!!this.condition)
      this.element.setIconType('smallicon-inline-breakpoint');
    else
      this.element.setIconType('smallicon-inline-breakpoint-conditional');
    this.element.classList.toggle('cm-inline-disabled', !this.enabled);
  }

  show() {
    if (this.bookmark)
      return;
    var location = this.handle.resolve();
    if (!location)
      return;
    this.bookmark = this.textEditor.addBookmark(
        location.lineNumber, location.columnNumber, this.element,
        Sources.JavaScriptSourceFrame.BreakpointDecoration.bookmarkSymbol);
    this.bookmark[Sources.JavaScriptSourceFrame.BreakpointDecoration._elementSymbolForTest] = this.element;
  }

  hide() {
    if (!this.bookmark)
      return;
    this.bookmark.clear();
    this.bookmark = null;
  }
};

Sources.JavaScriptSourceFrame.BreakpointDecoration.bookmarkSymbol = Symbol('bookmark');
Sources.JavaScriptSourceFrame.BreakpointDecoration._elementSymbolForTest = Symbol('element');

Sources.JavaScriptSourceFrame.continueToLocationDecorationSymbol = Symbol('bookmark');