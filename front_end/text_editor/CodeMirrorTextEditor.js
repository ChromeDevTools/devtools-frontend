/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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
 * @implements {UI.TextEditor}
 * @unrestricted
 */
TextEditor.CodeMirrorTextEditor = class extends UI.VBox {
  /**
   * @param {!UI.TextEditor.Options} options
   */
  constructor(options) {
    super();
    this._options = options;

    this.registerRequiredCSS('cm/codemirror.css');
    this.registerRequiredCSS('text_editor/cmdevtools.css');

    TextEditor.CodeMirrorUtils.appendThemeStyle(this.element);

    this._codeMirror = new window.CodeMirror(this.element, {
      lineNumbers: options.lineNumbers,
      matchBrackets: true,
      smartIndent: true,
      styleSelectedText: true,
      electricChars: true,
      styleActiveLine: true,
      indentUnit: 4,
      lineWrapping: options.lineWrapping
    });
    this._codeMirrorElement = this.element.lastElementChild;

    this._codeMirror._codeMirrorTextEditor = this;

    CodeMirror.keyMap['devtools-common'] = {
      'Left': 'goCharLeft',
      'Right': 'goCharRight',
      'Up': 'goLineUp',
      'Down': 'goLineDown',
      'End': 'goLineEnd',
      'Home': 'goLineStartSmart',
      'PageUp': 'smartPageUp',
      'PageDown': 'smartPageDown',
      'Delete': 'delCharAfter',
      'Backspace': 'delCharBefore',
      'Tab': 'defaultTab',
      'Shift-Tab': 'indentLess',
      'Enter': 'newlineAndIndent',
      'Ctrl-Space': 'autocomplete',
      'Esc': 'dismiss',
      'Ctrl-M': 'gotoMatchingBracket'
    };

    CodeMirror.keyMap['devtools-pc'] = {
      'Ctrl-A': 'selectAll',
      'Ctrl-Z': 'undoAndReveal',
      'Shift-Ctrl-Z': 'redoAndReveal',
      'Ctrl-Y': 'redo',
      'Ctrl-Home': 'goDocStart',
      'Ctrl-Up': 'goDocStart',
      'Ctrl-End': 'goDocEnd',
      'Ctrl-Down': 'goDocEnd',
      'Ctrl-Left': 'goGroupLeft',
      'Ctrl-Right': 'goGroupRight',
      'Alt-Left': 'moveCamelLeft',
      'Alt-Right': 'moveCamelRight',
      'Shift-Alt-Left': 'selectCamelLeft',
      'Shift-Alt-Right': 'selectCamelRight',
      'Ctrl-Backspace': 'delGroupBefore',
      'Ctrl-Delete': 'delGroupAfter',
      'Ctrl-/': 'toggleComment',
      'Ctrl-D': 'selectNextOccurrence',
      'Ctrl-U': 'undoLastSelection',
      fallthrough: 'devtools-common'
    };

    CodeMirror.keyMap['devtools-mac'] = {
      'Cmd-A': 'selectAll',
      'Cmd-Z': 'undoAndReveal',
      'Shift-Cmd-Z': 'redoAndReveal',
      'Cmd-Up': 'goDocStart',
      'Cmd-Down': 'goDocEnd',
      'Alt-Left': 'goGroupLeft',
      'Alt-Right': 'goGroupRight',
      'Ctrl-Left': 'moveCamelLeft',
      'Ctrl-Right': 'moveCamelRight',
      'Ctrl-A': 'goLineLeft',
      'Ctrl-E': 'goLineRight',
      'Shift-Ctrl-Left': 'selectCamelLeft',
      'Shift-Ctrl-Right': 'selectCamelRight',
      'Cmd-Left': 'goLineStartSmart',
      'Cmd-Right': 'goLineEnd',
      'Cmd-Backspace': 'delLineLeft',
      'Alt-Backspace': 'delGroupBefore',
      'Alt-Delete': 'delGroupAfter',
      'Cmd-/': 'toggleComment',
      'Cmd-D': 'selectNextOccurrence',
      'Cmd-U': 'undoLastSelection',
      fallthrough: 'devtools-common'
    };
    if (options.bracketMatchingSetting)
      options.bracketMatchingSetting.addChangeListener(this._enableBracketMatchingIfNeeded, this);
    this._enableBracketMatchingIfNeeded();

    this._codeMirror.setOption('keyMap', Host.isMac() ? 'devtools-mac' : 'devtools-pc');

    this._codeMirror.addKeyMap({'\'': 'maybeAvoidSmartSingleQuotes', '\'"\'': 'maybeAvoidSmartDoubleQuotes'});

    this._codeMirror.setOption('flattenSpans', false);

    this._codeMirror.setOption('maxHighlightLength', TextEditor.CodeMirrorTextEditor.maxHighlightLength);
    this._codeMirror.setOption('mode', null);
    this._codeMirror.setOption('crudeMeasuringFrom', 1000);

    this._shouldClearHistory = true;
    this._lineSeparator = '\n';

    this._fixWordMovement = new TextEditor.CodeMirrorTextEditor.FixWordMovement(this._codeMirror);
    this._selectNextOccurrenceController =
        new TextEditor.CodeMirrorTextEditor.SelectNextOccurrenceController(this, this._codeMirror);

    this._codeMirror.on('changes', this._changes.bind(this));
    this._codeMirror.on('beforeSelectionChange', this._beforeSelectionChange.bind(this));
    this._codeMirror.on('keyHandled', this._onKeyHandled.bind(this));

    this.element.style.overflow = 'hidden';
    this._codeMirrorElement.classList.add('source-code');
    this._codeMirrorElement.classList.add('fill');

    /** @type {!Multimap<number, !TextEditor.CodeMirrorTextEditor.Decoration>} */
    this._decorations = new Multimap();
    this._nestedUpdatesCounter = 0;

    this.element.addEventListener('focus', this._handleElementFocus.bind(this), false);
    this.element.addEventListener('keydown', this._handleKeyDown.bind(this), true);
    this.element.addEventListener('keydown', this._handlePostKeyDown.bind(this), false);
    this.element.tabIndex = 0;

    this._needsRefresh = true;

    this._mimeType = '';
    if (options.mimeType)
      this.setMimeType(options.mimeType);
    if (options.autoHeight)
      this._codeMirror.setSize(null, 'auto');
  }

  /**
   * @param {!CodeMirror} codeMirror
   */
  static autocompleteCommand(codeMirror) {
    var autocompleteController = codeMirror._codeMirrorTextEditor._autocompleteController;
    if (autocompleteController)
      autocompleteController.autocomplete(true);
  }

  /**
   * @param {!CodeMirror} codeMirror
   */
  static undoLastSelectionCommand(codeMirror) {
    codeMirror._codeMirrorTextEditor._selectNextOccurrenceController.undoLastSelection();
  }

  /**
   * @param {!CodeMirror} codeMirror
   */
  static selectNextOccurrenceCommand(codeMirror) {
    codeMirror._codeMirrorTextEditor._selectNextOccurrenceController.selectNextOccurrence();
  }

  /**
   * @param {boolean} shift
   * @param {!CodeMirror} codeMirror
   */
  static moveCamelLeftCommand(shift, codeMirror) {
    codeMirror._codeMirrorTextEditor._doCamelCaseMovement(-1, shift);
  }

  /**
   * @param {boolean} shift
   * @param {!CodeMirror} codeMirror
   */
  static moveCamelRightCommand(shift, codeMirror) {
    codeMirror._codeMirrorTextEditor._doCamelCaseMovement(1, shift);
  }

  /**
   * @param {string} quoteCharacter
   * @param {!CodeMirror} codeMirror
   * @return {*}
   */
  static _maybeAvoidSmartQuotes(quoteCharacter, codeMirror) {
    var textEditor = codeMirror._codeMirrorTextEditor;
    if (!codeMirror.getOption('autoCloseBrackets'))
      return CodeMirror.Pass;
    var selections = textEditor.selections();
    if (selections.length !== 1 || !selections[0].isEmpty())
      return CodeMirror.Pass;

    var selection = selections[0];
    var token = textEditor.tokenAtTextPosition(selection.startLine, selection.startColumn);
    if (!token || !token.type || token.type.indexOf('string') === -1)
      return CodeMirror.Pass;
    var line = textEditor.line(selection.startLine);
    var tokenValue = line.substring(token.startColumn, token.endColumn);
    if (tokenValue[0] === tokenValue[tokenValue.length - 1] && (tokenValue[0] === '\'' || tokenValue[0] === '"'))
      return CodeMirror.Pass;
    codeMirror.replaceSelection(quoteCharacter);
  }

  /**
   * @param {string} modeName
   * @param {string} tokenPrefix
   */
  static _overrideModeWithPrefixedTokens(modeName, tokenPrefix) {
    var oldModeName = modeName + '-old';
    if (CodeMirror.modes[oldModeName])
      return;

    CodeMirror.defineMode(oldModeName, CodeMirror.modes[modeName]);
    CodeMirror.defineMode(modeName, modeConstructor);

    function modeConstructor(config, parserConfig) {
      var innerConfig = {};
      for (var i in parserConfig)
        innerConfig[i] = parserConfig[i];
      innerConfig.name = oldModeName;
      var codeMirrorMode = CodeMirror.getMode(config, innerConfig);
      codeMirrorMode.name = modeName;
      codeMirrorMode.token = tokenOverride.bind(null, codeMirrorMode.token);
      return codeMirrorMode;
    }

    function tokenOverride(superToken, stream, state) {
      var token = superToken(stream, state);
      return token ? tokenPrefix + token.split(/ +/).join(' ' + tokenPrefix) : token;
    }
  }

  /**
   * @param {string} mimeType
   * @return {!Array<!Runtime.Extension>}}
   */
  static _collectUninstalledModes(mimeType) {
    var installed = TextEditor.CodeMirrorTextEditor._loadedMimeModeExtensions;

    var nameToExtension = new Map();
    var extensions = self.runtime.extensions(TextEditor.CodeMirrorMimeMode);
    for (var extension of extensions)
      nameToExtension.set(extension.descriptor()['fileName'], extension);

    var modesToLoad = new Set();
    for (var extension of extensions) {
      var descriptor = extension.descriptor();
      if (installed.has(extension) || descriptor['mimeTypes'].indexOf(mimeType) === -1)
        continue;

      modesToLoad.add(extension);
      var deps = descriptor['dependencies'] || [];
      for (var i = 0; i < deps.length; ++i) {
        var extension = nameToExtension.get(deps[i]);
        if (extension && !installed.has(extension))
          modesToLoad.add(extension);
      }
    }
    return Array.from(modesToLoad);
  }

  /**
   * @param {!Array<!Runtime.Extension>} extensions
   * @return {!Promise}
   */
  static _installMimeTypeModes(extensions) {
    var promises = extensions.map(extension => extension.instance().then(installMode.bind(null, extension)));
    return Promise.all(promises);

    /**
     * @param {!Runtime.Extension} extension
     * @param {!Object} instance
     */
    function installMode(extension, instance) {
      if (TextEditor.CodeMirrorTextEditor._loadedMimeModeExtensions.has(extension))
        return;
      var mode = /** @type {!TextEditor.CodeMirrorMimeMode} */ (instance);
      mode.install(extension);
      TextEditor.CodeMirrorTextEditor._loadedMimeModeExtensions.add(extension);
    }
  }

  /**
   * @protected
   * @return {!CodeMirror}
   */
  codeMirror() {
    return this._codeMirror;
  }

  /**
   * @override
   * @return {!UI.Widget}
   */
  widget() {
    return this;
  }

  _onKeyHandled() {
    UI.shortcutRegistry.dismissPendingShortcutAction();
  }

  /**
   * @param {number} lineNumber
   * @param {number} lineLength
   * @param {number} charNumber
   * @return {{lineNumber: number, columnNumber: number}}
   */
  _normalizePositionForOverlappingColumn(lineNumber, lineLength, charNumber) {
    var linesCount = this._codeMirror.lineCount();
    var columnNumber = charNumber;
    if (charNumber < 0 && lineNumber > 0) {
      --lineNumber;
      columnNumber = this.line(lineNumber).length;
    } else if (charNumber >= lineLength && lineNumber < linesCount - 1) {
      ++lineNumber;
      columnNumber = 0;
    } else {
      columnNumber = Number.constrain(charNumber, 0, lineLength);
    }
    return {lineNumber: lineNumber, columnNumber: columnNumber};
  }

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @param {number} direction
   * @return {{lineNumber: number, columnNumber: number}}
   */
  _camelCaseMoveFromPosition(lineNumber, columnNumber, direction) {
    /**
     * @param {number} charNumber
     * @param {number} length
     * @return {boolean}
     */
    function valid(charNumber, length) {
      return charNumber >= 0 && charNumber < length;
    }

    /**
     * @param {string} text
     * @param {number} charNumber
     * @return {boolean}
     */
    function isWordStart(text, charNumber) {
      var position = charNumber;
      var nextPosition = charNumber + 1;
      return valid(position, text.length) && valid(nextPosition, text.length) &&
          Common.TextUtils.isWordChar(text[position]) && Common.TextUtils.isWordChar(text[nextPosition]) &&
          Common.TextUtils.isUpperCase(text[position]) && Common.TextUtils.isLowerCase(text[nextPosition]);
    }

    /**
     * @param {string} text
     * @param {number} charNumber
     * @return {boolean}
     */
    function isWordEnd(text, charNumber) {
      var position = charNumber;
      var prevPosition = charNumber - 1;
      return valid(position, text.length) && valid(prevPosition, text.length) &&
          Common.TextUtils.isWordChar(text[position]) && Common.TextUtils.isWordChar(text[prevPosition]) &&
          Common.TextUtils.isUpperCase(text[position]) && Common.TextUtils.isLowerCase(text[prevPosition]);
    }

    /**
     * @param {number} lineNumber
     * @param {number} lineLength
     * @param {number} columnNumber
     * @return {{lineNumber: number, columnNumber: number}}
     */
    function constrainPosition(lineNumber, lineLength, columnNumber) {
      return {lineNumber: lineNumber, columnNumber: Number.constrain(columnNumber, 0, lineLength)};
    }

    var text = this.line(lineNumber);
    var length = text.length;

    if ((columnNumber === length && direction === 1) || (columnNumber === 0 && direction === -1))
      return this._normalizePositionForOverlappingColumn(lineNumber, length, columnNumber + direction);

    var charNumber = direction === 1 ? columnNumber : columnNumber - 1;

    // Move through initial spaces if any.
    while (valid(charNumber, length) && Common.TextUtils.isSpaceChar(text[charNumber]))
      charNumber += direction;
    if (!valid(charNumber, length))
      return constrainPosition(lineNumber, length, charNumber);

    if (Common.TextUtils.isStopChar(text[charNumber])) {
      while (valid(charNumber, length) && Common.TextUtils.isStopChar(text[charNumber]))
        charNumber += direction;
      if (!valid(charNumber, length))
        return constrainPosition(lineNumber, length, charNumber);
      return {lineNumber: lineNumber, columnNumber: direction === -1 ? charNumber + 1 : charNumber};
    }

    charNumber += direction;
    while (valid(charNumber, length) && !isWordStart(text, charNumber) && !isWordEnd(text, charNumber) &&
           Common.TextUtils.isWordChar(text[charNumber]))
      charNumber += direction;

    if (!valid(charNumber, length))
      return constrainPosition(lineNumber, length, charNumber);
    if (isWordStart(text, charNumber) || isWordEnd(text, charNumber))
      return {lineNumber: lineNumber, columnNumber: charNumber};


    return {lineNumber: lineNumber, columnNumber: direction === -1 ? charNumber + 1 : charNumber};
  }

  /**
   * @param {number} direction
   * @param {boolean} shift
   */
  _doCamelCaseMovement(direction, shift) {
    var selections = this.selections();
    for (var i = 0; i < selections.length; ++i) {
      var selection = selections[i];
      var move = this._camelCaseMoveFromPosition(selection.endLine, selection.endColumn, direction);
      selection.endLine = move.lineNumber;
      selection.endColumn = move.columnNumber;
      if (!shift)
        selections[i] = selection.collapseToEnd();
    }
    this.setSelections(selections);
  }

  dispose() {
    if (this._options.bracketMatchingSetting)
      this._options.bracketMatchingSetting.removeChangeListener(this._enableBracketMatchingIfNeeded, this);
  }

  _enableBracketMatchingIfNeeded() {
    this._codeMirror.setOption(
        'autoCloseBrackets', (this._options.bracketMatchingSetting && this._options.bracketMatchingSetting.get()) ?
            {explode: false} :
            false);
  }

  /**
   * @override
   */
  wasShown() {
    if (this._needsRefresh)
      this.refresh();
  }

  /**
   * @protected
   */
  refresh() {
    if (this.isShowing()) {
      this._codeMirror.refresh();
      this._needsRefresh = false;
      return;
    }
    this._needsRefresh = true;
  }

  /**
   * @override
   */
  willHide() {
    delete this._editorSizeInSync;
  }

  undo() {
    this._codeMirror.undo();
  }

  redo() {
    this._codeMirror.redo();
  }

  /**
   * @param {!Event} e
   */
  _handleKeyDown(e) {
    if (this._autocompleteController && this._autocompleteController.keyDown(e))
      e.consume(true);
  }

  /**
   * @param {!Event} e
   */
  _handlePostKeyDown(e) {
    if (e.defaultPrevented)
      e.consume(true);
  }

  /**
   * @override
   * @param {?UI.AutocompleteConfig} config
   */
  configureAutocomplete(config) {
    if (this._autocompleteController) {
      this._autocompleteController.dispose();
      delete this._autocompleteController;
    }

    if (config)
      this._autocompleteController = new TextEditor.TextEditorAutocompleteController(this, this._codeMirror, config);
  }

  /**
   * @param {number} lineNumber
   * @param {number} column
   * @return {?{x: number, y: number, height: number}}
   */
  cursorPositionToCoordinates(lineNumber, column) {
    if (lineNumber >= this._codeMirror.lineCount() || lineNumber < 0 || column < 0 ||
        column > this._codeMirror.getLine(lineNumber).length)
      return null;
    var metrics = this._codeMirror.cursorCoords(new CodeMirror.Pos(lineNumber, column));
    return {x: metrics.left, y: metrics.top, height: metrics.bottom - metrics.top};
  }

  /**
   * @param {number} x
   * @param {number} y
   * @return {?Common.TextRange}
   */
  coordinatesToCursorPosition(x, y) {
    var element = this.element.ownerDocument.elementFromPoint(x, y);
    if (!element || !element.isSelfOrDescendant(this._codeMirror.getWrapperElement()))
      return null;
    var gutterBox = this._codeMirror.getGutterElement().boxInWindow();
    if (x >= gutterBox.x && x <= gutterBox.x + gutterBox.width && y >= gutterBox.y &&
        y <= gutterBox.y + gutterBox.height)
      return null;
    var coords = this._codeMirror.coordsChar({left: x, top: y});
    return TextEditor.CodeMirrorUtils.toRange(coords, coords);
  }

  /**
   * @param {number} lineNumber
   * @param {number} column
   * @return {?{startColumn: number, endColumn: number, type: string}}
   */
  tokenAtTextPosition(lineNumber, column) {
    if (lineNumber < 0 || lineNumber >= this._codeMirror.lineCount())
      return null;
    var token = this._codeMirror.getTokenAt(new CodeMirror.Pos(lineNumber, (column || 0) + 1));
    if (!token)
      return null;
    return {startColumn: token.start, endColumn: token.end, type: token.type};
  }

  /**
   * @return {boolean}
   */
  isClean() {
    return this._codeMirror.isClean();
  }

  markClean() {
    this._codeMirror.markClean();
  }

  /**
   * @return {boolean}
   */
  _hasLongLines() {
    function lineIterator(lineHandle) {
      if (lineHandle.text.length > TextEditor.CodeMirrorTextEditor.LongLineModeLineLengthThreshold)
        hasLongLines = true;
      return hasLongLines;
    }
    var hasLongLines = false;
    this._codeMirror.eachLine(lineIterator);
    return hasLongLines;
  }

  _enableLongLinesMode() {
    this._codeMirror.setOption('styleSelectedText', false);
  }

  _disableLongLinesMode() {
    this._codeMirror.setOption('styleSelectedText', true);
  }

  /**
   * @param {string} mimeType
   */
  setMimeType(mimeType) {
    this._mimeType = mimeType;
    var modesToLoad = TextEditor.CodeMirrorTextEditor._collectUninstalledModes(mimeType);

    if (!modesToLoad.length)
      setMode.call(this);
    else
      TextEditor.CodeMirrorTextEditor._installMimeTypeModes(modesToLoad).then(setMode.bind(this));

    /**
     * @this {TextEditor.CodeMirrorTextEditor}
     */
    function setMode() {
      var rewrittenMimeType = this.rewriteMimeType(mimeType);
      if (this._codeMirror.options.mode !== rewrittenMimeType)
        this._codeMirror.setOption('mode', rewrittenMimeType);
    }
  }

  /**
   * @protected
   * @param {string} mimeType
   */
  rewriteMimeType(mimeType) {
    // Overridden in SourcesTextEditor
    return mimeType;
  }

  /**
   * @protected
   * @return {string}
   */
  mimeType() {
    return this._mimeType;
  }

  /**
   * @param {boolean} readOnly
   */
  setReadOnly(readOnly) {
    this.element.classList.toggle('CodeMirror-readonly', readOnly);
    this._codeMirror.setOption('readOnly', readOnly);
  }

  /**
   * @return {boolean}
   */
  readOnly() {
    return !!this._codeMirror.getOption('readOnly');
  }

  /**
   * @override
   * @param {function(!KeyboardEvent)} handler
   */
  addKeyDownHandler(handler) {
    this._codeMirror.on('keydown', (CodeMirror, event) => handler(event));
  }

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @param {!Element} element
   * @param {symbol} type
   * @param {boolean=} insertBefore
   * @return {!TextEditor.TextEditorBookMark}
   */
  addBookmark(lineNumber, columnNumber, element, type, insertBefore) {
    var bookmark = new TextEditor.TextEditorBookMark(
        this._codeMirror.setBookmark(
            new CodeMirror.Pos(lineNumber, columnNumber), {widget: element, insertLeft: insertBefore}),
        type, this);
    this._updateDecorations(lineNumber);
    return bookmark;
  }

  /**
   * @param {!Common.TextRange} range
   * @param {symbol=} type
   * @return {!Array.<!TextEditor.TextEditorBookMark>}
   */
  bookmarks(range, type) {
    var pos = TextEditor.CodeMirrorUtils.toPos(range);
    var markers = this._codeMirror.findMarksAt(pos.start);
    if (!range.isEmpty()) {
      var middleMarkers = this._codeMirror.findMarks(pos.start, pos.end);
      var endMarkers = this._codeMirror.findMarksAt(pos.end);
      markers = markers.concat(middleMarkers, endMarkers);
    }
    var bookmarks = [];
    for (var i = 0; i < markers.length; i++) {
      var bookmark = markers[i][TextEditor.TextEditorBookMark._symbol];
      if (bookmark && (!type || bookmark.type() === type))
        bookmarks.push(bookmark);
    }
    return bookmarks;
  }

  /**
   * @override
   */
  focus() {
    this._codeMirror.focus();
  }

  /**
   * @override
   * @return {boolean}
   */
  hasFocus() {
    return this._codeMirror.hasFocus();
  }

  _handleElementFocus() {
    this._codeMirror.focus();
  }

  /**
   * @param {function()} operation
   */
  operation(operation) {
    this._codeMirror.operation(operation);
  }

  /**
   * @param {number} lineNumber
   */
  scrollLineIntoView(lineNumber) {
    this._innerRevealLine(lineNumber, this._codeMirror.getScrollInfo());
  }

  /**
   * @param {number} lineNumber
   * @param {!{left: number, top: number, width: number, height: number, clientWidth: number, clientHeight: number}} scrollInfo
   */
  _innerRevealLine(lineNumber, scrollInfo) {
    var topLine = this._codeMirror.lineAtHeight(scrollInfo.top, 'local');
    var bottomLine = this._codeMirror.lineAtHeight(scrollInfo.top + scrollInfo.clientHeight, 'local');
    var linesPerScreen = bottomLine - topLine + 1;
    if (lineNumber < topLine) {
      var topLineToReveal = Math.max(lineNumber - (linesPerScreen / 2) + 1, 0) | 0;
      this._codeMirror.scrollIntoView(new CodeMirror.Pos(topLineToReveal, 0));
    } else if (lineNumber > bottomLine) {
      var bottomLineToReveal = Math.min(lineNumber + (linesPerScreen / 2) - 1, this.linesCount - 1) | 0;
      this._codeMirror.scrollIntoView(new CodeMirror.Pos(bottomLineToReveal, 0));
    }
  }

  /**
   * @param {!Element} element
   * @param {number} lineNumber
   * @param {number=} startColumn
   * @param {number=} endColumn
   */
  addDecoration(element, lineNumber, startColumn, endColumn) {
    var widget = this._codeMirror.addLineWidget(lineNumber, element);
    var update = null;
    if (typeof startColumn !== 'undefined') {
      if (typeof endColumn === 'undefined')
        endColumn = Infinity;
      update = this._updateFloatingDecoration.bind(this, element, lineNumber, startColumn, endColumn);
      update();
    }

    this._decorations.set(lineNumber, {element: element, update: update, widget: widget});
  }

  /**
   * @param {!Element} element
   * @param {number} lineNumber
   * @param {number} startColumn
   * @param {number} endColumn
   */
  _updateFloatingDecoration(element, lineNumber, startColumn, endColumn) {
    var base = this._codeMirror.cursorCoords(new CodeMirror.Pos(lineNumber, 0), 'page');
    var start = this._codeMirror.cursorCoords(new CodeMirror.Pos(lineNumber, startColumn), 'page');
    var end = this._codeMirror.charCoords(new CodeMirror.Pos(lineNumber, endColumn), 'page');
    element.style.width = (end.right - start.left) + 'px';
    element.style.left = (start.left - base.left) + 'px';
  }

  /**
   * @param {number} lineNumber
   */
  _updateDecorations(lineNumber) {
    this._decorations.get(lineNumber).forEach(innerUpdateDecorations);

    /**
     * @param {!TextEditor.CodeMirrorTextEditor.Decoration} decoration
     */
    function innerUpdateDecorations(decoration) {
      if (decoration.update)
        decoration.update();
    }
  }

  /**
   * @param {!Element} element
   * @param {number} lineNumber
   */
  removeDecoration(element, lineNumber) {
    this._decorations.get(lineNumber).forEach(innerRemoveDecoration.bind(this));

    /**
     * @this {TextEditor.CodeMirrorTextEditor}
     * @param {!TextEditor.CodeMirrorTextEditor.Decoration} decoration
     */
    function innerRemoveDecoration(decoration) {
      if (decoration.element !== element)
        return;
      this._codeMirror.removeLineWidget(decoration.widget);
      this._decorations.remove(lineNumber, decoration);
    }
  }

  /**
   * @param {number} lineNumber 0-based
   * @param {number=} columnNumber
   * @param {boolean=} shouldHighlight
   */
  revealPosition(lineNumber, columnNumber, shouldHighlight) {
    lineNumber = Number.constrain(lineNumber, 0, this._codeMirror.lineCount() - 1);
    if (typeof columnNumber !== 'number')
      columnNumber = 0;
    columnNumber = Number.constrain(columnNumber, 0, this._codeMirror.getLine(lineNumber).length);

    this.clearPositionHighlight();
    this._highlightedLine = this._codeMirror.getLineHandle(lineNumber);
    if (!this._highlightedLine)
      return;
    this.scrollLineIntoView(lineNumber);
    if (shouldHighlight) {
      this._codeMirror.addLineClass(this._highlightedLine, null, 'cm-highlight');
      this._clearHighlightTimeout = setTimeout(this.clearPositionHighlight.bind(this), 2000);
    }
    this.setSelection(Common.TextRange.createFromLocation(lineNumber, columnNumber));
  }

  clearPositionHighlight() {
    if (this._clearHighlightTimeout)
      clearTimeout(this._clearHighlightTimeout);
    delete this._clearHighlightTimeout;

    if (this._highlightedLine)
      this._codeMirror.removeLineClass(this._highlightedLine, null, 'cm-highlight');
    delete this._highlightedLine;
  }

  /**
   * @override
   * @return {!Array.<!Element>}
   */
  elementsToRestoreScrollPositionsFor() {
    return [];
  }

  /**
   * @param {number} width
   * @param {number} height
   */
  _updatePaddingBottom(width, height) {
    var scrollInfo = this._codeMirror.getScrollInfo();
    var newPaddingBottom;
    var linesElement = this._codeMirrorElement.querySelector('.CodeMirror-lines');
    var lineCount = this._codeMirror.lineCount();
    if (lineCount <= 1) {
      newPaddingBottom = 0;
    } else {
      newPaddingBottom =
          Math.max(scrollInfo.clientHeight - this._codeMirror.getLineHandle(this._codeMirror.lastLine()).height, 0);
    }
    newPaddingBottom += 'px';
    linesElement.style.paddingBottom = newPaddingBottom;
    this._codeMirror.setSize(width, height);
  }

  _resizeEditor() {
    var parentElement = this.element.parentElement;
    if (!parentElement || !this.isShowing())
      return;
    this._codeMirror.operation(() => {
      var scrollLeft = this._codeMirror.doc.scrollLeft;
      var scrollTop = this._codeMirror.doc.scrollTop;
      var width = parentElement.offsetWidth;
      var height = parentElement.offsetHeight - this.element.offsetTop;
      if (this._options.autoHeight) {
        this._codeMirror.setSize(width, 'auto');
      } else {
        this._codeMirror.setSize(width, height);
        this._updatePaddingBottom(width, height);
      }
      this._codeMirror.scrollTo(scrollLeft, scrollTop);
    });
  }

  /**
   * @override
   */
  onResize() {
    if (this._autocompleteController)
      this._autocompleteController.clearAutocomplete();
    this._resizeEditor();
    this._editorSizeInSync = true;
    if (this._selectionSetScheduled) {
      delete this._selectionSetScheduled;
      this.setSelection(this._lastSelection);
    }
  }

  /**
   * @param {!Common.TextRange} range
   * @param {string} text
   * @param {string=} origin
   * @return {!Common.TextRange}
   */
  editRange(range, text, origin) {
    var pos = TextEditor.CodeMirrorUtils.toPos(range);
    this._codeMirror.replaceRange(text, pos.start, pos.end, origin);
    return TextEditor.CodeMirrorUtils.toRange(
        pos.start, this._codeMirror.posFromIndex(this._codeMirror.indexFromPos(pos.start) + text.length));
  }

  /**
   * @override
   */
  clearAutocomplete() {
    if (this._autocompleteController)
      this._autocompleteController.clearAutocomplete();
  }

  /**
   * @param {number} lineNumber
   * @param {number} column
   * @param {function(string):boolean} isWordChar
   * @return {!Common.TextRange}
   */
  wordRangeForCursorPosition(lineNumber, column, isWordChar) {
    var line = this.line(lineNumber);
    var wordStart = column;
    if (column !== 0 && isWordChar(line.charAt(column - 1))) {
      wordStart = column - 1;
      while (wordStart > 0 && isWordChar(line.charAt(wordStart - 1)))
        --wordStart;
    }
    var wordEnd = column;
    while (wordEnd < line.length && isWordChar(line.charAt(wordEnd)))
      ++wordEnd;
    return new Common.TextRange(lineNumber, wordStart, lineNumber, wordEnd);
  }

  /**
   * @param {!CodeMirror} codeMirror
   * @param {!Array.<!CodeMirror.ChangeObject>} changes
   */
  _changes(codeMirror, changes) {
    if (!changes.length)
      return;
    // We do not show "scroll beyond end of file" span for one line documents, so we need to check if "document has one line" changed.
    var hasOneLine = this._codeMirror.lineCount() === 1;
    if (hasOneLine !== this._hasOneLine)
      this._resizeEditor();
    this._hasOneLine = hasOneLine;

    this._decorations.valuesArray().forEach(decoration => this._codeMirror.removeLineWidget(decoration.widget));
    this._decorations.clear();
  }

  /**
   * @param {!CodeMirror} codeMirror
   * @param {{ranges: !Array.<{head: !CodeMirror.Pos, anchor: !CodeMirror.Pos}>}} selection
   */
  _beforeSelectionChange(codeMirror, selection) {
    this._selectNextOccurrenceController.selectionWillChange();
  }

  /**
   * @param {number} lineNumber
   */
  scrollToLine(lineNumber) {
    var pos = new CodeMirror.Pos(lineNumber, 0);
    var coords = this._codeMirror.charCoords(pos, 'local');
    this._codeMirror.scrollTo(0, coords.top);
  }

  /**
   * @return {number}
   */
  firstVisibleLine() {
    return this._codeMirror.lineAtHeight(this._codeMirror.getScrollInfo().top, 'local');
  }

  /**
   * @return {number}
   */
  scrollTop() {
    return this._codeMirror.getScrollInfo().top;
  }

  /**
   * @param {number} scrollTop
   */
  setScrollTop(scrollTop) {
    this._codeMirror.scrollTo(0, scrollTop);
  }

  /**
   * @return {number}
   */
  lastVisibleLine() {
    var scrollInfo = this._codeMirror.getScrollInfo();
    return this._codeMirror.lineAtHeight(scrollInfo.top + scrollInfo.clientHeight, 'local');
  }

  /**
   * @override
   * @return {!Common.TextRange}
   */
  selection() {
    var start = this._codeMirror.getCursor('anchor');
    var end = this._codeMirror.getCursor('head');

    return TextEditor.CodeMirrorUtils.toRange(start, end);
  }

  /**
   * @return {!Array.<!Common.TextRange>}
   */
  selections() {
    var selectionList = this._codeMirror.listSelections();
    var result = [];
    for (var i = 0; i < selectionList.length; ++i) {
      var selection = selectionList[i];
      result.push(TextEditor.CodeMirrorUtils.toRange(selection.anchor, selection.head));
    }
    return result;
  }

  /**
   * @return {?Common.TextRange}
   */
  lastSelection() {
    return this._lastSelection;
  }

  /**
   * @override
   * @param {!Common.TextRange} textRange
   */
  setSelection(textRange) {
    this._lastSelection = textRange;
    if (!this._editorSizeInSync) {
      this._selectionSetScheduled = true;
      return;
    }
    var pos = TextEditor.CodeMirrorUtils.toPos(textRange);
    this._codeMirror.setSelection(pos.start, pos.end);
  }

  /**
   * @param {!Array.<!Common.TextRange>} ranges
   * @param {number=} primarySelectionIndex
   */
  setSelections(ranges, primarySelectionIndex) {
    var selections = [];
    for (var i = 0; i < ranges.length; ++i) {
      var selection = TextEditor.CodeMirrorUtils.toPos(ranges[i]);
      selections.push({anchor: selection.start, head: selection.end});
    }
    primarySelectionIndex = primarySelectionIndex || 0;
    this._codeMirror.setSelections(selections, primarySelectionIndex, {scroll: false});
  }

  /**
   * @param {string} text
   */
  _detectLineSeparator(text) {
    this._lineSeparator = text.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
  }

  /**
   * @override
   * @param {string} text
   */
  setText(text) {
    if (text.length > TextEditor.CodeMirrorTextEditor.MaxEditableTextSize) {
      this.configureAutocomplete(null);
      this.setReadOnly(true);
    }
    this._codeMirror.setValue(text);
    if (this._shouldClearHistory) {
      this._codeMirror.clearHistory();
      this._shouldClearHistory = false;
    }
    this._detectLineSeparator(text);

    if (this._hasLongLines())
      this._enableLongLinesMode();
    else
      this._disableLongLinesMode();
  }

  /**
   * @override
   * @param {!Common.TextRange=} textRange
   * @return {string}
   */
  text(textRange) {
    if (!textRange)
      return this._codeMirror.getValue().replace(/\n/g, this._lineSeparator);
    var pos = TextEditor.CodeMirrorUtils.toPos(textRange.normalize());
    return this._codeMirror.getRange(pos.start, pos.end).replace(/\n/g, this._lineSeparator);
  }

  /**
   * @override
   * @return {!Common.TextRange}
   */
  fullRange() {
    var lineCount = this.linesCount;
    var lastLine = this._codeMirror.getLine(lineCount - 1);
    return TextEditor.CodeMirrorUtils.toRange(
        new CodeMirror.Pos(0, 0), new CodeMirror.Pos(lineCount - 1, lastLine.length));
  }

  /**
   * @override
   * @param {number} lineNumber
   * @return {string}
   */
  line(lineNumber) {
    return this._codeMirror.getLine(lineNumber);
  }

  /**
   * @return {number}
   */
  get linesCount() {
    return this._codeMirror.lineCount();
  }

  /**
   * @override
   */
  newlineAndIndent() {
    this._codeMirror.execCommand('newlineAndIndent');
  }

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!TextEditor.TextEditorPositionHandle}
   */
  textEditorPositionHandle(lineNumber, columnNumber) {
    return new TextEditor.CodeMirrorPositionHandle(this._codeMirror, new CodeMirror.Pos(lineNumber, columnNumber));
  }
};

