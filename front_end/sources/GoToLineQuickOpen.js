// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as QuickOpen from '../quick_open/quick_open.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars

import {SourcesView} from './SourcesView.js';
import {UISourceCodeFrame} from './UISourceCodeFrame.js';  // eslint-disable-line no-unused-vars

export class GoToLineQuickOpen extends QuickOpen.FilteredListWidget.Provider {
  /**
   * @override
   * @param {?number} itemIndex
   * @param {string} promptValue
   */
  selectItem(itemIndex, promptValue) {
    const uiSourceCode = this._currentUISourceCode();
    if (!uiSourceCode) {
      return;
    }
    const position = this._parsePosition(promptValue);
    if (!position) {
      return;
    }
    Common.Revealer.reveal(uiSourceCode.uiLocation(position.line - 1, position.column - 1));
  }

  /**
   * @override
   * @param {string} query
   * @return {string}
   */
  notFoundText(query) {
    if (!this._currentUISourceCode()) {
      return Common.UIString.UIString('No file selected.');
    }
    const position = this._parsePosition(query);
    const sourceFrame = this._currentSourceFrame();
    if (!position) {
      if (!sourceFrame) {
        return ls`Type a number to go to that line.`;
      }
      const disassembly = sourceFrame.wasmDisassembly;
      const currentLineNumber = sourceFrame.textEditor.currentLineNumber();
      if (disassembly) {
        const lastBytecodeOffset = disassembly.lineNumberToBytecodeOffset(disassembly.lineNumbers - 1);
        const bytecodeOffsetDigits = lastBytecodeOffset.toString(16).length;
        const currentPosition = disassembly.lineNumberToBytecodeOffset(currentLineNumber);
        return ls`Current position: 0x${
            currentPosition.toString(16).padStart(
                bytecodeOffsetDigits,
                '0')}. Type an offset between 0x${'0'.padStart(bytecodeOffsetDigits, '0')} and 0x${
            lastBytecodeOffset.toString(16)} to navigate to.`;
      }
      const linesCount = sourceFrame.textEditor.linesCount;
      return ls`Current line: ${currentLineNumber}. Type a line number between 1 and ${linesCount} to navigate to.`;
    }

    if (sourceFrame && sourceFrame.wasmDisassembly) {
      return ls`Go to offset 0x${(position.column - 1).toString(16)}.`;
    }
    if (position.column && position.column > 1) {
      return ls`Go to line ${position.line} and column ${position.column}.`;
    }
    return ls`Go to line ${position.line}.`;
  }

  /**
   * @param {string} query
   * @return {?{line: number, column: number}}
   */
  _parsePosition(query) {
    const sourceFrame = this._currentSourceFrame();
    if (sourceFrame && sourceFrame.wasmDisassembly) {
      const parts = query.match(/0x([0-9a-fA-F]+)/);
      if (!parts || !parts[0] || parts[0].length !== query.length) {
        return null;
      }

      const column = parseInt(parts[0], 16) + 1;
      return {line: 0, column};
    }

    const parts = query.match(/([0-9]+)(\:[0-9]*)?/);
    if (!parts || !parts[0] || parts[0].length !== query.length) {
      return null;
    }
    const line = parseInt(parts[1], 10);
    let column = 0;
    if (parts[2]) {
      column = parseInt(parts[2].substring(1), 10);
    }
    return {line: Math.max(line | 0, 1), column: Math.max(column | 0, 1)};
  }

  /**
   * @return {?Workspace.UISourceCode.UISourceCode}
   */
  _currentUISourceCode() {
    const sourcesView = UI.Context.Context.instance().flavor(SourcesView);
    if (!sourcesView) {
      return null;
    }
    return sourcesView.currentUISourceCode();
  }

  /**
   * @return {?UISourceCodeFrame}
   */
  _currentSourceFrame() {
    const sourcesView = UI.Context.Context.instance().flavor(SourcesView);
    if (!sourcesView) {
      return null;
    }
    return sourcesView.currentSourceFrame();
  }
}
