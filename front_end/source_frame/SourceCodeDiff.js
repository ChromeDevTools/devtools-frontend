// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
SourceFrame.SourceCodeDiff = class {
  /**
   * @param {!Promise<?string>} diffBaseline
   * @param {!TextEditor.CodeMirrorTextEditor} textEditor
   */
  constructor(diffBaseline, textEditor) {
    this._textEditor = textEditor;
    this._decorations = [];
    this._textEditor.installGutter(SourceFrame.SourceCodeDiff.DiffGutterType, true);
    this._diffBaseline = diffBaseline;
    /** @type {!Array<!TextEditor.TextEditorPositionHandle>}*/
    this._animatedLines = [];
  }

  updateDiffMarkersWhenPossible() {
    if (this._updateTimeout)
      clearTimeout(this._updateTimeout);
    this._updateTimeout =
        setTimeout(this.updateDiffMarkersImmediately.bind(this), SourceFrame.SourceCodeDiff.UpdateTimeout);
  }

  updateDiffMarkersImmediately() {
    if (this._updateTimeout)
      clearTimeout(this._updateTimeout);
    this._updateTimeout = null;
    this._diffBaseline.then(this._innerUpdate.bind(this));
  }

  /**
   * @param {?string} oldContent
   * @param {?string} newContent
   */
  highlightModifiedLines(oldContent, newContent) {
    if (typeof oldContent !== 'string' || typeof newContent !== 'string')
      return;

    var diff = this._computeDiff(oldContent, newContent);
    var changedLines = [];
    for (var i = 0; i < diff.length; ++i) {
      var diffEntry = diff[i];
      if (diffEntry.type === SourceFrame.SourceCodeDiff.GutterDecorationType.Delete)
        continue;
      for (var lineNumber = diffEntry.from; lineNumber < diffEntry.to; ++lineNumber) {
        var position = this._textEditor.textEditorPositionHandle(lineNumber, 0);
        if (position)
          changedLines.push(position);
      }
    }
    this._updateHighlightedLines(changedLines);
    this._animationTimeout = setTimeout(
        this._updateHighlightedLines.bind(this, []), 400);  // // Keep this timeout in sync with sourcesView.css.
  }

  /**
   * @param {!Array<!TextEditor.TextEditorPositionHandle>} newLines
   */
  _updateHighlightedLines(newLines) {
    if (this._animationTimeout)
      clearTimeout(this._animationTimeout);
    this._animationTimeout = null;
    this._textEditor.operation(operation.bind(this));

    /**
     * @this {SourceFrame.SourceCodeDiff}
     */
    function operation() {
      toggleLines.call(this, false);
      this._animatedLines = newLines;
      toggleLines.call(this, true);
    }

    /**
     * @param {boolean} value
     * @this {SourceFrame.SourceCodeDiff}
     */
    function toggleLines(value) {
      for (var i = 0; i < this._animatedLines.length; ++i) {
        var location = this._animatedLines[i].resolve();
        if (location)
          this._textEditor.toggleLineClass(location.lineNumber, 'highlight-line-modification', value);
      }
    }
  }

  /**
   * @param {!Array<!SourceFrame.SourceCodeDiff.GutterDecoration>} removed
   * @param {!Array<!SourceFrame.SourceCodeDiff.GutterDecoration>} added
   */
  _updateDecorations(removed, added) {
    this._textEditor.operation(operation);

    function operation() {
      for (var decoration of removed)
        decoration.remove();
      for (var decoration of added)
        decoration.install();
    }
  }

  /**
   * @param {string} baseline
   * @param {string} current
   * @return {!Array<!{type: !SourceFrame.SourceCodeDiff.GutterDecorationType, from: number, to: number}>}
   */
  _computeDiff(baseline, current) {
    var diff = Diff.Diff.lineDiff(baseline.split('\n'), current.split('\n'));
    var result = [];
    var hasAdded = false;
    var hasRemoved = false;
    var blockStartLineNumber = 0;
    var currentLineNumber = 0;
    var isInsideBlock = false;
    for (var i = 0; i < diff.length; ++i) {
      var token = diff[i];
      if (token[0] === Diff.Diff.Operation.Equal) {
        if (isInsideBlock)
          flush();
        currentLineNumber += token[1].length;
        continue;
      }

      if (!isInsideBlock) {
        isInsideBlock = true;
        blockStartLineNumber = currentLineNumber;
      }

      if (token[0] === Diff.Diff.Operation.Delete) {
        hasRemoved = true;
      } else {
        currentLineNumber += token[1].length;
        hasAdded = true;
      }
    }
    if (isInsideBlock)
      flush();
    if (result.length > 1 && result[0].from === 0 && result[1].from === 0) {
      var merged = {type: SourceFrame.SourceCodeDiff.GutterDecorationType.Modify, from: 0, to: result[1].to};
      result.splice(0, 2, merged);
    }
    return result;

    function flush() {
      var type = SourceFrame.SourceCodeDiff.GutterDecorationType.Insert;
      var from = blockStartLineNumber;
      var to = currentLineNumber;
      if (hasAdded && hasRemoved) {
        type = SourceFrame.SourceCodeDiff.GutterDecorationType.Modify;
      } else if (!hasAdded && hasRemoved && from === 0 && to === 0) {
        type = SourceFrame.SourceCodeDiff.GutterDecorationType.Modify;
        to = 1;
      } else if (!hasAdded && hasRemoved) {
        type = SourceFrame.SourceCodeDiff.GutterDecorationType.Delete;
        from -= 1;
      }
      result.push({type: type, from: from, to: to});
      isInsideBlock = false;
      hasAdded = false;
      hasRemoved = false;
    }
  }

  /**
   * @param {?string} baseline
   */
  _innerUpdate(baseline) {
    var current = this._textEditor.text();
    if (typeof baseline !== 'string') {
      this._updateDecorations(this._decorations, [] /* added */);
      this._decorations = [];
      return;
    }

    var diff = this._computeDiff(baseline, current);

    /** @type {!Map<number, !SourceFrame.SourceCodeDiff.GutterDecoration>} */
    var oldDecorations = new Map();
    for (var i = 0; i < this._decorations.length; ++i) {
      var decoration = this._decorations[i];
      var lineNumber = decoration.lineNumber();
      if (lineNumber === -1)
        continue;
      oldDecorations.set(lineNumber, decoration);
    }

    /** @type {!Map<number, !{lineNumber: number, type: !SourceFrame.SourceCodeDiff.GutterDecorationType}>} */
    var newDecorations = new Map();
    for (var i = 0; i < diff.length; ++i) {
      var diffEntry = diff[i];
      for (var lineNumber = diffEntry.from; lineNumber < diffEntry.to; ++lineNumber)
        newDecorations.set(lineNumber, {lineNumber: lineNumber, type: diffEntry.type});
    }

    var decorationDiff = oldDecorations.diff(newDecorations, (e1, e2) => e1.type === e2.type);
    var addedDecorations = decorationDiff.added.map(
        entry => new SourceFrame.SourceCodeDiff.GutterDecoration(this._textEditor, entry.lineNumber, entry.type));

    this._decorations = decorationDiff.equal.concat(addedDecorations);
    this._updateDecorations(decorationDiff.removed, addedDecorations);
    this._decorationsSetForTest(newDecorations);
  }

  /**
   * @param {!Map<number, !{lineNumber: number, type: !SourceFrame.SourceCodeDiff.GutterDecorationType}>} decorations
   */
  _decorationsSetForTest(decorations) {
  }
};