TextEditor.CodeMirrorTextEditor.maxHighlightLength = 1000;


CodeMirror.commands.autocomplete = TextEditor.CodeMirrorTextEditor.autocompleteCommand;


CodeMirror.commands.undoLastSelection = TextEditor.CodeMirrorTextEditor.undoLastSelectionCommand;


CodeMirror.commands.selectNextOccurrence = TextEditor.CodeMirrorTextEditor.selectNextOccurrenceCommand;


CodeMirror.commands.moveCamelLeft = TextEditor.CodeMirrorTextEditor.moveCamelLeftCommand.bind(null, false);
CodeMirror.commands.selectCamelLeft = TextEditor.CodeMirrorTextEditor.moveCamelLeftCommand.bind(null, true);


CodeMirror.commands.moveCamelRight = TextEditor.CodeMirrorTextEditor.moveCamelRightCommand.bind(null, false);
CodeMirror.commands.selectCamelRight = TextEditor.CodeMirrorTextEditor.moveCamelRightCommand.bind(null, true);

/**
 * @param {!CodeMirror} codeMirror
 */
CodeMirror.commands.gotoMatchingBracket = function(codeMirror) {
  var updatedSelections = [];
  var selections = codeMirror.listSelections();
  for (var i = 0; i < selections.length; ++i) {
    var selection = selections[i];
    var cursor = selection.head;
    var matchingBracket = codeMirror.findMatchingBracket(cursor, false, {maxScanLines: 10000});
    var updatedHead = cursor;
    if (matchingBracket && matchingBracket.match) {
      var columnCorrection = CodeMirror.cmpPos(matchingBracket.from, cursor) === 0 ? 1 : 0;
      updatedHead = new CodeMirror.Pos(matchingBracket.to.line, matchingBracket.to.ch + columnCorrection);
    }
    updatedSelections.push({anchor: updatedHead, head: updatedHead});
  }
  codeMirror.setSelections(updatedSelections);
};

