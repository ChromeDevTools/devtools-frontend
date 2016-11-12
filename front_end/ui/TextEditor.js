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
  createEditor: function(options) {}
};

/**
 * @interface
 */
UI.TextEditor = function() {};

UI.TextEditor.prototype = {

  /**
   * @return {!UI.Widget}
   */
  widget: function() {},

  /**
   * @return {!Common.TextRange}
   */
  fullRange: function() {},

  /**
   * @return {!Common.TextRange}
   */
  selection: function() {},

  /**
   * @param {!Common.TextRange} selection
   */
  setSelection: function(selection) {},

  /**
   * @param {!Common.TextRange=} textRange
   * @return {string}
   */
  text: function(textRange) {},

  /**
   * @param {string} text
   */
  setText: function(text) {},

  /**
   * @param {number} lineNumber
   * @return {string}
   */
  line: function(lineNumber) {},

  newlineAndIndent: function() {},

  /**
   * @param {function(!KeyboardEvent)} handler
   */
  addKeyDownHandler: function(handler) {},

  /**
   * @param {?UI.AutocompleteConfig} config
   */
  configureAutocomplete: function(config) {},

  clearAutocomplete: function() {}
};

/**
 * @typedef {{
 *  bracketMatchingSetting: (!Common.Setting|undefined),
 *  lineNumbers: boolean,
 *  lineWrapping: boolean,
 *  mimeType: (string|undefined),
 *  autoHeight: (boolean|undefined)
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
