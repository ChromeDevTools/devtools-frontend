/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
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
TextEditor.CodeMirrorUtils = class extends UI.InplaceEditor {
  constructor() {
    super();
  }

  /**
   * @param {!Common.TextRange} range
   * @return {!{start: !CodeMirror.Pos, end: !CodeMirror.Pos}}
   */
  static toPos(range) {
    return {
      start: new CodeMirror.Pos(range.startLine, range.startColumn),
      end: new CodeMirror.Pos(range.endLine, range.endColumn)
    };
  }

  /**
   * @param {!CodeMirror.Pos} start
   * @param {!CodeMirror.Pos} end
   * @return {!Common.TextRange}
   */
  static toRange(start, end) {
    return new Common.TextRange(start.line, start.ch, end.line, end.ch);
  }

  /**
   * @param {!CodeMirror.ChangeObject} changeObject
   * @return {{oldRange: !Common.TextRange, newRange: !Common.TextRange}}
   */
  static changeObjectToEditOperation(changeObject) {
    var oldRange = TextEditor.CodeMirrorUtils.toRange(changeObject.from, changeObject.to);
    var newRange = oldRange.clone();
    var linesAdded = changeObject.text.length;
    if (linesAdded === 0) {
      newRange.endLine = newRange.startLine;
      newRange.endColumn = newRange.startColumn;
    } else if (linesAdded === 1) {
      newRange.endLine = newRange.startLine;
      newRange.endColumn = newRange.startColumn + changeObject.text[0].length;
    } else {
      newRange.endLine = newRange.startLine + linesAdded - 1;
      newRange.endColumn = changeObject.text[linesAdded - 1].length;
    }
    return {oldRange: oldRange, newRange: newRange};
  }

  /**
   * @param {!CodeMirror} codeMirror
   * @param {number} linesCount
   * @return {!Array.<string>}
   */
  static pullLines(codeMirror, linesCount) {
    var lines = [];
    codeMirror.eachLine(0, linesCount, onLineHandle);
    return lines;

    /**
     * @param {!{text: string}} lineHandle
     */
    function onLineHandle(lineHandle) {
      lines.push(lineHandle.text);
    }
  }

  /**
   * @param {!Element} element
   */
  static appendThemeStyle(element) {
    if (UI.themeSupport.hasTheme())
      return;
    var backgroundColor = InspectorFrontendHost.getSelectionBackgroundColor();
    var backgroundColorRule =
        backgroundColor ? '.CodeMirror .CodeMirror-selected { background-color: ' + backgroundColor + ';}' : '';
    var foregroundColor = InspectorFrontendHost.getSelectionForegroundColor();
    var foregroundColorRule = foregroundColor ?
        '.CodeMirror .CodeMirror-selectedtext:not(.CodeMirror-persist-highlight) { color: ' + foregroundColor +
            '!important;}' :
        '';

    var selectionRule = (foregroundColor && backgroundColor) ?
        '.CodeMirror-line::selection, .CodeMirror-line > span::selection, .CodeMirror-line > span > span::selection { background: ' +
            backgroundColor + '; color: ' + foregroundColor + ' !important }' :
        '';
    var style = createElement('style');
    if (foregroundColorRule || backgroundColorRule)
      style.textContent = backgroundColorRule + foregroundColorRule + selectionRule;
    element.appendChild(style);
  }

  /**
   * @override
   * @return {string}
   */
  editorContent(editingContext) {
    return editingContext.codeMirror.getValue();
  }

  /**
   * @param {!Event} e
   */
  _consumeCopy(e) {
    e.consume();
  }

  /**
   * @override
   */
  setUpEditor(editingContext) {
    var element = editingContext.element;
    var config = editingContext.config;
    editingContext.cssLoadView = new TextEditor.CodeMirrorCSSLoadView();
    editingContext.cssLoadView.show(element);
    element.focus();
    element.addEventListener('copy', this._consumeCopy, false);
    var codeMirror = new window.CodeMirror(element, {
      mode: config.mode,
      lineWrapping: config.lineWrapping,
      lineWiseCopyCut: false,
      smartIndent: config.smartIndent,
      autofocus: true,
      theme: config.theme,
      value: config.initialValue
    });
    codeMirror.getWrapperElement().classList.add('source-code');
    codeMirror.on('cursorActivity', function(cm) {
      cm.display.cursorDiv.scrollIntoViewIfNeeded(false);
    });
    editingContext.codeMirror = codeMirror;
  }

  /**
   * @override
   */
  closeEditor(editingContext) {
    editingContext.element.removeEventListener('copy', this._consumeCopy, false);
    editingContext.cssLoadView.detach();
  }

  /**
   * @override
   */
  cancelEditing(editingContext) {
    editingContext.codeMirror.setValue(editingContext.oldText);
  }

  /**
   * @override
   */
  augmentEditingHandle(editingContext, handle) {
    function setWidth(editingContext, width) {
      var padding = 30;
      var codeMirror = editingContext.codeMirror;
      codeMirror.getWrapperElement().style.width = (width - codeMirror.getWrapperElement().offsetLeft - padding) + 'px';
      codeMirror.refresh();
    }

    handle.codeMirror = editingContext.codeMirror;
    handle.setWidth = setWidth.bind(null, editingContext);
  }
};


/**
 * @implements {Common.TokenizerFactory}
 * @unrestricted
 */
TextEditor.CodeMirrorUtils.TokenizerFactory = class {
  /**
   * @override
   * @param {string} mimeType
   * @return {function(string, function(string, ?string, number, number))}
   */
  createTokenizer(mimeType) {
    var mode = CodeMirror.getMode({indentUnit: 2}, mimeType);
    var state = CodeMirror.startState(mode);
    function tokenize(line, callback) {
      var stream = new CodeMirror.StringStream(line);
      while (!stream.eol()) {
        var style = mode.token(stream, state);
        var value = stream.current();
        callback(value, style, stream.start, stream.start + value.length);
        stream.start = stream.pos;
      }
    }
    return tokenize;
  }
};

/**
 * @unrestricted
 */
TextEditor.CodeMirrorCSSLoadView = class extends UI.VBox {
  /**
   * This bogus view is needed to load/unload CodeMirror-related CSS on demand.
   */
  constructor() {
    super();
    this.element.classList.add('hidden');
    this.registerRequiredCSS('cm/codemirror.css');
    this.registerRequiredCSS('text_editor/cmdevtools.css');
    TextEditor.CodeMirrorUtils.appendThemeStyle(this.element);
  }
};
