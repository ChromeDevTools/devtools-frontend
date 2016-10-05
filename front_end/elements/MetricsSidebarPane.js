/*
 * Copyright (C) 2007 Apple Inc.  All rights reserved.
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
 * @extends {WebInspector.ElementsSidebarPane}
 */
WebInspector.MetricsSidebarPane = function()
{
    WebInspector.ElementsSidebarPane.call(this);
};

WebInspector.MetricsSidebarPane.prototype = {
    /**
     * @override
     * @protected
     * @return {!Promise.<?>}
     */
    doUpdate: function()
    {
        // "style" attribute might have changed. Update metrics unless they are being edited
        // (if a CSS property is added, a StyleSheetChanged event is dispatched).
        if (this._isEditingMetrics)
            return Promise.resolve();

        // FIXME: avoid updates of a collapsed pane.
        var node = this.node();
        var cssModel = this.cssModel();
        if (!node || node.nodeType() !== Node.ELEMENT_NODE || !cssModel) {
            this.element.removeChildren();
            return Promise.resolve();
        }

        /**
         * @param {?Map.<string, string>} style
         * @this {WebInspector.MetricsSidebarPane}
         */
        function callback(style)
        {
            if (!style || this.node() !== node)
                return;
            this._updateMetrics(style);
        }
        /**
         * @param {?WebInspector.CSSModel.InlineStyleResult} inlineStyleResult
         * @this {WebInspector.MetricsSidebarPane}
         */
        function inlineStyleCallback(inlineStyleResult)
        {
            if (inlineStyleResult && this.node() === node)
                this.inlineStyle = inlineStyleResult.inlineStyle;
        }

        var promises = [
            cssModel.computedStylePromise(node.id).then(callback.bind(this)),
            cssModel.inlineStylesPromise(node.id).then(inlineStyleCallback.bind(this))
        ];
        return Promise.all(promises);
    },

    /**
     * @override
     */
    onCSSModelChanged: function()
    {
        this.update();
    },

    /**
     * @param {!Map.<string, string>} style
     * @param {string} propertyName
     * @return {number}
     */
    _getPropertyValueAsPx: function(style, propertyName)
    {
        return Number(style.get(propertyName).replace(/px$/, "") || 0);
    },

    /**
     * @param {!Map.<string, string>} computedStyle
     * @param {string} componentName
     */
    _getBox: function(computedStyle, componentName)
    {
        var suffix = componentName === "border" ? "-width" : "";
        var left = this._getPropertyValueAsPx(computedStyle, componentName + "-left" + suffix);
        var top = this._getPropertyValueAsPx(computedStyle, componentName + "-top" + suffix);
        var right = this._getPropertyValueAsPx(computedStyle, componentName + "-right" + suffix);
        var bottom = this._getPropertyValueAsPx(computedStyle, componentName + "-bottom" + suffix);
        return { left: left, top: top, right: right, bottom: bottom };
    },

    /**
     * @param {boolean} showHighlight
     * @param {string} mode
     * @param {!Event} event
     */
    _highlightDOMNode: function(showHighlight, mode, event)
    {
        event.consume();
        if (showHighlight && this.node()) {
            if (this._highlightMode === mode)
                return;
            this._highlightMode = mode;
            this.node().highlight(mode);
        } else {
            delete this._highlightMode;
            WebInspector.DOMModel.hideDOMNodeHighlight();
        }

        for (var i = 0; this._boxElements && i < this._boxElements.length; ++i) {
            var element = this._boxElements[i];
            if (!this.node() || mode === "all" || element._name === mode)
                element.style.backgroundColor = element._backgroundColor;
            else
                element.style.backgroundColor = "";
        }
    },

    /**
     * @param {!Map.<string, string>} style
     */
    _updateMetrics: function(style)
    {
        // Updating with computed style.
        var metricsElement = createElement("div");
        metricsElement.className = "metrics";
        var self = this;

        /**
         * @param {!Map.<string, string>} style
         * @param {string} name
         * @param {string} side
         * @param {string} suffix
         * @this {WebInspector.MetricsSidebarPane}
         */
        function createBoxPartElement(style, name, side, suffix)
        {
            var propertyName = (name !== "position" ? name + "-" : "") + side + suffix;
            var value = style.get(propertyName);
            if (value === "" || (name !== "position" && value === "0px"))
                value = "\u2012";
            else if (name === "position" && value === "auto")
                value = "\u2012";
            value = value.replace(/px$/, "");
            value = Number.toFixedIfFloating(value);

            var element = createElement("div");
            element.className = side;
            element.textContent = value;
            element.addEventListener("dblclick", this.startEditing.bind(this, element, name, propertyName, style), false);
            return element;
        }

        /**
         * @param {!Map.<string, string>} style
         * @return {string}
         */
        function getContentAreaWidthPx(style)
        {
            var width = style.get("width").replace(/px$/, "");
            if (!isNaN(width) && style.get("box-sizing") === "border-box") {
                var borderBox = self._getBox(style, "border");
                var paddingBox = self._getBox(style, "padding");

                width = width - borderBox.left - borderBox.right - paddingBox.left - paddingBox.right;
            }

            return Number.toFixedIfFloating(width.toString());
        }

        /**
         * @param {!Map.<string, string>} style
         * @return {string}
         */
        function getContentAreaHeightPx(style)
        {
            var height = style.get("height").replace(/px$/, "");
            if (!isNaN(height) && style.get("box-sizing") === "border-box") {
                var borderBox = self._getBox(style, "border");
                var paddingBox = self._getBox(style, "padding");

                height = height - borderBox.top - borderBox.bottom - paddingBox.top - paddingBox.bottom;
            }

            return Number.toFixedIfFloating(height.toString());
        }

        // Display types for which margin is ignored.
        var noMarginDisplayType = {
            "table-cell": true,
            "table-column": true,
            "table-column-group": true,
            "table-footer-group": true,
            "table-header-group": true,
            "table-row": true,
            "table-row-group": true
        };

        // Display types for which padding is ignored.
        var noPaddingDisplayType = {
            "table-column": true,
            "table-column-group": true,
            "table-footer-group": true,
            "table-header-group": true,
            "table-row": true,
            "table-row-group": true
        };

        // Position types for which top, left, bottom and right are ignored.
        var noPositionType = {
            "static": true
        };

        var boxes = ["content", "padding", "border", "margin", "position"];
        var boxColors = [
            WebInspector.Color.PageHighlight.Content,
            WebInspector.Color.PageHighlight.Padding,
            WebInspector.Color.PageHighlight.Border,
            WebInspector.Color.PageHighlight.Margin,
            WebInspector.Color.fromRGBA([0, 0, 0, 0])
        ];
        var boxLabels = [WebInspector.UIString("content"), WebInspector.UIString("padding"), WebInspector.UIString("border"), WebInspector.UIString("margin"), WebInspector.UIString("position")];
        var previousBox = null;
        this._boxElements = [];
        for (var i = 0; i < boxes.length; ++i) {
            var name = boxes[i];

            if (name === "margin" && noMarginDisplayType[style.get("display")])
                continue;
            if (name === "padding" && noPaddingDisplayType[style.get("display")])
                continue;
            if (name === "position" && noPositionType[style.get("position")])
                continue;

            var boxElement = createElement("div");
            boxElement.className = name;
            boxElement._backgroundColor = boxColors[i].asString(WebInspector.Color.Format.RGBA);
            boxElement._name = name;
            boxElement.style.backgroundColor = boxElement._backgroundColor;
            boxElement.addEventListener("mouseover", this._highlightDOMNode.bind(this, true, name === "position" ? "all" : name), false);
            this._boxElements.push(boxElement);

            if (name === "content") {
                var widthElement = createElement("span");
                widthElement.textContent = getContentAreaWidthPx(style);
                widthElement.addEventListener("dblclick", this.startEditing.bind(this, widthElement, "width", "width", style), false);

                var heightElement = createElement("span");
                heightElement.textContent = getContentAreaHeightPx(style);
                heightElement.addEventListener("dblclick", this.startEditing.bind(this, heightElement, "height", "height", style), false);

                boxElement.appendChild(widthElement);
                boxElement.createTextChild(" \u00D7 ");
                boxElement.appendChild(heightElement);
            } else {
                var suffix = (name === "border" ? "-width" : "");

                var labelElement = createElement("div");
                labelElement.className = "label";
                labelElement.textContent = boxLabels[i];
                boxElement.appendChild(labelElement);

                boxElement.appendChild(createBoxPartElement.call(this, style, name, "top", suffix));
                boxElement.appendChild(createElement("br"));
                boxElement.appendChild(createBoxPartElement.call(this, style, name, "left", suffix));

                if (previousBox)
                    boxElement.appendChild(previousBox);

                boxElement.appendChild(createBoxPartElement.call(this, style, name, "right", suffix));
                boxElement.appendChild(createElement("br"));
                boxElement.appendChild(createBoxPartElement.call(this, style, name, "bottom", suffix));
            }

            previousBox = boxElement;
        }

        metricsElement.appendChild(previousBox);
        metricsElement.addEventListener("mouseover", this._highlightDOMNode.bind(this, false, "all"), false);
        this.element.removeChildren();
        this.element.appendChild(metricsElement);
    },

    /**
     * @param {!Element} targetElement
     * @param {string} box
     * @param {string} styleProperty
     * @param {!Map.<string, string>} computedStyle
     */
    startEditing: function(targetElement, box, styleProperty, computedStyle)
    {
        if (WebInspector.isBeingEdited(targetElement))
            return;

        var context = { box: box, styleProperty: styleProperty, computedStyle: computedStyle };
        var boundKeyDown = this._handleKeyDown.bind(this, context, styleProperty);
        context.keyDownHandler = boundKeyDown;
        targetElement.addEventListener("keydown", boundKeyDown, false);

        this._isEditingMetrics = true;

        var config = new WebInspector.InplaceEditor.Config(this._editingCommitted.bind(this), this.editingCancelled.bind(this), context);
        WebInspector.InplaceEditor.startEditing(targetElement, config);

        targetElement.getComponentSelection().setBaseAndExtent(targetElement, 0, targetElement, 1);
    },

    _handleKeyDown: function(context, styleProperty, event)
    {
        var element = event.currentTarget;

        /**
         * @param {string} originalValue
         * @param {string} replacementString
         * @this {WebInspector.MetricsSidebarPane}
         */
        function finishHandler(originalValue, replacementString)
        {
            this._applyUserInput(element, replacementString, originalValue, context, false);
        }

        /**
         * @param {string} prefix
         * @param {number} number
         * @param {string} suffix
         * @return {string}
         */
        function customNumberHandler(prefix, number, suffix)
        {
            if (styleProperty !== "margin" && number < 0)
                number = 0;
            return prefix + number + suffix;
        }

        WebInspector.handleElementValueModifications(event, element, finishHandler.bind(this), undefined, customNumberHandler);
    },

    editingEnded: function(element, context)
    {
        delete this.originalPropertyData;
        delete this.previousPropertyDataCandidate;
        element.removeEventListener("keydown", context.keyDownHandler, false);
        delete this._isEditingMetrics;
    },

    editingCancelled: function(element, context)
    {
        if ("originalPropertyData" in this && this.inlineStyle) {
            if (!this.originalPropertyData) {
                // An added property, remove the last property in the style.
                var pastLastSourcePropertyIndex = this.inlineStyle.pastLastSourcePropertyIndex();
                if (pastLastSourcePropertyIndex)
                    this.inlineStyle.allProperties[pastLastSourcePropertyIndex - 1].setText("", false);
            } else
                this.inlineStyle.allProperties[this.originalPropertyData.index].setText(this.originalPropertyData.propertyText, false);
        }
        this.editingEnded(element, context);
        this.update();
    },

    _applyUserInput: function(element, userInput, previousContent, context, commitEditor)
    {
        if (!this.inlineStyle) {
            // Element has no renderer.
            return this.editingCancelled(element, context); // nothing changed, so cancel
        }

        if (commitEditor && userInput === previousContent)
            return this.editingCancelled(element, context); // nothing changed, so cancel

        if (context.box !== "position" && (!userInput || userInput === "\u2012"))
            userInput = "0px";
        else if (context.box === "position" && (!userInput || userInput === "\u2012"))
            userInput = "auto";

        userInput = userInput.toLowerCase();
        // Append a "px" unit if the user input was just a number.
        if (/^\d+$/.test(userInput))
            userInput += "px";

        var styleProperty = context.styleProperty;
        var computedStyle = context.computedStyle;

        if (computedStyle.get("box-sizing") === "border-box" && (styleProperty === "width" || styleProperty === "height")) {
            if (!userInput.match(/px$/)) {
                WebInspector.console.error("For elements with box-sizing: border-box, only absolute content area dimensions can be applied");
                return;
            }

            var borderBox = this._getBox(computedStyle, "border");
            var paddingBox = this._getBox(computedStyle, "padding");
            var userValuePx = Number(userInput.replace(/px$/, ""));
            if (isNaN(userValuePx))
                return;
            if (styleProperty === "width")
                userValuePx += borderBox.left + borderBox.right + paddingBox.left + paddingBox.right;
            else
                userValuePx += borderBox.top + borderBox.bottom + paddingBox.top + paddingBox.bottom;

            userInput = userValuePx + "px";
        }

        this.previousPropertyDataCandidate = null;

        var allProperties = this.inlineStyle.allProperties;
        for (var i = 0; i < allProperties.length; ++i) {
            var property = allProperties[i];
            if (property.name !== context.styleProperty || !property.activeInStyle())
                continue;

            this.previousPropertyDataCandidate = property;
            property.setValue(userInput, commitEditor, true, callback.bind(this));
            return;
        }

        this.inlineStyle.appendProperty(context.styleProperty, userInput, callback.bind(this));

        /**
         * @param {boolean} success
         * @this {WebInspector.MetricsSidebarPane}
         */
        function callback(success)
        {
            if (!success)
                return;
            if (!("originalPropertyData" in this))
                this.originalPropertyData = this.previousPropertyDataCandidate;

            if (typeof this._highlightMode !== "undefined")
                this.node().highlight(this._highlightMode);

            if (commitEditor)
                this.update();
        }
    },

    _editingCommitted: function(element, userInput, previousContent, context)
    {
        this.editingEnded(element, context);
        this._applyUserInput(element, userInput, previousContent, context, true);
    },

    __proto__: WebInspector.ElementsSidebarPane.prototype
};
