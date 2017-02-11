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
 * @implements {UI.Searchable}
 * @implements {UI.Replaceable}
 * @implements {SourceFrame.SourcesTextEditorDelegate}
 * @unrestricted
 */
SourceFrame.SourceFrame = class extends UI.SimpleView {
  /**
   * @param {string} url
   * @param {function(): !Promise<?string>} lazyContent
   */
  constructor(url, lazyContent) {
    super(Common.UIString('Source'));

    this._url = url;
    this._lazyContent = lazyContent;

    this._textEditor = new SourceFrame.SourcesTextEditor(this);

    this._currentSearchResultIndex = -1;
    this._searchResults = [];

    this._textEditor.addEventListener(
        SourceFrame.SourcesTextEditor.Events.EditorFocused, this._resetCurrentSearchResultIndex, this);
    this._textEditor.addEventListener(
        SourceFrame.SourcesTextEditor.Events.SelectionChanged, this._updateSourcePosition, this);
    this._textEditor.addEventListener(
        SourceFrame.SourcesTextEditor.Events.TextChanged,
        event => this.onTextChanged(event.data.oldRange, event.data.newRange));

    this._shortcuts = {};
    this.element.addEventListener('keydown', this._handleKeyDown.bind(this), false);

    this._sourcePosition = new UI.ToolbarText();

    /**
     * @type {?UI.SearchableView}
     */
    this._searchableView = null;
    this._editable = false;
    this._textEditor.setReadOnly(true);
  }

  /**
   * @param {boolean} editable
   * @protected
   */
  setEditable(editable) {
    this._editable = editable;
    if (this._loaded)
      this._textEditor.setReadOnly(!editable);
  }

  /**
   * @param {number} key
   * @param {function():boolean} handler
   */
  addShortcut(key, handler) {
    this._shortcuts[key] = handler;
  }

  /**
   * @override
   */
  wasShown() {
    this._ensureContentLoaded();
    this._textEditor.show(this.element);
    this._editorAttached = true;
    this._wasShownOrLoaded();
  }

  /**
   * @return {boolean}
   */
  isEditorShowing() {
    return this.isShowing() && this._editorAttached;
  }

  /**
   * @override
   */
  willHide() {
    super.willHide();

    this._clearPositionToReveal();
  }

  /**
   * @override
   * @return {!Array<!UI.ToolbarItem>}
   */
  syncToolbarItems() {
    return [this._sourcePosition];
  }

  get loaded() {
    return this._loaded;
  }

  get textEditor() {
    return this._textEditor;
  }

  _ensureContentLoaded() {
    if (!this._contentRequested) {
      this._contentRequested = true;
      this._lazyContent().then(this.setContent.bind(this));
    }
  }

  /**
   * @param {number} line 0-based
   * @param {number=} column
   * @param {boolean=} shouldHighlight
   */
  revealPosition(line, column, shouldHighlight) {
    this._clearLineToScrollTo();
    this._clearSelectionToSet();
    this._positionToReveal = {line: line, column: column, shouldHighlight: shouldHighlight};
    this._innerRevealPositionIfNeeded();
  }

  _innerRevealPositionIfNeeded() {
    if (!this._positionToReveal)
      return;

    if (!this.loaded || !this.isEditorShowing())
      return;

    this._textEditor.revealPosition(
        this._positionToReveal.line, this._positionToReveal.column, this._positionToReveal.shouldHighlight);
    delete this._positionToReveal;
  }

  _clearPositionToReveal() {
    this._textEditor.clearPositionHighlight();
    delete this._positionToReveal;
  }

  /**
   * @param {number} line
   */
  scrollToLine(line) {
    this._clearPositionToReveal();
    this._lineToScrollTo = line;
    this._innerScrollToLineIfNeeded();
  }

  _innerScrollToLineIfNeeded() {
    if (typeof this._lineToScrollTo === 'number') {
      if (this.loaded && this.isEditorShowing()) {
        this._textEditor.scrollToLine(this._lineToScrollTo);
        delete this._lineToScrollTo;
      }
    }
  }

  _clearLineToScrollTo() {
    delete this._lineToScrollTo;
  }

  /**
   * @return {!Common.TextRange}
   */
  selection() {
    return this.textEditor.selection();
  }

  /**
   * @param {!Common.TextRange} textRange
   */
  setSelection(textRange) {
    this._selectionToSet = textRange;
    this._innerSetSelectionIfNeeded();
  }

  _innerSetSelectionIfNeeded() {
    if (this._selectionToSet && this.loaded && this.isEditorShowing()) {
      this._textEditor.setSelection(this._selectionToSet);
      delete this._selectionToSet;
    }
  }

  _clearSelectionToSet() {
    delete this._selectionToSet;
  }

  _wasShownOrLoaded() {
    this._innerRevealPositionIfNeeded();
    this._innerSetSelectionIfNeeded();
    this._innerScrollToLineIfNeeded();
  }

  /**
   * @param {!Common.TextRange} oldRange
   * @param {!Common.TextRange} newRange
   */
  onTextChanged(oldRange, newRange) {
    if (this._searchConfig && this._searchableView)
      this.performSearch(this._searchConfig, false, false);
  }

  /**
   * @param {string} content
   * @param {string} mimeType
   * @return {string}
   */
  _simplifyMimeType(content, mimeType) {
    if (!mimeType)
      return '';
    if (mimeType.indexOf('javascript') >= 0 || mimeType.indexOf('jscript') >= 0 || mimeType.indexOf('ecmascript') >= 0)
      return 'text/javascript';
    // A hack around the fact that files with "php" extension might be either standalone or html embedded php scripts.
    if (mimeType === 'text/x-php' && content.match(/\<\?.*\?\>/g))
      return 'application/x-httpd-php';
    return mimeType;
  }

  /**
   * @param {string} highlighterType
   */
  setHighlighterType(highlighterType) {
    this._highlighterType = highlighterType;
    this._updateHighlighterType('');
  }

  /**
   * @param {string} content
   */
  _updateHighlighterType(content) {
    this._textEditor.setMimeType(this._simplifyMimeType(content, this._highlighterType));
  }

  /**
   * @param {?string} content
   */
  setContent(content) {
    if (!this._loaded) {
      this._loaded = true;
      this._textEditor.setText(content || '');
      this._textEditor.markClean();
      this._textEditor.setReadOnly(!this._editable);
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
  }

  onTextEditorContentSet() {
  }

  /**
   * @param {?UI.SearchableView} view
   */
  setSearchableView(view) {
    this._searchableView = view;
  }

  /**
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @param {boolean} shouldJump
   * @param {boolean} jumpBackwards
   */
  _doFindSearchMatches(searchConfig, shouldJump, jumpBackwards) {
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
  }

  /**
   * @override
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @param {boolean} shouldJump
   * @param {boolean=} jumpBackwards
   */
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    if (this._searchableView)
      this._searchableView.updateSearchMatchesCount(0);

    this._resetSearch();
    this._searchConfig = searchConfig;
    if (this.loaded)
      this._doFindSearchMatches(searchConfig, shouldJump, !!jumpBackwards);
    else
      this._delayedFindSearchMatches = this._doFindSearchMatches.bind(this, searchConfig, shouldJump, !!jumpBackwards);

    this._ensureContentLoaded();
  }

  _resetCurrentSearchResultIndex() {
    if (!this._searchResults.length)
      return;
    this._currentSearchResultIndex = -1;
    if (this._searchableView)
      this._searchableView.updateCurrentMatchIndex(this._currentSearchResultIndex);
    this._textEditor.highlightSearchResults(this._searchRegex, null);
  }

  _resetSearch() {
    delete this._searchConfig;
    delete this._delayedFindSearchMatches;
    this._currentSearchResultIndex = -1;
    this._searchResults = [];
    delete this._searchRegex;
  }

  /**
   * @override
   */
  searchCanceled() {
    var range = this._currentSearchResultIndex !== -1 ? this._searchResults[this._currentSearchResultIndex] : null;
    this._resetSearch();
    if (!this.loaded)
      return;
    this._textEditor.cancelSearchResultsHighlight();
    if (range)
      this.setSelection(range);
  }

  /**
   * @return {boolean}
   */
  hasSearchResults() {
    return this._searchResults.length > 0;
  }

  jumpToFirstSearchResult() {
    this.jumpToSearchResult(0);
  }

  jumpToLastSearchResult() {
    this.jumpToSearchResult(this._searchResults.length - 1);
  }

  /**
   * @return {number}
   */
  _searchResultIndexForCurrentSelection() {
    return this._searchResults.lowerBound(this._textEditor.selection().collapseToEnd(), Common.TextRange.comparator);
  }

  /**
   * @override
   */
  jumpToNextSearchResult() {
    var currentIndex = this._searchResultIndexForCurrentSelection();
    var nextIndex = this._currentSearchResultIndex === -1 ? currentIndex : currentIndex + 1;
    this.jumpToSearchResult(nextIndex);
  }

  /**
   * @override
   */
  jumpToPreviousSearchResult() {
    var currentIndex = this._searchResultIndexForCurrentSelection();
    this.jumpToSearchResult(currentIndex - 1);
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsCaseSensitiveSearch() {
    return true;
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsRegexSearch() {
    return true;
  }

  get currentSearchResultIndex() {
    return this._currentSearchResultIndex;
  }

  jumpToSearchResult(index) {
    if (!this.loaded || !this._searchResults.length)
      return;
    this._currentSearchResultIndex = (index + this._searchResults.length) % this._searchResults.length;
    if (this._searchableView)
      this._searchableView.updateCurrentMatchIndex(this._currentSearchResultIndex);
    this._textEditor.highlightSearchResults(this._searchRegex, this._searchResults[this._currentSearchResultIndex]);
  }

  /**
   * @override
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @param {string} replacement
   */
  replaceSelectionWith(searchConfig, replacement) {
    var range = this._searchResults[this._currentSearchResultIndex];
    if (!range)
      return;
    this._textEditor.highlightSearchResults(this._searchRegex, null);

    var oldText = this._textEditor.text(range);
    var regex = searchConfig.toSearchRegex();
    var text;
    if (regex.__fromRegExpQuery) {
      text = oldText.replace(regex, replacement);
    } else {
      text = oldText.replace(regex, function() {
        return replacement;
      });
    }

    var newRange = this._textEditor.editRange(range, text);
    this._textEditor.setSelection(newRange.collapseToEnd());
  }

  /**
   * @override
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @param {string} replacement
   */
  replaceAllWith(searchConfig, replacement) {
    this._resetCurrentSearchResultIndex();

    var text = this._textEditor.text();
    var range = this._textEditor.fullRange();

    var regex = searchConfig.toSearchRegex(true);
    if (regex.__fromRegExpQuery) {
      text = text.replace(regex, replacement);
    } else {
      text = text.replace(regex, function() {
        return replacement;
      });
    }

    var ranges = this._collectRegexMatches(regex);
    if (!ranges.length)
      return;

    // Calculate the position of the end of the last range to be edited.
    var currentRangeIndex = ranges.lowerBound(this._textEditor.selection(), Common.TextRange.comparator);
    var lastRangeIndex = mod(currentRangeIndex - 1, ranges.length);
    var lastRange = ranges[lastRangeIndex];
    var replacementLineEndings = replacement.computeLineEndings();
    var replacementLineCount = replacementLineEndings.length;
    var lastLineNumber = lastRange.startLine + replacementLineEndings.length - 1;
    var lastColumnNumber = lastRange.startColumn;
    if (replacementLineEndings.length > 1) {
      lastColumnNumber =
          replacementLineEndings[replacementLineCount - 1] - replacementLineEndings[replacementLineCount - 2] - 1;
    }

    this._textEditor.editRange(range, text);
    this._textEditor.revealPosition(lastLineNumber, lastColumnNumber);
    this._textEditor.setSelection(Common.TextRange.createFromLocation(lastLineNumber, lastColumnNumber));
  }

  _collectRegexMatches(regexObject) {
    var ranges = [];
    for (var i = 0; i < this._textEditor.linesCount; ++i) {
      var line = this._textEditor.line(i);
      var offset = 0;
      do {
        var match = regexObject.exec(line);
        if (match) {
          var matchEndIndex = match.index + Math.max(match[0].length, 1);
          if (match[0].length)
            ranges.push(new Common.TextRange(i, offset + match.index, i, offset + matchEndIndex));
          offset += matchEndIndex;
          line = line.substring(matchEndIndex);
        }
      } while (match && line);
    }
    return ranges;
  }

  /**
   * @override
   * @return {!Promise}
   */
  populateLineGutterContextMenu(contextMenu, lineNumber) {
    return Promise.resolve();
  }

  /**
   * @override
   * @return {!Promise}
   */
  populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber) {
    return Promise.resolve();
  }

  /**
   * @return {boolean}
   */
  canEditSource() {
    return this._editable;
  }

  _updateSourcePosition() {
    var selections = this._textEditor.selections();
    if (!selections.length)
      return;
    if (selections.length > 1) {
      this._sourcePosition.setText(Common.UIString('%d selection regions', selections.length));
      return;
    }
    var textRange = selections[0];
    if (textRange.isEmpty()) {
      this._sourcePosition.setText(
          Common.UIString('Line %d, Column %d', textRange.endLine + 1, textRange.endColumn + 1));
      return;
    }
    textRange = textRange.normalize();

    var selectedText = this._textEditor.text(textRange);
    if (textRange.startLine === textRange.endLine) {
      this._sourcePosition.setText(Common.UIString('%d characters selected', selectedText.length));
    } else {
      this._sourcePosition.setText(Common.UIString(
          '%d lines, %d characters selected', textRange.endLine - textRange.startLine + 1, selectedText.length));
    }
  }

  _handleKeyDown(e) {
    var shortcutKey = UI.KeyboardShortcut.makeKeyFromEvent(e);
    var handler = this._shortcuts[shortcutKey];
    if (handler && handler())
      e.consume(true);
  }
};