/**
 * @param {!CodeMirror} codemirror
 */
CodeMirror.commands.undoAndReveal = function(codemirror) {
  var scrollInfo = codemirror.getScrollInfo();
  codemirror.execCommand('undo');
  var cursor = codemirror.getCursor('start');
  codemirror._codeMirrorTextEditor._innerRevealLine(cursor.line, scrollInfo);
  var autocompleteController = codemirror._codeMirrorTextEditor._autocompleteController;
  if (autocompleteController)
    autocompleteController.clearAutocomplete();
};

/**
 * @param {!CodeMirror} codemirror
 */
CodeMirror.commands.redoAndReveal = function(codemirror) {
  var scrollInfo = codemirror.getScrollInfo();
  codemirror.execCommand('redo');
  var cursor = codemirror.getCursor('start');
  codemirror._codeMirrorTextEditor._innerRevealLine(cursor.line, scrollInfo);
  var autocompleteController = codemirror._codeMirrorTextEditor._autocompleteController;
  if (autocompleteController)
    autocompleteController.clearAutocomplete();
};

/**
 * @return {!Object|undefined}
 */
CodeMirror.commands.dismiss = function(codemirror) {
  var selections = codemirror.listSelections();
  var selection = selections[0];
  if (selections.length === 1) {
    if (TextEditor.CodeMirrorUtils.toRange(selection.anchor, selection.head).isEmpty())
      return CodeMirror.Pass;
    codemirror.setSelection(selection.anchor, selection.anchor, {scroll: false});
    codemirror._codeMirrorTextEditor.scrollLineIntoView(selection.anchor.line);
    return;
  }

  codemirror.setSelection(selection.anchor, selection.head, {scroll: false});
  codemirror._codeMirrorTextEditor.scrollLineIntoView(selection.anchor.line);
};