/** @type {number} */
SourceFrame.SourceCodeDiff.UpdateTimeout = 200;

/** @type {string} */
SourceFrame.SourceCodeDiff.DiffGutterType = 'CodeMirror-gutter-diff';

/** @enum {symbol} */
SourceFrame.SourceCodeDiff.GutterDecorationType = {
  Insert: Symbol('Insert'),
  Delete: Symbol('Delete'),
  Modify: Symbol('Modify'),
};

/**
 * @unrestricted
 */
SourceFrame.SourceCodeDiff.GutterDecoration = class {
  /**
   * @param {!TextEditor.CodeMirrorTextEditor} textEditor
   * @param {number} lineNumber
   * @param {!SourceFrame.SourceCodeDiff.GutterDecorationType} type
   */
  constructor(textEditor, lineNumber, type) {
    this._textEditor = textEditor;
    this._position = this._textEditor.textEditorPositionHandle(lineNumber, 0);
    this._className = '';
    if (type === SourceFrame.SourceCodeDiff.GutterDecorationType.Insert)
      this._className = 'diff-entry-insert';
    else if (type === SourceFrame.SourceCodeDiff.GutterDecorationType.Delete)
      this._className = 'diff-entry-delete';
    else if (type === SourceFrame.SourceCodeDiff.GutterDecorationType.Modify)
      this._className = 'diff-entry-modify';
    this.type = type;
  }

  /**
   * @return {number}
   */
  lineNumber() {
    var location = this._position.resolve();
    if (!location)
      return -1;
    return location.lineNumber;
  }

  install() {
    var location = this._position.resolve();
    if (!location)
      return;
    var element = createElementWithClass('div', 'diff-marker');
    element.textContent = '\u00A0';
    this._textEditor.setGutterDecoration(location.lineNumber, SourceFrame.SourceCodeDiff.DiffGutterType, element);
    this._textEditor.toggleLineClass(location.lineNumber, this._className, true);
  }

  remove() {
    var location = this._position.resolve();
    if (!location)
      return;
    this._textEditor.setGutterDecoration(location.lineNumber, SourceFrame.SourceCodeDiff.DiffGutterType, null);
    this._textEditor.toggleLineClass(location.lineNumber, this._className, false);
  }
};
