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

  _updateInfobars() {
    this.attachInfobars([this._blackboxInfobar, this._divergedInfobar]);
  }

  _showDivergedInfobar() {
    if (!this.uiSourceCode().contentType().isScript())
      return;

    if (this._divergedInfobar)
      this._divergedInfobar.dispose();

    var infobar = new UI.Infobar(UI.Infobar.Type.Warning, Common.UIString('Workspace mapping mismatch'));
    this._divergedInfobar = infobar;

    var fileURL = this.uiSourceCode().url();
    infobar.createDetailsRowMessage(Common.UIString('The content of this file on the file system:\u00a0'))
        .appendChild(UI.createExternalLink(fileURL, undefined, 'source-frame-infobar-details-url'));

    var scriptURL = this.uiSourceCode().url();
    infobar.createDetailsRowMessage(Common.UIString('does not match the loaded script:\u00a0'))
        .appendChild(UI.createExternalLink(scriptURL, undefined, 'source-frame-infobar-details-url'));

    infobar.createDetailsRowMessage();
    infobar.createDetailsRowMessage(Common.UIString('Possible solutions are:'));

    if (Common.moduleSetting('cacheDisabled').get()) {
      infobar.createDetailsRowMessage(' - ').createTextChild(Common.UIString('Reload inspected page'));
    } else {
      infobar.createDetailsRowMessage(' - ').createTextChild(Common.UIString(
          'Check "Disable cache" in settings and reload inspected page (recommended setup for authoring and debugging)'));
    }
    infobar.createDetailsRowMessage(' - ').createTextChild(Common.UIString(
        'Check that your file and script are both loaded from the correct source and their contents match'));

    this._updateInfobars();
  }

  _hideDivergedInfobar() {
    if (!this._divergedInfobar)
      return;
    this._divergedInfobar.dispose();
    delete this._divergedInfobar;
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

    this._updateInfobars();
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
    this._removeAllBreakpoints();
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
      var breakpoints = this._breakpointManager.findBreakpoints(this.uiSourceCode(), lineNumber);
      if (!breakpoints.length) {
        // This row doesn't have a breakpoint: We want to show Add Breakpoint and Add and Edit Breakpoint.
        contextMenu.appendItem(
            Common.UIString('Add breakpoint'), this._createNewBreakpoint.bind(this, lineNumber, '', true));
        contextMenu.appendItem(
            Common.UIString('Add conditional breakpoint…'), this._editBreakpointCondition.bind(this, lineNumber));
        contextMenu.appendItem(
            Common.UIString('Never pause here'), this._createNewBreakpoint.bind(this, lineNumber, 'false', true));
      } else {
        var breakpoint = breakpoints[0];

        // This row has a breakpoint, we want to show edit and remove breakpoint, and either disable or enable.
        contextMenu.appendItem(Common.UIString('Remove breakpoint'), breakpoint.remove.bind(breakpoint));
        contextMenu.appendItem(
            Common.UIString('Edit breakpoint…'), this._editBreakpointCondition.bind(this, lineNumber, breakpoint));
        if (breakpoint.enabled())
          contextMenu.appendItem(Common.UIString('Disable breakpoint'), breakpoint.setEnabled.bind(breakpoint, false));
        else
          contextMenu.appendItem(Common.UIString('Enable breakpoint'), breakpoint.setEnabled.bind(breakpoint, true));
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
    this._updateDivergedInfobar();
    this._restoreBreakpointsIfConsistentScripts();
  }

  _didDivergeFromVM() {
    if (this._supportsEnabledBreakpointsWhileEditing())
      return;
    this._updateDivergedInfobar();
    this._muteBreakpointsWhileEditing();
  }

  _muteBreakpointsWhileEditing() {
    if (this._muted)
      return;
    for (var lineNumber = 0; lineNumber < this._textEditor.linesCount; ++lineNumber) {
      var breakpointDecoration = this._textEditor.getAttribute(lineNumber, 'breakpoint');
      if (!breakpointDecoration)
        continue;
      this._removeBreakpointDecoration(lineNumber);
      this._addBreakpointDecoration(
          lineNumber, breakpointDecoration.columnNumber, breakpointDecoration.condition, breakpointDecoration.enabled,
          true);
    }
    this._muted = true;
  }

  _updateDivergedInfobar() {
    if (this.uiSourceCode().project().type() !== Workspace.projectTypes.FileSystem) {
      this._hideDivergedInfobar();
      return;
    }

    var scriptFiles = this._scriptFileForTarget.valuesArray();
    var hasDivergedScript = false;
    for (var i = 0; i < scriptFiles.length; ++i)
      hasDivergedScript = hasDivergedScript || scriptFiles[i].hasDivergedFromVM();

    if (this._divergedInfobar) {
      if (!hasDivergedScript)
        this._hideDivergedInfobar();
    } else {
      if (hasDivergedScript && !this.uiSourceCode().isDirty())
        this._showDivergedInfobar();
    }
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
    var breakpoints = {};
    // Save and remove muted breakpoint decorations.
    for (var lineNumber = 0; lineNumber < this._textEditor.linesCount; ++lineNumber) {
      var breakpointDecoration = this._textEditor.getAttribute(lineNumber, 'breakpoint');
      if (breakpointDecoration) {
        breakpoints[lineNumber] = breakpointDecoration;
        this._removeBreakpointDecoration(lineNumber);
      }
    }

    // Remove all breakpoints.
    this._removeAllBreakpoints();

    // Restore all breakpoints from saved decorations.
    for (var lineNumberString in breakpoints) {
      var lineNumber = parseInt(lineNumberString, 10);
      if (isNaN(lineNumber))
        continue;
      var breakpointDecoration = breakpoints[lineNumberString];
      this._setBreakpoint(
          lineNumber, breakpointDecoration.columnNumber, breakpointDecoration.condition, breakpointDecoration.enabled);
    }
  }

  _removeAllBreakpoints() {
    var breakpoints = this._breakpointManager.breakpointsForUISourceCode(this.uiSourceCode());
    for (var i = 0; i < breakpoints.length; ++i)
      breakpoints[i].remove();
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

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @param {string} condition
   * @param {boolean} enabled
   * @param {boolean} mutedWhileEditing
   */
  _addBreakpointDecoration(lineNumber, columnNumber, condition, enabled, mutedWhileEditing) {
    var breakpoint = {condition: condition, enabled: enabled, columnNumber: columnNumber};

    this.textEditor.setAttribute(lineNumber, 'breakpoint', breakpoint);

    var disabled = !enabled || mutedWhileEditing;
    this.textEditor.addBreakpoint(lineNumber, disabled, !!condition);
  }

  _removeBreakpointDecoration(lineNumber) {
    this.textEditor.removeAttribute(lineNumber, 'breakpoint');
    this.textEditor.removeBreakpoint(lineNumber);
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
   * @param {!Bindings.BreakpointManager.Breakpoint=} breakpoint
   */
  _editBreakpointCondition(lineNumber, breakpoint) {
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
   * @return {boolean}
   */
  _shouldIgnoreExternalBreakpointEvents() {
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

  _breakpointAdded(event) {
    var uiLocation = /** @type {!Workspace.UILocation} */ (event.data.uiLocation);
    if (uiLocation.uiSourceCode !== this.uiSourceCode())
      return;
    if (this._shouldIgnoreExternalBreakpointEvents())
      return;

    var breakpoint = /** @type {!Bindings.BreakpointManager.Breakpoint} */ (event.data.breakpoint);
    if (this.loaded) {
      this._addBreakpointDecoration(
          uiLocation.lineNumber, uiLocation.columnNumber, breakpoint.condition(), breakpoint.enabled(), false);
    }
  }

  _breakpointRemoved(event) {
    var uiLocation = /** @type {!Workspace.UILocation} */ (event.data.uiLocation);
    if (uiLocation.uiSourceCode !== this.uiSourceCode())
      return;
    if (this._shouldIgnoreExternalBreakpointEvents())
      return;

    var remainingBreakpoints = this._breakpointManager.findBreakpoints(this.uiSourceCode(), uiLocation.lineNumber);
    if (!remainingBreakpoints.length && this.loaded)
      this._removeBreakpointDecoration(uiLocation.lineNumber);
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

    this._updateDivergedInfobar();

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
      this._breakpointAdded({data: breakpointLocations[i]});

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
    var breakpoints = this._breakpointManager.findBreakpoints(this.uiSourceCode(), lineNumber);
    if (breakpoints.length) {
      if (onlyDisable)
        breakpoints[0].setEnabled(!breakpoints[0].enabled());
      else
        breakpoints[0].remove();
    } else {
      this._createNewBreakpoint(lineNumber, '', true);
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
        .then(setBreakpoint.bind(this));

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
     * @param {?Array<!Workspace.UILocation>} locations
     */
    function setBreakpoint(locations) {
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