/**
 * @return {!Object|undefined}
 */
CodeMirror.commands.smartPageUp = function(codemirror) {
  if (codemirror._codeMirrorTextEditor.selection().equal(Common.TextRange.createFromLocation(0, 0)))
    return CodeMirror.Pass;
  codemirror.execCommand('goPageUp');
};

/**
 * @return {!Object|undefined}
 */
CodeMirror.commands.smartPageDown = function(codemirror) {
  if (codemirror._codeMirrorTextEditor.selection().equal(codemirror._codeMirrorTextEditor.fullRange().collapseToEnd()))
    return CodeMirror.Pass;
  codemirror.execCommand('goPageDown');
};


CodeMirror.commands.maybeAvoidSmartSingleQuotes =
    TextEditor.CodeMirrorTextEditor._maybeAvoidSmartQuotes.bind(null, '\'');
CodeMirror.commands.maybeAvoidSmartDoubleQuotes =
    TextEditor.CodeMirrorTextEditor._maybeAvoidSmartQuotes.bind(null, '"');

TextEditor.CodeMirrorTextEditor.LongLineModeLineLengthThreshold = 2000;
TextEditor.CodeMirrorTextEditor.MaxEditableTextSize = 1024 * 1024 * 10;

/**
 * @implements {TextEditor.TextEditorPositionHandle}
 * @unrestricted
 */
