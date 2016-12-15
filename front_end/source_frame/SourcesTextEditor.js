// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
SourceFrame.SourcesTextEditor = class extends TextEditor.CodeMirrorTextEditor {
  /**
   * @param {!SourceFrame.SourcesTextEditorDelegate} delegate
   */
  constructor(delegate) {
    super({
      lineNumbers: true,
      lineWrapping: false,
      bracketMatchingSetting: Common.moduleSetting('textEditorBracketMatching'),
    });

    this.codeMirror().addKeyMap({'Enter': 'smartNewlineAndIndent', 'Esc': 'sourcesDismiss'});

    this._delegate = delegate;

    this.codeMirror().on('changes', this._fireTextChanged.bind(this));
    this.codeMirror().on('cursorActivity', this._cursorActivity.bind(this));
    this.codeMirror().on('gutterClick', this._gutterClick.bind(this));
    this.codeMirror().on('scroll', this._scroll.bind(this));
    this.codeMirror().on('focus', this._focus.bind(this));
    this.codeMirror().on('blur', this._blur.bind(this));
    this.codeMirror().on('beforeSelectionChange', this._fireBeforeSelectionChanged.bind(this));
    this.element.addEventListener('contextmenu', this._contextMenu.bind(this), false);

    this.codeMirror().addKeyMap(SourceFrame.SourcesTextEditor._BlockIndentController);
    this._tokenHighlighter = new SourceFrame.SourcesTextEditor.TokenHighlighter(this, this.codeMirror());

    /** @type {!Array<string>} */
    this._gutters = ['CodeMirror-linenumbers'];
    this.codeMirror().setOption('gutters', this._gutters.slice());

    this.codeMirror().setOption('electricChars', false);
    this.codeMirror().setOption('smartIndent', false);

    /**
     * @this {SourceFrame.SourcesTextEditor}
     */
    function updateAnticipateJumpFlag(value) {
      this._isHandlingMouseDownEvent = value;
    }

    this.element.addEventListener('mousedown', updateAnticipateJumpFlag.bind(this, true), true);
    this.element.addEventListener('mousedown', updateAnticipateJumpFlag.bind(this, false), false);
    Common.moduleSetting('textEditorIndent').addChangeListener(this._onUpdateEditorIndentation, this);
    Common.moduleSetting('textEditorAutoDetectIndent').addChangeListener(this._onUpdateEditorIndentation, this);
    Common.moduleSetting('showWhitespacesInEditor').addChangeListener(this._updateWhitespace, this);

    this._onUpdateEditorIndentation();
    this._setupWhitespaceHighlight();
  }

  /**
   * @param {!Array.<string>} lines
   * @return {string}
   */
  static _guessIndentationLevel(lines) {
    var tabRegex = /^\t+/;
    var tabLines = 0;
    var indents = {};
    for (var lineNumber = 0; lineNumber < lines.length; ++lineNumber) {
      var text = lines[lineNumber];
      if (text.length === 0 || !Common.TextUtils.isSpaceChar(text[0]))
        continue;
      if (tabRegex.test(text)) {
        ++tabLines;
        continue;
      }
      var i = 0;
      while (i < text.length && Common.TextUtils.isSpaceChar(text[i]))
        ++i;
      if (i % 2 !== 0)
        continue;
      indents[i] = 1 + (indents[i] || 0);
    }
    var linesCountPerIndentThreshold = 3 * lines.length / 100;
    if (tabLines && tabLines > linesCountPerIndentThreshold)
      return '\t';
    var minimumIndent = Infinity;
    for (var i in indents) {
      if (indents[i] < linesCountPerIndentThreshold)
        continue;
      var indent = parseInt(i, 10);
      if (minimumIndent > indent)
        minimumIndent = indent;
    }
    if (minimumIndent === Infinity)
      return Common.moduleSetting('textEditorIndent').get();
    return ' '.repeat(minimumIndent);
  }

  /**
   * @return {boolean}
   */
  _isSearchActive() {
    return !!this._tokenHighlighter.highlightedRegex();
  }

  /**
   * @override
   * @param {number} lineNumber
   */
  scrollToLine(lineNumber) {
    super.scrollToLine(lineNumber);
    this._scroll();
  }

  /**
   * @param {!RegExp} regex
   * @param {?Common.TextRange} range
   */
  highlightSearchResults(regex, range) {
    /**
     * @this {TextEditor.CodeMirrorTextEditor}
     */
    function innerHighlightRegex() {
      if (range) {
        this.scrollLineIntoView(range.startLine);
        if (range.endColumn > TextEditor.CodeMirrorTextEditor.maxHighlightLength)
          this.setSelection(range);
        else
          this.setSelection(Common.TextRange.createFromLocation(range.startLine, range.startColumn));
      }
      this._tokenHighlighter.highlightSearchResults(regex, range);
    }

    if (!this._selectionBeforeSearch)
      this._selectionBeforeSearch = this.selection();

    this.codeMirror().operation(innerHighlightRegex.bind(this));
  }

  cancelSearchResultsHighlight() {
    this.codeMirror().operation(this._tokenHighlighter.highlightSelectedTokens.bind(this._tokenHighlighter));

    if (this._selectionBeforeSearch) {
      this._reportJump(this._selectionBeforeSearch, this.selection());
      delete this._selectionBeforeSearch;
    }
  }

  /**
   * @param {!Object} highlightDescriptor
   */
  removeHighlight(highlightDescriptor) {
    highlightDescriptor.clear();
  }

  /**
   * @param {!Common.TextRange} range
   * @param {string} cssClass
   * @return {!Object}
   */
  highlightRange(range, cssClass) {
    cssClass = 'CodeMirror-persist-highlight ' + cssClass;
    var pos = TextEditor.CodeMirrorUtils.toPos(range);
    ++pos.end.ch;
    return this.codeMirror().markText(
        pos.start, pos.end, {className: cssClass, startStyle: cssClass + '-start', endStyle: cssClass + '-end'});
  }

  /**
   * @param {string} type
   * @param {boolean} leftToNumbers
   */
  installGutter(type, leftToNumbers) {
    if (this._gutters.indexOf(type) !== -1)
      return;

    if (leftToNumbers)
      this._gutters.unshift(type);
    else
      this._gutters.push(type);

    this.codeMirror().setOption('gutters', this._gutters.slice());
    this.refresh();
  }

  /**
   * @param {string} type
   */
  uninstallGutter(type) {
    var index = this._gutters.indexOf(type);
    if (index === -1)
      return;
    this.codeMirror().clearGutter(type);
    this._gutters.splice(index, 1);
    this.codeMirror().setOption('gutters', this._gutters.slice());
    this.refresh();
  }

  /**
   * @param {number} lineNumber
   * @param {string} type
   * @param {?Element} element
   */
  setGutterDecoration(lineNumber, type, element) {
    console.assert(this._gutters.indexOf(type) !== -1, 'Cannot decorate unexisting gutter.');
    this.codeMirror().setGutterMarker(lineNumber, type, element);
  }

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   */
  setExecutionLocation(lineNumber, columnNumber) {
    this.clearPositionHighlight();

    this._executionLine = this.codeMirror().getLineHandle(lineNumber);
    if (!this._executionLine)
      return;

    this.codeMirror().addLineClass(this._executionLine, 'wrap', 'cm-execution-line');
    this._executionLineTailMarker = this.codeMirror().markText(
        {line: lineNumber, ch: columnNumber}, {line: lineNumber, ch: this.codeMirror().getLine(lineNumber).length},
        {className: 'cm-execution-line-tail'});
  }

  clearExecutionLine() {
    this.clearPositionHighlight();

    if (this._executionLine)
      this.codeMirror().removeLineClass(this._executionLine, 'wrap', 'cm-execution-line');
    delete this._executionLine;

    if (this._executionLineTailMarker)
      this._executionLineTailMarker.clear();
    delete this._executionLineTailMarker;
  }

  /**
   * @param {number} lineNumber
   * @param {string} className
   * @param {boolean} toggled
   */
  toggleLineClass(lineNumber, className, toggled) {
    if (this.hasLineClass(lineNumber, className) === toggled)
      return;

    var lineHandle = this.codeMirror().getLineHandle(lineNumber);
    if (!lineHandle)
      return;

    if (toggled) {
      this.codeMirror().addLineClass(lineHandle, 'gutter', className);
      this.codeMirror().addLineClass(lineHandle, 'wrap', className);
    } else {
      this.codeMirror().removeLineClass(lineHandle, 'gutter', className);
      this.codeMirror().removeLineClass(lineHandle, 'wrap', className);
    }
  }

  /**
   * @param {number} lineNumber
   * @param {string} className
   * @return {boolean}
   */
  hasLineClass(lineNumber, className) {
    var lineInfo = this.codeMirror().lineInfo(lineNumber);
    var wrapClass = lineInfo.wrapClass || '';
    var classNames = wrapClass.split(' ');
    return classNames.indexOf(className) !== -1;
  }

  _gutterClick(instance, lineNumber, gutter, event) {
    this.dispatchEventToListeners(
        SourceFrame.SourcesTextEditor.Events.GutterClick, {lineNumber: lineNumber, event: event});
  }

  _contextMenu(event) {
    var contextMenu = new UI.ContextMenu(event);
    event.consume(true);  // Consume event now to prevent document from handling the async menu
    var wrapper = event.target.enclosingNodeOrSelfWithClass('CodeMirror-gutter-wrapper');
    var target = wrapper ? wrapper.querySelector('.CodeMirror-linenumber') : null;
    var promise;
    if (target) {
      promise = this._delegate.populateLineGutterContextMenu(contextMenu, parseInt(target.textContent, 10) - 1);
    } else {
      var textSelection = this.selection();
      promise =
          this._delegate.populateTextAreaContextMenu(contextMenu, textSelection.startLine, textSelection.startColumn);
    }
    promise.then(showAsync.bind(this));

    /**
     * @this {SourceFrame.SourcesTextEditor}
     */
    function showAsync() {
      contextMenu.appendApplicableItems(this);
      contextMenu.show();
    }
  }

  /**
   * @override
   * @param {!Common.TextRange} range
   * @param {string} text
   * @param {string=} origin
   * @return {!Common.TextRange}
   */
  editRange(range, text, origin) {
    var newRange = super.editRange(range, text, origin);
    this.dispatchEventToListeners(
        SourceFrame.SourcesTextEditor.Events.TextChanged, {oldRange: range, newRange: newRange});

    if (Common.moduleSetting('textEditorAutoDetectIndent').get())
      this._onUpdateEditorIndentation();

    return newRange;
  }

  _onUpdateEditorIndentation() {
    this._setEditorIndentation(TextEditor.CodeMirrorUtils.pullLines(
        this.codeMirror(), SourceFrame.SourcesTextEditor.LinesToScanForIndentationGuessing));
  }

  /**
   * @param {!Array.<string>} lines
   */
  _setEditorIndentation(lines) {
    var extraKeys = {};
    var indent = Common.moduleSetting('textEditorIndent').get();
    if (Common.moduleSetting('textEditorAutoDetectIndent').get())
      indent = SourceFrame.SourcesTextEditor._guessIndentationLevel(lines);

    if (indent === Common.TextUtils.Indent.TabCharacter) {
      this.codeMirror().setOption('indentWithTabs', true);
      this.codeMirror().setOption('indentUnit', 4);
    } else {
      this.codeMirror().setOption('indentWithTabs', false);
      this.codeMirror().setOption('indentUnit', indent.length);
      extraKeys.Tab = function(codeMirror) {
        if (codeMirror.somethingSelected())
          return CodeMirror.Pass;
        var pos = codeMirror.getCursor('head');
        codeMirror.replaceRange(indent.substring(pos.ch % indent.length), codeMirror.getCursor());
      };
    }

    this.codeMirror().setOption('extraKeys', extraKeys);
    this._indentationLevel = indent;
  }

  /**
   * @return {string}
   */
  indent() {
    return this._indentationLevel;
  }

  _onAutoAppendedSpaces() {
    this._autoAppendedSpaces = this._autoAppendedSpaces || [];

    for (var i = 0; i < this._autoAppendedSpaces.length; ++i) {
      var position = this._autoAppendedSpaces[i].resolve();
      if (!position)
        continue;
      var line = this.line(position.lineNumber);
      if (line.length === position.columnNumber && Common.TextUtils.lineIndent(line).length === line.length) {
        this.codeMirror().replaceRange(
            '', new CodeMirror.Pos(position.lineNumber, 0),
            new CodeMirror.Pos(position.lineNumber, position.columnNumber));
      }
    }

    this._autoAppendedSpaces = [];
    var selections = this.selections();
    for (var i = 0; i < selections.length; ++i) {
      var selection = selections[i];
      this._autoAppendedSpaces.push(this.textEditorPositionHandle(selection.startLine, selection.startColumn));
    }
  }

  /**
   * @param {!CodeMirror} codeMirror
   * @param {!Array.<!CodeMirror.ChangeObject>} changes
   */
  _fireTextChanged(codeMirror, changes) {
    if (!changes.length || this._muteTextChangedEvent)
      return;
    var edits = [];
    var currentEdit;

    for (var changeIndex = 0; changeIndex < changes.length; ++changeIndex) {
      var changeObject = changes[changeIndex];
      var edit = TextEditor.CodeMirrorUtils.changeObjectToEditOperation(changeObject);
      if (currentEdit && edit.oldRange.equal(currentEdit.newRange)) {
        currentEdit.newRange = edit.newRange;
      } else {
        currentEdit = edit;
        edits.push(currentEdit);
      }
    }

    for (var i = 0; i < edits.length; ++i)
      this.dispatchEventToListeners(SourceFrame.SourcesTextEditor.Events.TextChanged, edits[i]);
  }

  _cursorActivity() {
    if (!this._isSearchActive())
      this.codeMirror().operation(this._tokenHighlighter.highlightSelectedTokens.bind(this._tokenHighlighter));

    var start = this.codeMirror().getCursor('anchor');
    var end = this.codeMirror().getCursor('head');
    this.dispatchEventToListeners(
        SourceFrame.SourcesTextEditor.Events.SelectionChanged, TextEditor.CodeMirrorUtils.toRange(start, end));
  }

  /**
   * @param {?Common.TextRange} from
   * @param {?Common.TextRange} to
   */
  _reportJump(from, to) {
    if (from && to && from.equal(to))
      return;
    this.dispatchEventToListeners(SourceFrame.SourcesTextEditor.Events.JumpHappened, {from: from, to: to});
  }

  _scroll() {
    var topmostLineNumber = this.codeMirror().lineAtHeight(this.codeMirror().getScrollInfo().top, 'local');
    this.dispatchEventToListeners(SourceFrame.SourcesTextEditor.Events.ScrollChanged, topmostLineNumber);
  }

  _focus() {
    this.dispatchEventToListeners(SourceFrame.SourcesTextEditor.Events.EditorFocused);
  }

  _blur() {
    this.dispatchEventToListeners(SourceFrame.SourcesTextEditor.Events.EditorBlurred);
  }

  /**
   * @param {!CodeMirror} codeMirror
   * @param {{ranges: !Array.<{head: !CodeMirror.Pos, anchor: !CodeMirror.Pos}>}} selection
   */
  _fireBeforeSelectionChanged(codeMirror, selection) {
    if (!this._isHandlingMouseDownEvent)
      return;
    if (!selection.ranges.length)
      return;

    var primarySelection = selection.ranges[0];
    this._reportJump(
        this.selection(), TextEditor.CodeMirrorUtils.toRange(primarySelection.anchor, primarySelection.head));
  }

  /**
   * @override
   */
  dispose() {
    super.dispose();
    Common.moduleSetting('textEditorIndent').removeChangeListener(this._onUpdateEditorIndentation, this);
    Common.moduleSetting('textEditorAutoDetectIndent').removeChangeListener(this._onUpdateEditorIndentation, this);
    Common.moduleSetting('showWhitespacesInEditor').removeChangeListener(this._updateWhitespace, this);
  }

  /**
   * @override
   * @param {string} text
   */
  setText(text) {
    this._muteTextChangedEvent = true;
    this._setEditorIndentation(
        text.split('\n').slice(0, SourceFrame.SourcesTextEditor.LinesToScanForIndentationGuessing));
    super.setText(text);
    delete this._muteTextChangedEvent;
  }

  _updateWhitespace() {
    this.setMimeType(this.mimeType());
  }

  /**
   * @override
   * @param {string} mimeType
   * @return {string}
   */
  rewriteMimeType(mimeType) {
    this._setupWhitespaceHighlight();
    var whitespaceMode = Common.moduleSetting('showWhitespacesInEditor').get();
    this.element.classList.toggle('show-whitespaces', whitespaceMode === 'all');

    if (whitespaceMode === 'all')
      return this._allWhitespaceOverlayMode(mimeType);
    else if (whitespaceMode === 'trailing')
      return this._trailingWhitespaceOverlayMode(mimeType);

    return mimeType;
  }

  /**
   * @param {string} mimeType
   * @return {string}
   */
  _allWhitespaceOverlayMode(mimeType) {
    var modeName = CodeMirror.mimeModes[mimeType] ?
        (CodeMirror.mimeModes[mimeType].name || CodeMirror.mimeModes[mimeType]) :
        CodeMirror.mimeModes['text/plain'];
    modeName += '+all-whitespaces';
    if (CodeMirror.modes[modeName])
      return modeName;

    function modeConstructor(config, parserConfig) {
      function nextToken(stream) {
        if (stream.peek() === ' ') {
          var spaces = 0;
          while (spaces < SourceFrame.SourcesTextEditor.MaximumNumberOfWhitespacesPerSingleSpan &&
                 stream.peek() === ' ') {
            ++spaces;
            stream.next();
          }
          return 'whitespace whitespace-' + spaces;
        }
        while (!stream.eol() && stream.peek() !== ' ')
          stream.next();
        return null;
      }
      var whitespaceMode = {token: nextToken};
      return CodeMirror.overlayMode(CodeMirror.getMode(config, mimeType), whitespaceMode, false);
    }
    CodeMirror.defineMode(modeName, modeConstructor);
    return modeName;
  }

  /**
   * @param {string} mimeType
   * @return {string}
   */
  _trailingWhitespaceOverlayMode(mimeType) {
    var modeName = CodeMirror.mimeModes[mimeType] ?
        (CodeMirror.mimeModes[mimeType].name || CodeMirror.mimeModes[mimeType]) :
        CodeMirror.mimeModes['text/plain'];
    modeName += '+trailing-whitespaces';
    if (CodeMirror.modes[modeName])
      return modeName;

    function modeConstructor(config, parserConfig) {
      function nextToken(stream) {
        if (stream.match(/^\s+$/, true))
          return true ? 'trailing-whitespace' : null;
        do
          stream.next();
        while (!stream.eol() && stream.peek() !== ' ');
        return null;
      }
      var whitespaceMode = {token: nextToken};
      return CodeMirror.overlayMode(CodeMirror.getMode(config, mimeType), whitespaceMode, false);
    }
    CodeMirror.defineMode(modeName, modeConstructor);
    return modeName;
  }

  _setupWhitespaceHighlight() {
    var doc = this.element.ownerDocument;
    if (doc._codeMirrorWhitespaceStyleInjected || !Common.moduleSetting('showWhitespacesInEditor').get())
      return;
    doc._codeMirrorWhitespaceStyleInjected = true;
    const classBase = '.show-whitespaces .CodeMirror .cm-whitespace-';
    const spaceChar = '·';
    var spaceChars = '';
    var rules = '';
    for (var i = 1; i <= SourceFrame.SourcesTextEditor.MaximumNumberOfWhitespacesPerSingleSpan; ++i) {
      spaceChars += spaceChar;
      var rule = classBase + i + '::before { content: \'' + spaceChars + '\';}\n';
      rules += rule;
    }
    var style = doc.createElement('style');
    style.textContent = rules;
    doc.head.appendChild(style);
  }
};

