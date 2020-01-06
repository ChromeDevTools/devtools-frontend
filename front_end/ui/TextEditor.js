// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import {Widget} from './Widget.js';  // eslint-disable-line no-unused-vars

/**
 * @interface
 */
export class TextEditorFactory {
  /**
   * @param {!UI.TextEditor.Options} options
   * @return {!TextEditor}
   */
  createEditor(options) {}
}

/**
 * @interface
 */
export class TextEditor extends Common.EventTarget.EventTarget {
  /**
   * @return {!Widget}
   */
  widget() {
  }

  /**
   * @return {!TextUtils.TextRange}
   */
  fullRange() {
  }

  /**
   * @return {!TextUtils.TextRange}
   */
  selection() {
  }

  /**
   * @param {!TextUtils.TextRange} selection
   */
  setSelection(selection) {
  }

  /**
   * @param {!TextUtils.TextRange=} textRange
   * @return {string}
   */
  text(textRange) {
  }

  /**
   * @return {string}
   */
  textWithCurrentSuggestion() {
  }

  /**
   * @param {string} text
   */
  setText(text) {
  }

  /**
   * @param {number} lineNumber
   * @return {string}
   */
  line(lineNumber) {
  }

  newlineAndIndent() {
  }

  /**
   * @param {function(!KeyboardEvent)} handler
   */
  addKeyDownHandler(handler) {
  }

  /**
   * @param {?UI.AutocompleteConfig} config
   */
  configureAutocomplete(config) {
  }

  clearAutocomplete() {
  }

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!{x: number, y: number}}
   */
  visualCoordinates(lineNumber, columnNumber) {
  }

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?{startColumn: number, endColumn: number, type: string}}
   */
  tokenAtTextPosition(lineNumber, columnNumber) {
  }

  /**
   * @param {string} placeholder
   */
  setPlaceholder(placeholder) {}
}

/** @enum {symbol} */
export const Events = {
  CursorChanged: Symbol('CursorChanged'),
  TextChanged: Symbol('TextChanged'),
  SuggestionChanged: Symbol('SuggestionChanged')
};
