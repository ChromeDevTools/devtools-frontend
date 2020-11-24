// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextEditor from '../text_editor/text_editor.js';
import * as UI from '../ui/ui.js';  // eslint-disable-line no-unused-vars

import {Row, RowType} from './ChangesView.js';  // eslint-disable-line no-unused-vars

/**
 * @extends {TextEditor.CodeMirrorTextEditor.CodeMirrorTextEditor}
 */
export class ChangesTextEditor extends TextEditor.CodeMirrorTextEditor.CodeMirrorTextEditor {
  /**
   * @param {!UI.TextEditor.Options} options
   */
  constructor(options) {
    options.inputStyle = 'devToolsAccessibleDiffTextArea';
    super(options);
    this.codeMirror().setOption('gutters', ['CodeMirror-linenumbers', 'changes-diff-gutter']);
    this.codeMirror().setOption('extraKeys', {
      Enter: false,
      Space: false,
      /**
       * @param {!CodeMirror.Editor} cm
       */
      Left: function(cm) {
        const scrollInfo = cm.getScrollInfo();
        // Left edge check required due to bug where line numbers would disappear when attempting to scroll left when the scrollbar is at the leftmost point.
        // CodeMirror Issue: https://github.com/codemirror/CodeMirror/issues/6139
        if (scrollInfo.left > 0) {
          cm.scrollTo(scrollInfo.left - Math.round(scrollInfo.clientWidth / 6), null);
        }
      },
      /**
       * @param {!CodeMirror.Editor} cm
       */
      Right: function(cm) {
        const scrollInfo = cm.getScrollInfo();
        cm.scrollTo(scrollInfo.left + Math.round(scrollInfo.clientWidth / 6), null);
      }
    });
  }

  /**
   * @param {!Array<!Row>} diffRows
   */
  updateDiffGutter(diffRows) {
    this.codeMirror().eachLine(/** @param {!CodeMirror.LineHandle} line */ line => {
      const lineNumber = this.codeMirror().getLineNumber(line);
      const row = diffRows[lineNumber];
      let gutterMarker;
      if (row.type === RowType.Deletion) {
        gutterMarker = document.createElement('div');
        gutterMarker.classList.add('deletion');
        gutterMarker.classList.add('changes-diff-gutter-marker');
        gutterMarker.textContent = '-';
      } else if (row.type === RowType.Addition) {
        gutterMarker = document.createElement('div');
        gutterMarker.classList.add('addition');
        gutterMarker.classList.add('changes-diff-gutter-marker');
        gutterMarker.textContent = '+';
      }
      if (gutterMarker) {
        this.codeMirror().setGutterMarker(line, 'changes-diff-gutter', gutterMarker);
      }
    });
  }
}

export class DevToolsAccessibleDiffTextArea extends TextEditor.CodeMirrorTextEditor.DevToolsAccessibleTextArea {
  /**
  * @override
  * @param {boolean=} typing - whether the user is currently typing
  */
  reset(typing) {
    super.reset(typing);
    // TODO(crbug.com/1011811): Update CodeMirror typings to include this property
    const doc = /** @type {!CodeMirror.Doc} */ (/** @type {*} */ (this.cm).doc);
    if (this.textAreaBusy(!!typing) || !(typeof doc.modeOption === 'object')) {
      return;
    }

    const diffRows = doc.modeOption.diffRows;
    const lineNumber = this.cm.getCursor().line;
    const rowType = diffRows[lineNumber].type;

    if (rowType === RowType.Deletion) {
      this.textarea.value = ls`Deletion:${this.textarea.value}`;
    }
    if (rowType === RowType.Addition) {
      this.textarea.value = ls`Addition:${this.textarea.value}`;
    }
    this.prevInput = this.textarea.value;
  }
}


/**
 * @constructor
 */
// @ts-ignore CodeMirror integration with externals, not yet part of codemirror-legacy.d.ts
CodeMirror.inputStyles.devToolsAccessibleDiffTextArea = DevToolsAccessibleDiffTextArea;