TextEditor.CodeMirrorPositionHandle = class {
  /**
   * @param {!CodeMirror} codeMirror
   * @param {!CodeMirror.Pos} pos
   */
  constructor(codeMirror, pos) {
    this._codeMirror = codeMirror;
    this._lineHandle = codeMirror.getLineHandle(pos.line);
    this._columnNumber = pos.ch;
  }

  /**
   * @override
   * @return {?{lineNumber: number, columnNumber: number}}
   */
  resolve() {
    var lineNumber = this._lineHandle ? this._codeMirror.getLineNumber(this._lineHandle) : null;
    if (typeof lineNumber !== 'number')
      return null;
    return {lineNumber: lineNumber, columnNumber: this._columnNumber};
  }

  /**
   * @override
   * @param {!TextEditor.TextEditorPositionHandle} positionHandle
   * @return {boolean}
   */
  equal(positionHandle) {
    return positionHandle._lineHandle === this._lineHandle && positionHandle._columnNumber === this._columnNumber &&
        positionHandle._codeMirror === this._codeMirror;
  }
};

/**
 * @unrestricted
 */
TextEditor.CodeMirrorTextEditor.FixWordMovement = class {
  /**
   * @param {!CodeMirror} codeMirror
   */
  constructor(codeMirror) {
    function moveLeft(shift, codeMirror) {
      codeMirror.setExtending(shift);
      var cursor = codeMirror.getCursor('head');
      codeMirror.execCommand('goGroupLeft');
      var newCursor = codeMirror.getCursor('head');
      if (newCursor.ch === 0 && newCursor.line !== 0) {
        codeMirror.setExtending(false);
        return;
      }

      var skippedText = codeMirror.getRange(newCursor, cursor, '#');
      if (/^\s+$/.test(skippedText))
        codeMirror.execCommand('goGroupLeft');
      codeMirror.setExtending(false);
    }

    function moveRight(shift, codeMirror) {
      codeMirror.setExtending(shift);
      var cursor = codeMirror.getCursor('head');
      codeMirror.execCommand('goGroupRight');
      var newCursor = codeMirror.getCursor('head');
      if (newCursor.ch === 0 && newCursor.line !== 0) {
        codeMirror.setExtending(false);
        return;
      }

      var skippedText = codeMirror.getRange(cursor, newCursor, '#');
      if (/^\s+$/.test(skippedText))
        codeMirror.execCommand('goGroupRight');
      codeMirror.setExtending(false);
    }

    var modifierKey = Host.isMac() ? 'Alt' : 'Ctrl';
    var leftKey = modifierKey + '-Left';
    var rightKey = modifierKey + '-Right';
    var keyMap = {};
    keyMap[leftKey] = moveLeft.bind(null, false);
    keyMap[rightKey] = moveRight.bind(null, false);
    keyMap['Shift-' + leftKey] = moveLeft.bind(null, true);
    keyMap['Shift-' + rightKey] = moveRight.bind(null, true);
    codeMirror.addKeyMap(keyMap);
  }
};

