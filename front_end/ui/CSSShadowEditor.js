// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.CSSShadowEditor = function()
{
    WebInspector.VBox.call(this, true);
    this.registerRequiredCSS("ui/cssShadowEditor.css");
    this.contentElement.tabIndex = 0;

    this._typeField = this.contentElement.createChild("div", "shadow-editor-field");
    this._typeField.createChild("label", "shadow-editor-label").textContent = WebInspector.UIString("Type");
    this._outsetButton = this._typeField.createChild("button", "shadow-editor-button-left");
    this._outsetButton.textContent = WebInspector.UIString("Outset");
    this._outsetButton.addEventListener("click", this._onButtonClick.bind(this), false);
    this._insetButton = this._typeField.createChild("button", "shadow-editor-button-right");
    this._insetButton.textContent = WebInspector.UIString("Inset");
    this._insetButton.addEventListener("click", this._onButtonClick.bind(this), false);

    var inputs;
    inputs = this._createSliderField(WebInspector.UIString("X offset"), true);
    this._xInput = inputs.textInput;
    this._xSlider = inputs.rangeInput;
    inputs = this._createSliderField(WebInspector.UIString("Y offset"), true);
    this._yInput = inputs.textInput;
    this._ySlider = inputs.rangeInput;
    inputs = this._createSliderField(WebInspector.UIString("Blur"), false);
    this._blurInput = inputs.textInput;
    this._blurSlider = inputs.rangeInput;
    inputs = this._createSliderField(WebInspector.UIString("Spread"), false);
    this._spreadInput = inputs.textInput;
    this._spreadSlider = inputs.rangeInput;
    this._spreadField = inputs.field;
}

/** @enum {symbol} */
WebInspector.CSSShadowEditor.Events = {
    ShadowChanged: Symbol("ShadowChanged")
}

/** @type {number} */
WebInspector.CSSShadowEditor.maxRange = 40;
/** @type {string} */
WebInspector.CSSShadowEditor.defaultUnit = "px";