/** @typedef {{lineNumber: number, event: !Event}} */
SourceFrame.SourcesTextEditor.GutterClickEventData;

/** @enum {symbol} */
SourceFrame.SourcesTextEditor.Events = {
  GutterClick: Symbol('GutterClick'),
  TextChanged: Symbol('TextChanged'),
  SelectionChanged: Symbol('SelectionChanged'),
  ScrollChanged: Symbol('ScrollChanged'),
  EditorFocused: Symbol('EditorFocused'),
  EditorBlurred: Symbol('EditorBlurred'),
  JumpHappened: Symbol('JumpHappened')
};

/**
 * @interface
 */
SourceFrame.SourcesTextEditorDelegate = function() {};
SourceFrame.SourcesTextEditorDelegate.prototype = {
  /**
   * @param {!UI.ContextMenu} contextMenu
   * @param {number} lineNumber
   * @return {!Promise}
   */
  populateLineGutterContextMenu(contextMenu, lineNumber) {},

  /**
   * @param {!UI.ContextMenu} contextMenu
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!Promise}
   */
  populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber) {},
};

/**
 * @param {!CodeMirror} codeMirror
 */
CodeMirror.commands.smartNewlineAndIndent = function(codeMirror) {
  codeMirror.operation(innerSmartNewlineAndIndent.bind(null, codeMirror));
  function innerSmartNewlineAndIndent(codeMirror) {
    var selections = codeMirror.listSelections();
    var replacements = [];
    for (var i = 0; i < selections.length; ++i) {
      var selection = selections[i];
      var cur = CodeMirror.cmpPos(selection.head, selection.anchor) < 0 ? selection.head : selection.anchor;
      var line = codeMirror.getLine(cur.line);
      var indent = Common.TextUtils.lineIndent(line);
      replacements.push('\n' + indent.substring(0, Math.min(cur.ch, indent.length)));
    }
    codeMirror.replaceSelections(replacements);
    codeMirror._codeMirrorTextEditor._onAutoAppendedSpaces();
  }
};