/**
 * @unrestricted
 */
TextEditor.CodeMirrorTextEditor.SelectNextOccurrenceController = class {
  /**
   * @param {!TextEditor.CodeMirrorTextEditor} textEditor
   * @param {!CodeMirror} codeMirror
   */
  constructor(textEditor, codeMirror) {
    this._textEditor = textEditor;
    this._codeMirror = codeMirror;
  }

  selectionWillChange() {
    if (!this._muteSelectionListener)
      delete this._fullWordSelection;
  }

  /**
   * @param {!Array.<!Common.TextRange>} selections
   * @param {!Common.TextRange} range
   * @return {boolean}
   */
  _findRange(selections, range) {
    for (var i = 0; i < selections.length; ++i) {
      if (range.equal(selections[i]))
        return true;
    }
    return false;
  }

  undoLastSelection() {
    this._muteSelectionListener = true;
    this._codeMirror.execCommand('undoSelection');
    this._muteSelectionListener = false;
  }

  selectNextOccurrence() {
    var selections = this._textEditor.selections();
    var anyEmptySelection = false;
    for (var i = 0; i < selections.length; ++i) {
      var selection = selections[i];
      anyEmptySelection = anyEmptySelection || selection.isEmpty();
      if (selection.startLine !== selection.endLine)
        return;
    }
    if (anyEmptySelection) {
      this._expandSelectionsToWords(selections);
      return;
    }

    var last = selections[selections.length - 1];
    var next = last;
    do
      next = this._findNextOccurrence(next, !!this._fullWordSelection);
    while (next && this._findRange(selections, next) && !next.equal(last));

    if (!next)
      return;
    selections.push(next);

    this._muteSelectionListener = true;
    this._textEditor.setSelections(selections, selections.length - 1);
    delete this._muteSelectionListener;

    this._textEditor.scrollLineIntoView(next.startLine);
  }

  /**
   * @param {!Array.<!Common.TextRange>} selections
   */
  _expandSelectionsToWords(selections) {
    var newSelections = [];
    for (var i = 0; i < selections.length; ++i) {
      var selection = selections[i];
      var startRangeWord = this._textEditor.wordRangeForCursorPosition(
                               selection.startLine, selection.startColumn, Common.TextUtils.isWordChar) ||
          Common.TextRange.createFromLocation(selection.startLine, selection.startColumn);
      var endRangeWord = this._textEditor.wordRangeForCursorPosition(
                             selection.endLine, selection.endColumn, Common.TextUtils.isWordChar) ||
          Common.TextRange.createFromLocation(selection.endLine, selection.endColumn);
      var newSelection = new Common.TextRange(
          startRangeWord.startLine, startRangeWord.startColumn, endRangeWord.endLine, endRangeWord.endColumn);
      newSelections.push(newSelection);
    }
    this._textEditor.setSelections(newSelections, newSelections.length - 1);
    this._fullWordSelection = true;
  }

  /**
   * @param {!Common.TextRange} range
   * @param {boolean} fullWord
   * @return {?Common.TextRange}
   */
  _findNextOccurrence(range, fullWord) {
    range = range.normalize();
    var matchedLineNumber;
    var matchedColumnNumber;
    var textToFind = this._textEditor.text(range);
    function findWordInLine(wordRegex, lineNumber, lineText, from, to) {
      if (typeof matchedLineNumber === 'number')
        return true;
      wordRegex.lastIndex = from;
      var result = wordRegex.exec(lineText);
      if (!result || result.index + textToFind.length > to)
        return false;
      matchedLineNumber = lineNumber;
      matchedColumnNumber = result.index;
      return true;
    }

    var iteratedLineNumber;
    function lineIterator(regex, lineHandle) {
      if (findWordInLine(regex, iteratedLineNumber++, lineHandle.text, 0, lineHandle.text.length))
        return true;
    }

    var regexSource = textToFind.escapeForRegExp();
    if (fullWord)
      regexSource = '\\b' + regexSource + '\\b';
    var wordRegex = new RegExp(regexSource, 'g');
    var currentLineText = this._codeMirror.getLine(range.startLine);

    findWordInLine(wordRegex, range.startLine, currentLineText, range.endColumn, currentLineText.length);
    iteratedLineNumber = range.startLine + 1;
    this._codeMirror.eachLine(range.startLine + 1, this._codeMirror.lineCount(), lineIterator.bind(null, wordRegex));
    iteratedLineNumber = 0;
    this._codeMirror.eachLine(0, range.startLine, lineIterator.bind(null, wordRegex));
    findWordInLine(wordRegex, range.startLine, currentLineText, 0, range.startColumn);

    if (typeof matchedLineNumber !== 'number')
      return null;
    return new Common.TextRange(
        matchedLineNumber, matchedColumnNumber, matchedLineNumber, matchedColumnNumber + textToFind.length);
  }
};


