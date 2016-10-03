// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.StaticViewportControl.Provider} provider
 */
WebInspector.StaticViewportControl = function(provider)
{
    this.element = createElement("div");
    this.element.style.overflow = "auto";
    this._innerElement = this.element.createChild("div");
    this._innerElement.style.height = "0px";
    this._innerElement.style.position = "relative";
    this._innerElement.style.overflow = "hidden";

    this._provider = provider;
    this.element.addEventListener("scroll", this._update.bind(this), false);
    this._itemCount = 0;
    this._indexSymbol = Symbol("WebInspector.StaticViewportControl._indexSymbol");
}

WebInspector.StaticViewportControl.prototype = {
    refresh: function()
    {
        this._itemCount = this._provider.itemCount();
        this._innerElement.removeChildren();

        var height = 0;
        this._cumulativeHeights = new Int32Array(this._itemCount);
        for (var i = 0; i < this._itemCount; ++i) {
            height += this._provider.fastItemHeight(i);
            this._cumulativeHeights[i] = height;
        }
        this._innerElement.style.height = height + "px";

        this._update();
    },

    _update: function()
    {
        if (!this._cumulativeHeights) {
            this.refresh();
            return;
        }

        var visibleHeight = this._visibleHeight();
        var visibleFrom = this.element.scrollTop;
        var activeHeight = visibleHeight * 2;
        var firstActiveIndex = Math.max(Array.prototype.lowerBound.call(this._cumulativeHeights, visibleFrom + 1 - (activeHeight - visibleHeight) / 2), 0);
        var lastActiveIndex = Math.min(Array.prototype.lowerBound.call(this._cumulativeHeights, visibleFrom + visibleHeight + (activeHeight - visibleHeight) / 2), this._itemCount - 1);

        var children = this._innerElement.children;
        for (var i = children.length - 1; i >= 0; --i) {
            var element = children[i];
            if (element[this._indexSymbol] < firstActiveIndex || element[this._indexSymbol] > lastActiveIndex)
                element.remove();
        }

        for (var i = firstActiveIndex; i <= lastActiveIndex; ++i)
            this._insertElement(i);
    },

    /**
     * @param {number} index
     */
    _insertElement: function(index)
    {
        var element = this._provider.itemElement(index);
        if (!element || element.parentElement === this._innerElement)
            return;

        element.style.position = "absolute";
        element.style.top = (this._cumulativeHeights[index - 1] || 0) + "px";
        element.style.left = "0";
        element.style.right = "0";
        element[this._indexSymbol] = index;
        this._innerElement.appendChild(element);
    },

    /**
     * @return {number}
     */
    firstVisibleIndex: function()
    {
        return Math.max(Array.prototype.lowerBound.call(this._cumulativeHeights, this.element.scrollTop + 1), 0);
    },

    /**
     * @return {number}
     */
    lastVisibleIndex: function()
    {
        return Math.min(Array.prototype.lowerBound.call(this._cumulativeHeights, this.element.scrollTop + this._visibleHeight()), this._itemCount);
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
        this.element.scrollTop = index > 0 ? this._cumulativeHeights[index - 1] : 0;
        this._update();
    },

    /**
     * @param {number} index
     */
    forceScrollItemToBeLast: function(index)
    {
        this.element.scrollTop = this._cumulativeHeights[index] - this._visibleHeight();
        this._update();
    },

    /**
     * @return {number}
     */
    _visibleHeight: function()
    {
        return this.element.offsetHeight;
    }
}

/**
 * @interface
 */
WebInspector.StaticViewportControl.Provider = function()
{
}

WebInspector.StaticViewportControl.Provider.prototype = {
    /**
     * @param {number} index
     * @return {number}
     */
    fastItemHeight: function(index) { return 0; },

    /**
     * @return {number}
     */
    itemCount: function() { return 0; },

    /**
     * @param {number} index
     * @return {?Element}
     */
    itemElement: function(index) { return null; }
}