/**
 * @return {!Object|undefined}
 */
CodeMirror.commands.sourcesDismiss = function(codemirror) {
  if (codemirror.listSelections().length === 1 && codemirror._codeMirrorTextEditor._isSearchActive())
    return CodeMirror.Pass;
  return CodeMirror.commands.dismiss(codemirror);
};

SourceFrame.SourcesTextEditor._BlockIndentController = {
  name: 'blockIndentKeymap',

  /**
   * @return {*}
   */
  Enter: function(codeMirror) {
    var selections = codeMirror.listSelections();
    var replacements = [];
    var allSelectionsAreCollapsedBlocks = false;
    for (var i = 0; i < selections.length; ++i) {
      var selection = selections[i];
      var start = CodeMirror.cmpPos(selection.head, selection.anchor) < 0 ? selection.head : selection.anchor;
      var line = codeMirror.getLine(start.line);
      var indent = Common.TextUtils.lineIndent(line);
      var indentToInsert = '\n' + indent + codeMirror._codeMirrorTextEditor.indent();
      var isCollapsedBlock = false;
      if (selection.head.ch === 0)
        return CodeMirror.Pass;
      if (line.substr(selection.head.ch - 1, 2) === '{}') {
        indentToInsert += '\n' + indent;
        isCollapsedBlock = true;
      } else if (line.substr(selection.head.ch - 1, 1) !== '{') {
        return CodeMirror.Pass;
      }
      if (i > 0 && allSelectionsAreCollapsedBlocks !== isCollapsedBlock)
        return CodeMirror.Pass;
      replacements.push(indentToInsert);
      allSelectionsAreCollapsedBlocks = isCollapsedBlock;
    }
    codeMirror.replaceSelections(replacements);
    if (!allSelectionsAreCollapsedBlocks) {
      codeMirror._codeMirrorTextEditor._onAutoAppendedSpaces();
      return;
    }
    selections = codeMirror.listSelections();
    var updatedSelections = [];
    for (var i = 0; i < selections.length; ++i) {
      var selection = selections[i];
      var line = codeMirror.getLine(selection.head.line - 1);
      var position = new CodeMirror.Pos(selection.head.line - 1, line.length);
      updatedSelections.push({head: position, anchor: position});
    }
    codeMirror.setSelections(updatedSelections);
    codeMirror._codeMirrorTextEditor._onAutoAppendedSpaces();
  },

  /**
   * @return {*}
   */
  '\'}\'': function(codeMirror) {
    if (codeMirror.somethingSelected())
      return CodeMirror.Pass;
    var selections = codeMirror.listSelections();
    var replacements = [];
    for (var i = 0; i < selections.length; ++i) {
      var selection = selections[i];
      var line = codeMirror.getLine(selection.head.line);
      if (line !== Common.TextUtils.lineIndent(line))
        return CodeMirror.Pass;
      replacements.push('}');
    }
    codeMirror.replaceSelections(replacements);
    selections = codeMirror.listSelections();
    replacements = [];
    var updatedSelections = [];
    for (var i = 0; i < selections.length; ++i) {
      var selection = selections[i];
      var matchingBracket = codeMirror.findMatchingBracket(selection.head);
      if (!matchingBracket || !matchingBracket.match)
        return;
      updatedSelections.push({head: selection.head, anchor: new CodeMirror.Pos(selection.head.line, 0)});
      var line = codeMirror.getLine(matchingBracket.to.line);
      var indent = Common.TextUtils.lineIndent(line);
      replacements.push(indent + '}');
    }
    codeMirror.setSelections(updatedSelections);
    codeMirror.replaceSelections(replacements);
  }
};


