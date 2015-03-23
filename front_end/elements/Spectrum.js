/*
 * Copyright (C) 2011 Brian Grinstead All rights reserved.
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
 * @extends {WebInspector.VBox}
 */
WebInspector.Spectrum = function()
{
    WebInspector.VBox.call(this, true);
    this.registerRequiredCSS("elements/spectrum.css");
    this.contentElement.tabIndex = 0;

    this._originalFormat = WebInspector.Color.Format.HEX;

    this._draggerElement = this.contentElement.createChild("div", "spectrum-color");
    this._dragHelperElement = this._draggerElement.createChild("div", "spectrum-sat fill").createChild("div", "spectrum-val fill").createChild("div", "spectrum-dragger");

    this._sliderElement = this.contentElement.createChild("div", "spectrum-hue");
    this.slideHelper = this._sliderElement.createChild("div", "spectrum-slider");

    var rangeContainer = this.contentElement.createChild("div", "spectrum-range-container");
    var alphaLabel = rangeContainer.createChild("label");
    alphaLabel.textContent = WebInspector.UIString("\u03B1:");

    this._alphaElement = rangeContainer.createChild("input", "spectrum-range");
    this._alphaElement.setAttribute("type", "range");
    this._alphaElement.setAttribute("min", "0");
    this._alphaElement.setAttribute("max", "100");
    this._alphaElement.addEventListener("input", alphaDrag.bind(this), false);
    this._alphaElement.addEventListener("change", alphaDrag.bind(this), false);

    var displayContainer = this.contentElement.createChild("div", "spectrum-text");
    var swatchElement = displayContainer.createChild("span", "swatch");
    this._swatchInnerElement = swatchElement.createChild("span", "swatch-inner");
    this._displayElement = displayContainer.createChild("span", "source-code spectrum-display-value");

    WebInspector.Spectrum.draggable(this._sliderElement, hueDrag.bind(this));
    WebInspector.Spectrum.draggable(this._draggerElement, colorDrag.bind(this), colorDragStart.bind(this));

    /**
     * @param {!Element} element
     * @param {number} dragX
     * @param {number} dragY
     * @this {WebInspector.Spectrum}
     */
    function hueDrag(element, dragX, dragY)
    {
        this._hsv[0] = (this.slideHeight - dragY) / this.slideHeight;

        this._onchange();
    }

    var initialHelperOffset;

    /**
     * @this {WebInspector.Spectrum}
     */
    function colorDragStart()
    {
        initialHelperOffset = { x: this._dragHelperElement.offsetLeft, y: this._dragHelperElement.offsetTop };
    }

    /**
     * @param {!Element} element
     * @param {number} dragX
     * @param {number} dragY
     * @param {!MouseEvent} event
     * @this {WebInspector.Spectrum}
     */
    function colorDrag(element, dragX, dragY, event)
    {
        if (event.shiftKey) {
            if (Math.abs(dragX - initialHelperOffset.x) >= Math.abs(dragY - initialHelperOffset.y))
                dragY = initialHelperOffset.y;
            else
                dragX = initialHelperOffset.x;
        }

        this._hsv[1] = dragX / this.dragWidth;
        this._hsv[2] = (this.dragHeight - dragY) / this.dragHeight;

        this._onchange();
    }

    /**
     * @this {WebInspector.Spectrum}
     */
    function alphaDrag()
    {
        this._hsv[3] = this._alphaElement.value / 100;

        this._onchange();
    }
};

WebInspector.Spectrum.Events = {
    ColorChanged: "ColorChanged"
};

/**
 * @param {!Element} element
 * @param {function(!Element, number, number, !MouseEvent)=} onmove
 * @param {function(!Element, !MouseEvent)=} onstart
 * @param {function(!Element, !MouseEvent)=} onstop
 */
