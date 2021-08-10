// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as TextEditor from '../../ui/legacy/components/text_editor/text_editor.js';
import type * as UI from '../../ui/legacy/legacy.js';

import type {Row} from './ChangesView.js';
import {RowType} from './ChangesView.js';

const UIStrings = {
  /**
  *@description Text prepended to a removed line in a diff in the Changes tool, viewable only by screen reader.
  *@example {function log () } PH1
  */
  deletions: 'Deletion:{PH1}',
  /**
  *@description Text prepended to a new line in a diff in the Changes tool, viewable only by screen reader.
  *@example {function log () } PH1
  */
  additions: 'Addition:{PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/changes/ChangesTextEditor.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ChangesTextEditor extends TextEditor.CodeMirrorTextEditor.CodeMirrorTextEditor {
  constructor(options: UI.TextEditor.Options) {
    options.inputStyle = 'devToolsAccessibleDiffTextArea';
    super(options);
    this.codeMirror().setOption('gutters', ['CodeMirror-linenumbers', 'changes-diff-gutter']);
    this.codeMirror().setOption('extraKeys', {
      Enter: false,
      Space: false,
      Left: function(cm: CodeMirror.Editor): void {
        const scrollInfo = cm.getScrollInfo();
        // Left edge check required due to bug where line numbers would disappear when attempting to scroll left when the scrollbar is at the leftmost point.
        // CodeMirror Issue: https://github.com/codemirror/CodeMirror/issues/6139
        if (scrollInfo.left > 0) {
          cm.scrollTo(scrollInfo.left - Math.round(scrollInfo.clientWidth / 6), null);
        }
      },
      Right: function(cm: CodeMirror.Editor): void {
        const scrollInfo = cm.getScrollInfo();
        cm.scrollTo(scrollInfo.left + Math.round(scrollInfo.clientWidth / 6), null);
      },
    });
  }

  updateDiffGutter(diffRows: Row[]): void {
    this.codeMirror().eachLine((line: CodeMirror.LineHandle): void => {
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
  reset(typing?: boolean): void {
    super.reset(typing);
    const doc = this.cm.doc;
    if (this.textAreaBusy(Boolean(typing)) || !(typeof doc.modeOption === 'object')) {
      return;
    }

    const diffRows = doc.modeOption.diffRows;
    const lineNumber = this.cm.getCursor().line;
    const rowType = diffRows[lineNumber].type;

    if (rowType === RowType.Deletion) {
      this.textarea.value = i18nString(UIStrings.deletions, {PH1: this.textarea.value});
    }
    if (rowType === RowType.Addition) {
      this.textarea.value = i18nString(UIStrings.additions, {PH1: this.textarea.value});
    }
    this.prevInput = this.textarea.value;
  }
}

// @ts-ignore CodeMirror integration with externals, not yet part of codemirror-legacy.d.ts
CodeMirror.inputStyles.devToolsAccessibleDiffTextArea = DevToolsAccessibleDiffTextArea;
