// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as TextUtils from '../text_utils/text_utils.js';  // eslint-disable-line no-unused-vars

import {AnchorBehavior} from './GlassPane.js';  // eslint-disable-line no-unused-vars
import {Suggestions} from './SuggestBox.js';    // eslint-disable-line no-unused-vars
import {Widget} from './Widget.js';  // eslint-disable-line no-unused-vars

/**
 * @interface
 */
export class TextEditorFactory {
  /**
   * @param {!Options} options
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
   * @return {!TextUtils.TextRange.TextRange}
   */
  fullRange() {
  }

  /**
   * @return {!TextUtils.TextRange.TextRange}
   */
  selection() {
  }

  /**
   * @param {!TextUtils.TextRange.TextRange} selection
   */
  setSelection(selection) {
  }

  /**
   * @param {!TextUtils.TextRange.TextRange=} textRange
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
   * @param {?AutocompleteConfig} config
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

/**
 * @typedef {{
  *  bracketMatchingSetting: (!Common.Settings.Setting|undefined),
  *  devtoolsAccessibleName: (string|undefined),
  *  lineNumbers: boolean,
  *  lineWrapping: boolean,
  *  mimeType: (string|undefined),
  *  autoHeight: (boolean|undefined),
  *  padBottom: (boolean|undefined),
  *  maxHighlightLength: (number|undefined),
  *  placeholder: (string|undefined)
  * }}
  */
export let Options;

/**
  * @typedef {{
  *     substituteRangeCallback: ((function(number, number):?TextUtils.TextRange.TextRange)|undefined),
  *     tooltipCallback: ((function(number, number):!Promise<?Element>)|undefined),
  *     suggestionsCallback: ((function(!TextUtils.TextRange.TextRange, !TextUtils.TextRange.TextRange, boolean=):?Promise.<!Suggestions>)|undefined),
  *     isWordChar: ((function(string):boolean)|undefined),
  *     anchorBehavior: (AnchorBehavior|undefined)
  * }}
  */
export let AutocompleteConfig;
