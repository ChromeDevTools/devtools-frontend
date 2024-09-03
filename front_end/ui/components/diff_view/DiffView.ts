// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Diff from '../../../third_party/diff/diff.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as LitHtml from '../../lit-html/lit-html.js';
import * as CodeHighlighter from '../code_highlighter/code_highlighter.js';

import diffViewStyles from './diffView.css.js';

const UIStrings = {
  /**
   *@description Text prepended to a removed line in a diff in the Changes tool, viewable only by screen reader.
   */
  deletions: 'Deletion:',
  /**
   *@description Text prepended to a new line in a diff in the Changes tool, viewable only by screen reader.
   */
  additions: 'Addition:',
  /**
   *@description Screen-reader accessible name for the code editor in the Changes tool showing the user's changes.
   */
  changesDiffViewer: 'Changes diff viewer',
  /**
   *@description Text in Changes View of the Changes tab
   *@example {2} PH1
   */
  SkippingDMatchingLines: '( … Skipping {PH1} matching lines … )',
};
const str_ = i18n.i18n.registerUIStrings('ui/components/diff_view/DiffView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface Token {
  text: string;
  className: string;
}

interface Row {
  originalLineNumber: number;
  currentLineNumber: number;
  tokens: Token[];
  type: RowType;
}

export const enum RowType {
  DELETION = 'deletion',
  ADDITION = 'addition',
  EQUAL = 'equal',
  SPACER = 'spacer',
}

export function buildDiffRows(diff: Diff.Diff.DiffArray): {
  originalLines: readonly string[],
  currentLines: readonly string[],
  rows: readonly Row[],
} {
  let currentLineNumber = 0;
  let originalLineNumber = 0;
  const paddingLines = 3;

  const originalLines: string[] = [];
  const currentLines: string[] = [];
  const rows: Row[] = [];

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
          rows.push(createRow(line, RowType.ADDITION));
        }
        currentLines.push(...token[1]);
        break;
      case Diff.Diff.Operation.Delete:
        originalLines.push(...token[1]);
        if (diff[i + 1] && diff[i + 1][0] === Diff.Diff.Operation.Insert) {
          i++;
          rows.push(...createModifyRows(token[1].join('\n'), diff[i][1].join('\n')));
          currentLines.push(...diff[i][1]);
        } else {
          for (const line of token[1]) {
            rows.push(createRow(line, RowType.DELETION));
          }
        }
        break;
    }
  }

  return {originalLines, currentLines, rows};

  function createEqualRows(lines: string[], atStart: boolean, atEnd: boolean): Row[] {
    const equalRows = [];
    if (!atStart) {
      for (let i = 0; i < paddingLines && i < lines.length; i++) {
        equalRows.push(createRow(lines[i], RowType.EQUAL));
      }
      if (lines.length > paddingLines * 2 + 1 && !atEnd) {
        equalRows.push(createRow(
            i18nString(UIStrings.SkippingDMatchingLines, {PH1: (lines.length - paddingLines * 2)}), RowType.SPACER));
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
        equalRows.push(createRow(lines[i], RowType.EQUAL));
      }
    }
    return equalRows;
  }

  function createModifyRows(before: string, after: string): Row[] {
    const internalDiff = Diff.Diff.DiffWrapper.charDiff(before, after, true /* cleanup diff */);
    const deletionRows = [createRow('', RowType.DELETION)];
    const insertionRows = [createRow('', RowType.ADDITION)];

    for (const token of internalDiff) {
      const text = token[1];
      const type = token[0];
      const className = type === Diff.Diff.Operation.Equal ? '' : 'inner-diff';
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (i > 0 && type !== Diff.Diff.Operation.Insert) {
          deletionRows.push(createRow('', RowType.DELETION));
        }
        if (i > 0 && type !== Diff.Diff.Operation.Delete) {
          insertionRows.push(createRow('', RowType.ADDITION));
        }
        if (!lines[i]) {
          continue;
        }
        if (type !== Diff.Diff.Operation.Insert) {
          deletionRows[deletionRows.length - 1].tokens.push({text: lines[i], className});
        }
        if (type !== Diff.Diff.Operation.Delete) {
          insertionRows[insertionRows.length - 1].tokens.push({text: lines[i], className});
        }
      }
    }
    return deletionRows.concat(insertionRows);
  }

  function createRow(text: string, type: RowType): Row {
    if (type === RowType.ADDITION) {
      currentLineNumber++;
    }
    if (type === RowType.DELETION) {
      originalLineNumber++;
    }
    if (type === RowType.EQUAL) {
      originalLineNumber++;
      currentLineNumber++;
    }

    return {originalLineNumber, currentLineNumber, tokens: text ? [{text, className: 'inner-diff'}] : [], type};
  }
}

