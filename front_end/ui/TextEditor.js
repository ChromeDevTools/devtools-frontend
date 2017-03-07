// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @interface
 */
UI.TextEditorFactory = function() {};

UI.TextEditorFactory.prototype = {
  /**
   * @param {!UI.TextEditor.Options} options
   * @return {!UI.TextEditor}
   */
  createEditor(options) {}
};

/**
 * @interface
 */
UI.TextEditor = function() {};

UI.TextEditor.prototype = {

  /**
   * @return {!UI.Widget}
   */
  widget() {},

  /**
   * @return {!Common.TextRange}
   */
  fullRange() {},

  /**
   * @return {!Common.TextRange}
   */
  selection() {},

  /**
   * @param {!Common.TextRange} selection
   */
  setSelection(selection) {},

  /**
   * @param {!Common.TextRange=} textRange
   * @return {string}
   */
  text(textRange) {},

  /**
   * @param {string} text
   */
  setText(text) {},

  /**
   * @param {number} lineNumber
   * @return {string}
   */
  line(lineNumber) {},

  newlineAndIndent() {},

  /**
   * @param {function(!KeyboardEvent)} handler
   */
  addKeyDownHandler(handler) {},

  /**
   * @param {?UI.AutocompleteConfig} config
   */
  configureAutocomplete(config) {},

  clearAutocomplete() {}
};

/**
 * @typedef {{
 *  bracketMatchingSetting: (!Common.Setting|undefined),
 *  lineNumbers: boolean,
 *  lineWrapping: boolean,
 *  mimeType: (string|undefined),
 *  autoHeight: (boolean|undefined),
 *  padBottom: (boolean|undefined)
 * }}
 */
UI.TextEditor.Options;

/**
 * @typedef {{
 *     substituteRangeCallback: ((function(number, number):?Common.TextRange)|undefined),
 *     suggestionsCallback: ((function(!Common.TextRange, !Common.TextRange, boolean=, string=):?Promise.<!UI.SuggestBox.Suggestions>)|undefined),
 *     isWordChar: ((function(string):boolean)|undefined),
 *     captureEnter: (boolean|undefined)
 * }}
 */
UI.AutocompleteConfig;