WebInspector.CSSShadowEditor.prototype = {
    /**
     * @param {string} propertyName
     * @param {boolean} negativeAllowed
     * @return {{textInput: !Element, rangeInput: !Element, field: !Element}}
     */
    _createSliderField: function(propertyName, negativeAllowed)
    {
        var field = this.contentElement.createChild("div", "shadow-editor-field");
        var label = field.createChild("label", "shadow-editor-label");
        label.textContent = propertyName;
        label.setAttribute("for", propertyName);
        var textInput = field.createChild("input", "shadow-editor-text-input");
        textInput.type = "text";
        textInput.id = propertyName;
        textInput.addEventListener("keydown", this._handleValueModification.bind(this), false);
        textInput.addEventListener("mousewheel", this._handleValueModification.bind(this), false);
        textInput.addEventListener("input", this._onTextInput.bind(this), false);
        textInput.addEventListener("blur", this._onTextBlur.bind(this), false);
        var halfRange = WebInspector.CSSShadowEditor.maxRange / 2;
        var slider = negativeAllowed ? createSliderLabel(-halfRange, halfRange) : createSliderLabel(0, WebInspector.CSSShadowEditor.maxRange);
        slider.addEventListener("input", this._onSliderInput.bind(this), false);
        field.appendChild(slider);
        return {field: field, textInput: textInput, rangeInput: slider};
    },

    /**
     * @override
     */
    wasShown: function()
    {
        this._updateUI();
    },

    /**
     * @param {!WebInspector.CSSShadowModel} model
     */
    setModel: function(model)
    {
        this._model = model;
        this._typeField.hidden = !model.isBoxShadow();
        this._spreadField.hidden = !model.isBoxShadow();
        this._updateUI();
    },

    _updateUI: function()
    {
        this._updateButtons();
        this._xInput.value = this._model.offsetX().asCSSText();
        this._yInput.value = this._model.offsetY().asCSSText();
        this._blurInput.value = this._model.blurRadius().asCSSText();
        this._spreadInput.value = this._model.spreadRadius().asCSSText();
        this._xSlider.value = this._model.offsetX().amount;
        this._ySlider.value = this._model.offsetY().amount;
        this._blurSlider.value = this._model.blurRadius().amount;
        this._spreadSlider.value = this._model.spreadRadius().amount;
    },

    _updateButtons: function()
    {
        this._insetButton.classList.toggle("enabled", this._model.inset());
        this._outsetButton.classList.toggle("enabled", !this._model.inset());
    },

    /**
     * @param {!Event} event
     */
    _onButtonClick: function(event)
    {
        var insetClicked = (event.currentTarget === this._insetButton);
        if (insetClicked && this._model.inset() || !insetClicked && !this._model.inset())
            return;
        this._model.setInset(insetClicked);
        this._updateButtons();
        this.dispatchEventToListeners(WebInspector.CSSShadowEditor.Events.ShadowChanged, this._model);
    },

    /**
     * @param {!Event} event
     */
    _handleValueModification: function(event)
    {
        var modifiedValue = WebInspector.createReplacementString(event.currentTarget.value, event, customNumberHandler);
        if (!modifiedValue)
            return;
        var length = WebInspector.CSSLength.parse(modifiedValue);
        if (!length)
            return;
        if (event.currentTarget === this._blurInput && length.amount < 0)
            length.amount = 0;
        event.currentTarget.value = length.asCSSText();
        event.currentTarget.selectionStart = 0;
        event.currentTarget.selectionEnd = event.currentTarget.value.length;
        this._onTextInput(event);
        event.consume(true);

        /**
         * @param {string} prefix
         * @param {number} number
         * @param {string} suffix
         * @return {string}
         */
        function customNumberHandler(prefix, number, suffix)
        {
            if (!suffix.length)
                suffix = WebInspector.CSSShadowEditor.defaultUnit;
            return prefix + number + suffix;
        }
    },

    /**
     * @param {!Event} event
     */
    _onTextInput: function(event)
    {
        this._changedElement = event.currentTarget;
        this._changedElement.classList.toggle("invalid", false);
        var length = WebInspector.CSSLength.parse(event.currentTarget.value);
        if (!length || event.currentTarget === this._blurInput && length.amount < 0)
            return;
        if (event.currentTarget === this._xInput) {
            this._model.setOffsetX(length);
            this._xSlider.value = length.amount;
        } else if (event.currentTarget === this._yInput) {
            this._model.setOffsetY(length);
            this._ySlider.value = length.amount;
        } else if (event.currentTarget === this._blurInput) {
            this._model.setBlurRadius(length);
            this._blurSlider.value = length.amount;
        } else if (event.currentTarget === this._spreadInput) {
            this._model.setSpreadRadius(length);
            this._spreadSlider.value = length.amount;
        }
        this.dispatchEventToListeners(WebInspector.CSSShadowEditor.Events.ShadowChanged, this._model);
    },

    _onTextBlur: function()
    {
        if (!this._changedElement)
            return;
        var length = !this._changedElement.value ? WebInspector.CSSLength.zero() : WebInspector.CSSLength.parse(this._changedElement.value);
        if (!length)
            length = WebInspector.CSSLength.parse(this._changedElement.value + WebInspector.CSSShadowEditor.defaultUnit);
        if (!length) {
            this._changedElement.classList.add("invalid");
            this._changedElement = null;
            return;
        }
        if (this._changedElement === this._xInput) {
            this._model.setOffsetX(length);
            this._xInput.value = length.asCSSText();
            this._xSlider.value = length.amount;
        } else if (this._changedElement === this._yInput) {
            this._model.setOffsetY(length);
            this._yInput.value = length.asCSSText();
            this._ySlider.value = length.amount;
        } else if (this._changedElement === this._blurInput) {
            if (length.amount < 0)
                length = WebInspector.CSSLength.zero();
            this._model.setBlurRadius(length);
            this._blurInput.value = length.asCSSText();
            this._blurSlider.value = length.amount;
        } else if (this._changedElement === this._spreadInput) {
            this._model.setSpreadRadius(length);
            this._spreadInput.value = length.asCSSText();
            this._spreadSlider.value = length.amount;
        }
        this._changedElement = null;
        this.dispatchEventToListeners(WebInspector.CSSShadowEditor.Events.ShadowChanged, this._model);
    },

    /**
     * @param {!Event} event
     */
    _onSliderInput: function(event)
    {
        if (event.currentTarget === this._xSlider) {
            this._model.setOffsetX(new WebInspector.CSSLength(this._xSlider.value, this._model.offsetX().unit || WebInspector.CSSShadowEditor.defaultUnit));
            this._xInput.value = this._model.offsetX().asCSSText();
            this._xInput.classList.toggle("invalid", false);
        } else if (event.currentTarget === this._ySlider) {
            this._model.setOffsetY(new WebInspector.CSSLength(this._ySlider.value, this._model.offsetY().unit || WebInspector.CSSShadowEditor.defaultUnit));
            this._yInput.value = this._model.offsetY().asCSSText();
            this._yInput.classList.toggle("invalid", false);
        } else if (event.currentTarget === this._blurSlider) {
            this._model.setBlurRadius(new WebInspector.CSSLength(this._blurSlider.value, this._model.blurRadius().unit || WebInspector.CSSShadowEditor.defaultUnit));
            this._blurInput.value = this._model.blurRadius().asCSSText();
            this._blurInput.classList.toggle("invalid", false);
        } else if (event.currentTarget === this._spreadSlider) {
            this._model.setSpreadRadius(new WebInspector.CSSLength(this._spreadSlider.value, this._model.spreadRadius().unit || WebInspector.CSSShadowEditor.defaultUnit));
            this._spreadInput.value = this._model.spreadRadius().asCSSText();
            this._spreadInput.classList.toggle("invalid", false);
        }
        this.dispatchEventToListeners(WebInspector.CSSShadowEditor.Events.ShadowChanged, this._model);
    },

    __proto__: WebInspector.VBox.prototype
}