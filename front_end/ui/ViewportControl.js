/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
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
 * @param {!WebInspector.ViewportControl.Provider} provider
 */
WebInspector.ViewportControl = function(provider)
{
    this.element = createElement("div");
    this.element.style.overflow = "auto";
    this._topGapElement = this.element.createChild("div");
    this._topGapElement.style.height = "0px";
    this._topGapElement.style.color = "transparent";
    this._contentElement = this.element.createChild("div");
    this._bottomGapElement = this.element.createChild("div");
    this._bottomGapElement.style.height = "0px";
    this._bottomGapElement.style.color = "transparent";

    // Text content needed for range intersection checks in _updateSelectionModel.
    // Use Unicode ZERO WIDTH NO-BREAK SPACE, which avoids contributing any height to the element's layout overflow.
    this._topGapElement.textContent = "\uFEFF";
    this._bottomGapElement.textContent = "\uFEFF";

    this._provider = provider;
    this.element.addEventListener("scroll", this._onScroll.bind(this), false);
    this.element.addEventListener("copy", this._onCopy.bind(this), false);
    this.element.addEventListener("dragstart", this._onDragStart.bind(this), false);

    this._firstActiveIndex = 0;
    this._lastActiveIndex = -1;
    this._renderedItems = [];
    this._anchorSelection = null;
    this._headSelection = null;
    this._itemCount = 0;

    // Listen for any changes to descendants and trigger a refresh. This ensures
    // that items updated asynchronously will not break stick-to-bottom behavior
    // if they change the scroll height.
    this._observer = new MutationObserver(this.refresh.bind(this));
    this._observerConfig = { childList: true, subtree: true };
};

/**
 * @interface
 */
WebInspector.ViewportControl.Provider = function()
{
};

WebInspector.ViewportControl.Provider.prototype = {
    /**
     * @param {number} index
     * @return {number}
     */
    fastHeight: function(index) { return 0; },

    /**
     * @return {number}
     */
    itemCount: function() { return 0; },

    /**
     * @return {number}
     */
    minimumRowHeight: function() { return 0; },

    /**
     * @param {number} index
     * @return {?WebInspector.ViewportElement}
     */
    itemElement: function(index) { return null; }
};

/**
 * @interface
 */
WebInspector.ViewportElement = function() { };
WebInspector.ViewportElement.prototype = {
    willHide: function() { },

    wasShown: function() { },

    /**
     * @return {!Element}
     */
    element: function() { },
};

/**
 * @constructor
 * @implements {WebInspector.ViewportElement}
 * @param {!Element} element
 */
WebInspector.StaticViewportElement = function(element)
{
    this._element = element;
};

WebInspector.StaticViewportElement.prototype = {
    /**
     * @override
     */
    willHide: function() { },

    /**
     * @override
     */
    wasShown: function() { },

    /**
     * @override
     * @return {!Element}
     */
    element: function()
    {
        return this._element;
    },
};

