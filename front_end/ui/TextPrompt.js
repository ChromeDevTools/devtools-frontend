/*
 * Copyright (C) 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2011 Google Inc.  All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @implements {WebInspector.SuggestBoxDelegate}
 * @unrestricted
 */
WebInspector.TextPrompt = class extends WebInspector.Object {
  constructor() {
    super();
    /**
     * @type {!Element|undefined}
     */
    this._proxyElement;
    this._proxyElementDisplay = 'inline-block';
    this._autocompletionTimeout = WebInspector.TextPrompt.DefaultAutocompletionTimeout;
    this._title = '';
    this._prefixRange = null;
    this._previousText = '';
    this._currentSuggestion = '';
    this._completionRequestId = 0;
    this._ghostTextElement = createElementWithClass('span', 'auto-complete-text');
  }

  /**
   * @param {function(!Element, !Range, boolean, function(!Array.<string>, number=))} completions
   * @param {string=} stopCharacters
   */
  initialize(completions, stopCharacters) {
    this._loadCompletions = completions;
    this._completionStopCharacters = stopCharacters || ' =:[({;,!+-*/&|^<>.';
  }

  /**
   * @param {number} timeout
   */
  setAutocompletionTimeout(timeout) {
    this._autocompletionTimeout = timeout;
  }

  /**
   * @param {boolean} suggestBoxEnabled
   */
  setSuggestBoxEnabled(suggestBoxEnabled) {
    this._suggestBoxEnabled = suggestBoxEnabled;
  }

  renderAsBlock() {
    this._proxyElementDisplay = 'block';
  }

  /**
   * Clients should never attach any event listeners to the |element|. Instead,
   * they should use the result of this method to attach listeners for bubbling events.
   *
   * @param {!Element} element
   * @return {!Element}
   */
  attach(element) {
    return this._attachInternal(element);
  }

  /**
   * Clients should never attach any event listeners to the |element|. Instead,
   * they should use the result of this method to attach listeners for bubbling events
   * or the |blurListener| parameter to register a "blur" event listener on the |element|
   * (since the "blur" event does not bubble.)
   *
   * @param {!Element} element
   * @param {function(!Event)} blurListener
   * @return {!Element}
   */
  attachAndStartEditing(element, blurListener) {
    var proxyElement = this._attachInternal(element);
    this._startEditing(blurListener);
    return proxyElement;
  }

  /**
   * @param {!Element} element
   * @return {!Element}
   */
  _attachInternal(element) {
    if (this._proxyElement)
      throw 'Cannot attach an attached TextPrompt';
    this._element = element;

    this._boundOnKeyDown = this.onKeyDown.bind(this);
    this._boundOnInput = this.onInput.bind(this);
    this._boundOnMouseWheel = this.onMouseWheel.bind(this);
    this._boundClearAutocomplete = this.clearAutocomplete.bind(this);
    this._proxyElement = element.ownerDocument.createElement('span');
    var shadowRoot = WebInspector.createShadowRootWithCoreStyles(this._proxyElement, 'ui/textPrompt.css');
    this._contentElement = shadowRoot.createChild('div');
    this._contentElement.createChild('content');
    this._proxyElement.style.display = this._proxyElementDisplay;
    element.parentElement.insertBefore(this._proxyElement, element);
    this._proxyElement.appendChild(element);
    this._element.classList.add('text-prompt');
    this._element.addEventListener('keydown', this._boundOnKeyDown, false);
    this._element.addEventListener('input', this._boundOnInput, false);
    this._element.addEventListener('mousewheel', this._boundOnMouseWheel, false);
    this._element.addEventListener('selectstart', this._boundClearAutocomplete, false);
    this._element.addEventListener('blur', this._boundClearAutocomplete, false);
    this._element.ownerDocument.defaultView.addEventListener('resize', this._boundClearAutocomplete, false);

    if (this._suggestBoxEnabled)
      this._suggestBox = new WebInspector.SuggestBox(this, 20, true);

    if (this._title)
      this._proxyElement.title = this._title;

    return this._proxyElement;
  }

  detach() {
    this._removeFromElement();
    this._proxyElement.parentElement.insertBefore(this._element, this._proxyElement);
    this._proxyElement.remove();
    delete this._proxyElement;
    this._element.classList.remove('text-prompt');
    this._focusRestorer.restore();
  }

  /**
   * @return {string}
   */
  textWithCurrentSuggestion() {
    return this._element.textContent;
  }

  /**
   * @return {string}
   */
  text() {
    var text = this.textWithCurrentSuggestion();
    if (this._ghostTextElement.parentNode) {
      var addition = this._ghostTextElement.textContent;
      text = text.substring(0, text.length - addition.length);
    }
    return text;
  }

  /**
   * @param {string} x
   */
  setText(x) {
    this.clearAutocomplete();
    if (!x) {
      // Append a break element instead of setting textContent to make sure the selection is inside the prompt.
      this._element.removeChildren();
      this._element.createChild('br');
    } else {
      this._element.textContent = x;
    }
    this._previousText = this.text();

    this.moveCaretToEndOfPrompt();
    this._element.scrollIntoView();
  }

  /**
   * @return {string}
   */
  title() {
    return this._title;
  }

  /**
   * @param {string} title
   */
  setTitle(title) {
    this._title = title;
    if (this._proxyElement)
      this._proxyElement.title = title;
  }

  _removeFromElement() {
    this.clearAutocomplete();
    this._element.removeEventListener('keydown', this._boundOnKeyDown, false);
    this._element.removeEventListener('input', this._boundOnInput, false);
    this._element.removeEventListener('selectstart', this._boundClearAutocomplete, false);
    this._element.removeEventListener('blur', this._boundClearAutocomplete, false);
    this._element.ownerDocument.defaultView.removeEventListener('resize', this._boundClearAutocomplete, false);
    if (this._isEditing)
      this._stopEditing();
    if (this._suggestBox)
      this._suggestBox.removeFromElement();
  }

  /**
   * @param {function(!Event)=} blurListener
   */
  _startEditing(blurListener) {
    this._isEditing = true;
    this._contentElement.classList.add('text-prompt-editing');
    if (blurListener) {
      this._blurListener = blurListener;
      this._element.addEventListener('blur', this._blurListener, false);
    }
    this._oldTabIndex = this._element.tabIndex;
    if (this._element.tabIndex < 0)
      this._element.tabIndex = 0;
    this._focusRestorer = new WebInspector.ElementFocusRestorer(this._element);
    if (!this.text())
      this.autoCompleteSoon();
  }

  _stopEditing() {
    this._element.tabIndex = this._oldTabIndex;
    if (this._blurListener)
      this._element.removeEventListener('blur', this._blurListener, false);
    this._contentElement.classList.remove('text-prompt-editing');
    delete this._isEditing;
  }

  /**
   * @param {!Event} event
   */
  onMouseWheel(event) {
    // Subclasses can implement.
  }

  /**
   * @param {!Event} event
   */
  onKeyDown(event) {
    var handled = false;

    switch (event.key) {
      case 'Tab':
        handled = this.tabKeyPressed(event);
        break;
      case 'ArrowLeft':
      case 'Home':
        this.clearAutocomplete();
        break;
      case 'ArrowRight':
      case 'End':
        if (this._isCaretAtEndOfPrompt())
          handled = this.acceptAutoComplete();
        else
          this.clearAutocomplete();
        break;
      case 'Escape':
        if (this._isSuggestBoxVisible()) {
          this.clearAutocomplete();
          handled = true;
        }
        break;
      case ' ':  // Space
        if (event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
          this.autoCompleteSoon(true);
          handled = true;
        }
        break;
      case 'Alt':
      case 'Meta':
      case 'Shift':
      case 'Control':
        break;
    }

    if (!handled && this._isSuggestBoxVisible())
      handled = this._suggestBox.keyPressed(event);

    if (handled)
      event.consume(true);
  }

  /**
   * @param {!Event} event
   */
  onInput(event) {
    var text = this.text();
    var hasCommonPrefix = text.startsWith(this._previousText) || this._previousText.startsWith(text);
    if (this._prefixRange && hasCommonPrefix)
      this._prefixRange.endColumn += text.length - this._previousText.length;
    this._refreshGhostText();
    this._previousText = text;

    this.autoCompleteSoon();
  }

  /**
   * @return {boolean}
   */
  acceptAutoComplete() {
    var result = false;
    if (this._isSuggestBoxVisible())
      result = this._suggestBox.acceptSuggestion();
    if (!result)
      result = this._acceptSuggestionInternal();

    return result;
  }

  clearAutocomplete() {
    if (this._isSuggestBoxVisible())
      this._suggestBox.hide();
    this._clearAutocompleteTimeout();
    this._prefixRange = null;
    this._refreshGhostText();
  }

  _refreshGhostText() {
    if (this._prefixRange && this._isCaretAtEndOfPrompt()) {
      this._ghostTextElement.textContent =
          this._currentSuggestion.substring(this._prefixRange.endColumn - this._prefixRange.startColumn);
      this._element.appendChild(this._ghostTextElement);
    } else {
      this._ghostTextElement.remove();
    }
  }

  _clearAutocompleteTimeout() {
    if (this._completeTimeout) {
      clearTimeout(this._completeTimeout);
      delete this._completeTimeout;
    }
    this._completionRequestId++;
  }

  /**
   * @param {boolean=} force
   */
  autoCompleteSoon(force) {
    var immediately = this._isSuggestBoxVisible() || force;
    if (!this._completeTimeout)
      this._completeTimeout =
          setTimeout(this.complete.bind(this, force), immediately ? 0 : this._autocompletionTimeout);
  }

  /**
   * @param {boolean=} force
   * @param {boolean=} reverse
   */
  complete(force, reverse) {
    this._clearAutocompleteTimeout();
    var selection = this._element.getComponentSelection();
    var selectionRange = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
    if (!selectionRange)
      return;

    var shouldExit;

    if (!force && !this._isCaretAtEndOfPrompt() && !this._isSuggestBoxVisible())
      shouldExit = true;
    else if (!selection.isCollapsed)
      shouldExit = true;
    else if (!force) {
      // BUG72018: Do not show suggest box if caret is followed by a non-stop character.
      var wordSuffixRange = selectionRange.startContainer.rangeOfWord(
          selectionRange.endOffset, this._completionStopCharacters, this._element, 'forward');
      var autocompleteTextLength = this._ghostTextElement.parentNode ? this._ghostTextElement.textContent.length : 0;
      if (wordSuffixRange.toString().length !== autocompleteTextLength)
        shouldExit = true;
    }
    if (shouldExit) {
      this.clearAutocomplete();
      return;
    }

    var wordPrefixRange = selectionRange.startContainer.rangeOfWord(
        selectionRange.startOffset, this._completionStopCharacters, this._element, 'backward');
    this._loadCompletions(
        /** @type {!Element} */ (this._proxyElement), wordPrefixRange, force || false,
        this._completionsReady.bind(this, ++this._completionRequestId, selection, wordPrefixRange, !!reverse, !!force));
  }

  disableDefaultSuggestionForEmptyInput() {
    this._disableDefaultSuggestionForEmptyInput = true;
  }

  /**
   * @param {!Selection} selection
   * @param {!Range} textRange
   */
  _boxForAnchorAtStart(selection, textRange) {
    var rangeCopy = selection.getRangeAt(0).cloneRange();
    var anchorElement = createElement('span');
    anchorElement.textContent = '\u200B';
    textRange.insertNode(anchorElement);
    var box = anchorElement.boxInWindow(window);
    anchorElement.remove();
    selection.removeAllRanges();
    selection.addRange(rangeCopy);
    return box;
  }

  /**
   * @return {?Range}
   * @suppressGlobalPropertiesCheck
   */
  _createRange() {
    return document.createRange();
  }

  /**
   * @param {string} prefix
   * @return {!WebInspector.SuggestBox.Suggestions}
   */
  additionalCompletions(prefix) {
    return [];
  }

  /**
   * @param {number} completionRequestId
   * @param {!Selection} selection
   * @param {!Range} originalWordPrefixRange
   * @param {boolean} reverse
   * @param {boolean} force
   * @param {!Array.<string>} completions
   * @param {number=} selectedIndex
   */
  _completionsReady(
      completionRequestId,
      selection,
      originalWordPrefixRange,
      reverse,
      force,
      completions,
      selectedIndex) {
    if (this._completionRequestId !== completionRequestId)
      return;

    var prefix = originalWordPrefixRange.toString();

    // Filter out dupes.
    var store = new Set();
    completions = completions.filter(item => !store.has(item) && !!store.add(item));
    var annotatedCompletions = completions.map(item => ({title: item}));

    if (prefix || force) {
      if (prefix)
        annotatedCompletions = annotatedCompletions.concat(this.additionalCompletions(prefix));
      else
        annotatedCompletions = this.additionalCompletions(prefix).concat(annotatedCompletions);
    }

    if (!annotatedCompletions.length) {
      this.clearAutocomplete();
      return;
    }

    var selectionRange = selection.getRangeAt(0);

    var fullWordRange = this._createRange();
    fullWordRange.setStart(originalWordPrefixRange.startContainer, originalWordPrefixRange.startOffset);
    fullWordRange.setEnd(selectionRange.endContainer, selectionRange.endOffset);

    if (prefix + selectionRange.toString() !== fullWordRange.toString())
      return;

    selectedIndex = (this._disableDefaultSuggestionForEmptyInput && !this.text()) ? -1 : (selectedIndex || 0);

    if (this._suggestBox)
      this._suggestBox.updateSuggestions(
          this._boxForAnchorAtStart(selection, fullWordRange), annotatedCompletions, selectedIndex,
          !this._isCaretAtEndOfPrompt(), this.text());

    var beforeRange = this._createRange();
    beforeRange.setStart(this._element, 0);
    beforeRange.setEnd(fullWordRange.startContainer, fullWordRange.startOffset);
    this._prefixRange = new WebInspector.TextRange(
        0, beforeRange.toString().length, 0, beforeRange.toString().length + fullWordRange.toString().length);

    if (selectedIndex === -1)
      return;
    this.applySuggestion(annotatedCompletions[selectedIndex].title, true);
  }

  /**
   * @override
   * @param {string} suggestion
   * @param {boolean=} isIntermediateSuggestion
   */
  applySuggestion(suggestion, isIntermediateSuggestion) {
    if (!this._prefixRange)
      return;
    this._currentSuggestion = suggestion;
    this._refreshGhostText();
    if (isIntermediateSuggestion)
      this.dispatchEventToListeners(WebInspector.TextPrompt.Events.ItemApplied);
  }

  /**
   * @override
   */
  acceptSuggestion() {
    this._acceptSuggestionInternal();
  }

  /**
   * @return {boolean}
   */
  _acceptSuggestionInternal() {
    if (!this._prefixRange)
      return false;

    var text = this.text();
    this._element.textContent = text.substring(0, this._prefixRange.startColumn) + this._currentSuggestion +
        text.substring(this._prefixRange.endColumn);
    this._setDOMSelection(
        this._prefixRange.startColumn + this._currentSuggestion.length,
        this._prefixRange.startColumn + this._currentSuggestion.length);

    this.clearAutocomplete();
    this.dispatchEventToListeners(WebInspector.TextPrompt.Events.ItemAccepted);

    return true;
  }

  /**
   * @param {number} startColumn
   * @param {number} endColumn
   */
  _setDOMSelection(startColumn, endColumn) {
    this._element.normalize();
    var node = this._element.childNodes[0];
    if (!node || node === this._ghostTextElement)
      return;
    var range = this._createRange();
    range.setStart(node, startColumn);
    range.setEnd(node, endColumn);
    var selection = this._element.getComponentSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * @return {boolean}
   */
  _isSuggestBoxVisible() {
    return this._suggestBox && this._suggestBox.visible();
  }

  /**
   * @return {boolean}
   */
  isCaretInsidePrompt() {
    var selection = this._element.getComponentSelection();
    // @see crbug.com/602541
    var selectionRange = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
    if (!selectionRange || !selection.isCollapsed)
      return false;
    return selectionRange.startContainer.isSelfOrDescendant(this._element);
  }

  /**
   * @return {boolean}
   */
  _isCaretAtEndOfPrompt() {
    var selection = this._element.getComponentSelection();
    var selectionRange = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
    if (!selectionRange || !selection.isCollapsed)
      return false;

    var node = selectionRange.startContainer;
    if (!node.isSelfOrDescendant(this._element))
      return false;

    if (node.nodeType === Node.TEXT_NODE && selectionRange.startOffset < node.nodeValue.length)
      return false;

    var foundNextText = false;
    while (node) {
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue.length) {
        if (foundNextText && !this._ghostTextElement.isAncestor(node))
          return false;
        foundNextText = true;
      }

      node = node.traverseNextNode(this._element);
    }

    return true;
  }

  moveCaretToEndOfPrompt() {
    var selection = this._element.getComponentSelection();
    var selectionRange = this._createRange();

    var container = this._element;
    while (container.childNodes.length)
      container = container.lastChild;
    var offset = container.nodeType === Node.TEXT_NODE ? container.textContent.length : 0;
    selectionRange.setStart(container, offset);
    selectionRange.setEnd(container, offset);

    selection.removeAllRanges();
    selection.addRange(selectionRange);
  }

  /**
   * @param {!Event} event
   * @return {boolean}
   */
  tabKeyPressed(event) {
    this.acceptAutoComplete();

    // Consume the key.
    return true;
  }

  /**
   * @return {?Element}
   */
  proxyElementForTests() {
    return this._proxyElement || null;
  }
};

WebInspector.TextPrompt.DefaultAutocompletionTimeout = 250;

/** @enum {symbol} */
WebInspector.TextPrompt.Events = {
  ItemApplied: Symbol('text-prompt-item-applied'),
  ItemAccepted: Symbol('text-prompt-item-accepted')
};
