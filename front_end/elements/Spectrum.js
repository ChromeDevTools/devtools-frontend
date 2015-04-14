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
    /**
     * @param {!Element} parentElement
     */
    function appendSwitcherIcon(parentElement)
    {
        var icon = parentElement.createSVGChild("svg");
        icon.setAttribute("height", 16);
        icon.setAttribute("width", 16);
        var path = icon.createSVGChild("path");
        path.setAttribute("d", "M5,6 L11,6 L8,2 Z M5,10 L11,10 L8,14 Z");
        return icon;
    }

    WebInspector.VBox.call(this, true);
    this.registerRequiredCSS("elements/spectrum.css");
    this.contentElement.tabIndex = 0;

    this._draggerElement = this.contentElement.createChild("div", "spectrum-color");
    this._dragHelperElement = this._draggerElement.createChild("div", "spectrum-sat fill").createChild("div", "spectrum-val fill").createChild("div", "spectrum-dragger");

    var swatchElement = this.contentElement.createChild("span", "swatch");
    this._swatchInnerElement = swatchElement.createChild("span", "swatch-inner");

    this._hueElement = this.contentElement.createChild("div", "spectrum-hue");
    this._hueSlider = this._hueElement.createChild("div", "spectrum-slider");
    this._alphaElement = this.contentElement.createChild("div", "spectrum-alpha");
    this._alphaElementBackground = this._alphaElement.createChild("div", "spectrum-alpha-background");
    this._alphaSlider = this._alphaElement.createChild("div", "spectrum-slider");

    this._currentFormat = WebInspector.Color.Format.HEX;
    var displaySwitcher = this.contentElement.createChild("div", "spectrum-display-switcher");
    appendSwitcherIcon(displaySwitcher);
    displaySwitcher.addEventListener("click", this._formatViewSwitch.bind(this));

    // RGBA/HSLA display.
    this._displayContainer = this.contentElement.createChild("div", "spectrum-text source-code");
    this._textValues = [];
    for (var i = 0; i < 4; ++i) {
        var inputValue = this._displayContainer.createChild("input", "spectrum-text-value");
        inputValue.maxLength = 4;
        this._textValues.push(inputValue);
        inputValue.addEventListener("input", this._inputChanged.bind(this));
    }

    this._textLabels = this._displayContainer.createChild("div", "spectrum-text-label");

    // HEX display.
    this._hexContainer = this.contentElement.createChild("div", "spectrum-text spectrum-text-hex source-code");
    this._hexValue = this._hexContainer.createChild("input", "spectrum-text-value");
    this._hexValue.maxLength = 7;
    this._hexValue.addEventListener("input", this._inputChanged.bind(this));

    var label = this._hexContainer.createChild("div", "spectrum-text-label");
    label.textContent = "HEX";

    WebInspector.Spectrum.draggable(this._hueElement, hueDrag.bind(this));
    WebInspector.Spectrum.draggable(this._alphaElement, alphaDrag.bind(this));
    WebInspector.Spectrum.draggable(this._draggerElement, colorDrag.bind(this), colorDragStart.bind(this));

    /**
     * @param {!Element} element
     * @param {number} dragX
     * @param {number} dragY
     * @this {WebInspector.Spectrum}
     */
    function hueDrag(element, dragX, dragY)
    {
        this._hsv[0] = (this._hueAlphaWidth - dragX) / this._hueAlphaWidth;
        this._onchange();
    }

    /**
     * @param {!Element} element
     * @param {number} dragX
     * @param {number} dragY
     * @this {WebInspector.Spectrum}
     */
    function alphaDrag(element, dragX, dragY)
    {
        this._hsv[3] = Math.round((dragX / this._hueAlphaWidth) * 100) / 100;
        if (this._color().hasAlpha() && (this._currentFormat === WebInspector.Color.Format.HEX || this._currentFormat === WebInspector.Color.Format.Nickname))
            this.setColorFormat(WebInspector.Color.Format.RGB);
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
        this._update();
    },

    /**
     * @param {!WebInspector.Color.Format} format
     */
    setColorFormat: function(format)
    {
        console.assert(format !== WebInspector.Color.Format.Original, "Spectrum's color format cannot be Original");
        if (format === WebInspector.Color.Format.RGBA)
            format = WebInspector.Color.Format.RGB;
        else if (format === WebInspector.Color.Format.HSLA)
            format = WebInspector.Color.Format.HSL;
        else if (format === WebInspector.Color.Format.ShortHEX)
            format = WebInspector.Color.Format.HEX;
        this._currentFormat = format;
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
        var color = this._color();
        var colorString = color.asString(this._currentFormat);
        if (colorString)
            return colorString;

        if (this._currentFormat === cf.Nickname) {
            colorString = color.asString(cf.HEX);
            if (colorString)
                return colorString;
        }

        console.assert(color.hasAlpha());
        return this._currentFormat === cf.HSL ? /** @type {string} */(color.asString(cf.HSLA)) : /** @type {string} */(color.asString(cf.RGBA));
    },

    _onchange: function()
    {
        this._update();
        this._dispatchChangeEvent();
    },

    _dispatchChangeEvent: function()
    {
        this.dispatchEventToListeners(WebInspector.Spectrum.Events.ColorChanged, this.colorString());
    },

    _update: function()
    {
        this._updateHelperLocations();
        this._updateUI();
        this._updateInput();
    },

    _updateHelperLocations: function()
    {
        var h = this._hsv[0];
        var s = this._hsv[1];
        var v = this._hsv[2];
        var alpha = this._hsv[3];

        // Where to show the little circle that displays your current selected color.
        var dragX = s * this.dragWidth;
        var dragY = this.dragHeight - (v * this.dragHeight);

        dragX = Math.max(-this._dragHelperElementHeight,
                        Math.min(this.dragWidth - this._dragHelperElementHeight, dragX - this._dragHelperElementHeight));
        dragY = Math.max(-this._dragHelperElementHeight,
                        Math.min(this.dragHeight - this._dragHelperElementHeight, dragY - this._dragHelperElementHeight));

        this._dragHelperElement.positionAt(dragX, dragY);

        // Where to show the bar that displays your current selected hue.
        var hueSlideX = (1 - h) * this._hueAlphaWidth - this.slideHelperWidth;
        this._hueSlider.style.left = hueSlideX + "px";
        var alphaSlideX = alpha * this._hueAlphaWidth - this.slideHelperWidth;
        this._alphaSlider.style.left = alphaSlideX + "px";
    },

    _updateInput: function()
    {
        var cf = WebInspector.Color.Format;
        if (this._currentFormat === cf.HEX || this._currentFormat === cf.Nickname) {
            this._hexContainer.hidden = false;
            this._displayContainer.hidden = true;
            this._hexValue.value = this._color().asString(cf.HEX);
        } else {
            // RGBA, HSLA display.
            this._hexContainer.hidden = true;
            this._displayContainer.hidden = false;
            var isRgb = this._currentFormat === cf.RGB;
            this._textLabels.textContent = isRgb ? "RGBA" : "HSLA";
            var colorValues = isRgb ? this._color().canonicalRGBA() : this._color().canonicalHSLA();
            for (var i = 0; i < 3; ++i) {
                this._textValues[i].value = colorValues[i];
                if (!isRgb && (i === 1 || i === 2))
                    this._textValues[i].value += "%";
            }
            this._textValues[3].value = Math.round(colorValues[3] * 100) / 100;
        }
    },

    _updateUI: function()
    {
        var h = WebInspector.Color.fromHSVA([this._hsv[0], 1, 1, 1]);
        this._draggerElement.style.backgroundColor = /** @type {string} */ (h.asString(WebInspector.Color.Format.RGB));
        this._swatchInnerElement.style.backgroundColor = /** @type {string} */ (this._color().asString(WebInspector.Color.Format.RGBA));
        // Show border if the swatch is white.
        this._swatchInnerElement.classList.toggle("swatch-inner-white", this._color().hsla()[2] > 0.9);
        this._dragHelperElement.style.backgroundColor = /** @type {string} */ (this._color().asString(WebInspector.Color.Format.RGBA));
        this._alphaElementBackground.style.backgroundImage = String.sprintf("linear-gradient(to right, rgba(0,0,0,0), %s)", h.asString(WebInspector.Color.Format.RGB));
    },

    _formatViewSwitch: function()
    {
        var cf = WebInspector.Color.Format;
        if (this._currentFormat === cf.RGB)
            this._currentFormat = cf.HSL;
        else if (this._currentFormat === cf.HSL && !this._color().hasAlpha())
            this._currentFormat = cf.HEX;
        else
            this._currentFormat = cf.RGB;
        this._onchange();
    },

    /**
     * @param {!Event} event
     */
    _inputChanged: function(event)
    {
        /**
         * @param {!Element} element
         * @return {string}
         */
        function elementValue(element)
        {
            return element.value;
        }

        var colorString;
        if (this._currentFormat === WebInspector.Color.Format.HEX) {
            colorString = this._hexValue.value;
        } else {
            var format = this._currentFormat === WebInspector.Color.Format.RGB ? "rgba" : "hsla";
            var values = this._textValues.map(elementValue).join(",");
            colorString = String.sprintf("%s(%s)", format, values);
        }

        var color = WebInspector.Color.parse(colorString);
        if (!color)
            return;
        this._hsv = color.hsva();

        this._dispatchChangeEvent();
        this._updateHelperLocations();
        this._updateUI();
    },

    wasShown: function()
    {
        this._hueAlphaWidth = this._hueElement.offsetWidth;
        this.slideHelperWidth = this._hueSlider.offsetWidth / 2;
        this.dragWidth = this._draggerElement.offsetWidth;
        this.dragHeight = this._draggerElement.offsetHeight;
        this._dragHelperElementHeight = this._dragHelperElement.offsetHeight / 2;
        this._update();
    },

    __proto__: WebInspector.VBox.prototype
}
