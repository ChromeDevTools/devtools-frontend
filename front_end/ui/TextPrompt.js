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
 * @constructor
 * @extends {WebInspector.Object}
 * @implements {WebInspector.SuggestBoxDelegate}
 * @param {function(!Element, !Range, boolean, function(!Array.<string>, number=))} completions
 * @param {string=} stopCharacters
 */
WebInspector.TextPrompt = function(completions, stopCharacters)
{
    /**
     * @type {!Element|undefined}
     */
    this._proxyElement;
    this._proxyElementDisplay = "inline-block";
    this._loadCompletions = completions;
    this._completionStopCharacters = stopCharacters || " =:[({;,!+-*/&|^<>.";
    this._autocompletionTimeout = WebInspector.TextPrompt.DefaultAutocompletionTimeout;
    this._title = "";
    this._completionRequestId = 0;
};

WebInspector.TextPrompt.DefaultAutocompletionTimeout = 250;

/** @enum {symbol} */
WebInspector.TextPrompt.Events = {
    ItemApplied: Symbol("text-prompt-item-applied"),
    ItemAccepted: Symbol("text-prompt-item-accepted")
};

WebInspector.TextPrompt.prototype = {
    /**
     * @param {number} timeout
     */
    setAutocompletionTimeout: function(timeout)
    {
        this._autocompletionTimeout = timeout;
    },

    /**
     * @param {boolean} suggestBoxEnabled
     */
    setSuggestBoxEnabled: function(suggestBoxEnabled)
    {
        this._suggestBoxEnabled = suggestBoxEnabled;
    },

    renderAsBlock: function()
    {
        this._proxyElementDisplay = "block";
    },

    /**
     * Clients should never attach any event listeners to the |element|. Instead,
     * they should use the result of this method to attach listeners for bubbling events.
     *
     * @param {!Element} element
     * @return {!Element}
     */
    attach: function(element)
    {
        return this._attachInternal(element);
    },

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
    attachAndStartEditing: function(element, blurListener)
    {
        var proxyElement = this._attachInternal(element);
        this._startEditing(blurListener);
        return proxyElement;
    },

    /**
     * @param {!Element} element
     * @return {!Element}
     */
    _attachInternal: function(element)
    {
        if (this._proxyElement)
            throw "Cannot attach an attached TextPrompt";
        this._element = element;

        this._boundOnKeyDown = this.onKeyDown.bind(this);
        this._boundOnInput = this.onInput.bind(this);
        this._boundOnMouseWheel = this.onMouseWheel.bind(this);
        this._boundSelectStart = this._selectStart.bind(this);
        this._boundClearAutocomplete = this.clearAutocomplete.bind(this);
        this._proxyElement = element.ownerDocument.createElement("span");
        var shadowRoot = WebInspector.createShadowRootWithCoreStyles(this._proxyElement, "ui/textPrompt.css");
        this._contentElement = shadowRoot.createChild("div");
        this._contentElement.createChild("content");
        this._proxyElement.style.display = this._proxyElementDisplay;
        element.parentElement.insertBefore(this._proxyElement, element);
        this._proxyElement.appendChild(element);
        this._element.classList.add("text-prompt");
        this._element.addEventListener("keydown", this._boundOnKeyDown, false);
        this._element.addEventListener("input", this._boundOnInput, false);
        this._element.addEventListener("mousewheel", this._boundOnMouseWheel, false);
        this._element.addEventListener("selectstart", this._boundSelectStart, false);
        this._element.addEventListener("blur", this._boundClearAutocomplete, false);
        this._element.ownerDocument.defaultView.addEventListener("resize", this._boundClearAutocomplete, false);

        if (this._suggestBoxEnabled)
            this._suggestBox = new WebInspector.SuggestBox(this);

        if (this._title)
            this._proxyElement.title = this._title;

        return this._proxyElement;
    },

    detach: function()
    {
        this._removeFromElement();
        this._proxyElement.parentElement.insertBefore(this._element, this._proxyElement);
        this._proxyElement.remove();
        delete this._proxyElement;
        this._element.classList.remove("text-prompt");
        WebInspector.restoreFocusFromElement(this._element);
    },

    /**
     * @return {string}
     */
    text: function()
    {
        return this._element.textContent;
    },

    /**
     * @return {string}
     */
    userEnteredText: function()
    {
        var text = this.text();
        if (this.autoCompleteElement) {
            var addition = this.autoCompleteElement.textContent;
            text = text.substring(0, text.length - addition.length);
        }
        return text;
    },

    /**
     * @param {string} x
     */
    setText: function(x)
    {
        this.clearAutocomplete();
        if (!x) {
            // Append a break element instead of setting textContent to make sure the selection is inside the prompt.
            this._element.removeChildren();
            this._element.createChild("br");
        } else {
            this._element.textContent = x;
        }

        this.moveCaretToEndOfPrompt();
        this._element.scrollIntoView();
    },

    /**
     * @return {string}
     */
    title: function()
    {
        return this._title;
    },

    /**
     * @param {string} title
     */
    setTitle: function(title)
    {
        this._title = title;
        if (this._proxyElement)
            this._proxyElement.title = title;
    },

    _removeFromElement: function()
    {
        this.clearAutocomplete();
        this._element.removeEventListener("keydown", this._boundOnKeyDown, false);
        this._element.removeEventListener("input", this._boundOnInput, false);
        this._element.removeEventListener("selectstart", this._boundSelectStart, false);
        this._element.removeEventListener("blur", this._boundClearAutocomplete, false);
        this._element.ownerDocument.defaultView.removeEventListener("resize", this._boundClearAutocomplete, false);
        if (this._isEditing)
            this._stopEditing();
        if (this._suggestBox)
            this._suggestBox.removeFromElement();
    },

    /**
     * @param {function(!Event)=} blurListener
     */
    _startEditing: function(blurListener)
    {
        this._isEditing = true;
        this._contentElement.classList.add("text-prompt-editing");
        if (blurListener) {
            this._blurListener = blurListener;
            this._element.addEventListener("blur", this._blurListener, false);
        }
        this._oldTabIndex = this._element.tabIndex;
        if (this._element.tabIndex < 0)
            this._element.tabIndex = 0;
        WebInspector.setCurrentFocusElement(this._element);
        if (!this.text())
            this._updateAutoComplete();
    },

    _stopEditing: function()
    {
        this._element.tabIndex = this._oldTabIndex;
        if (this._blurListener)
            this._element.removeEventListener("blur", this._blurListener, false);
        this._contentElement.classList.remove("text-prompt-editing");
        delete this._isEditing;
    },

    _selectStart: function()
    {
        if (this._selectionTimeout)
            clearTimeout(this._selectionTimeout);

        this.clearAutocomplete();

        /**
         * @this {WebInspector.TextPrompt}
         */
        function moveBackIfOutside()
        {
            delete this._selectionTimeout;
            if (!this.isCaretInsidePrompt() && this._element.isComponentSelectionCollapsed()) {
                this.moveCaretToEndOfPrompt();
                this.autoCompleteSoon();
            }
        }

        this._selectionTimeout = setTimeout(moveBackIfOutside.bind(this), 100);
    },

    /**
     * @param {boolean=} force
     */
    _updateAutoComplete: function(force)
    {
        this.clearAutocomplete();
        this.autoCompleteSoon(force);
    },

    /**
     * @param {!Event} event
     */
    onMouseWheel: function(event)
    {
        // Subclasses can implement.
    },

    /**
     * @param {!Event} event
     */
    onKeyDown: function(event)
    {
        if (isEnterKey(event))
            return;

        var handled = false;
        delete this._needUpdateAutocomplete;

        switch (event.key) {
        case "Tab":
            handled = this.tabKeyPressed(event);
            break;
        case "ArrowLeft":
        case "Home":
            this.clearAutocomplete();
            break;
        case "ArrowRight":
        case "End":
            if (this.isCaretAtEndOfPrompt())
                handled = this.acceptAutoComplete();
            else
                this.clearAutocomplete();
            break;
        case "Escape":
            if (this.isSuggestBoxVisible()) {
                this.clearAutocomplete();
                handled = true;
            }
            break;
        case " ": // Space
            if (event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
                this._updateAutoComplete(true);
                handled = true;
            }
            break;
        case "Alt":
        case "Meta":
        case "Shift":
        case "Control":
            break;
        }

        if (!handled && this.isSuggestBoxVisible())
            handled = this._suggestBox.keyPressed(event);

        if (!handled)
            this._needUpdateAutocomplete = true;

        if (handled)
            event.consume(true);
    },

    /**
     * @param {!Event} event
     */
    onInput: function(event)
    {
        if (this._needUpdateAutocomplete)
            this._updateAutoComplete();
    },

    /**
     * @return {boolean}
     */
    acceptAutoComplete: function()
    {
        var result = false;
        if (this.isSuggestBoxVisible())
            result = this._suggestBox.acceptSuggestion();
        if (!result)
            result = this._acceptSuggestionInternal();

        return result;
    },

    clearAutocomplete: function()
    {
        if (this.isSuggestBoxVisible())
            this._suggestBox.hide();

        if (this._completeTimeout) {
            clearTimeout(this._completeTimeout);
            delete this._completeTimeout;
        }

        if (!this.autoCompleteElement)
            return;

        this.autoCompleteElement.remove();
        delete this.autoCompleteElement;
        delete this._userEnteredRange;
        delete this._userEnteredText;
    },

    /**
     * @param {boolean=} force
     */
    autoCompleteSoon: function(force)
    {
        var immediately = this.isSuggestBoxVisible() || force;
        if (!this._completeTimeout)
            this._completeTimeout = setTimeout(this.complete.bind(this, force), immediately ? 0 : this._autocompletionTimeout);
    },

    /**
     * @param {boolean=} force
     * @param {boolean=} reverse
     */
    complete: function(force, reverse)
    {
        this.clearAutocomplete();
        var selection = this._element.getComponentSelection();
        var selectionRange = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
        if (!selectionRange)
            return;

        var shouldExit;

        if (!force && !this.isCaretAtEndOfPrompt() && !this.isSuggestBoxVisible())
            shouldExit = true;
        else if (!selection.isCollapsed)
            shouldExit = true;
        else if (!force) {
            // BUG72018: Do not show suggest box if caret is followed by a non-stop character.
            var wordSuffixRange = selectionRange.startContainer.rangeOfWord(selectionRange.endOffset, this._completionStopCharacters, this._element, "forward");
            if (wordSuffixRange.toString().length)
                shouldExit = true;
        }
        if (shouldExit) {
            this.clearAutocomplete();
            return;
        }

        var wordPrefixRange = selectionRange.startContainer.rangeOfWord(selectionRange.startOffset, this._completionStopCharacters, this._element, "backward");
        this._loadCompletions(/** @type {!Element} */ (this._proxyElement), wordPrefixRange, force || false, this._completionsReady.bind(this, ++this._completionRequestId, selection, wordPrefixRange, !!reverse, !!force));
    },

    disableDefaultSuggestionForEmptyInput: function()
    {
        this._disableDefaultSuggestionForEmptyInput = true;
    },

    /**
     * @param {!Selection} selection
     * @param {!Range} textRange
     */
    _boxForAnchorAtStart: function(selection, textRange)
    {
        var rangeCopy = selection.getRangeAt(0).cloneRange();
        var anchorElement = createElement("span");
        anchorElement.textContent = "\u200B";
        textRange.insertNode(anchorElement);
        var box = anchorElement.boxInWindow(window);
        anchorElement.remove();
        selection.removeAllRanges();
        selection.addRange(rangeCopy);
        return box;
    },

    /**
     * @param {!Array.<string>} completions
     * @param {number} wordPrefixLength
     */
    _buildCommonPrefix: function(completions, wordPrefixLength)
    {
        var commonPrefix = completions[0];
        for (var i = 0; i < completions.length; ++i) {
            var completion = completions[i];
            var lastIndex = Math.min(commonPrefix.length, completion.length);
            for (var j = wordPrefixLength; j < lastIndex; ++j) {
                if (commonPrefix[j] !== completion[j]) {
                    commonPrefix = commonPrefix.substr(0, j);
                    break;
                }
            }
        }
        return commonPrefix;
    },

    /**
     * @return {?Range}
     * @suppressGlobalPropertiesCheck
     */
    _createRange: function()
    {
        return document.createRange();
    },

    /**
     * @param {string} prefix
     * @return {!WebInspector.SuggestBox.Suggestions}
     */
    additionalCompletions: function(prefix)
    {
        return [];
    },

    /**
     * @param {number} completionRequestId
     * @param {!Selection} selection
     * @param {!Range} originalWordPrefixRange
     * @param {boolean} reverse
     * @param {boolean} force
     * @param {!Array.<string>} completions
     * @param {number=} selectedIndex
     */
    _completionsReady: function(completionRequestId, selection, originalWordPrefixRange, reverse, force, completions, selectedIndex)
    {
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

        this._userEnteredRange = fullWordRange;
        this._userEnteredText = fullWordRange.toString();

        if (this._suggestBox)
            this._suggestBox.updateSuggestions(this._boxForAnchorAtStart(selection, fullWordRange), annotatedCompletions, selectedIndex, !this.isCaretAtEndOfPrompt(), this._userEnteredText);

        if (selectedIndex === -1)
            return;

        var wordPrefixLength = originalWordPrefixRange.toString().length;
        this._commonPrefix = this._buildCommonPrefix(completions, wordPrefixLength);

        if (this.isCaretAtEndOfPrompt()) {
            var completionText = annotatedCompletions[selectedIndex].title;
            var prefixText = this._userEnteredRange.toString();
            var suffixText = completionText.substring(wordPrefixLength);
            this._userEnteredRange.deleteContents();
            this._element.normalize();
            var finalSelectionRange = this._createRange();

            var prefixTextNode = createTextNode(prefixText);
            fullWordRange.insertNode(prefixTextNode);

            this.autoCompleteElement = createElementWithClass("span", "auto-complete-text");
            this.autoCompleteElement.textContent = suffixText;

            prefixTextNode.parentNode.insertBefore(this.autoCompleteElement, prefixTextNode.nextSibling);

            finalSelectionRange.setStart(prefixTextNode, wordPrefixLength);
            finalSelectionRange.setEnd(prefixTextNode, wordPrefixLength);
            selection.removeAllRanges();
            selection.addRange(finalSelectionRange);
            this.dispatchEventToListeners(WebInspector.TextPrompt.Events.ItemApplied);
        }
    },

    _completeCommonPrefix: function()
    {
        if (!this.autoCompleteElement || !this._commonPrefix || !this._userEnteredText || !this._commonPrefix.startsWith(this._userEnteredText))
            return;

        if (!this.isSuggestBoxVisible()) {
            this.acceptAutoComplete();
            return;
        }

        this.autoCompleteElement.textContent = this._commonPrefix.substring(this._userEnteredText.length);
        this._acceptSuggestionInternal(true);
    },

    /**
     * @override
     * @param {string} completionText
     * @param {boolean=} isIntermediateSuggestion
     */
    applySuggestion: function(completionText, isIntermediateSuggestion)
    {
        this._applySuggestion(completionText, isIntermediateSuggestion);
    },

    /**
     * @param {string} completionText
     * @param {boolean=} isIntermediateSuggestion
     */
    _applySuggestion: function(completionText, isIntermediateSuggestion)
    {
        if (!this._userEnteredRange) {
            // We could have already cleared autocompletion range by the time this is called. (crbug.com/587683)
            return;
        }

        var wordPrefixLength = this._userEnteredText ? this._userEnteredText.length : 0;

        this._userEnteredRange.deleteContents();
        this._element.normalize();
        var finalSelectionRange = this._createRange();
        var completionTextNode = createTextNode(completionText);
        this._userEnteredRange.insertNode(completionTextNode);
        if (this.autoCompleteElement) {
            this.autoCompleteElement.remove();
            delete this.autoCompleteElement;
        }

        if (isIntermediateSuggestion)
            finalSelectionRange.setStart(completionTextNode, wordPrefixLength);
        else
            finalSelectionRange.setStart(completionTextNode, completionText.length);

        finalSelectionRange.setEnd(completionTextNode, completionText.length);

        var selection = this._element.getComponentSelection();
        selection.removeAllRanges();
        selection.addRange(finalSelectionRange);
        if (isIntermediateSuggestion)
            this.dispatchEventToListeners(WebInspector.TextPrompt.Events.ItemApplied, { itemText: completionText });
    },

    /**
     * @override
     */
    acceptSuggestion: function()
    {
        this._acceptSuggestionInternal();
    },

    /**
     * @param {boolean=} prefixAccepted
     * @return {boolean}
     */
    _acceptSuggestionInternal: function(prefixAccepted)
    {
        if (!this.autoCompleteElement || !this.autoCompleteElement.parentNode)
            return false;

        var text = this.autoCompleteElement.textContent;
        var textNode = createTextNode(text);
        this.autoCompleteElement.parentNode.replaceChild(textNode, this.autoCompleteElement);
        delete this.autoCompleteElement;

        var finalSelectionRange = this._createRange();
        finalSelectionRange.setStart(textNode, text.length);
        finalSelectionRange.setEnd(textNode, text.length);

        var selection = this._element.getComponentSelection();
        selection.removeAllRanges();
        selection.addRange(finalSelectionRange);

        if (!prefixAccepted) {
            this.clearAutocomplete();
            this.dispatchEventToListeners(WebInspector.TextPrompt.Events.ItemAccepted);
        } else
            this.autoCompleteSoon(true);

        return true;
    },

    /**
     * @return {boolean}
     */
    isSuggestBoxVisible: function()
    {
        return this._suggestBox && this._suggestBox.visible();
    },

    /**
     * @return {boolean}
     */
    isCaretInsidePrompt: function()
    {
        return this._element.isInsertionCaretInside();
    },

    /**
     * @return {boolean}
     */
    isCaretAtEndOfPrompt: function()
    {
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
                if (foundNextText && (!this.autoCompleteElement || !this.autoCompleteElement.isAncestor(node)))
                    return false;
                foundNextText = true;
            }

            node = node.traverseNextNode(this._element);
        }

        return true;
    },

    /**
     * @return {boolean}
     */
    isCaretOnFirstLine: function()
    {
        var selection = this._element.getComponentSelection();
        var focusNode = selection.focusNode;
        if (!focusNode || focusNode.nodeType !== Node.TEXT_NODE || focusNode.parentNode !== this._element)
            return true;

        if (focusNode.textContent.substring(0, selection.focusOffset).indexOf("\n") !== -1)
            return false;
        focusNode = focusNode.previousSibling;

        while (focusNode) {
            if (focusNode.nodeType !== Node.TEXT_NODE)
                return true;
            if (focusNode.textContent.indexOf("\n") !== -1)
                return false;
            focusNode = focusNode.previousSibling;
        }

        return true;
    },

    /**
     * @return {boolean}
     */
    isCaretOnLastLine: function()
    {
        var selection = this._element.getComponentSelection();
        var focusNode = selection.focusNode;
        if (!focusNode || focusNode.nodeType !== Node.TEXT_NODE || focusNode.parentNode !== this._element)
            return true;

        if (focusNode.textContent.substring(selection.focusOffset).indexOf("\n") !== -1)
            return false;
        focusNode = focusNode.nextSibling;

        while (focusNode) {
            if (focusNode.nodeType !== Node.TEXT_NODE)
                return true;
            if (focusNode.textContent.indexOf("\n") !== -1)
                return false;
            focusNode = focusNode.nextSibling;
        }

        return true;
    },

    moveCaretToEndOfPrompt: function()
    {
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
    },

    /**
     * @param {!Event} event
     * @return {boolean}
     */
    tabKeyPressed: function(event)
    {
        this.acceptAutoComplete();

        // Consume the key.
        return true;
    },

    /**
     * @return {?Element}
     */
    proxyElementForTests: function()
    {
        return this._proxyElement || null;
    },

    __proto__: WebInspector.Object.prototype
};


