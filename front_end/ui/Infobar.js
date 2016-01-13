// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.Infobar.Type} type
 * @param {string} text
 * @param {!WebInspector.Setting=} disableSetting
 */
WebInspector.Infobar = function(type, text, disableSetting)
{
    this.element = createElementWithClass("div", "flex-none");
    this._shadowRoot = WebInspector.createShadowRootWithCoreStyles(this.element, "ui/infobar.css");
    this._contentElement = this._shadowRoot.createChild("div", "infobar infobar-" + type);

    this._mainRow = this._contentElement.createChild("div", "infobar-main-row");
    this._mainRow.createChild("div", type + "-icon icon");
    this._mainRowText = this._mainRow.createChild("div", "infobar-main-title");
    this._mainRowText.textContent = text;
    this._detailsRows = this._contentElement.createChild("div", "infobar-details-rows hidden");

    this._toggleElement = this._mainRow.createChild("div", "infobar-toggle hidden");
    this._toggleElement.addEventListener("click", this._onToggleDetails.bind(this), false);
    this._toggleElement.textContent = WebInspector.UIString("more");

    /** @type {?WebInspector.Setting} */
    this._disableSetting = disableSetting || null;
    if (disableSetting) {
        var disableButton = this._mainRow.createChild("div", "infobar-toggle");
        disableButton.textContent = WebInspector.UIString("never show");
        disableButton.addEventListener("click", this._onDisable.bind(this), false);
    }

    this._closeButton = this._contentElement.createChild("div", "close-button", "dt-close-button");
    this._closeButton.addEventListener("click", this.dispose.bind(this), false);

    /** @type {?function()} */
    this._closeCallback = null;
}

/**
 * @param {!WebInspector.Infobar.Type} type
 * @param {string} text
 * @param {!WebInspector.Setting=} disableSetting
 * @return {?WebInspector.Infobar}
 */
WebInspector.Infobar.create = function(type, text, disableSetting)
{
    if (disableSetting && disableSetting.get())
        return null;
    return new WebInspector.Infobar(type, text, disableSetting);
}


/** @enum {string} */
WebInspector.Infobar.Type = {
    Warning: "warning",
    Info: "info"
}

WebInspector.Infobar.prototype = {
    dispose: function()
    {
        this.element.remove();
        this._onResize();
        if (this._closeCallback)
            this._closeCallback.call(null);
    },

    /**
     * @param {string} text
     */
    setText: function(text)
    {
        this._mainRowText.textContent = text;
        this._onResize();
    },

    /**
     * @param {?function()} callback
     */
    setCloseCallback: function(callback)
    {
        this._closeCallback = callback;
    },

    /**
     * @param {!WebInspector.Widget} parentView
     */
    setParentView: function(parentView)
    {
        this._parentView = parentView;
    },

    _onResize: function()
    {
        if (this._parentView)
            this._parentView.doResize();
    },

    _onDisable: function()
    {
        this._disableSetting.set(true);
        this.dispose();
    },

    _onToggleDetails: function()
    {
        this._detailsRows.classList.remove("hidden");
        this._toggleElement.remove();
        this._onResize();
    },

    /**
     * @param {string=} message
     * @return {!Element}
     */
    createDetailsRowMessage: function(message)
    {
        this._toggleElement.classList.remove("hidden");
        var infobarDetailsRow = this._detailsRows.createChild("div", "infobar-details-row");
        var detailsRowMessage = infobarDetailsRow.createChild("span", "infobar-row-message");
        detailsRowMessage.textContent = message || "";
        return detailsRowMessage;
    }
}