WebInspector.ViewportControl.prototype = {
    /**
     * @return {boolean}
     */
    stickToBottom: function()
    {
        return this._stickToBottom;
    },

    /**
     * @param {boolean} value
     */
    setStickToBottom: function(value)
    {
        this._stickToBottom = value;
        if (this._stickToBottom)
            this._observer.observe(this._contentElement, this._observerConfig);
        else
            this._observer.disconnect();
    },

    /**
     * @param {!Event} event
     */
    _onCopy: function(event)
    {
        var text = this._selectedText();
        if (!text)
            return;
        event.preventDefault();
        event.clipboardData.setData("text/plain", text);
    },

    /**
     * @param {!Event} event
     */
    _onDragStart: function(event)
    {
        var text = this._selectedText();
        if (!text)
            return false;
        event.dataTransfer.clearData();
        event.dataTransfer.setData("text/plain", text);
        event.dataTransfer.effectAllowed = "copy";
        return true;
    },

    /**
     * @return {!Element}
     */
    contentElement: function()
    {
        return this._contentElement;
    },

    invalidate: function()
    {
        delete this._cumulativeHeights;
        delete this._cachedProviderElements;
        this._itemCount = this._provider.itemCount();
        this.refresh();
    },

    /**
     * @param {number} index
     * @return {?WebInspector.ViewportElement}
     */
    _providerElement: function(index)
    {
        if (!this._cachedProviderElements)
            this._cachedProviderElements = new Array(this._itemCount);
        var element = this._cachedProviderElements[index];
        if (!element) {
            element = this._provider.itemElement(index);
            this._cachedProviderElements[index] = element;
        }
        return element;
    },

    _rebuildCumulativeHeightsIfNeeded: function()
    {
        if (this._cumulativeHeights)
            return;
        if (!this._itemCount)
            return;
        var firstActiveIndex = this._firstActiveIndex;
        var lastActiveIndex = this._lastActiveIndex;
        var height = 0;
        this._cumulativeHeights = new Int32Array(this._itemCount);
        for (var i = 0; i < this._itemCount; ++i) {
            if (firstActiveIndex <= i && i <= lastActiveIndex)
                height += this._renderedItems[i - firstActiveIndex].element().offsetHeight;
            else
                height += this._provider.fastHeight(i);
            this._cumulativeHeights[i] = height;
        }
    },

    /**
     * @param {number} index
     * @return {number}
     */
    _cachedItemHeight: function(index)
    {
        return index === 0 ? this._cumulativeHeights[0] : this._cumulativeHeights[index] - this._cumulativeHeights[index - 1];
    },

    /**
     * @param {?Selection} selection
     * @suppressGlobalPropertiesCheck
     */
    _isSelectionBackwards: function(selection)
    {
        if (!selection || !selection.rangeCount)
            return false;
        var range = document.createRange();
        range.setStart(selection.anchorNode, selection.anchorOffset);
        range.setEnd(selection.focusNode, selection.focusOffset);
        return range.collapsed;
    },

    /**
     * @param {number} itemIndex
     * @param {!Node} node
     * @param {number} offset
     * @return {!{item: number, node: !Node, offset: number}}
     */
    _createSelectionModel: function(itemIndex, node, offset)
    {
        return {
            item: itemIndex,
            node: node,
            offset: offset
        };
    },

    /**
     * @param {?Selection} selection
     */
    _updateSelectionModel: function(selection)
    {
        var range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
        if (!range || selection.isCollapsed || !this.element.hasSelection()) {
            this._headSelection = null;
            this._anchorSelection = null;
            return false;
        }

        var firstSelected = Number.MAX_VALUE;
        var lastSelected = -1;

        var hasVisibleSelection = false;
        for (var i = 0; i < this._renderedItems.length; ++i) {
            if (range.intersectsNode(this._renderedItems[i].element())) {
                var index = i + this._firstActiveIndex;
                firstSelected = Math.min(firstSelected, index);
                lastSelected = Math.max(lastSelected, index);
                hasVisibleSelection = true;
            }
        }
        if (hasVisibleSelection) {
            firstSelected = this._createSelectionModel(firstSelected, /** @type {!Node} */(range.startContainer), range.startOffset);
            lastSelected = this._createSelectionModel(lastSelected, /** @type {!Node} */(range.endContainer), range.endOffset);
        }
        var topOverlap = range.intersectsNode(this._topGapElement) && this._topGapElement._active;
        var bottomOverlap = range.intersectsNode(this._bottomGapElement) && this._bottomGapElement._active;
        if (!topOverlap && !bottomOverlap && !hasVisibleSelection) {
            this._headSelection = null;
            this._anchorSelection = null;
            return false;
        }

        if (!this._anchorSelection || !this._headSelection) {
            this._anchorSelection = this._createSelectionModel(0, this.element, 0);
            this._headSelection = this._createSelectionModel(this._itemCount - 1, this.element, this.element.children.length);
            this._selectionIsBackward = false;
        }

        var isBackward = this._isSelectionBackwards(selection);
        var startSelection = this._selectionIsBackward ? this._headSelection : this._anchorSelection;
        var endSelection = this._selectionIsBackward ? this._anchorSelection : this._headSelection;
        if (topOverlap && bottomOverlap && hasVisibleSelection) {
            firstSelected = firstSelected.item < startSelection.item ? firstSelected : startSelection;
            lastSelected = lastSelected.item > endSelection.item ? lastSelected : endSelection;
        } else if (!hasVisibleSelection) {
            firstSelected = startSelection;
            lastSelected = endSelection;
        } else if (topOverlap)
            firstSelected = isBackward ? this._headSelection : this._anchorSelection;
        else if (bottomOverlap)
            lastSelected = isBackward ? this._anchorSelection : this._headSelection;

        if (isBackward) {
            this._anchorSelection = lastSelected;
            this._headSelection = firstSelected;
        } else {
            this._anchorSelection = firstSelected;
            this._headSelection = lastSelected;
        }
        this._selectionIsBackward = isBackward;
        return true;
    },

    /**
     * @param {?Selection} selection
     */
    _restoreSelection: function(selection)
    {
        var anchorElement = null;
        var anchorOffset;
        if (this._firstActiveIndex <= this._anchorSelection.item && this._anchorSelection.item <= this._lastActiveIndex) {
            anchorElement = this._anchorSelection.node;
            anchorOffset = this._anchorSelection.offset;
        } else {
            if (this._anchorSelection.item < this._firstActiveIndex)
                anchorElement = this._topGapElement;
            else if (this._anchorSelection.item > this._lastActiveIndex)
                anchorElement = this._bottomGapElement;
            anchorOffset = this._selectionIsBackward ? 1 : 0;
        }

        var headElement = null;
        var headOffset;
        if (this._firstActiveIndex <= this._headSelection.item && this._headSelection.item <= this._lastActiveIndex) {
            headElement = this._headSelection.node;
            headOffset = this._headSelection.offset;
        } else {
            if (this._headSelection.item < this._firstActiveIndex)
                headElement = this._topGapElement;
            else if (this._headSelection.item > this._lastActiveIndex)
                headElement = this._bottomGapElement;
            headOffset = this._selectionIsBackward ? 0 : 1;
        }

        selection.setBaseAndExtent(anchorElement, anchorOffset, headElement, headOffset);
    },

    refresh: function()
    {
        this._observer.disconnect();
        this._innerRefresh();
        if (this._stickToBottom)
            this._observer.observe(this._contentElement, this._observerConfig);
    },

    _innerRefresh: function()
    {
        if (!this._visibleHeight())
            return;  // Do nothing for invisible controls.

        if (!this._itemCount) {
            for (var i = 0; i < this._renderedItems.length; ++i)
                this._renderedItems[i].willHide();
            this._renderedItems = [];
            this._contentElement.removeChildren();
            this._topGapElement.style.height = "0px";
            this._bottomGapElement.style.height = "0px";
            this._firstActiveIndex = -1;
            this._lastActiveIndex = -1;
            return;
        }

        var selection = this.element.getComponentSelection();
        var shouldRestoreSelection = this._updateSelectionModel(selection);

        var visibleFrom = this.element.scrollTop;
        var visibleHeight = this._visibleHeight();
        var isInvalidating = !this._cumulativeHeights;

        for (var i = 0; i < this._renderedItems.length; ++i) {
            // Tolerate 1-pixel error due to double-to-integer rounding errors.
            if (this._cumulativeHeights && Math.abs(this._cachedItemHeight(this._firstActiveIndex + i) - this._renderedItems[i].element().offsetHeight) > 1)
                delete this._cumulativeHeights;
        }
        this._rebuildCumulativeHeightsIfNeeded();
        var oldFirstActiveIndex = this._firstActiveIndex;
        var oldLastActiveIndex = this._lastActiveIndex;
        var activeHeight = visibleHeight * 2;
        // When the viewport is scrolled to the bottom, using the cumulative heights estimate is not
        // precise enough to determine next visible indices. This stickToBottom check avoids extra
        // calls to refresh in those cases.
        if (this._stickToBottom) {
            this._firstActiveIndex = Math.max(this._itemCount - Math.ceil(activeHeight / this._provider.minimumRowHeight()), 0);
            this._lastActiveIndex = this._itemCount - 1;
        } else {
            this._firstActiveIndex = Math.max(Array.prototype.lowerBound.call(this._cumulativeHeights, visibleFrom + 1 - (activeHeight - visibleHeight) / 2), 0);
            // Proactively render more rows in case some of them will be collapsed without triggering refresh. @see crbug.com/390169
            this._lastActiveIndex = this._firstActiveIndex + Math.ceil(activeHeight / this._provider.minimumRowHeight()) - 1;
            this._lastActiveIndex = Math.min(this._lastActiveIndex, this._itemCount - 1);
        }

        var topGapHeight = this._cumulativeHeights[this._firstActiveIndex - 1] || 0;
        var bottomGapHeight = this._cumulativeHeights[this._cumulativeHeights.length - 1] - this._cumulativeHeights[this._lastActiveIndex];

        /**
         * @this {WebInspector.ViewportControl}
         */
        function prepare()
        {
            this._topGapElement.style.height = topGapHeight + "px";
            this._bottomGapElement.style.height = bottomGapHeight + "px";
            this._topGapElement._active = !!topGapHeight;
            this._bottomGapElement._active = !!bottomGapHeight;
            this._contentElement.style.setProperty("height", "10000000px");
        }

        if (isInvalidating)
            this._fullViewportUpdate(prepare.bind(this));
        else
            this._partialViewportUpdate(oldFirstActiveIndex, oldLastActiveIndex, prepare.bind(this));
        this._contentElement.style.removeProperty("height");
        // Should be the last call in the method as it might force layout.
        if (shouldRestoreSelection)
            this._restoreSelection(selection);
        if (this._stickToBottom)
            this.element.scrollTop = 10000000;
    },

    /**
     * @param {function()} prepare
     */
    _fullViewportUpdate: function(prepare)
    {
        for (var i = 0; i < this._renderedItems.length; ++i)
            this._renderedItems[i].willHide();
        prepare();
        this._renderedItems = [];
        this._contentElement.removeChildren();
        for (var i = this._firstActiveIndex; i <= this._lastActiveIndex; ++i) {
            var viewportElement = this._providerElement(i);
            this._contentElement.appendChild(viewportElement.element());
            this._renderedItems.push(viewportElement);
        }
        for (var i = 0; i < this._renderedItems.length; ++i)
            this._renderedItems[i].wasShown();
    },

    /**
     * @param {number} oldFirstActiveIndex
     * @param {number} oldLastActiveIndex
     * @param {function()} prepare
     */
    _partialViewportUpdate: function(oldFirstActiveIndex, oldLastActiveIndex, prepare)
    {
        var willBeHidden = [];
        for (var i = 0; i < this._renderedItems.length; ++i) {
            var index = oldFirstActiveIndex + i;
            if (index < this._firstActiveIndex || this._lastActiveIndex < index)
                willBeHidden.push(this._renderedItems[i]);
        }
        for (var i = 0; i < willBeHidden.length; ++i)
            willBeHidden[i].willHide();
        prepare();
        for (var i = 0; i < willBeHidden.length; ++i)
            willBeHidden[i].element().remove();

        this._renderedItems = [];
        var anchor = this._contentElement.firstChild;
        var wasShown = [];
        for (var i = this._firstActiveIndex; i <= this._lastActiveIndex; ++i) {
            var viewportElement = this._providerElement(i);
            var element = viewportElement.element();
            if (element !== anchor) {
                this._contentElement.insertBefore(element, anchor);
                wasShown.push(viewportElement);
            } else {
                anchor = anchor.nextSibling;
            }
            this._renderedItems.push(viewportElement);
        }
        for (var i = 0; i < wasShown.length; ++i)
            wasShown[i].wasShown();
    },

    /**
     * @return {?string}
     */
    _selectedText: function()
    {
        this._updateSelectionModel(this.element.getComponentSelection());
        if (!this._headSelection || !this._anchorSelection)
            return null;

        var startSelection = null;
        var endSelection = null;
        if (this._selectionIsBackward) {
            startSelection = this._headSelection;
            endSelection = this._anchorSelection;
        } else {
            startSelection = this._anchorSelection;
            endSelection = this._headSelection;
        }

        var textLines = [];
        for (var i = startSelection.item; i <= endSelection.item; ++i)
            textLines.push(this._providerElement(i).element().deepTextContent());

        var endSelectionElement = this._providerElement(endSelection.item).element();
        if (endSelection.node && endSelection.node.isSelfOrDescendant(endSelectionElement)) {
            var itemTextOffset = this._textOffsetInNode(endSelectionElement, endSelection.node, endSelection.offset);
            textLines[textLines.length - 1] = textLines.peekLast().substring(0, itemTextOffset);
        }

        var startSelectionElement = this._providerElement(startSelection.item).element();
        if (startSelection.node && startSelection.node.isSelfOrDescendant(startSelectionElement)) {
            var itemTextOffset = this._textOffsetInNode(startSelectionElement, startSelection.node, startSelection.offset);
            textLines[0] = textLines[0].substring(itemTextOffset);
        }

        return textLines.join("\n");
    },

    /**
     * @param {!Element} itemElement
     * @param {!Node} container
     * @param {number} offset
     * @return {number}
     */
    _textOffsetInNode: function(itemElement, container, offset)
    {
        var chars = 0;
        var node = itemElement;
        while ((node = node.traverseNextTextNode()) && !node.isSelfOrDescendant(container))
            chars += node.textContent.length;
        return chars + offset;
    },

    /**
     * @param {!Event} event
     */
    _onScroll: function(event)
    {
        this.refresh();
    },

    /**
     * @return {number}
     */
    firstVisibleIndex: function()
    {
        var firstVisibleIndex = Math.max(Array.prototype.lowerBound.call(this._cumulativeHeights, this.element.scrollTop + 1), 0);
        return Math.max(firstVisibleIndex, this._firstActiveIndex);
    },

    /**
     * @return {number}
     */
    lastVisibleIndex: function()
    {
        var lastVisibleIndex;
        if (this._stickToBottom)
            lastVisibleIndex = this._itemCount - 1;
        else
            lastVisibleIndex = this.firstVisibleIndex() + Math.ceil(this._visibleHeight() / this._provider.minimumRowHeight()) - 1;
        return Math.min(lastVisibleIndex, this._lastActiveIndex);
    },

    /**
     * @return {?Element}
     */
    renderedElementAt: function(index)
    {
        if (index < this._firstActiveIndex)
            return null;
        if (index > this._lastActiveIndex)
            return null;
        return this._renderedItems[index - this._firstActiveIndex].element();
    },

    /**
     * @param {number} index
     * @param {boolean=} makeLast
     */
    scrollItemIntoView: function(index, makeLast)
    {
        var firstVisibleIndex = this.firstVisibleIndex();
        var lastVisibleIndex = this.lastVisibleIndex();
        if (index > firstVisibleIndex && index < lastVisibleIndex)
            return;
        if (makeLast)
            this.forceScrollItemToBeLast(index);
        else if (index <= firstVisibleIndex)
            this.forceScrollItemToBeFirst(index);
        else if (index >= lastVisibleIndex)
            this.forceScrollItemToBeLast(index);
    },

    /**
     * @param {number} index
     */
    forceScrollItemToBeFirst: function(index)
    {
        this.setStickToBottom(false);
        this._rebuildCumulativeHeightsIfNeeded();
        this.element.scrollTop = index > 0 ? this._cumulativeHeights[index - 1] : 0;
        if (this.element.isScrolledToBottom())
            this.setStickToBottom(true);
        this.refresh();
    },

    /**
     * @param {number} index
     */
    forceScrollItemToBeLast: function(index)
    {
        this.setStickToBottom(false);
        this._rebuildCumulativeHeightsIfNeeded();
        this.element.scrollTop = this._cumulativeHeights[index] - this._visibleHeight();
        if (this.element.isScrolledToBottom())
            this.setStickToBottom(true);
        this.refresh();
    },

    /**
     * @return {number}
     */
    _visibleHeight: function()
    {
        // Use offsetHeight instead of clientHeight to avoid being affected by horizontal scroll.
        return this.element.offsetHeight;
    }
};
