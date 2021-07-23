// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Diff from '../../../../third_party/diff/diff.js';
import type * as TextEditor from '../text_editor/text_editor.js';
import type {SourcesTextEditor} from './SourcesTextEditor.js';

export class SourceCodeDiff {
  _textEditor: SourcesTextEditor;
  _animatedLines: TextEditor.CodeMirrorTextEditor.TextEditorPositionHandle[];
  _animationTimeout: number|null;
  constructor(textEditor: SourcesTextEditor) {
    this._textEditor = textEditor;
    this._animatedLines = [];
    this._animationTimeout = null;
  }

  highlightModifiedLines(oldContent: string|null, newContent: string|null): void {
    if (typeof oldContent !== 'string' || typeof newContent !== 'string') {
      return;
    }

    const diff =
        SourceCodeDiff.computeDiff(Diff.Diff.DiffWrapper.lineDiff(oldContent.split('\n'), newContent.split('\n')));
    const changedLines = [];
    for (let i = 0; i < diff.length; ++i) {
      const diffEntry = diff[i];
      if (diffEntry.type === EditType.Delete) {
        continue;
      }
      for (let lineNumber = diffEntry.from; lineNumber < diffEntry.to; ++lineNumber) {
        const position = this._textEditor.textEditorPositionHandle(lineNumber, 0);
        if (position) {
          changedLines.push(position);
        }
      }
    }
    this._updateHighlightedLines(changedLines);
    this._animationTimeout = window.setTimeout(
        this._updateHighlightedLines.bind(this, []), 400);  // // Keep this timeout in sync with sourcesView.css.
  }

  _updateHighlightedLines(newLines: TextEditor.CodeMirrorTextEditor.TextEditorPositionHandle[]): void {
    if (this._animationTimeout) {
      clearTimeout(this._animationTimeout);
    }
    this._animationTimeout = null;
    this._textEditor.operation(operation.bind(this));

    function operation(this: SourceCodeDiff): void {
      toggleLines.call(this, false);
      this._animatedLines = newLines;
      toggleLines.call(this, true);
    }

    function toggleLines(this: SourceCodeDiff, value: boolean): void {
      for (let i = 0; i < this._animatedLines.length; ++i) {
        const location = this._animatedLines[i].resolve();
        if (location) {
          this._textEditor.toggleLineClass(location.lineNumber, 'highlight-line-modification', value);
        }
      }
    }
  }

  static computeDiff(diff: Diff.Diff.DiffArray): {
    type: EditType,
    from: number,
    to: number,
  }[] {
    const result: {
      type: EditType,
      from: number,
      to: number,
    }[] = [];
    let hasAdded = false;
    let hasRemoved = false;
    let blockStartLineNumber = 0;
    let currentLineNumber = 0;
    let isInsideBlock = false;
    for (let i = 0; i < diff.length; ++i) {
      const token = diff[i];
      if (token[0] === Diff.Diff.Operation.Equal) {
        if (isInsideBlock) {
          flush();
        }
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
    if (isInsideBlock) {
      flush();
    }
    if (result.length > 1 && result[0].from === 0 && result[1].from === 0) {
      const merged = {type: EditType.Modify, from: 0, to: result[1].to};
      result.splice(0, 2, merged);
    }
    return result;

    function flush(): void {
      let type = EditType.Insert;
      let from = blockStartLineNumber;
      let to: 1|number = currentLineNumber;
      if (hasAdded && hasRemoved) {
        type = EditType.Modify;
      } else if (!hasAdded && hasRemoved && from === 0 && to === 0) {
        type = EditType.Modify;
        to = 1;
      } else if (!hasAdded && hasRemoved) {
        type = EditType.Delete;
        from -= 1;
      }
      result.push({type: type, from: from, to: to});
      isInsideBlock = false;
      hasAdded = false;
      hasRemoved = false;
    }
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum EditType {
  Insert = 'Insert',
  Delete = 'Delete',
  Modify = 'Modify',
}
