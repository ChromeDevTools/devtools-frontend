// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */
import {Row, RowType} from './ChangesView.js';  // eslint-disable-line no-unused-vars

interface ParserConfig {
  diffRows: Array<Row>;
  baselineLines: Array<string>;
  currentLines: Array<string>;
  mimeType: string;
}

export function ChangesHighlighter(config: Object, parserConfig: ParserConfig): {
  startState: () => DiffState,
  token: (arg0: typeof CodeMirror.StringStream, arg1: DiffState) => string,
  blankLine: (arg0: DiffState) => string,
  copyState: (arg0: DiffState) => DiffState,
} {
  const diffRows = parserConfig.diffRows;
  const baselineLines = parserConfig.baselineLines;
  const currentLines = parserConfig.currentLines;
  const syntaxHighlightMode = CodeMirror.getMode({}, parserConfig.mimeType);

  function fastForward(state: DiffState, baselineLineNumber: number, currentLineNumber: number): void {
    if (baselineLineNumber > state.baselineLineNumber) {
      fastForwardSyntaxHighlighter(
          state.baselineSyntaxState, state.baselineLineNumber, baselineLineNumber, baselineLines);
      state.baselineLineNumber = baselineLineNumber;
    }
    if (currentLineNumber > state.currentLineNumber) {
      fastForwardSyntaxHighlighter(state.currentSyntaxState, state.currentLineNumber, currentLineNumber, currentLines);
      state.currentLineNumber = currentLineNumber;
    }
  }

  function fastForwardSyntaxHighlighter(syntaxState: Object, from: number, to: number, lines: string[]): void {
    let lineNumber = from;
    while (lineNumber < to && lineNumber < lines.length) {
      const stream = new CodeMirror.StringStream(lines[lineNumber]);
      if (stream.eol() && syntaxHighlightMode.blankLine) {
        syntaxHighlightMode.blankLine(syntaxState);
      }
      while (!stream.eol()) {
        if (syntaxHighlightMode.token) {
          syntaxHighlightMode.token(stream, syntaxState);
        }
        stream.start = stream.pos;
      }
      lineNumber++;
    }
  }

  return {
    startState: function(): DiffState {
      return {
        rowNumber: 0,
        diffTokenIndex: 0,
        currentLineNumber: 0,
        baselineLineNumber: 0,
        currentSyntaxState: CodeMirror.startState(syntaxHighlightMode),
        baselineSyntaxState: CodeMirror.startState(syntaxHighlightMode),
        syntaxPosition: 0,
        diffPosition: 0,
        syntaxStyle: '',
        diffStyle: '',
      };
    },

    token: function(stream: typeof CodeMirror.StringStream, state: DiffState): string {
      const diffRow = diffRows[state.rowNumber];
      if (!diffRow) {
        // @ts-ignore TODO(crbug.com/1011811): Fix after upstream CodeMirror type fixes
        stream.next();
        return '';
      }
      fastForward(state, diffRow.baselineLineNumber - 1, diffRow.currentLineNumber - 1);
      let classes = '';
      // @ts-ignore TODO(crbug.com/1011811): Fix after upstream CodeMirror type fixes
      if (stream.pos === 0) {
        classes += ' line-background-' + diffRow.type + ' line-' + diffRow.type;
      }

      const syntaxHighlighterNeedsRefresh = state.diffPosition >= state.syntaxPosition;
      if (state.diffPosition <= state.syntaxPosition) {
        state.diffPosition += diffRow.tokens[state.diffTokenIndex].text.length;
        state.diffStyle = diffRow.tokens[state.diffTokenIndex].className;
        state.diffTokenIndex++;
      }

      if (syntaxHighlighterNeedsRefresh) {
        if (syntaxHighlightMode.token &&
            (diffRow.type === RowType.Deletion || diffRow.type === RowType.Addition ||
             diffRow.type === RowType.Equal)) {
          state.syntaxStyle =
              syntaxHighlightMode.token(
                  // @ts-ignore TODO(crbug.com/1011811): Fix after upstream CodeMirror type fixes
                  stream, diffRow.type === RowType.Deletion ? state.baselineSyntaxState : state.currentSyntaxState) ||
              '';
          // @ts-ignore TODO(crbug.com/1011811): Fix after upstream CodeMirror type fixes
          state.syntaxPosition = stream.pos;
        } else {
          state.syntaxStyle = '';
          state.syntaxPosition = Infinity;
        }
      }

      // @ts-ignore TODO(crbug.com/1011811): Fix after upstream CodeMirror type fixes
      stream.pos = Math.min(state.syntaxPosition, state.diffPosition);
      classes += ' ' + state.syntaxStyle;
      classes += ' ' + state.diffStyle;

      // @ts-ignore TODO(crbug.com/1011811): Fix after upstream CodeMirror type fixes
      if (stream.eol()) {
        state.rowNumber++;
        if (diffRow.type === RowType.Deletion) {
          state.baselineLineNumber++;
        } else {
          state.currentLineNumber++;
        }
        state.diffPosition = 0;
        state.syntaxPosition = 0;
        state.diffTokenIndex = 0;
      }
      return classes;
    },

    blankLine: function(state: DiffState): string {
      const diffRow = diffRows[state.rowNumber];
      state.rowNumber++;
      state.syntaxPosition = 0;
      state.diffPosition = 0;
      state.diffTokenIndex = 0;
      if (!diffRow) {
        return '';
      }

      let style: void|'' = '';
      if (syntaxHighlightMode.blankLine) {
        if (diffRow.type === RowType.Equal || diffRow.type === RowType.Addition) {
          // @ts-ignore TODO(crbug.com/1011811): Fix after upstream CodeMirror type fixes
          style = syntaxHighlightMode.blankLine(state.currentSyntaxState);
          state.currentLineNumber++;
        } else if (diffRow.type === RowType.Deletion) {
          // @ts-ignore TODO(crbug.com/1011811): Fix after upstream CodeMirror type fixes
          style = syntaxHighlightMode.blankLine(state.baselineSyntaxState);
          state.baselineLineNumber++;
        }
      }
      return style + ' line-background-' + diffRow.type + ' line-' + diffRow.type;
    },

    copyState: function(state: DiffState): DiffState {
      const newState = Object.assign({}, state);
      // @ts-ignore TODO(crbug.com/1011811): Fix after upstream CodeMirror type fixes
      newState.currentSyntaxState = CodeMirror.copyState(syntaxHighlightMode, state.currentSyntaxState);
      // @ts-ignore TODO(crbug.com/1011811): Fix after upstream CodeMirror type fixes
      newState.baselineSyntaxState = CodeMirror.copyState(syntaxHighlightMode, state.baselineSyntaxState);
      return /** @type {!DiffState} */ newState as DiffState;
    },
  };
}

// @ts-ignore TODO(crbug.com/1011811): Fix after upstream CodeMirror type fixes
CodeMirror.defineMode('devtools-diff', ChangesHighlighter);
export interface DiffState {
  rowNumber: number;
  diffTokenIndex: number;
  currentLineNumber: number;
  baselineLineNumber: number;
  currentSyntaxState: Object;
  baselineSyntaxState: Object;
  syntaxPosition: number;
  diffPosition: number;
  syntaxStyle: string;
  diffStyle: string;
}