function documentMap(lines: readonly string[]): Map<number, number> {
  const map = new Map<number, number>();
  for (let pos = 0, lineNo = 0; lineNo < lines.length; lineNo++) {
    map.set(lineNo + 1, pos);
    pos += lines[lineNo].length + 1;
  }
  return map;
}

class DiffRenderer {
  private constructor(
      readonly originalHighlighter: CodeHighlighter.CodeHighlighter.CodeHighlighter,
      readonly originalMap: Map<number, number>,
      readonly currentHighlighter: CodeHighlighter.CodeHighlighter.CodeHighlighter,
      readonly currentMap: Map<number, number>,
  ) {
  }

  #render(rows: readonly Row[]): LitHtml.TemplateResult {
    return LitHtml.html`
      <div class="diff-listing" aria-label=${i18nString(UIStrings.changesDiffViewer)}>
        ${rows.map(row => this.#renderRow(row))}
      </div>`;
  }

  #renderRow(row: Row): LitHtml.TemplateResult {
    const baseNumber =
        row.type === RowType.EQUAL || row.type === RowType.DELETION ? String(row.originalLineNumber) : '';
    const curNumber = row.type === RowType.EQUAL || row.type === RowType.ADDITION ? String(row.currentLineNumber) : '';
    let marker = '', markerClass = 'diff-line-marker', screenReaderText = null;
    if (row.type === RowType.ADDITION) {
      marker = '+';
      markerClass += ' diff-line-addition';
      screenReaderText = LitHtml.html`<span class="diff-hidden-text">${i18nString(UIStrings.additions)}</span>`;
    } else if (row.type === RowType.DELETION) {
      marker = '-';
      markerClass += ' diff-line-deletion';
      screenReaderText = LitHtml.html`<span class="diff-hidden-text">${i18nString(UIStrings.deletions)}</span>`;
    }
    return LitHtml.html`
      <div class="diff-line-number" aria-hidden="true">${baseNumber}</div>
      <div class="diff-line-number" aria-hidden="true">${curNumber}</div>
      <div class=${markerClass} aria-hidden="true">${marker}</div>
      <div class="diff-line-content diff-line-${row.type}" data-line-number=${curNumber} jslog=${
        VisualLogging.link('changes.reveal-source').track({click: true})}>${screenReaderText}${
        this.#renderRowContent(row)}</div>`;
  }

  #renderRowContent(row: Row): LitHtml.TemplateResult[] {
    if (row.type === RowType.SPACER) {
      return row.tokens.map(tok => LitHtml.html`${tok.text}`);
    }
    const [doc, startPos] = row.type === RowType.DELETION ?
        [this.originalHighlighter, this.originalMap.get(row.originalLineNumber) as number] :
        [this.currentHighlighter, this.currentMap.get(row.currentLineNumber) as number];
    const content: LitHtml.TemplateResult[] = [];
    let pos = startPos;
    for (const token of row.tokens) {
      const tokenContent: (LitHtml.TemplateResult|string)[] = [];
      doc.highlightRange(pos, pos + token.text.length, (text, style) => {
        tokenContent.push(style ? LitHtml.html`<span class=${style}>${text}</span>` : text);
      });
      content.push(
          token.className ? LitHtml.html`<span class=${token.className}>${tokenContent}</span>` :
                            LitHtml.html`${tokenContent}`);
      pos += token.text.length;
    }
    return content;
  }

  static async render(diff: Diff.Diff.DiffArray, mimeType: string, parent: HTMLElement|DocumentFragment):
      Promise<void> {
    const {originalLines, currentLines, rows} = buildDiffRows(diff);
    const renderer = new DiffRenderer(
        await CodeHighlighter.CodeHighlighter.create(originalLines.join('\n'), mimeType),
        documentMap(originalLines),
        await CodeHighlighter.CodeHighlighter.create(currentLines.join('\n'), mimeType),
        documentMap(currentLines),
    );
    LitHtml.render(renderer.#render(rows), parent, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-diff-view': DiffView;
  }
}

export type DiffViewData = {
  diff: Diff.Diff.DiffArray,
  mimeType: string,
};

export class DiffView extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-diff-view`;

  readonly #shadow = this.attachShadow({mode: 'open'});
  loaded: Promise<void>;

  constructor(data?: DiffViewData) {
    super();
    this.#shadow.adoptedStyleSheets = [diffViewStyles, CodeHighlighter.Style.default];
    if (data) {
      this.loaded = DiffRenderer.render(data.diff, data.mimeType, this.#shadow);
    } else {
      this.loaded = Promise.resolve();
    }
  }

  set data(data: DiffViewData) {
    this.loaded = DiffRenderer.render(data.diff, data.mimeType, this.#shadow);
  }
}

customElements.define('devtools-diff-view', DiffView);