WebInspector.Spectrum.draggable = function(element, onmove, onstart, onstop) {

    var dragging;
    var offset;
    var scrollOffset;
    var maxHeight;
    var maxWidth;

    /**
     * @param {!Event} e
     */
    function consume(e)
    {
        e.consume(true);
    }

    /**
     * @param {!Event} e
     */
    function move(e)
    {
        if (dragging) {
            var dragX = Math.max(0, Math.min(e.pageX - offset.left + scrollOffset.left, maxWidth));
            var dragY = Math.max(0, Math.min(e.pageY - offset.top + scrollOffset.top, maxHeight));

            if (onmove)
                onmove(element, dragX, dragY, /** @type {!MouseEvent} */ (e));
        }
    }

    /**
     * @param {!Event} e
     */
    function start(e)
    {
        var mouseEvent = /** @type {!MouseEvent} */ (e);
        var rightClick = mouseEvent.which ? (mouseEvent.which === 3) : (mouseEvent.button === 2);

        if (!rightClick && !dragging) {

            if (onstart)
                onstart(element, mouseEvent);

            dragging = true;
            maxHeight = element.clientHeight;
            maxWidth = element.clientWidth;

            scrollOffset = element.scrollOffset();
            offset = element.totalOffset();

            element.ownerDocument.addEventListener("selectstart", consume, false);
            element.ownerDocument.addEventListener("dragstart", consume, false);
            element.ownerDocument.addEventListener("mousemove", move, false);
            element.ownerDocument.addEventListener("mouseup", stop, false);

            move(mouseEvent);
            consume(mouseEvent);
        }
    }

    /**
     * @param {!Event} e
     */
    function stop(e)
    {
        if (dragging) {
            element.ownerDocument.removeEventListener("selectstart", consume, false);
            element.ownerDocument.removeEventListener("dragstart", consume, false);
            element.ownerDocument.removeEventListener("mousemove", move, false);
            element.ownerDocument.removeEventListener("mouseup", stop, false);

            if (onstop)
                onstop(element, /** @type {!MouseEvent} */ (e));
        }

        dragging = false;
    }

    element.addEventListener("mousedown", start, false);
};

WebInspector.Spectrum.prototype = {
    /**
     * @param {!WebInspector.Color} color
     */
    setColor: function(color)
    {
        this._hsv = color.hsva();
        this._updateUI();
    },

    /**
     * @param {!WebInspector.Color.Format} format
     */
    setColorFormat: function(format)
    {
        console.assert(format !== WebInspector.Color.Format.Original, "Spectrum's color format cannot be Original");
        this._originalFormat = format;
    },

    /**
     * @return {!WebInspector.Color}
     */
    _color: function()
    {
        return WebInspector.Color.fromHSVA(this._hsv);
    },

    /**
     * @return {string}
     */
    colorString: function()
    {
        var cf = WebInspector.Color.Format;
        var format = this._originalFormat;
        var color = this._color();
        var originalFormatString = color.asString(this._originalFormat);
        if (originalFormatString)
            return originalFormatString;

        if (color.hasAlpha()) {
            // Everything except HSL(A) should be returned as RGBA if transparency is involved.
            if (format === cf.HSLA || format === cf.HSL)
                return /** @type {string} */(color.asString(cf.HSLA));
            else
                return /** @type {string} */(color.asString(cf.RGBA));
        }

        if (format === cf.ShortHEX)
            return /** @type {string} */(color.asString(cf.HEX));
        console.assert(format === cf.Nickname);
        return /** @type {string} */(color.asString(cf.RGB));
    },

    _onchange: function()
    {
        this._updateUI();
        this.dispatchEventToListeners(WebInspector.Spectrum.Events.ColorChanged, this.colorString());
    },

    _updateHelperLocations: function()
    {
        var h = this._hsv[0];
        var s = this._hsv[1];
        var v = this._hsv[2];

        // Where to show the little circle that displays your current selected color.
        var dragX = s * this.dragWidth;
        var dragY = this.dragHeight - (v * this.dragHeight);

        dragX = Math.max(-this._dragHelperElementHeight,
                        Math.min(this.dragWidth - this._dragHelperElementHeight, dragX - this._dragHelperElementHeight));
        dragY = Math.max(-this._dragHelperElementHeight,
                        Math.min(this.dragHeight - this._dragHelperElementHeight, dragY - this._dragHelperElementHeight));

        this._dragHelperElement.positionAt(dragX, dragY);

        // Where to show the bar that displays your current selected hue.
        var slideY = this.slideHeight - ((h * this.slideHeight) + this.slideHelperHeight);
        this.slideHelper.style.top = slideY + "px";

        this._alphaElement.value = this._hsv[3] * 100;
    },

    _updateUI: function()
    {
        this._updateHelperLocations();

        this._draggerElement.style.backgroundColor = /** @type {string} */ (WebInspector.Color.fromHSVA([this._hsv[0], 1, 1, 1]).asString(WebInspector.Color.Format.RGB));
        this._swatchInnerElement.style.backgroundColor = /** @type {string} */ (this._color().asString(WebInspector.Color.Format.RGBA));
        this._alphaElement.value = this._hsv[3] * 100;
        this._displayElement.textContent = this.colorString();
    },

    wasShown: function()
    {
        this.slideHeight = this._sliderElement.offsetHeight;
        this.dragWidth = this._draggerElement.offsetWidth;
        this.dragHeight = this._draggerElement.offsetHeight;
        this._dragHelperElementHeight = this._dragHelperElement.offsetHeight / 2;
        this.slideHelperHeight = this.slideHelper.offsetHeight / 2;
        this._updateUI();
    },

    __proto__: WebInspector.VBox.prototype
}
