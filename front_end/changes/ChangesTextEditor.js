// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {RowType} from './ChangesView.js';

/**
 * @extends {TextEditor.CodeMirrorTextEditor}
 */
export class ChangesTextEditor extends TextEditor.CodeMirrorTextEditor {
  /**
   * @param {!UI.TextEditor.Options} options
   */
  constructor(options) {
    options.inputStyle = 'devToolsAccessibleDiffTextArea';
    super(options);
    this.codeMirror().setOption('gutters', ['CodeMirror-linenumbers', 'changes-diff-gutter']);
    this.codeMirror().setOption('extraKeys', {Enter: false, Space: false});
  }

  /**
   * @param {!Array<!Changes.ChangesView.Row>} diffRows
   */
  updateDiffGutter(diffRows) {
    this.codeMirror().eachLine(line => {
      const lineNumber = this.codeMirror().getLineNumber(line);
      const row = diffRows[lineNumber];
      let gutterMarker;
      if (row.type === RowType.Deletion) {
        gutterMarker = createElementWithClass('div', 'deletion changes-diff-gutter-marker');
        gutterMarker.textContent = '-';
      } else if (row.type === RowType.Addition) {
        gutterMarker = createElementWithClass('div', 'addition changes-diff-gutter-marker');
        gutterMarker.textContent = '+';
      }
      if (gutterMarker) {
        this.codeMirror().setGutterMarker(line, 'changes-diff-gutter', gutterMarker);
      }
    });
  }
}

export class DevToolsAccessibleDiffTextArea extends CodeMirror.inputStyles.devToolsAccessibleTextArea {
  /**
  * @override
  * @param {boolean=} typing - whether the user is currently typing
  */
  reset(typing) {
    super.reset(typing);
    if (this.textAreaBusy(!!typing) || !(typeof this.cm.doc.modeOption === 'object')) {
      return;
    }

    const diffRows = this.cm.doc.modeOption.diffRows;
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
CodeMirror.inputStyles.devToolsAccessibleDiffTextArea = DevToolsAccessibleDiffTextArea;
