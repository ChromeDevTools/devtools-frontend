// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @param {!Object} config
 * @param {{rows: !Array<!Changes.ChangesView.Row>}} parserConfig
 * @return {{
 *  startState: function():!Changes.ChangesHighlighter.DiffState,
 *  token: function({next: function()}, !Changes.ChangesHighlighter.DiffState):string,
 *  blankLine: function(!Changes.ChangesHighlighter.DiffState):string,
 * }}
 */
Changes.ChangesHighlighter = function(config, parserConfig) {
  var rows = parserConfig.rows;

  return {
    /**
     * @return {!Changes.ChangesHighlighter.DiffState}
     */
    startState: function() {
      return {lineNumber: 0, index: 0};
    },

    /**
     * @param {!{next: function()}} stream
     * @param {!Changes.ChangesHighlighter.DiffState} state
     * @return {string}
     */
    token: function(stream, state) {
      var row = rows[state.lineNumber];
      if (!row) {
        stream.next();
        return '';
      }
      var classes = '';
      if (state.index === 0)
        classes += ' line-background-' + row.type + ' line-' + row.type;
      stream.pos += row.content[state.index].text.length;
      classes += ' ' + row.content[state.index].className;
      state.index++;
      if (state.index >= row.content.length) {
        state.lineNumber++;
        state.index = 0;
      }
      return classes;
    },

    /**
     * @param {!Changes.ChangesHighlighter.DiffState} state
     * @return {string}
     */
    blankLine: function(state) {
      var row = rows[state.lineNumber];
      state.lineNumber++;
      state.index = 0;
      if (!row)
        return '';
      return 'line-background-' + row.type + ' line-' + row.type;
    }
  };
};

/** @typedef {!{lineNumber: number, index: number}} */
Changes.ChangesHighlighter.DiffState;

CodeMirror.defineMode('devtools-diff', Changes.ChangesHighlighter);
