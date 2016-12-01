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
Sources.JavaScriptSourceFrame = class extends Sources.UISourceCodeFrame {
  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  constructor(uiSourceCode) {
    super(uiSourceCode);

    this._scriptsPanel = Sources.SourcesPanel.instance();
    this._breakpointManager = Bindings.breakpointManager;
    if (uiSourceCode.project().type() === Workspace.projectTypes.Debugger)
      this.element.classList.add('source-frame-debugger-script');

    this._popoverHelper = new Components.ObjectPopoverHelper(
        this._scriptsPanel.element, this._getPopoverAnchor.bind(this), this._resolveObjectForPopover.bind(this),
        this._onHidePopover.bind(this), true);
    this._popoverHelper.setTimeout(250, 250);

    this.textEditor.element.addEventListener('keydown', this._onKeyDown.bind(this), true);

    this.textEditor.addEventListener(
        SourceFrame.SourcesTextEditor.Events.GutterClick, this._handleGutterClick.bind(this), this);

    this._breakpointManager.addEventListener(
        Bindings.BreakpointManager.Events.BreakpointAdded, this._breakpointAdded, this);
    this._breakpointManager.addEventListener(
        Bindings.BreakpointManager.Events.BreakpointRemoved, this._breakpointRemoved, this);

    this.uiSourceCode().addEventListener(
        Workspace.UISourceCode.Events.SourceMappingChanged, this._onSourceMappingChanged, this);
    this.uiSourceCode().addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this._workingCopyChanged, this);
    this.uiSourceCode().addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._workingCopyCommitted, this);
    this.uiSourceCode().addEventListener(
        Workspace.UISourceCode.Events.TitleChanged, this._showBlackboxInfobarIfNeeded, this);

    /** @type {!Set<!Sources.JavaScriptSourceFrame.BreakpointDecoration>} */
    this._breakpointDecorations = new Set();

    /** @type {!Map.<!SDK.Target, !Bindings.ResourceScriptFile>}*/
    this._scriptFileForTarget = new Map();
    var targets = SDK.targetManager.targets();
    for (var i = 0; i < targets.length; ++i) {
      var scriptFile = Bindings.debuggerWorkspaceBinding.scriptFile(uiSourceCode, targets[i]);
      if (scriptFile)
        this._updateScriptFile(targets[i]);
    }

    if (this._scriptFileForTarget.size || uiSourceCode.extension() === 'js' ||
        uiSourceCode.project().type() === Workspace.projectTypes.Snippets)
      this._compiler = new Sources.JavaScriptCompiler(this);

    Common.moduleSetting('skipStackFramesPattern').addChangeListener(this._showBlackboxInfobarIfNeeded, this);
    Common.moduleSetting('skipContentScripts').addChangeListener(this._showBlackboxInfobarIfNeeded, this);
    this._showBlackboxInfobarIfNeeded();
    /** @type {!Map.<number, !Element>} */
    this._valueWidgets = new Map();
  }

  /**
   * @override
   * @return {!Array<!UI.ToolbarItem>}
   */
  syncToolbarItems() {
    var result = super.syncToolbarItems();
    var originURL = Bindings.CompilerScriptMapping.uiSourceCodeOrigin(this.uiSourceCode());
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
    var uiSourceCode = this.uiSourceCode();
    if (!uiSourceCode.contentType().hasScripts())
      return;
    var projectType = uiSourceCode.project().type();
    if (projectType === Workspace.projectTypes.Snippets)
      return;
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

    var scriptFile = this._scriptFileForTarget.size ? this._scriptFileForTarget.valuesArray()[0] : null;
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
      setImmediate(this._generateValuesInSource.bind(this));
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
    for (var decoration of this._breakpointDecorations)
      decoration.breakpoint.remove();
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
      var uiLocation = new Workspace.UILocation(this.uiSourceCode(), lineNumber, 0);
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
      if (this.uiSourceCode().project().type() === Workspace.projectTypes.Network &&
          Common.moduleSetting('jsSourceMapsEnabled').get() &&
          !Bindings.blackboxManager.isBlackboxedUISourceCode(this.uiSourceCode())) {
        if (this._scriptFileForTarget.size) {
          var scriptFile = this._scriptFileForTarget.valuesArray()[0];
          var addSourceMapURLLabel = Common.UIString.capitalize('Add ^source ^map\u2026');
          contextMenu.appendItem(addSourceMapURLLabel, addSourceMapURL.bind(null, scriptFile));
          contextMenu.appendSeparator();
        }
      }
    }

    return super.populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber)
        .then(populateSourceMapMembers.bind(this));
  }

  _workingCopyChanged(event) {
    if (this._supportsEnabledBreakpointsWhileEditing() || this._scriptFileForTarget.size)
      return;

    if (this.uiSourceCode().isDirty())
      this._muteBreakpointsWhileEditing();
    else
      this._restoreBreakpointsAfterEditing();
  }

  _workingCopyCommitted(event) {
    this._scriptsPanel.updateLastModificationTime();
    if (this._supportsEnabledBreakpointsWhileEditing())
      return;

    if (!this._scriptFileForTarget.size)
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
    var scriptFiles = this._scriptFileForTarget.valuesArray();
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
    this._textEditor.operation(() => decorations.map(decoration => decoration.hide()));
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

  _getPopoverAnchor(element, event) {
    var target = UI.context.flavor(SDK.Target);
    var debuggerModel = SDK.DebuggerModel.fromTarget(target);
    if (!debuggerModel || !debuggerModel.isPaused())
      return;

    var textPosition = this.textEditor.coordinatesToCursorPosition(event.x, event.y);
    if (!textPosition)
      return;
    var mouseLine = textPosition.startLine;
    var mouseColumn = textPosition.startColumn;
    var textSelection = this.textEditor.selection().normalize();
    if (textSelection && !textSelection.isEmpty()) {
      if (textSelection.startLine !== textSelection.endLine || textSelection.startLine !== mouseLine ||
          mouseColumn < textSelection.startColumn || mouseColumn > textSelection.endColumn)
        return;

      var leftCorner = this.textEditor.cursorPositionToCoordinates(textSelection.startLine, textSelection.startColumn);
      var rightCorner = this.textEditor.cursorPositionToCoordinates(textSelection.endLine, textSelection.endColumn);
      var anchorBox = new AnchorBox(leftCorner.x, leftCorner.y, rightCorner.x - leftCorner.x, leftCorner.height);
      anchorBox.highlight = {
        lineNumber: textSelection.startLine,
        startColumn: textSelection.startColumn,
        endColumn: textSelection.endColumn - 1
      };
      anchorBox.forSelection = true;
      return anchorBox;
    }

    var token = this.textEditor.tokenAtTextPosition(textPosition.startLine, textPosition.startColumn);
    if (!token || !token.type)
      return;
    var lineNumber = textPosition.startLine;
    var line = this.textEditor.line(lineNumber);
    var tokenContent = line.substring(token.startColumn, token.endColumn);

    var isIdentifier = this._isIdentifier(token.type);
    if (!isIdentifier && (token.type !== 'js-keyword' || tokenContent !== 'this'))
      return;

    var leftCorner = this.textEditor.cursorPositionToCoordinates(lineNumber, token.startColumn);
    var rightCorner = this.textEditor.cursorPositionToCoordinates(lineNumber, token.endColumn - 1);
    var anchorBox = new AnchorBox(leftCorner.x, leftCorner.y, rightCorner.x - leftCorner.x, leftCorner.height);

    anchorBox.highlight = {lineNumber: lineNumber, startColumn: token.startColumn, endColumn: token.endColumn - 1};

    return anchorBox;
  }

  _resolveObjectForPopover(anchorBox, showCallback, objectGroupName) {
    var target = UI.context.flavor(SDK.Target);
    var selectedCallFrame = UI.context.flavor(SDK.DebuggerModel.CallFrame);
    if (!selectedCallFrame) {
      this._popoverHelper.hidePopover();
      return;
    }
    var lineNumber = anchorBox.highlight.lineNumber;
    var startHighlight = anchorBox.highlight.startColumn;
    var endHighlight = anchorBox.highlight.endColumn;
    var line = this.textEditor.line(lineNumber);
    if (!anchorBox.forSelection) {
      while (startHighlight > 1 && line.charAt(startHighlight - 1) === '.') {
        var token = this.textEditor.tokenAtTextPosition(lineNumber, startHighlight - 2);
        if (!token || !token.type) {
          this._popoverHelper.hidePopover();
          return;
        }
        startHighlight = token.startColumn;
      }
    }
    var evaluationText = line.substring(startHighlight, endHighlight + 1);
    Sources.SourceMapNamesResolver
        .resolveExpression(
            selectedCallFrame, evaluationText, this.uiSourceCode(), lineNumber, startHighlight, endHighlight)
        .then(onResolve.bind(this));

    /**
     * @param {?string=} text
     * @this {Sources.JavaScriptSourceFrame}
     */
    function onResolve(text) {
      selectedCallFrame.evaluate(
          text || evaluationText, objectGroupName, false, true, false, false, showObjectPopover.bind(this));
    }

    /**
     * @param {?Protocol.Runtime.RemoteObject} result
     * @param {!Protocol.Runtime.ExceptionDetails=} exceptionDetails
     * @this {Sources.JavaScriptSourceFrame}
     */
    function showObjectPopover(result, exceptionDetails) {
      var target = UI.context.flavor(SDK.Target);
      var potentiallyUpdatedCallFrame = UI.context.flavor(SDK.DebuggerModel.CallFrame);
      if (selectedCallFrame !== potentiallyUpdatedCallFrame || !result) {
        this._popoverHelper.hidePopover();
        return;
      }
      this._popoverAnchorBox = anchorBox;
      showCallback(target.runtimeModel.createRemoteObject(result), !!exceptionDetails, this._popoverAnchorBox);
      // Popover may have been removed by showCallback().
      if (this._popoverAnchorBox) {
        var highlightRange = new Common.TextRange(lineNumber, startHighlight, lineNumber, endHighlight);
        this._popoverAnchorBox._highlightDescriptor =
            this.textEditor.highlightRange(highlightRange, 'source-frame-eval-expression');
      }
    }
  }

  _onHidePopover() {
    if (!this._popoverAnchorBox)
      return;
    if (this._popoverAnchorBox._highlightDescriptor)
      this.textEditor.removeHighlight(this._popoverAnchorBox._highlightDescriptor);
    delete this._popoverAnchorBox;
  }

  _onKeyDown(event) {
    if (event.key === 'Escape') {
      if (this._popoverHelper.isPopoverVisible()) {
        this._popoverHelper.hidePopover();
        event.consume();
      }
    }
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

    var editorElement = conditionElement.createChild('input', 'monospace');
    editorElement.id = 'source-frame-breakpoint-condition';
    editorElement.type = 'text';
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
      setImmediate(this._generateValuesInSource.bind(this));
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
          .getAllProperties(false, this._prepareScopeVariables.bind(this, callFrame));
    }

    if (this._clearValueWidgetsTimer) {
      clearTimeout(this._clearValueWidgetsTimer);
      delete this._clearValueWidgetsTimer;
    }
  }

  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @param {?Array.<!SDK.RemoteObjectProperty>} properties
   * @param {?Array.<!SDK.RemoteObjectProperty>} internalProperties
   */
  _prepareScopeVariables(callFrame, properties, internalProperties) {
    if (!properties || !properties.length || properties.length > 500) {
      this._clearValueWidgets();
      return;
    }

    var functionUILocation = Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(
        /** @type {!SDK.DebuggerModel.Location} */ (callFrame.functionLocation()));
    var executionUILocation = Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(callFrame.location());
    if (functionUILocation.uiSourceCode !== this.uiSourceCode() ||
        executionUILocation.uiSourceCode !== this.uiSourceCode()) {
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
    var formatter = new Components.RemoteObjectPreviewFormatter();
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
        if (value.preview && propertyCount + entryCount < 10)
          formatter.appendObjectPreview(nameValuePair, value.preview);
        else
          nameValuePair.appendChild(Components.ObjectPropertiesSection.createValueElement(value, false));
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
    if (this.loaded && this._executionLocation)
      this.textEditor.clearExecutionLine();
    delete this._executionLocation;
    this._clearValueWidgetsTimer = setTimeout(this._clearValueWidgets.bind(this), 1000);
  }

  _clearValueWidgets() {
    delete this._clearValueWidgetsTimer;
    for (var line of this._valueWidgets.keys())
      this.textEditor.removeDecoration(this._valueWidgets.get(line), line);
    this._valueWidgets.clear();
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
      for (var lineNumber of lineNumbers) {
        this.textEditor.toggleLineClass(lineNumber, 'cm-breakpoint', false);
        this.textEditor.toggleLineClass(lineNumber, 'cm-breakpoint-disabled', false);
        this.textEditor.toggleLineClass(lineNumber, 'cm-breakpoint-conditional', false);

        var decorations = this._lineBreakpointDecorations(lineNumber);
        var actualBookmarks =
            new Set(decorations.map(decoration => decoration.bookmark).filter(bookmark => !!bookmark));
        var lineEnd = this._textEditor.line(lineNumber).length;
        var bookmarks = this._textEditor.bookmarks(
            new Common.TextRange(lineNumber, 0, lineNumber, lineEnd),
            Sources.JavaScriptSourceFrame.BreakpointDecoration.bookmarkSymbol);
        for (var bookmark of bookmarks) {
          if (!actualBookmarks.has(bookmark))
            bookmark.clear();
        }
        if (!decorations.length)
          continue;
        decorations.sort(Sources.JavaScriptSourceFrame.BreakpointDecoration.mostSpecificFirst);
        this.textEditor.toggleLineClass(lineNumber, 'cm-breakpoint', true);
        this.textEditor.toggleLineClass(lineNumber, 'cm-breakpoint-disabled', !decorations[0].enabled || this._muted);
        this.textEditor.toggleLineClass(lineNumber, 'cm-breakpoint-conditional', !!decorations[0].condition);
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
      this._breakpointDecorationsUpdatedForTest();
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
    if (uiLocation.uiSourceCode !== this.uiSourceCode() || !this.loaded)
      return true;
    if (this._supportsEnabledBreakpointsWhileEditing())
      return false;
    if (this._muted)
      return true;
    var scriptFiles = this._scriptFileForTarget.valuesArray();
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
    var lineDecorations = this._lineBreakpointDecorations(uiLocation.lineNumber);
    var breakpoint = /** @type {!Bindings.BreakpointManager.Breakpoint} */ (event.data.breakpoint);

    var decoration = this._breakpointDecoration(uiLocation.lineNumber, uiLocation.columnNumber);
    if (decoration) {
      decoration.breakpoint = breakpoint;
      decoration.condition = breakpoint.condition();
      decoration.enabled = breakpoint.enabled();
    } else {
      var handle = this._textEditor.textEditorPositionHandle(uiLocation.lineNumber, uiLocation.columnNumber);
      decoration = new Sources.JavaScriptSourceFrame.BreakpointDecoration(
          this._textEditor, handle, breakpoint.condition(), breakpoint.enabled(), breakpoint);
      decoration.element.addEventListener('click', this._inlineBreakpointClick.bind(this, decoration), true);
      decoration.element.addEventListener(
          'contextmenu', this._inlineBreakpointContextMenu.bind(this, decoration), true);
      this._breakpointDecorations.add(decoration);
    }
    breakpoint[Sources.JavaScriptSourceFrame.BreakpointDecoration._decorationSymbol] = decoration;
    this._updateBreakpointDecoration(decoration);
    if (!lineDecorations.length && Runtime.experiments.isEnabled('inlineBreakpoints')) {
      this._willAddInlineDecorationsForTest();
      this._breakpointManager
          .possibleBreakpoints(
              this.uiSourceCode(), new Common.TextRange(uiLocation.lineNumber, 0, uiLocation.lineNumber + 1, 0))
          .then(addInlineDecorations.bind(this, uiLocation.lineNumber));
    }

    /**
     * @this {Sources.JavaScriptSourceFrame}
     * @param {number} lineNumber
     * @param {!Array<!Workspace.UILocation>} possibleLocations
     */
    function addInlineDecorations(lineNumber, possibleLocations) {
      var decorations = this._lineBreakpointDecorations(lineNumber);
      if (!decorations.some(decoration => !!decoration.breakpoint)) {
        this._didAddInlineDecorationsForTest(false);
        return;
      }
      /** @type {!Set<number>} */
      var columns = new Set();
      for (var decoration of decorations) {
        var location = decoration.handle.resolve();
        if (!location)
          continue;
        columns.add(location.columnNumber);
      }
      var updateWasScheduled = false;
      for (var location of possibleLocations) {
        if (columns.has(location.columnNumber))
          continue;
        var handle = this._textEditor.textEditorPositionHandle(location.lineNumber, location.columnNumber);
        var decoration =
            new Sources.JavaScriptSourceFrame.BreakpointDecoration(this._textEditor, handle, '', false, null);
        decoration.element.addEventListener('click', this._inlineBreakpointClick.bind(this, decoration), true);
        decoration.element.addEventListener(
            'contextmenu', this._inlineBreakpointContextMenu.bind(this, decoration), true);
        this._breakpointDecorations.add(decoration);
        updateWasScheduled = true;
        this._updateBreakpointDecoration(decoration);
      }
      this._didAddInlineDecorationsForTest(updateWasScheduled);
    }
  }

  _willAddInlineDecorationsForTest() {
  }

  /**
   * @param {boolean} updateWasScheduled
   */
  _didAddInlineDecorationsForTest(updateWasScheduled) {
  }

  /**
   * @param {!Common.Event} event
   */
  _breakpointRemoved(event) {
    if (this._shouldIgnoreExternalBreakpointEvents(event))
      return;
    var uiLocation = /** @type {!Workspace.UILocation} */ (event.data.uiLocation);
    var breakpoint = /** @type {!Bindings.BreakpointManager.Breakpoint} */ (event.data.breakpoint);
    var decoration = breakpoint[Sources.JavaScriptSourceFrame.BreakpointDecoration._decorationSymbol];
    if (!decoration)
      return;
    delete breakpoint[Sources.JavaScriptSourceFrame.BreakpointDecoration._decorationSymbol];

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
   * @param {!Common.Event} event
   */
  _onSourceMappingChanged(event) {
    var data = /** @type {{target: !SDK.Target}} */ (event.data);
    this._updateScriptFile(data.target);
    this._updateLinesWithoutMappingHighlight();
  }

  _updateLinesWithoutMappingHighlight() {
    var linesCount = this.textEditor.linesCount;
    for (var i = 0; i < linesCount; ++i) {
      var lineHasMapping = Bindings.debuggerWorkspaceBinding.uiLineHasMapping(this.uiSourceCode(), i);
      if (!lineHasMapping)
        this._hasLineWithoutMapping = true;
      if (this._hasLineWithoutMapping)
        this.textEditor.toggleLineClass(i, 'cm-line-without-source-mapping', !lineHasMapping);
    }
  }

  /**
   * @param {!SDK.Target} target
   */
  _updateScriptFile(target) {
    var oldScriptFile = this._scriptFileForTarget.get(target);
    var newScriptFile = Bindings.debuggerWorkspaceBinding.scriptFile(this.uiSourceCode(), target);
    this._scriptFileForTarget.remove(target);
    if (oldScriptFile) {
      oldScriptFile.removeEventListener(Bindings.ResourceScriptFile.Events.DidMergeToVM, this._didMergeToVM, this);
      oldScriptFile.removeEventListener(
          Bindings.ResourceScriptFile.Events.DidDivergeFromVM, this._didDivergeFromVM, this);
      if (this._muted && !this.uiSourceCode().isDirty())
        this._restoreBreakpointsIfConsistentScripts();
    }
    if (newScriptFile)
      this._scriptFileForTarget.set(target, newScriptFile);

    if (newScriptFile) {
      newScriptFile.addEventListener(Bindings.ResourceScriptFile.Events.DidMergeToVM, this._didMergeToVM, this);
      newScriptFile.addEventListener(Bindings.ResourceScriptFile.Events.DidDivergeFromVM, this._didDivergeFromVM, this);
      if (this.loaded)
        newScriptFile.checkMapping();
      if (newScriptFile.hasSourceMapURL()) {
        var sourceMapInfobar = UI.Infobar.create(
            UI.Infobar.Type.Info, Common.UIString('Source Map detected.'),
            Common.settings.createSetting('sourceMapInfobarDisabled', false));
        if (sourceMapInfobar) {
          sourceMapInfobar.createDetailsRowMessage(Common.UIString(
              'Associated files should be added to the file tree. You can debug these resolved source files as regular JavaScript files.'));
          sourceMapInfobar.createDetailsRowMessage(Common.UIString(
              'Associated files are available via file tree or %s.',
              UI.shortcutRegistry.shortcutTitleForAction('sources.go-to-source')));
          this.attachInfobars([sourceMapInfobar]);
        }
      }
    }
  }

  /**
   * @override
   */
  onTextEditorContentSet() {
    super.onTextEditorContentSet();
    if (this._executionLocation)
      this.setExecutionLocation(this._executionLocation);

    var breakpointLocations = this._breakpointManager.breakpointLocationsForUISourceCode(this.uiSourceCode());
    for (var i = 0; i < breakpointLocations.length; ++i)
      this._breakpointAdded(/** @type {!Common.Event} */ ({data: breakpointLocations[i]}));

    var scriptFiles = this._scriptFileForTarget.valuesArray();
    for (var i = 0; i < scriptFiles.length; ++i)
      scriptFiles[i].checkMapping();

    this._updateLinesWithoutMappingHighlight();
    this._detectMinified();
  }

  _detectMinified() {
    if (this._prettyPrintInfobar)
      return;

    var minified = false;
    for (var i = 0; i < 10 && i < this.textEditor.linesCount; ++i) {
      var line = this.textEditor.line(i);
      if (line.startsWith('//#'))  // mind source map.
        continue;
      if (line.length > 500) {
        minified = true;
        break;
      }
    }
    if (!minified)
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
    var hasDisabled = this._textEditor.hasLineClass(lineNumber, 'cm-breakpoint-disabled');
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
      if (lineNumber >= this._textEditor.linesCount)
        return Promise.resolve(/** @type {?Array<!Workspace.UILocation>} */ ([]));
      if (this._textEditor.line(lineNumber).length >= maxLengthToCheck)
        return Promise.resolve(/** @type {?Array<!Workspace.UILocation>} */ ([]));
      return this._breakpointManager
          .possibleBreakpoints(this.uiSourceCode(), new Common.TextRange(lineNumber, 0, lineNumber + 1, 0))
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

  toggleBreakpointOnCurrentLine() {
    if (this._muted)
      return;

    var selection = this.textEditor.selection();
    if (!selection)
      return;
    this._toggleBreakpoint(selection.startLine, false);
  }

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @param {string} condition
   * @param {boolean} enabled
   */
  _setBreakpoint(lineNumber, columnNumber, condition, enabled) {
    if (!Bindings.debuggerWorkspaceBinding.uiLineHasMapping(this.uiSourceCode(), lineNumber))
      return;

    this._breakpointManager.setBreakpoint(this.uiSourceCode(), lineNumber, columnNumber, condition, enabled);
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
        Workspace.UISourceCode.Events.SourceMappingChanged, this._onSourceMappingChanged, this);
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
    this._textEditor = textEditor;
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
    if (this.bookmark || !Runtime.experiments.isEnabled('inlineBreakpoints'))
      return;
    var location = this.handle.resolve();
    if (!location)
      return;
    this.bookmark = this._textEditor.addBookmark(
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

Sources.JavaScriptSourceFrame.BreakpointDecoration._decorationSymbol = Symbol('decoration');
Sources.JavaScriptSourceFrame.BreakpointDecoration.bookmarkSymbol = Symbol('bookmark');
Sources.JavaScriptSourceFrame.BreakpointDecoration._elementSymbolForTest = Symbol('element');
