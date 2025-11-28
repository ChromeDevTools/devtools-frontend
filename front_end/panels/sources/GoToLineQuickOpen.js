// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/kit/kit.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as QuickOpen from '../../ui/legacy/components/quick_open/quick_open.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html } from '../../ui/lit/lit.js';
import { SourcesView } from './SourcesView.js';
const UIStrings = {
    /**
     * @description Text in Go To Line Quick Open of the Sources panel
     */
    noFileSelected: 'No file selected',
    /**
     * @description Text to show no results have been found
     */
    noResultsFound: 'No results found',
    /**
     * @description Text in Go To Line Quick Open of the Sources panel
     */
    typeANumberToGoToThatLine: 'Type a number to go to that line',
    /**
     * @description Text in Go To Line Quick Open of the Sources panel
     * @example {000} PH1
     * @example {bbb} PH2
     */
    currentPositionXsTypeAnOffset: 'Type an offset between 0x{PH1} and 0x{PH2} to navigate to',
    /**
     * @description Text in the GoToLine dialog of the Sources pane that describes the current line number, file line number range, and use of the GoToLine dialog
     * @example {100} PH1
     */
    currentLineSTypeALineNumber: 'Type a line number between 1 and {PH1} to navigate to',
    /**
     * @description Text in Go To Line Quick Open of the Sources panel
     * @example {abc} PH1
     */
    goToOffsetXs: 'Go to offset 0x{PH1}',
    /**
     * @description Text in Go To Line Quick Open of the Sources panel
     * @example {2} PH1
     * @example {2} PH2
     */
    goToLineSAndColumnS: 'Go to line {PH1} and column {PH2}',
    /**
     * @description Text in Go To Line Quick Open of the Sources panel
     * @example {2} PH1
     */
    goToLineS: 'Go to line {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/GoToLineQuickOpen.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class GoToLineQuickOpen extends QuickOpen.FilteredListWidget.Provider {
    #goToLineStrings = [];
    constructor() {
        super('source-line');
    }
    selectItem(_itemIndex, promptValue) {
        const sourceFrame = this.currentSourceFrame();
        if (!sourceFrame) {
            return;
        }
        const position = this.parsePosition(promptValue);
        if (!position) {
            return;
        }
        sourceFrame.revealPosition({ lineNumber: position.line - 1, columnNumber: position.column - 1 });
    }
    itemCount() {
        return this.#goToLineStrings.length;
    }
    renderItem(itemIndex, _query) {
        // clang-format off
        return html `
      <devtools-icon name="colon"></devtools-icon>
      <div>
        <div>${this.#goToLineStrings[itemIndex]}</div>
      </div>`;
        // clang-format on
    }
    rewriteQuery(_query) {
        // For Go to Line Quick Open, we don't need to filter any item, set query to empty string, so the filter regex matching will be skipped
        return '';
    }
    queryChanged(query) {
        this.#goToLineStrings = [];
        const position = this.parsePosition(query);
        const sourceFrame = this.currentSourceFrame();
        if (!position) {
            if (!sourceFrame) {
                this.#goToLineStrings.push(i18nString(UIStrings.typeANumberToGoToThatLine));
                return;
            }
            const editorState = sourceFrame.textEditor.state;
            const disassembly = sourceFrame.wasmDisassembly;
            if (disassembly) {
                const lastBytecodeOffset = disassembly.lineNumberToBytecodeOffset(disassembly.lineNumbers - 1);
                const bytecodeOffsetDigits = lastBytecodeOffset.toString(16).length;
                this.#goToLineStrings.push(i18nString(UIStrings.currentPositionXsTypeAnOffset, {
                    PH1: '0'.padStart(bytecodeOffsetDigits, '0'),
                    PH2: lastBytecodeOffset.toString(16),
                }));
                return;
            }
            const linesCount = sourceFrame.editorLocationToUILocation(editorState.doc.lines - 1).lineNumber + 1;
            this.#goToLineStrings.push(i18nString(UIStrings.currentLineSTypeALineNumber, { PH1: linesCount }));
            return;
        }
        if (sourceFrame?.wasmDisassembly) {
            this.#goToLineStrings.push(i18nString(UIStrings.goToOffsetXs, { PH1: (position.column - 1).toString(16) }));
            return;
        }
        if (position.column && position.column > 1) {
            this.#goToLineStrings.push(i18nString(UIStrings.goToLineSAndColumnS, { PH1: position.line, PH2: position.column }));
            return;
        }
        if (sourceFrame && position.line > sourceFrame.textEditor.state.doc.lines) {
            return;
        }
        this.#goToLineStrings.push(i18nString(UIStrings.goToLineS, { PH1: position.line }));
    }
    notFoundText(_query) {
        if (!this.currentSourceFrame()) {
            return i18nString(UIStrings.noFileSelected);
        }
        return i18nString(UIStrings.noResultsFound);
    }
    parsePosition(query) {
        const sourceFrame = this.currentSourceFrame();
        if (sourceFrame?.wasmDisassembly) {
            const parts = query.match(/0x([0-9a-fA-F]+)/);
            if (!parts?.[0] || parts[0].length !== query.length) {
                return null;
            }
            const column = parseInt(parts[0], 16) + 1;
            return { line: 0, column };
        }
        const parts = query.match(/([0-9]+)(\:[0-9]*)?/);
        if (!parts?.[0] || parts[0].length !== query.length) {
            return null;
        }
        const line = parseInt(parts[1], 10);
        let column = 0;
        if (parts[2]) {
            column = parseInt(parts[2].substring(1), 10);
        }
        return { line: Math.max(line | 0, 1), column: Math.max(column | 0, 1) };
    }
    currentSourceFrame() {
        const sourcesView = UI.Context.Context.instance().flavor(SourcesView);
        if (!sourcesView) {
            return null;
        }
        return sourcesView.currentSourceFrame();
    }
}
//# sourceMappingURL=GoToLineQuickOpen.js.map