/**
 * @unrestricted
 */
SourceFrame.SourcesTextEditor.TokenHighlighter = class {
  /**
   * @param {!SourceFrame.SourcesTextEditor} textEditor
   * @param {!CodeMirror} codeMirror
   */
  constructor(textEditor, codeMirror) {
    this._textEditor = textEditor;
    this._codeMirror = codeMirror;
  }

  /**
   * @param {!RegExp} regex
   * @param {?Common.TextRange} range
   */
  highlightSearchResults(regex, range) {
    var oldRegex = this._highlightRegex;
    this._highlightRegex = regex;
    this._highlightRange = range;
    if (this._searchResultMarker) {
      this._searchResultMarker.clear();
      delete this._searchResultMarker;
    }
    if (this._highlightDescriptor && this._highlightDescriptor.selectionStart)
      this._codeMirror.removeLineClass(this._highlightDescriptor.selectionStart.line, 'wrap', 'cm-line-with-selection');
    var selectionStart = this._highlightRange ?
        new CodeMirror.Pos(this._highlightRange.startLine, this._highlightRange.startColumn) :
        null;
    if (selectionStart)
      this._codeMirror.addLineClass(selectionStart.line, 'wrap', 'cm-line-with-selection');
    if (oldRegex && this._highlightRegex.toString() === oldRegex.toString()) {
      // Do not re-add overlay mode if regex did not change for better performance.
      if (this._highlightDescriptor)
        this._highlightDescriptor.selectionStart = selectionStart;
    } else {
      this._removeHighlight();
      this._setHighlighter(this._searchHighlighter.bind(this, this._highlightRegex), selectionStart);
    }
    if (this._highlightRange) {
      var pos = TextEditor.CodeMirrorUtils.toPos(this._highlightRange);
      this._searchResultMarker = this._codeMirror.markText(pos.start, pos.end, {className: 'cm-column-with-selection'});
    }
  }

  /**
   * @return {!RegExp|undefined}
   */
  highlightedRegex() {
    return this._highlightRegex;
  }

  highlightSelectedTokens() {
    delete this._highlightRegex;
    delete this._highlightRange;
    if (this._highlightDescriptor && this._highlightDescriptor.selectionStart)
      this._codeMirror.removeLineClass(this._highlightDescriptor.selectionStart.line, 'wrap', 'cm-line-with-selection');
    this._removeHighlight();
    var selectionStart = this._codeMirror.getCursor('start');
    var selectionEnd = this._codeMirror.getCursor('end');
    if (selectionStart.line !== selectionEnd.line)
      return;
    if (selectionStart.ch === selectionEnd.ch)
      return;
    var selections = this._codeMirror.getSelections();
    if (selections.length > 1)
      return;
    var selectedText = selections[0];
    if (this._isWord(selectedText, selectionStart.line, selectionStart.ch, selectionEnd.ch)) {
      if (selectionStart)
        this._codeMirror.addLineClass(selectionStart.line, 'wrap', 'cm-line-with-selection');
      this._setHighlighter(this._tokenHighlighter.bind(this, selectedText, selectionStart), selectionStart);
    }
  }

  /**
   * @param {string} selectedText
   * @param {number} lineNumber
   * @param {number} startColumn
   * @param {number} endColumn
   */
  _isWord(selectedText, lineNumber, startColumn, endColumn) {
    var line = this._codeMirror.getLine(lineNumber);
    var leftBound = startColumn === 0 || !Common.TextUtils.isWordChar(line.charAt(startColumn - 1));
    var rightBound = endColumn === line.length || !Common.TextUtils.isWordChar(line.charAt(endColumn));
    return leftBound && rightBound && Common.TextUtils.isWord(selectedText);
  }

  _removeHighlight() {
    if (this._highlightDescriptor) {
      this._codeMirror.removeOverlay(this._highlightDescriptor.overlay);
      delete this._highlightDescriptor;
    }
  }

  /**
   * @param {!RegExp} regex
   * @param {!CodeMirror.StringStream} stream
   */
  _searchHighlighter(regex, stream) {
    if (stream.column() === 0)
      delete this._searchMatchLength;
    if (this._searchMatchLength) {
      if (this._searchMatchLength > 2) {
        for (var i = 0; i < this._searchMatchLength - 2; ++i)
          stream.next();
        this._searchMatchLength = 1;
        return 'search-highlight';
      } else {
        stream.next();
        delete this._searchMatchLength;
        return 'search-highlight search-highlight-end';
      }
    }
    var match = stream.match(regex, false);
    if (match) {
      stream.next();
      var matchLength = match[0].length;
      if (matchLength === 1)
        return 'search-highlight search-highlight-full';
      this._searchMatchLength = matchLength;
      return 'search-highlight search-highlight-start';
    }
    while (!stream.match(regex, false) && stream.next()) {
    }
  }

  /**
   * @param {string} token
   * @param {!CodeMirror.Pos} selectionStart
   * @param {!CodeMirror.StringStream} stream
   */
  _tokenHighlighter(token, selectionStart, stream) {
    var tokenFirstChar = token.charAt(0);
    if (stream.match(token) && (stream.eol() || !Common.TextUtils.isWordChar(stream.peek())))
      return stream.column() === selectionStart.ch ? 'token-highlight column-with-selection' : 'token-highlight';
    var eatenChar;
    do
      eatenChar = stream.next();
    while (eatenChar && (Common.TextUtils.isWordChar(eatenChar) || stream.peek() !== tokenFirstChar));
  }

  /**
   * @param {function(!CodeMirror.StringStream)} highlighter
   * @param {?CodeMirror.Pos} selectionStart
   */
  _setHighlighter(highlighter, selectionStart) {
    var overlayMode = {token: highlighter};
    this._codeMirror.addOverlay(overlayMode);
    this._highlightDescriptor = {overlay: overlayMode, selectionStart: selectionStart};
  }
};

SourceFrame.SourcesTextEditor.LinesToScanForIndentationGuessing = 1000;
SourceFrame.SourcesTextEditor.MaximumNumberOfWhitespacesPerSingleSpan = 16;