/**
 * @constructor
 * @extends {WebInspector.TextPrompt}
 * @param {function(!Element, !Range, boolean, function(!Array.<string>, number=))} completions
 * @param {string=} stopCharacters
 */
WebInspector.TextPromptWithHistory = function(completions, stopCharacters)
{
    WebInspector.TextPrompt.call(this, completions, stopCharacters);

    this._history = new WebInspector.HistoryManager();
    this._addCompletionsFromHistory = true;
};

WebInspector.TextPromptWithHistory.prototype = {
    /**
     * @override
     * @param {string} prefix
     * @return {!WebInspector.SuggestBox.Suggestions}
     */
    additionalCompletions: function(prefix)
    {
        if (!this._addCompletionsFromHistory || !this.isCaretAtEndOfPrompt())
            return [];
        var result = [];
        var text = this.text();
        var set = new Set();
        var data =  this._history.historyData();
        for (var i = data.length - 1; i >= 0 && result.length < 50; --i) {
            var item = data[i];
            if (!item.startsWith(text))
                continue;
            if (set.has(item))
                continue;
            set.add(item);
            result.push({title: item.substring(text.length - prefix.length), className: "additional"});
        }
        return result;
    },

    /**
     * @override
     */
    onKeyDown: function(event)
    {
        var newText;
        var isPrevious;

        switch (event.keyCode) {
        case WebInspector.KeyboardShortcut.Keys.Up.code:
            if (!this.isCaretOnFirstLine() || this.isSuggestBoxVisible())
                break;
            newText = this._history.previous(this.text());
            isPrevious = true;
            break;
        case WebInspector.KeyboardShortcut.Keys.Down.code:
            if (!this.isCaretOnLastLine() || this.isSuggestBoxVisible())
                break;
            newText = this._history.next();
            break;
        case WebInspector.KeyboardShortcut.Keys.P.code: // Ctrl+P = Previous
            if (WebInspector.isMac() && event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
                newText = this._history.previous(this.text());
                isPrevious = true;
            }
            break;
        case WebInspector.KeyboardShortcut.Keys.N.code: // Ctrl+N = Next
            if (WebInspector.isMac() && event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey)
                newText = this._history.next();
            break;
        }

        if (newText !== undefined) {
            event.consume(true);
            this.setText(newText);
            this.clearAutocomplete();

            if (isPrevious) {
                var firstNewlineIndex = this.text().indexOf("\n");
                if (firstNewlineIndex === -1)
                    this.moveCaretToEndOfPrompt();
                else {
                    var selection = this._element.getComponentSelection();
                    var selectionRange = this._createRange();

                    selectionRange.setStart(this._element.firstChild, firstNewlineIndex);
                    selectionRange.setEnd(this._element.firstChild, firstNewlineIndex);

                    selection.removeAllRanges();
                    selection.addRange(selectionRange);
                }
            }

            return;
        }

        WebInspector.TextPrompt.prototype.onKeyDown.apply(this, arguments);
    },

    /**
     * @param {boolean} value
     */
    setAddCompletionsFromHistory: function(value)
    {
        this._addCompletionsFromHistory = value;
    },

    /**
     * @return {!WebInspector.HistoryManager}
     */
    history: function()
    {
        return this._history;
    },

    __proto__: WebInspector.TextPrompt.prototype
};

