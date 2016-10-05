/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.SimpleView}
 * @implements {WebInspector.Searchable}
 * @implements {WebInspector.Replaceable}
 * @implements {WebInspector.SourcesTextEditorDelegate}
 * @param {string} url
 * @param {function(): !Promise<?string>} lazyContent
 */
WebInspector.SourceFrame = function(url, lazyContent) {
  WebInspector.SimpleView.call(this, WebInspector.UIString('Source'));

  this._url = url;
  this._lazyContent = lazyContent;

  this._textEditor = new WebInspector.SourcesTextEditor(this);

  this._currentSearchResultIndex = -1;
  this._searchResults = [];

  this._textEditor.setReadOnly(!this.canEditSource());

  this._shortcuts = {};
  this.element.addEventListener('keydown', this._handleKeyDown.bind(this), false);

  this._sourcePosition = new WebInspector.ToolbarText();

  /**
   * @type {?WebInspector.SearchableView}
   */
  this._searchableView = null;
};

/** @enum {symbol} */
WebInspector.SourceFrame.Events = {
  ScrollChanged: Symbol('ScrollChanged'),
  SelectionChanged: Symbol('SelectionChanged'),
  JumpHappened: Symbol('JumpHappened')
};

WebInspector.SourceFrame.prototype = {
  /**
   * @param {number} key
   * @param {function():boolean} handler
   */
  addShortcut: function(key, handler) { this._shortcuts[key] = handler; },

  /**
   * @override
   */
  wasShown: function() {
    this._ensureContentLoaded();
    this._textEditor.show(this.element);
    this._editorAttached = true;
    this._wasShownOrLoaded();
  },

  /**
     * @return {boolean}
     */
  isEditorShowing: function() { return this.isShowing() && this._editorAttached; },

  willHide: function() {
    WebInspector.Widget.prototype.willHide.call(this);

    this._clearPositionToReveal();
  },

  /**
     * @override
     * @return {!Array<!WebInspector.ToolbarItem>}
     */
  syncToolbarItems: function() { return [this._sourcePosition]; },

  get loaded() { return this._loaded; },

  get textEditor() { return this._textEditor; },

  _ensureContentLoaded: function() {
    if (!this._contentRequested) {
      this._contentRequested = true;
      this._lazyContent().then(this.setContent.bind(this));
    }
  },

  /**
   * @param {number} line 0-based
   * @param {number=} column
   * @param {boolean=} shouldHighlight
   */
  revealPosition: function(line, column, shouldHighlight) {
    this._clearLineToScrollTo();
    this._clearSelectionToSet();
    this._positionToReveal = {line: line, column: column, shouldHighlight: shouldHighlight};
    this._innerRevealPositionIfNeeded();
  },

  _innerRevealPositionIfNeeded: function() {
    if (!this._positionToReveal)
      return;

    if (!this.loaded || !this.isEditorShowing())
      return;

    this._textEditor.revealPosition(
        this._positionToReveal.line, this._positionToReveal.column,
        this._positionToReveal.shouldHighlight);
    delete this._positionToReveal;
  },

  _clearPositionToReveal: function() {
    this._textEditor.clearPositionHighlight();
    delete this._positionToReveal;
  },

  /**
   * @param {number} line
   */
  scrollToLine: function(line) {
    this._clearPositionToReveal();
    this._lineToScrollTo = line;
    this._innerScrollToLineIfNeeded();
  },

  _innerScrollToLineIfNeeded: function() {
    if (typeof this._lineToScrollTo === 'number') {
      if (this.loaded && this.isEditorShowing()) {
        this._textEditor.scrollToLine(this._lineToScrollTo);
        delete this._lineToScrollTo;
      }
    }
  },

  _clearLineToScrollTo: function() { delete this._lineToScrollTo; },

  /**
     * @return {!WebInspector.TextRange}
     */
  selection: function() { return this.textEditor.selection(); },

  /**
   * @param {!WebInspector.TextRange} textRange
   */
  setSelection: function(textRange) {
    this._selectionToSet = textRange;
    this._innerSetSelectionIfNeeded();
  },

  _innerSetSelectionIfNeeded: function() {
    if (this._selectionToSet && this.loaded && this.isEditorShowing()) {
      this._textEditor.setSelection(this._selectionToSet);
      delete this._selectionToSet;
    }
  },

  _clearSelectionToSet: function() { delete this._selectionToSet; },

  _wasShownOrLoaded: function() {
    this._innerRevealPositionIfNeeded();
    this._innerSetSelectionIfNeeded();
    this._innerScrollToLineIfNeeded();
  },

  /**
   * @override
   * @param {!WebInspector.TextRange} oldRange
   * @param {!WebInspector.TextRange} newRange
   */
  onTextChanged: function(oldRange, newRange) {
    if (this._searchConfig && this._searchableView)
      this.performSearch(this._searchConfig, false, false);
  },

  /**
     * @param {string} content
     * @param {string} mimeType
     * @return {string}
     */
  _simplifyMimeType: function(content, mimeType) {
    if (!mimeType)
      return '';
    if (mimeType.indexOf('javascript') >= 0 || mimeType.indexOf('jscript') >= 0 ||
        mimeType.indexOf('ecmascript') >= 0)
      return 'text/javascript';
    // A hack around the fact that files with "php" extension might be either standalone or html
    // embedded php scripts.
    if (mimeType === 'text/x-php' && content.match(/\<\?.*\?\>/g))
      return 'application/x-httpd-php';
    return mimeType;
  },

  /**
   * @param {string} highlighterType
   */
  setHighlighterType: function(highlighterType) {
    this._highlighterType = highlighterType;
    this._updateHighlighterType('');
  },

  /**
   * @param {string} content
   */
  _updateHighlighterType: function(content) {
    this._textEditor.setMimeType(this._simplifyMimeType(content, this._highlighterType));
  },

  /**
   * @param {?string} content
   */
  setContent: function(content) {
    if (!this._loaded) {
      this._loaded = true;
      this._textEditor.setText(content || '');
      this._textEditor.markClean();
    } else {
      var scrollTop = this._textEditor.scrollTop();
      var selection = this._textEditor.selection();
      this._textEditor.setText(content || '');
      this._textEditor.setScrollTop(scrollTop);
      this._textEditor.setSelection(selection);
    }

    this._updateHighlighterType(content || '');
    this._wasShownOrLoaded();

    if (this._delayedFindSearchMatches) {
      this._delayedFindSearchMatches();
      delete this._delayedFindSearchMatches;
    }
    this.onTextEditorContentSet();
  },

  onTextEditorContentSet: function() {},

  /**
   * @param {?WebInspector.SearchableView} view
   */
  setSearchableView: function(view) { this._searchableView = view; },

  /**
   * @param {!WebInspector.SearchableView.SearchConfig} searchConfig
   * @param {boolean} shouldJump
   * @param {boolean} jumpBackwards
   */
  _doFindSearchMatches: function(searchConfig, shouldJump, jumpBackwards) {
    this._currentSearchResultIndex = -1;
    this._searchResults = [];

    var regex = searchConfig.toSearchRegex();
    this._searchRegex = regex;
    this._searchResults = this._collectRegexMatches(regex);

    if (this._searchableView)
      this._searchableView.updateSearchMatchesCount(this._searchResults.length);

    if (!this._searchResults.length)
      this._textEditor.cancelSearchResultsHighlight();
    else if (shouldJump && jumpBackwards)
      this.jumpToPreviousSearchResult();
    else if (shouldJump)
      this.jumpToNextSearchResult();
    else
      this._textEditor.highlightSearchResults(regex, null);
  },

  /**
   * @override
   * @param {!WebInspector.SearchableView.SearchConfig} searchConfig
   * @param {boolean} shouldJump
   * @param {boolean=} jumpBackwards
   */
  performSearch: function(searchConfig, shouldJump, jumpBackwards) {
    if (this._searchableView)
      this._searchableView.updateSearchMatchesCount(0);

    this._resetSearch();
    this._searchConfig = searchConfig;
    if (this.loaded)
      this._doFindSearchMatches(searchConfig, shouldJump, !!jumpBackwards);
    else
      this._delayedFindSearchMatches =
          this._doFindSearchMatches.bind(this, searchConfig, shouldJump, !!jumpBackwards);

    this._ensureContentLoaded();
  },

  /**
   * @override
   */
  editorFocused: function() { this._resetCurrentSearchResultIndex(); },

  /**
   * @override
   */
  editorBlurred: function() {},

  _resetCurrentSearchResultIndex: function() {
    if (!this._searchResults.length)
      return;
    this._currentSearchResultIndex = -1;
    if (this._searchableView)
      this._searchableView.updateCurrentMatchIndex(this._currentSearchResultIndex);
    this._textEditor.highlightSearchResults(this._searchRegex, null);
  },

  _resetSearch: function() {
    delete this._searchConfig;
    delete this._delayedFindSearchMatches;
    this._currentSearchResultIndex = -1;
    this._searchResults = [];
    delete this._searchRegex;
  },

  /**
   * @override
   */
  searchCanceled: function() {
    var range = this._currentSearchResultIndex !== -1 ?
        this._searchResults[this._currentSearchResultIndex] :
        null;
    this._resetSearch();
    if (!this.loaded)
      return;
    this._textEditor.cancelSearchResultsHighlight();
    if (range)
      this.setSelection(range);
  },

  /**
     * @return {boolean}
     */
  hasSearchResults: function() { return this._searchResults.length > 0; },

  jumpToFirstSearchResult: function() { this.jumpToSearchResult(0); },

  jumpToLastSearchResult: function() { this.jumpToSearchResult(this._searchResults.length - 1); },

  /**
     * @return {number}
     */
  _searchResultIndexForCurrentSelection: function() {
    return this._searchResults.lowerBound(
        this._textEditor.selection().collapseToEnd(), WebInspector.TextRange.comparator);
  },

  /**
   * @override
   */
  jumpToNextSearchResult: function() {
    var currentIndex = this._searchResultIndexForCurrentSelection();
    var nextIndex = this._currentSearchResultIndex === -1 ? currentIndex : currentIndex + 1;
    this.jumpToSearchResult(nextIndex);
  },

  /**
   * @override
   */
  jumpToPreviousSearchResult: function() {
    var currentIndex = this._searchResultIndexForCurrentSelection();
    this.jumpToSearchResult(currentIndex - 1);
  },

  /**
     * @override
     * @return {boolean}
     */
  supportsCaseSensitiveSearch: function() { return true; },

  /**
     * @override
     * @return {boolean}
     */
  supportsRegexSearch: function() { return true; },

  get currentSearchResultIndex() { return this._currentSearchResultIndex; },

  jumpToSearchResult: function(index) {
    if (!this.loaded || !this._searchResults.length)
      return;
    this._currentSearchResultIndex =
        (index + this._searchResults.length) % this._searchResults.length;
    if (this._searchableView)
      this._searchableView.updateCurrentMatchIndex(this._currentSearchResultIndex);
    this._textEditor.highlightSearchResults(
        this._searchRegex, this._searchResults[this._currentSearchResultIndex]);
  },

  /**
   * @override
   * @param {!WebInspector.SearchableView.SearchConfig} searchConfig
   * @param {string} replacement
   */
  replaceSelectionWith: function(searchConfig, replacement) {
    var range = this._searchResults[this._currentSearchResultIndex];
    if (!range)
      return;
    this._textEditor.highlightSearchResults(this._searchRegex, null);

    var oldText = this._textEditor.text(range);
    var regex = searchConfig.toSearchRegex();
    var text;
    if (regex.__fromRegExpQuery)
      text = oldText.replace(regex, replacement);
    else
      text = oldText.replace(regex, function() { return replacement; });

    var newRange = this._textEditor.editRange(range, text);
    this._textEditor.setSelection(newRange.collapseToEnd());
  },

  /**
   * @override
   * @param {!WebInspector.SearchableView.SearchConfig} searchConfig
   * @param {string} replacement
   */
  replaceAllWith: function(searchConfig, replacement) {
    this._resetCurrentSearchResultIndex();

    var text = this._textEditor.text();
    var range = this._textEditor.fullRange();

    var regex = searchConfig.toSearchRegex(true);
    if (regex.__fromRegExpQuery)
      text = text.replace(regex, replacement);
    else
      text = text.replace(regex, function() { return replacement; });

    var ranges = this._collectRegexMatches(regex);
    if (!ranges.length)
      return;

    // Calculate the position of the end of the last range to be edited.
    var currentRangeIndex =
        ranges.lowerBound(this._textEditor.selection(), WebInspector.TextRange.comparator);
    var lastRangeIndex = mod(currentRangeIndex - 1, ranges.length);
    var lastRange = ranges[lastRangeIndex];
    var replacementLineEndings = replacement.computeLineEndings();
    var replacementLineCount = replacementLineEndings.length;
    var lastLineNumber = lastRange.startLine + replacementLineEndings.length - 1;
    var lastColumnNumber = lastRange.startColumn;
    if (replacementLineEndings.length > 1)
      lastColumnNumber = replacementLineEndings[replacementLineCount - 1] -
          replacementLineEndings[replacementLineCount - 2] - 1;

    this._textEditor.editRange(range, text);
    this._textEditor.revealPosition(lastLineNumber, lastColumnNumber);
    this._textEditor.setSelection(
        WebInspector.TextRange.createFromLocation(lastLineNumber, lastColumnNumber));
  },

  _collectRegexMatches: function(regexObject) {
    var ranges = [];
    for (var i = 0; i < this._textEditor.linesCount; ++i) {
      var line = this._textEditor.line(i);
      var offset = 0;
      do {
        var match = regexObject.exec(line);
        if (match) {
          var matchEndIndex = match.index + Math.max(match[0].length, 1);
          if (match[0].length)
            ranges.push(
                new WebInspector.TextRange(i, offset + match.index, i, offset + matchEndIndex));
          offset += matchEndIndex;
          line = line.substring(matchEndIndex);
        }
      } while (match && line);
    }
    return ranges;
  },

  /**
     * @override
     * @return {!Promise}
     */
  populateLineGutterContextMenu: function(contextMenu, lineNumber) { return Promise.resolve(); },

  /**
     * @override
     * @return {!Promise}
     */
  populateTextAreaContextMenu: function(contextMenu, lineNumber, columnNumber) {
    return Promise.resolve();
  },

  /**
   * @override
   * @param {?WebInspector.TextRange} from
   * @param {?WebInspector.TextRange} to
   */
  onJumpToPosition: function(from, to) {
    this.dispatchEventToListeners(
        WebInspector.SourceFrame.Events.JumpHappened, {from: from, to: to});
  },

  /**
     * @return {boolean}
     */
  canEditSource: function() { return false; },

  /**
   * @override
   * @param {!WebInspector.TextRange} textRange
   */
  selectionChanged: function(textRange) {
    this._updateSourcePosition();
    this.dispatchEventToListeners(WebInspector.SourceFrame.Events.SelectionChanged, textRange);
  },

  _updateSourcePosition: function() {
    var selections = this._textEditor.selections();
    if (!selections.length)
      return;
    if (selections.length > 1) {
      this._sourcePosition.setText(
          WebInspector.UIString('%d selection regions', selections.length));
      return;
    }
    var textRange = selections[0];
    if (textRange.isEmpty()) {
      this._sourcePosition.setText(WebInspector.UIString(
          'Line %d, Column %d', textRange.endLine + 1, textRange.endColumn + 1));
      return;
    }
    textRange = textRange.normalize();

    var selectedText = this._textEditor.text(textRange);
    if (textRange.startLine === textRange.endLine)
      this._sourcePosition.setText(
          WebInspector.UIString('%d characters selected', selectedText.length));
    else
      this._sourcePosition.setText(WebInspector.UIString(
          '%d lines, %d characters selected', textRange.endLine - textRange.startLine + 1,
          selectedText.length));
  },

  /**
   * @override
   * @param {number} lineNumber
   */
  scrollChanged: function(lineNumber) {
    if (this._scrollTimer)
      clearTimeout(this._scrollTimer);
    this._scrollTimer = setTimeout(
        this.dispatchEventToListeners.bind(
            this, WebInspector.SourceFrame.Events.ScrollChanged, lineNumber),
        100);
  },

  _handleKeyDown: function(e) {
    var shortcutKey = WebInspector.KeyboardShortcut.makeKeyFromEvent(e);
    var handler = this._shortcuts[shortcutKey];
    if (handler && handler())
      e.consume(true);
  },

  __proto__: WebInspector.SimpleView.prototype
};
