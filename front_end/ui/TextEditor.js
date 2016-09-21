// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @interface
 */
WebInspector.TextEditorFactory = function()
{
}

WebInspector.TextEditorFactory.prototype = {
    /**
     * @param {!WebInspector.TextEditor.Options} options
     * @return {!WebInspector.TextEditor}
     */
    createEditor: function(options) { }
}

/**
 * @interface
 */
WebInspector.TextEditor = function()
{
}

WebInspector.TextEditor.prototype = {

    /**
     * @return {!WebInspector.Widget}
     */
    widget: function() { },

    /**
     * @return {!WebInspector.TextRange}
     */
    fullRange: function(){ },

    /**
     * @return {!WebInspector.TextRange}
     */
    selection: function() { },

    /**
     * @param {!WebInspector.TextRange} selection
     */
    setSelection: function(selection) { },

    /**
     * @param {!WebInspector.TextRange=} textRange
     * @return {string}
     */
    text: function(textRange) { },

    /**
     * @param {string} text
     */
    setText: function(text) { },

    /**
     * @param {number} lineNumber
     * @return {string}
     */
    line: function(lineNumber) { },

    newlineAndIndent: function() { },

    /**
     * @param {function(!KeyboardEvent)} handler
     */
    addKeyDownHandler: function(handler) { },

    /**
     * @param {?WebInspector.AutocompleteConfig} config
     */
    configureAutocomplete: function(config) { },

    clearAutocomplete: function() { }
}

/**
 * @typedef {{
 *  bracketMatchingSetting: (!WebInspector.Setting|undefined),
 *  lineNumbers: boolean,
 *  lineWrapping: boolean,
 *  mimeType: (string|undefined),
 *  autoHeight: (boolean|undefined)
 * }}
 **/
WebInspector.TextEditor.Options;

/**
 * @typedef {{
 *     substituteRangeCallback: ((function(number, number):?WebInspector.TextRange)|undefined),
 *     suggestionsCallback: ((function(!WebInspector.TextRange, !WebInspector.TextRange):?Promise.<!WebInspector.SuggestBox.Suggestions>)|undefined),
 *     isWordChar: ((function(string):boolean)|undefined),
 *     captureEnter: (boolean|undefined)
 * }}
 **/
WebInspector.AutocompleteConfig;