/**
 * @constructor
 */
WebInspector.HistoryManager = function()
{
    /**
     * @type {!Array.<string>}
     */
    this._data = [];

    /**
     * 1-based entry in the history stack.
     * @type {number}
     */
    this._historyOffset = 1;
};

WebInspector.HistoryManager.prototype = {
    /**
     * @return {!Array.<string>}
     */
    historyData: function()
    {
        return this._data;
    },

    /**
     * @param {!Array.<string>} data
     */
    setHistoryData: function(data)
    {
        this._data = data.slice();
        this._historyOffset = 1;
    },

    /**
     * Pushes a committed text into the history.
     * @param {string} text
     */
    pushHistoryItem: function(text)
    {
        if (this._uncommittedIsTop) {
            this._data.pop();
            delete this._uncommittedIsTop;
        }

        this._historyOffset = 1;
        if (text === this._currentHistoryItem())
            return;
        this._data.push(text);
    },

    /**
     * Pushes the current (uncommitted) text into the history.
     * @param {string} currentText
     */
    _pushCurrentText: function(currentText)
    {
        if (this._uncommittedIsTop)
            this._data.pop(); // Throw away obsolete uncommitted text.
        this._uncommittedIsTop = true;
        this._data.push(currentText);
    },

    /**
     * @param {string} currentText
     * @return {string|undefined}
     */
    previous: function(currentText)
    {
        if (this._historyOffset > this._data.length)
            return undefined;
        if (this._historyOffset === 1)
            this._pushCurrentText(currentText);
        ++this._historyOffset;
        return this._currentHistoryItem();
    },

    /**
     * @return {string|undefined}
     */
    next: function()
    {
        if (this._historyOffset === 1)
            return undefined;
        --this._historyOffset;
        return this._currentHistoryItem();
    },

    /**
     * @return {string|undefined}
     */
    _currentHistoryItem: function()
    {
        return this._data[this._data.length - this._historyOffset];
    }
};
