// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../core/common/common.js';
import * as i18n from '../core/i18n/i18n.js';
import * as QuickOpen from '../quick_open/quick_open.js';
import * as UI from '../ui/legacy/legacy.js';
import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars

import {SourcesView} from './SourcesView.js';
import {UISourceCodeFrame} from './UISourceCodeFrame.js';  // eslint-disable-line no-unused-vars

const UIStrings = {
  /**
  *@description Text in Go To Line Quick Open of the Sources panel
  */
  noFileSelected: 'No file selected.',
  /**
  *@description Text in Go To Line Quick Open of the Sources panel
  */
  typeANumberToGoToThatLine: 'Type a number to go to that line.',
  /**
  *@description Text in Go To Line Quick Open of the Sources panel
  *@example {abc} PH1
  *@example {000} PH2
  *@example {bbb} PH3
  */
  currentPositionXsTypeAnOffset:
      'Current position: 0x{PH1}. Type an offset between 0x{PH2} and 0x{PH3} to navigate to.',
  /**
  *@description Text in the GoToLine dialog of the Sources pane that describes the current line number, file line number range, and use of the GoToLine dialog
  *@example {1} PH1
  *@example {100} PH2
  */
  currentLineSTypeALineNumber: 'Current line: {PH1}. Type a line number between 1 and {PH2} to navigate to.',
  /**
  *@description Text in Go To Line Quick Open of the Sources panel
  *@example {abc} PH1
  */
  goToOffsetXs: 'Go to offset 0x{PH1}.',
  /**
  *@description Text in Go To Line Quick Open of the Sources panel
  *@example {2} PH1
  *@example {2} PH2
  */
  goToLineSAndColumnS: 'Go to line {PH1} and column {PH2}.',
  /**
  *@description Text in Go To Line Quick Open of the Sources panel
  *@example {2} PH1
  */
  goToLineS: 'Go to line {PH1}.',
};
const str_ = i18n.i18n.registerUIStrings('sources/GoToLineQuickOpen.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let goToLineQuickOpenInstance: GoToLineQuickOpen;
export class GoToLineQuickOpen extends QuickOpen.FilteredListWidget.Provider {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): GoToLineQuickOpen {
    const {forceNew} = opts;
    if (!goToLineQuickOpenInstance || forceNew) {
      goToLineQuickOpenInstance = new GoToLineQuickOpen();
    }

    return goToLineQuickOpenInstance;
  }

  selectItem(itemIndex: number|null, promptValue: string): void {
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

  notFoundText(query: string): string {
    if (!this._currentUISourceCode()) {
      return i18nString(UIStrings.noFileSelected);
    }
    const position = this._parsePosition(query);
    const sourceFrame = this._currentSourceFrame();
    if (!position) {
      if (!sourceFrame) {
        return i18nString(UIStrings.typeANumberToGoToThatLine);
      }
      const disassembly = sourceFrame.wasmDisassembly;
      const currentLineNumber = sourceFrame.textEditor.currentLineNumber();
      if (disassembly) {
        const lastBytecodeOffset = disassembly.lineNumberToBytecodeOffset(disassembly.lineNumbers - 1);
        const bytecodeOffsetDigits = lastBytecodeOffset.toString(16).length;
        return i18nString(UIStrings.currentPositionXsTypeAnOffset, {PH1: '0'.padStart(bytecodeOffsetDigits, '0')});
      }
      const linesCount = sourceFrame.textEditor.linesCount;
      return i18nString(UIStrings.currentLineSTypeALineNumber, {PH1: currentLineNumber, PH2: linesCount});
    }

    if (sourceFrame && sourceFrame.wasmDisassembly) {
      return i18nString(UIStrings.goToOffsetXs, {PH1: (position.column - 1).toString(16)});
    }
    if (position.column && position.column > 1) {
      return i18nString(UIStrings.goToLineSAndColumnS, {PH1: position.line, PH2: position.column});
    }
    return i18nString(UIStrings.goToLineS, {PH1: position.line});
  }

  _parsePosition(query: string): {
    line: number,
    column: number,
  }|null {
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

  _currentUISourceCode(): Workspace.UISourceCode.UISourceCode|null {
    const sourcesView = UI.Context.Context.instance().flavor(SourcesView);
    if (!sourcesView) {
      return null;
    }
    return sourcesView.currentUISourceCode();
  }

  _currentSourceFrame(): UISourceCodeFrame|null {
    const sourcesView = UI.Context.Context.instance().flavor(SourcesView);
    if (!sourcesView) {
      return null;
    }
    return sourcesView.currentSourceFrame();
  }
}
