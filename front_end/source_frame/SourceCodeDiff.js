// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
SourceFrame.SourceCodeDiff = class {
  /**
   * @param {!WorkspaceDiff.WorkspaceDiff} workspaceDiff
   * @param {!TextEditor.CodeMirrorTextEditor} textEditor
   */
  constructor(workspaceDiff, textEditor) {
    this._textEditor = textEditor;
    this._decorations = [];
    this._textEditor.installGutter(SourceFrame.SourceCodeDiff.DiffGutterType, true);
    this._uiSourceCode = null;
    this._workspaceDiff = workspaceDiff;
    /** @type {!Array<!TextEditor.TextEditorPositionHandle>}*/
    this._animatedLines = [];

    this._update();
  }

  /**
   * @param {?Workspace.UISourceCode} uiSourceCode
   */
  setUISourceCode(uiSourceCode) {
    if (uiSourceCode === this._uiSourceCode)
      return;
    if (this._uiSourceCode)
      this._workspaceDiff.unsubscribeFromDiffChange(this._uiSourceCode, this._update, this);
    if (uiSourceCode)
      this._workspaceDiff.subscribeToDiffChange(uiSourceCode, this._update, this);
    this._uiSourceCode = uiSourceCode;
    this._update();
  }

  /**
   * @param {?string} oldContent
   * @param {?string} newContent
   */
  highlightModifiedLines(oldContent, newContent) {
    if (typeof oldContent !== 'string' || typeof newContent !== 'string')
      return;

    const diff = this._computeDiff(Diff.Diff.lineDiff(oldContent.split('\n'), newContent.split('\n')));
    const changedLines = [];
    for (let i = 0; i < diff.length; ++i) {
      const diffEntry = diff[i];
      if (diffEntry.type === SourceFrame.SourceCodeDiff.GutterDecorationType.Delete)
        continue;
      for (let lineNumber = diffEntry.from; lineNumber < diffEntry.to; ++lineNumber) {
        const position = this._textEditor.textEditorPositionHandle(lineNumber, 0);
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
      for (let i = 0; i < this._animatedLines.length; ++i) {
        const location = this._animatedLines[i].resolve();
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
      for (const decoration of removed)
        decoration.remove();
      for (const decoration of added)
        decoration.install();
    }
  }

  /**
   * @param {!Diff.Diff.DiffArray} diff
   * @return {!Array<!{type: !SourceFrame.SourceCodeDiff.GutterDecorationType, from: number, to: number}>}
   */
  _computeDiff(diff) {
    const result = [];
    let hasAdded = false;
    let hasRemoved = false;
    let blockStartLineNumber = 0;
    let currentLineNumber = 0;
    let isInsideBlock = false;
    for (let i = 0; i < diff.length; ++i) {
      const token = diff[i];
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
      const merged = {type: SourceFrame.SourceCodeDiff.GutterDecorationType.Modify, from: 0, to: result[1].to};
      result.splice(0, 2, merged);
    }
    return result;

    function flush() {
      let type = SourceFrame.SourceCodeDiff.GutterDecorationType.Insert;
      let from = blockStartLineNumber;
      let to = currentLineNumber;
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

  _update() {
    if (this._uiSourceCode)
      this._workspaceDiff.requestDiff(this._uiSourceCode).then(this._innerUpdate.bind(this));
    else
      this._innerUpdate(null);
  }

  /**
   * @param {?Diff.Diff.DiffArray} lineDiff
   */
  _innerUpdate(lineDiff) {
    if (!lineDiff) {
      this._updateDecorations(this._decorations, []);
      this._decorations = [];
      return;
    }

    /** @type {!Map<number, !SourceFrame.SourceCodeDiff.GutterDecoration>} */
    const oldDecorations = new Map();
    for (let i = 0; i < this._decorations.length; ++i) {
      const decoration = this._decorations[i];
      const lineNumber = decoration.lineNumber();
      if (lineNumber === -1)
        continue;
      oldDecorations.set(lineNumber, decoration);
    }

    const diff = this._computeDiff(lineDiff);

    /** @type {!Map<number, !{lineNumber: number, type: !SourceFrame.SourceCodeDiff.GutterDecorationType}>} */
    const newDecorations = new Map();
    for (let i = 0; i < diff.length; ++i) {
      const diffEntry = diff[i];
      for (let lineNumber = diffEntry.from; lineNumber < diffEntry.to; ++lineNumber)
        newDecorations.set(lineNumber, {lineNumber: lineNumber, type: diffEntry.type});
    }

    const decorationDiff = oldDecorations.diff(newDecorations, (e1, e2) => e1.type === e2.type);
    const addedDecorations = decorationDiff.added.map(
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

  dispose() {
    if (this._uiSourceCode)
      WorkspaceDiff.workspaceDiff().unsubscribeFromDiffChange(this._uiSourceCode, this._update, this);
  }
};

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
    const location = this._position.resolve();
    if (!location)
      return -1;
    return location.lineNumber;
  }

  install() {
    const location = this._position.resolve();
    if (!location)
      return;
    const element = createElementWithClass('div', 'diff-marker');
    element.textContent = '\u00A0';
    this._textEditor.setGutterDecoration(location.lineNumber, SourceFrame.SourceCodeDiff.DiffGutterType, element);
    this._textEditor.toggleLineClass(location.lineNumber, this._className, true);
  }

  remove() {
    const location = this._position.resolve();
    if (!location)
      return;
    this._textEditor.setGutterDecoration(location.lineNumber, SourceFrame.SourceCodeDiff.DiffGutterType, null);
    this._textEditor.toggleLineClass(location.lineNumber, this._className, false);
  }
};