/**
 * @interface
 */
TextEditor.TextEditorPositionHandle = function() {};

TextEditor.TextEditorPositionHandle.prototype = {
  /**
   * @return {?{lineNumber: number, columnNumber: number}}
   */
  resolve() {},

  /**
   * @param {!TextEditor.TextEditorPositionHandle} positionHandle
   * @return {boolean}
   */
  equal(positionHandle) {}
};

TextEditor.CodeMirrorTextEditor._overrideModeWithPrefixedTokens('css', 'css-');
TextEditor.CodeMirrorTextEditor._overrideModeWithPrefixedTokens('javascript', 'js-');
TextEditor.CodeMirrorTextEditor._overrideModeWithPrefixedTokens('xml', 'xml-');

/** @type {!Set<!Runtime.Extension>} */
TextEditor.CodeMirrorTextEditor._loadedMimeModeExtensions = new Set();


/**
 * @interface
 */
TextEditor.CodeMirrorMimeMode = function() {};

TextEditor.CodeMirrorMimeMode.prototype = {
  /**
   * @param {!Runtime.Extension} extension
   */
  install(extension) {}
};

/**
 * @unrestricted
 */
TextEditor.TextEditorBookMark = class {
  /**
   * @param {!CodeMirror.TextMarker} marker
   * @param {symbol} type
   * @param {!TextEditor.CodeMirrorTextEditor} editor
   */
  constructor(marker, type, editor) {
    marker[TextEditor.TextEditorBookMark._symbol] = this;

    this._marker = marker;
    this._type = type;
    this._editor = editor;
  }

  clear() {
    var position = this._marker.find();
    this._marker.clear();
    if (position)
      this._editor._updateDecorations(position.line);
  }

  refresh() {
    this._marker.changed();
    var position = this._marker.find();
    if (position)
      this._editor._updateDecorations(position.line);
  }

  /**
   * @return {symbol}
   */
  type() {
    return this._type;
  }

  /**
   * @return {?Common.TextRange}
   */
  position() {
    var pos = this._marker.find();
    return pos ? Common.TextRange.createFromLocation(pos.line, pos.ch) : null;
  }
};

TextEditor.TextEditorBookMark._symbol = Symbol('TextEditor.TextEditorBookMark');

/**
 * @typedef {{
 *  element: !Element,
 *  widget: !CodeMirror.LineWidget,
 *  update: ?function()
 * }}
 */
TextEditor.CodeMirrorTextEditor.Decoration;

/**
 * @implements {UI.TextEditorFactory}
 * @unrestricted
 */
TextEditor.CodeMirrorTextEditorFactory = class {
  /**
   * @override
   * @param {!UI.TextEditor.Options} options
   * @return {!TextEditor.CodeMirrorTextEditor}
   */
  createEditor(options) {
    return new TextEditor.CodeMirrorTextEditor(options);
  }
};
