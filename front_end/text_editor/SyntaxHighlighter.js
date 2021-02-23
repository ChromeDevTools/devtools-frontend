// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../ui/ui.js';  // eslint-disable-line no-unused-vars

import {TokenizerFactory} from './CodeMirrorUtils.js';

export class SyntaxHighlighter {
  /**
   * @param {string} mimeType
   * @param {boolean} stripExtraWhitespace
   */
  constructor(mimeType, stripExtraWhitespace) {
    this._mimeType = mimeType;
    this._stripExtraWhitespace = stripExtraWhitespace;
  }

  /**
   * @param {string} content
   * @param {string} className
   * @return {!Element}
   */
  createSpan(content, className) {
    const span = document.createElement('span');
    span.className = className.replace(/\S+/g, 'cm-$&');
    if (this._stripExtraWhitespace && className !== 'whitespace') {
      content = content.replace(/^[\n\r]*/, '').replace(/\s*$/, '');
    }
    UI.UIUtils.createTextChild(span, content);
    return span;
  }

  /**
   * @param {!Element} node
   * @return {!Promise.<void>}
   */
  syntaxHighlightNode(node) {
    const lines = node.textContent ? node.textContent.split('\n') : [];
    /** @type {number} */
    let plainTextStart;
    /** @type {string} */
    let line;

      node.removeChildren();
      const tokenize = TokenizerFactory.instance().createTokenizer(this._mimeType);
      for (let i = 0; i < lines.length; ++i) {
        line = lines[i];
        plainTextStart = 0;
        tokenize(line, processToken.bind(this));
        if (plainTextStart < line.length) {
          const plainText = line.substring(plainTextStart, line.length);
          UI.UIUtils.createTextChild(node, plainText);
        }
        if (i < lines.length - 1) {
          UI.UIUtils.createTextChild(node, '\n');
        }
      }
      return Promise.resolve();

      /**
     * @param {string} token
     * @param {?string} tokenType
     * @param {number} column
     * @param {number} newColumn
     * @this {SyntaxHighlighter}
     */
      function processToken(token, tokenType, column, newColumn) {
        if (!tokenType) {
          return;
        }

        if (column > plainTextStart) {
          const plainText = line.substring(plainTextStart, column);
          UI.UIUtils.createTextChild(node, plainText);
        }
        node.appendChild(this.createSpan(token, tokenType));
        plainTextStart = newColumn;
      }
  }
}
