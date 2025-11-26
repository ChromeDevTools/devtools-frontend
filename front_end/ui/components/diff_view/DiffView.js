// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view, @devtools/enforce-custom-element-definitions-location */
import * as i18n from '../../../core/i18n/i18n.js';
import * as Diff from '../../../third_party/diff/diff.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as Lit from '../../lit/lit.js';
import * as CodeHighlighter from '../code_highlighter/code_highlighter.js';
import diffViewStyles from './diffView.css.js';
const { html } = Lit;
const UIStrings = {
    /**
     * @description Text prepended to a removed line in a diff in the Changes tool, viewable only by screen reader.
     */
    deletions: 'Deletion:',
    /**
     * @description Text prepended to a new line in a diff in the Changes tool, viewable only by screen reader.
     */
    additions: 'Addition:',
    /**
     * @description Screen-reader accessible name for the code editor in the Changes tool showing the user's changes.
     */
    changesDiffViewer: 'Changes diff viewer',
    /**
     * @description Text in Changes View of the Changes tab
     * @example {2} PH1
     */
    SkippingDMatchingLines: '( … Skipping {PH1} matching lines … )',
    /**
     * @description Text in Changes View for the case where the modified file contents are the same with its unmodified state
     * e.g. the file contents changed from A -> B then B -> A and not saved yet.
     */
    noDiff: 'File is identical to its unmodified state',
};
const str_ = i18n.i18n.registerUIStrings('ui/components/diff_view/DiffView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export function buildDiffRows(diff) {
    let currentLineNumber = 0;
    let originalLineNumber = 0;
    const paddingLines = 3;
    const originalLines = [];
    const currentLines = [];
    const rows = [];
    for (let i = 0; i < diff.length; ++i) {
        const token = diff[i];
        switch (token[0]) {
            case Diff.Diff.Operation.Equal:
                rows.push(...createEqualRows(token[1], i === 0, i === diff.length - 1));
                originalLines.push(...token[1]);
                currentLines.push(...token[1]);
                break;
            case Diff.Diff.Operation.Insert:
                for (const line of token[1]) {
                    rows.push(createRow(line, "addition" /* RowType.ADDITION */));
                }
                currentLines.push(...token[1]);
                break;
            case Diff.Diff.Operation.Delete:
                originalLines.push(...token[1]);
                if (diff[i + 1] && diff[i + 1][0] === Diff.Diff.Operation.Insert) {
                    i++;
                    rows.push(...createModifyRows(token[1].join('\n'), diff[i][1].join('\n')));
                    currentLines.push(...diff[i][1]);
                }
                else {
                    for (const line of token[1]) {
                        rows.push(createRow(line, "deletion" /* RowType.DELETION */));
                    }
                }
                break;
        }
    }
    return { originalLines, currentLines, rows };
    function createEqualRows(lines, atStart, atEnd) {
        const equalRows = [];
        if (!atStart) {
            for (let i = 0; i < paddingLines && i < lines.length; i++) {
                equalRows.push(createRow(lines[i], "equal" /* RowType.EQUAL */));
            }
            if (lines.length > paddingLines * 2 + 1 && !atEnd) {
                equalRows.push(createRow(i18nString(UIStrings.SkippingDMatchingLines, { PH1: (lines.length - paddingLines * 2) }), "spacer" /* RowType.SPACER */));
            }
        }
        if (!atEnd) {
            const start = Math.max(lines.length - paddingLines - 1, atStart ? 0 : paddingLines);
            let skip = lines.length - paddingLines - 1;
            if (!atStart) {
                skip -= paddingLines;
            }
            if (skip > 0) {
                originalLineNumber += skip;
                currentLineNumber += skip;
            }
            for (let i = start; i < lines.length; i++) {
                equalRows.push(createRow(lines[i], "equal" /* RowType.EQUAL */));
            }
        }
        return equalRows;
    }
    function createModifyRows(before, after) {
        const internalDiff = Diff.Diff.DiffWrapper.charDiff(before, after, true /* cleanup diff */);
        const deletionRows = [createRow('', "deletion" /* RowType.DELETION */)];
        const insertionRows = [createRow('', "addition" /* RowType.ADDITION */)];
        for (const token of internalDiff) {
            const text = token[1];
            const type = token[0];
            const className = type === Diff.Diff.Operation.Equal ? '' : 'inner-diff';
            const lines = text.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (i > 0 && type !== Diff.Diff.Operation.Insert) {
                    deletionRows.push(createRow('', "deletion" /* RowType.DELETION */));
                }
                if (i > 0 && type !== Diff.Diff.Operation.Delete) {
                    insertionRows.push(createRow('', "addition" /* RowType.ADDITION */));
                }
                if (!lines[i]) {
                    continue;
                }
                if (type !== Diff.Diff.Operation.Insert) {
                    deletionRows[deletionRows.length - 1].tokens.push({ text: lines[i], className });
                }
                if (type !== Diff.Diff.Operation.Delete) {
                    insertionRows[insertionRows.length - 1].tokens.push({ text: lines[i], className });
                }
            }
        }
        return deletionRows.concat(insertionRows);
    }
    function createRow(text, type) {
        if (type === "addition" /* RowType.ADDITION */) {
            currentLineNumber++;
        }
        if (type === "deletion" /* RowType.DELETION */) {
            originalLineNumber++;
        }
        if (type === "equal" /* RowType.EQUAL */) {
            originalLineNumber++;
            currentLineNumber++;
        }
        return { originalLineNumber, currentLineNumber, tokens: text ? [{ text, className: 'inner-diff' }] : [], type };
    }
}
function documentMap(lines) {
    const map = new Map();
    for (let pos = 0, lineNo = 0; lineNo < lines.length; lineNo++) {
        map.set(lineNo + 1, pos);
        pos += lines[lineNo].length + 1;
    }
    return map;
}
class DiffRenderer {
    originalHighlighter;
    originalMap;
    currentHighlighter;
    currentMap;
    constructor(originalHighlighter, originalMap, currentHighlighter, currentMap) {
        this.originalHighlighter = originalHighlighter;
        this.originalMap = originalMap;
        this.currentHighlighter = currentHighlighter;
        this.currentMap = currentMap;
    }
    #render(rows) {
        return html `
      <style>${diffViewStyles}</style>
      <style>${CodeHighlighter.codeHighlighterStyles}</style>
      <div class="diff-listing" aria-label=${i18nString(UIStrings.changesDiffViewer)}>
        ${rows.map(row => this.#renderRow(row))}
      </div>`;
    }
    #renderRow(row) {
        const baseNumber = row.type === "equal" /* RowType.EQUAL */ || row.type === "deletion" /* RowType.DELETION */ ? String(row.originalLineNumber) : '';
        const curNumber = row.type === "equal" /* RowType.EQUAL */ || row.type === "addition" /* RowType.ADDITION */ ? String(row.currentLineNumber) : '';
        let marker = '', markerClass = 'diff-line-marker', screenReaderText = null;
        if (row.type === "addition" /* RowType.ADDITION */) {
            marker = '+';
            markerClass += ' diff-line-addition';
            screenReaderText = html `<span class="diff-hidden-text">${i18nString(UIStrings.additions)}</span>`;
        }
        else if (row.type === "deletion" /* RowType.DELETION */) {
            marker = '-';
            markerClass += ' diff-line-deletion';
            screenReaderText = html `<span class="diff-hidden-text">${i18nString(UIStrings.deletions)}</span>`;
        }
        return html `
      <div class="diff-line-number" aria-hidden="true">${baseNumber}</div>
      <div class="diff-line-number" aria-hidden="true">${curNumber}</div>
      <div class=${markerClass} aria-hidden="true">${marker}</div>
      <div class="diff-line-content diff-line-${row.type}" data-line-number=${curNumber} jslog=${VisualLogging.link('changes.reveal-source').track({ click: true })}>${screenReaderText}${this.#renderRowContent(row)}</div>`;
    }
    #renderRowContent(row) {
        if (row.type === "spacer" /* RowType.SPACER */) {
            return row.tokens.map(tok => html `${tok.text}`);
        }
        const [doc, startPos] = row.type === "deletion" /* RowType.DELETION */ ?
            [this.originalHighlighter, this.originalMap.get(row.originalLineNumber)] :
            [this.currentHighlighter, this.currentMap.get(row.currentLineNumber)];
        const content = [];
        let pos = startPos;
        for (const token of row.tokens) {
            const tokenContent = [];
            doc.highlightRange(pos, pos + token.text.length, (text, style) => {
                tokenContent.push(style ? html `<span class=${style}>${text}</span>` : text);
            });
            content.push(token.className ? html `<span class=${token.className}>${tokenContent}</span>` : html `${tokenContent}`);
            pos += token.text.length;
        }
        return content;
    }
    static async render(diff, mimeType, parent) {
        const { originalLines, currentLines, rows } = buildDiffRows(diff);
        const renderer = new DiffRenderer(await CodeHighlighter.CodeHighlighter.create(originalLines.join('\n'), mimeType), documentMap(originalLines), await CodeHighlighter.CodeHighlighter.create(currentLines.join('\n'), mimeType), documentMap(currentLines));
        Lit.render(renderer.#render(rows), parent, { host: this });
    }
}
function renderNoDiffState(container) {
    // clang-format off
    Lit.render(html `
    <style>${diffViewStyles}</style>
    <p class="diff-listing-no-diff" data-testid="no-diff">${i18nString(UIStrings.noDiff)}</p>`, container, { host: container });
    // clang-format on
}
export class DiffView extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    loaded;
    constructor(data) {
        super();
        this.loaded = this.#render(data);
    }
    set data(data) {
        this.loaded = this.#render(data);
    }
    async #render(data) {
        if (!data || data.diff.length === 0) {
            renderNoDiffState(this.#shadow);
            return;
        }
        await DiffRenderer.render(data.diff, data.mimeType, this.#shadow);
    }
}
customElements.define('devtools-diff-view', DiffView);
//# sourceMappingURL=DiffView.js.map