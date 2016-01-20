/*
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.ViewportControl.Provider}
 * @param {!WebInspector.FilteredListWidget.Delegate} delegate
 * @param {boolean} renderAsTwoRows
 */
WebInspector.FilteredListWidget = function(delegate, renderAsTwoRows)
{
    WebInspector.VBox.call(this, true);

    this._renderAsTwoRows = renderAsTwoRows;

    this.contentElement.classList.add("filtered-list-widget");
    this.contentElement.addEventListener("keydown", this._onKeyDown.bind(this), false);
    this.registerRequiredCSS("ui_lazy/filteredListWidget.css");

    this._promptElement = this.contentElement.createChild("div", "monospace filtered-list-widget-input");
    this._promptElement.setAttribute("spellcheck", "false");
    this._promptElement.setAttribute("contenteditable", "plaintext-only");
    this._prompt = new WebInspector.TextPrompt(this._autocomplete.bind(this));
    this._prompt.renderAsBlock();
    this._prompt.addEventListener(WebInspector.TextPrompt.Events.ItemAccepted, this._onAutocompleted, this);
    var promptProxy = this._prompt.attach(this._promptElement);
    promptProxy.addEventListener("input", this._onInput.bind(this), false);
    promptProxy.classList.add("filtered-list-widget-prompt-element");

    this._filteredItems = [];
    this._viewportControl = new WebInspector.ViewportControl(this);
    this._itemElementsContainer = this._viewportControl.element;
    this._itemElementsContainer.classList.add("container");
    this._itemElementsContainer.classList.add("monospace");
    this._itemElementsContainer.addEventListener("click", this._onClick.bind(this), false);
    this.contentElement.appendChild(this._itemElementsContainer);

    this.setDefaultFocusedElement(this._promptElement);

    this._delegate = delegate;
    this._delegate.setRefreshCallback(this._itemsLoaded.bind(this));
    this._itemsLoaded();
    this._updateShowMatchingItems();
    this._viewportControl.refresh();
    this._prompt.autoCompleteSoon(true);
}

/**
 * @param {string} query
 * @return {!RegExp}
 */
WebInspector.FilteredListWidget.filterRegex = function(query)
{
    const toEscape = String.regexSpecialCharacters();
    var regexString = "";
    for (var i = 0; i < query.length; ++i) {
        var c = query.charAt(i);
        if (toEscape.indexOf(c) !== -1)
            c = "\\" + c;
        if (i)
            regexString += "[^" + c + "]*";
        regexString += c;
    }
    return new RegExp(regexString, "i");
}

WebInspector.FilteredListWidget.prototype = {
    showAsDialog: function()
    {
        this._dialog = new WebInspector.Dialog();
        this._dialog.setMaxSize(new Size(504, 600));
        this.show(this._dialog.element);
        this._dialog.show();
    },

    /**
     * @return {string}
     */
    _value: function()
    {
        return this._prompt.userEnteredText().trim();
    },

    willHide: function()
    {
        this._delegate.dispose();
        if (this._filterTimer)
            clearTimeout(this._filterTimer);
    },

    /**
     * @param {!Event} event
     */
    _onEnter: function(event)
    {
        event.preventDefault();
        if (!this._delegate.itemCount())
            return;
        var selectedIndex = this._shouldShowMatchingItems() && this._selectedIndexInFiltered < this._filteredItems.length ? this._filteredItems[this._selectedIndexInFiltered] : null;
        this._delegate.selectItemWithQuery(selectedIndex, this._value());
        if (this._dialog)
            this._dialog.detach();
    },

    _itemsLoaded: function()
    {

        if (this._loadTimeout)
            return;
        this._loadTimeout = setTimeout(this._updateAfterItemsLoaded.bind(this), 0);
    },

    _updateAfterItemsLoaded: function()
    {
        delete this._loadTimeout;
        this._filterItems();
    },

    /**
     * @param {number} index
     * @return {!Element}
     */
    _createItemElement: function(index)
    {
        var itemElement = createElement("div");
        itemElement.className = "filtered-list-widget-item " + (this._renderAsTwoRows ? "two-rows" : "one-row");
        itemElement._titleElement = itemElement.createChild("div", "filtered-list-widget-title");
        itemElement._subtitleElement = itemElement.createChild("div", "filtered-list-widget-subtitle");
        itemElement._subtitleElement.textContent = "\u200B";
        itemElement._index = index;
        this._delegate.renderItem(index, this._value(), itemElement._titleElement, itemElement._subtitleElement);
        return itemElement;
    },

    /**
     * @param {string} query
     */
    setQuery: function(query)
    {
        this._prompt.setText(query);
        this._prompt.autoCompleteSoon(true);
        this._scheduleFilter();
    },

    /**
     * @param {!Element} proxyElement
     * @param {string} query
     * @param {number} cursorOffset
     * @param {!Range} wordRange
     * @param {boolean} force
     * @param {function(!Array.<string>, number=)} completionsReadyCallback
     */
    _autocomplete: function(proxyElement, query, cursorOffset, wordRange, force, completionsReadyCallback)
    {
        var completions = wordRange.startOffset === 0 ? [this._delegate.autocomplete(query)] : [];
        completionsReadyCallback.call(null, completions);
        this._autocompletedForTests();
    },

    _autocompletedForTests: function()
    {
        // Sniffed in tests.
    },

    _filterItems: function()
    {
        delete this._filterTimer;
        if (this._scoringTimer) {
            clearTimeout(this._scoringTimer);
            delete this._scoringTimer;
        }

        var query = this._delegate.rewriteQuery(this._value());
        this._query = query;
        var filterRegex = query ? WebInspector.FilteredListWidget.filterRegex(query) : null;

        var oldSelectedAbsoluteIndex = this._selectedIndexInFiltered ? this._filteredItems[this._selectedIndexInFiltered] : null;
        var filteredItems = [];
        this._selectedIndexInFiltered = 0;

        var bestScores = [];
        var bestItems = [];
        var bestItemsToCollect = 100;
        var minBestScore = 0;
        var overflowItems = [];

        scoreItems.call(this, 0);

        /**
         * @param {number} a
         * @param {number} b
         * @return {number}
         */
        function compareIntegers(a, b)
        {
            return b - a;
        }

        /**
         * @param {number} fromIndex
         * @this {WebInspector.FilteredListWidget}
         */
        function scoreItems(fromIndex)
        {
            var maxWorkItems = 1000;
            var workDone = 0;
            for (var i = fromIndex; i < this._delegate.itemCount() && workDone < maxWorkItems; ++i) {
                // Filter out non-matching items quickly.
                if (filterRegex && !filterRegex.test(this._delegate.itemKeyAt(i)))
                    continue;

                // Score item.
                var score = this._delegate.itemScoreAt(i, query);
                if (query)
                    workDone++;

                // Find its index in the scores array (earlier elements have bigger scores).
                if (score > minBestScore || bestScores.length < bestItemsToCollect) {
                    var index = insertionIndexForObjectInListSortedByFunction(score, bestScores, compareIntegers, true);
                    bestScores.splice(index, 0, score);
                    bestItems.splice(index, 0, i);
                    if (bestScores.length > bestItemsToCollect) {
                        // Best list is too large -> drop last elements.
                        overflowItems.push(bestItems.peekLast());
                        bestScores.length = bestItemsToCollect;
                        bestItems.length = bestItemsToCollect;
                    }
                    minBestScore = bestScores.peekLast();
                } else
                    filteredItems.push(i);
            }

            // Process everything in chunks.
            if (i < this._delegate.itemCount()) {
                this._scoringTimer = setTimeout(scoreItems.bind(this, i), 0);
                return;
            }
            delete this._scoringTimer;

            this._filteredItems = bestItems.concat(overflowItems).concat(filteredItems);
            for (var i = 0; i < this._filteredItems.length; ++i) {
                if (this._filteredItems[i] === oldSelectedAbsoluteIndex) {
                    this._selectedIndexInFiltered = i;
                    break;
                }
            }
            this._viewportControl.invalidate();
            if (!query)
                this._selectedIndexInFiltered = 0;
            this._updateSelection(this._selectedIndexInFiltered, false);
        }
    },

    /**
     * @return {boolean}
     */
    _shouldShowMatchingItems: function()
    {
        return this._delegate.shouldShowMatchingItems(this._value());
    },

    _onAutocompleted: function()
    {
        this._prompt.autoCompleteSoon(true);
        this._onInput();
    },

    _onInput: function()
    {
        this._updateShowMatchingItems();
        this._scheduleFilter();
    },

    _updateShowMatchingItems: function()
    {
        var shouldShowMatchingItems = this._shouldShowMatchingItems();
        this._itemElementsContainer.classList.toggle("hidden", !shouldShowMatchingItems);
    },

    /**
     * @return {number}
     */
    _rowsPerViewport: function()
    {
        return Math.floor(this._viewportControl.element.clientHeight / this._rowHeight);
    },

    _onKeyDown: function(event)
    {
        var newSelectedIndex = this._selectedIndexInFiltered;

        switch (event.keyCode) {
        case WebInspector.KeyboardShortcut.Keys.Down.code:
            if (++newSelectedIndex >= this._filteredItems.length)
                newSelectedIndex = this._filteredItems.length - 1;
            this._updateSelection(newSelectedIndex, true);
            event.consume(true);
            break;
        case WebInspector.KeyboardShortcut.Keys.Up.code:
            if (--newSelectedIndex < 0)
                newSelectedIndex = 0;
            this._updateSelection(newSelectedIndex, false);
            event.consume(true);
            break;
        case WebInspector.KeyboardShortcut.Keys.PageDown.code:
            newSelectedIndex = Math.min(newSelectedIndex + this._rowsPerViewport(), this._filteredItems.length - 1);
            this._updateSelection(newSelectedIndex, true);
            event.consume(true);
            break;
        case WebInspector.KeyboardShortcut.Keys.PageUp.code:
            newSelectedIndex = Math.max(newSelectedIndex - this._rowsPerViewport(), 0);
            this._updateSelection(newSelectedIndex, false);
            event.consume(true);
            break;
        case WebInspector.KeyboardShortcut.Keys.Enter.code:
            this._onEnter(event);
            break;
        default:
        }
    },

    _scheduleFilter: function()
    {
        if (this._filterTimer)
            return;
        this._filterTimer = setTimeout(this._filterItems.bind(this), 0);
    },

    /**
     * @param {number} index
     * @param {boolean} makeLast
     */
    _updateSelection: function(index, makeLast)
    {
        if (!this._filteredItems.length)
            return;
        if (this._selectedElement)
            this._selectedElement.classList.remove("selected");
        this._viewportControl.scrollItemIntoView(index, makeLast);
        this._selectedIndexInFiltered = index;
        this._selectedElement = this._viewportControl.renderedElementAt(index);
        if (this._selectedElement)
            this._selectedElement.classList.add("selected");
    },

    _onClick: function(event)
    {
        var itemElement = event.target.enclosingNodeOrSelfWithClass("filtered-list-widget-item");
        if (!itemElement)
            return;
        this._delegate.selectItemWithQuery(itemElement._index, this._value());
        if (this._dialog)
            this._dialog.detach();
    },

    /**
     * @override
     * @return {number}
     */
    itemCount: function()
    {
        return this._filteredItems.length;
    },

    /**
     * @override
     * @param {number} index
     * @return {number}
     */
    fastHeight: function(index)
    {
        if (!this._rowHeight) {
            var delegateIndex = this._filteredItems[index];
            var element = this._createItemElement(delegateIndex);
            this._rowHeight = WebInspector.measurePreferredSize(element, this._viewportControl.contentElement()).height;
        }
        return this._rowHeight;
    },

    /**
     * @override
     * @param {number} index
     * @return {!WebInspector.ViewportElement}
     */
    itemElement: function(index)
    {
        var delegateIndex = this._filteredItems[index];
        var element = this._createItemElement(delegateIndex);
        return new WebInspector.StaticViewportElement(element);
    },

    /**
     * @override
     * @return {number}
     */
    minimumRowHeight: function()
    {
        return this.fastHeight(0);
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @param {!Array<string>} promptHistory
 */
WebInspector.FilteredListWidget.Delegate = function(promptHistory)
{
    this._promptHistory = promptHistory;
}

WebInspector.FilteredListWidget.Delegate.prototype = {
    /**
     * @param {function():void} refreshCallback
     */
    setRefreshCallback: function(refreshCallback)
    {
        this._refreshCallback = refreshCallback;
    },

    /**
     * @param {string} query
     * @return {boolean}
     */
    shouldShowMatchingItems: function(query)
    {
        return true;
    },

    /**
     * @return {number}
     */
    itemCount: function()
    {
        return 0;
    },

    /**
     * @param {number} itemIndex
     * @return {string}
     */
    itemKeyAt: function(itemIndex)
    {
        return "";
    },

    /**
     * @param {number} itemIndex
     * @param {string} query
     * @return {number}
     */
    itemScoreAt: function(itemIndex, query)
    {
        return 1;
    },

    /**
     * @param {number} itemIndex
     * @param {string} query
     * @param {!Element} titleElement
     * @param {!Element} subtitleElement
     */
    renderItem: function(itemIndex, query, titleElement, subtitleElement)
    {
    },

    /**
     * @param {!Element} element
     * @param {string} query
     * @return {boolean}
     */
    highlightRanges: function(element, query)
    {
        if (!query)
            return false;

        /**
         * @param {string} text
         * @param {string} query
         * @return {?Array.<!WebInspector.SourceRange>}
         */
        function rangesForMatch(text, query)
        {
            var opcodes = WebInspector.Diff.charDiff(query, text);
            var offset = 0;
            var ranges = [];
            for (var i = 0; i < opcodes.length; ++i) {
                var opcode = opcodes[i];
                if (opcode[0] === WebInspector.Diff.Operation.Equal)
                    ranges.push(new WebInspector.SourceRange(offset, opcode[1].length));
                else if (opcode[0] !== WebInspector.Diff.Operation.Insert)
                    return null;
                offset += opcode[1].length;
            }
            return ranges;
        }

        var text = element.textContent;
        var ranges = rangesForMatch(text, query);
        if (!ranges)
            ranges = rangesForMatch(text.toUpperCase(), query.toUpperCase());
        if (ranges) {
            WebInspector.highlightRangesWithStyleClass(element, ranges, "highlight");
            return true;
        }
        return false;
    },

    /**
     * @param {number} itemIndex
     * @param {string} promptValue
     */
    selectItemWithQuery: function(itemIndex, promptValue)
    {
        this._promptHistory.push(promptValue);
        if (this._promptHistory.length > 100)
            this._promptHistory.shift();
        this.selectItem(itemIndex, promptValue);
    },

    /**
     * @param {number} itemIndex
     * @param {string} promptValue
     */
    selectItem: function(itemIndex, promptValue)
    {
    },

    refresh: function()
    {
        this._refreshCallback();
    },

    /**
     * @param {string} query
     * @return {string}
     */
    rewriteQuery: function(query)
    {
        return query;
    },

    /**
     * @param {string} query
     * @return {string}
     */
    autocomplete: function(query)
    {
        for (var i = this._promptHistory.length - 1; i >= 0; i--) {
            if (this._promptHistory[i] !== query && this._promptHistory[i].startsWith(query))
                return this._promptHistory[i];
        }
        return query;
    },

    dispose: function()
    {
    }
}
