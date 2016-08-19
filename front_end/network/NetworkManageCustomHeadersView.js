/*
 * Copyright 2016 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.ListWidget.Delegate}
 * @param {!Array.<!{title: string, editable: boolean}>} columnData
 * @param {function(string) : boolean} addHeaderColumnCallback
 * @param {function(string, string) : boolean} changeHeaderColumnCallback
 * @param {function(string) : boolean} removeHeaderColumnCallback
 */
WebInspector.NetworkManageCustomHeadersView = function(columnData, addHeaderColumnCallback, changeHeaderColumnCallback, removeHeaderColumnCallback)
{
    WebInspector.VBox.call(this, true);
    this.registerRequiredCSS("network/networkManageCustomHeadersView.css");

    this.contentElement.classList.add("custom-headers-wrapper");
    this.contentElement.createChild("div", "header").textContent = WebInspector.UIString("Manage Header Columns");

    this._list = new WebInspector.ListWidget(this);
    this._list.element.classList.add("custom-headers-list");
    this._list.registerRequiredCSS("network/networkManageCustomHeadersView.css");

    var placeholder = createElementWithClass("div", "custom-headers-list-list-empty");
    placeholder.textContent = WebInspector.UIString("No custom headers");
    this._list.setEmptyPlaceholder(placeholder);
    this._list.show(this.contentElement);
    this.contentElement.appendChild(createTextButton(WebInspector.UIString("Add custom header\u2026"), this._addButtonClicked.bind(this), "add-button"));

    /** @type {!Map.<string, !{title: string, editable: boolean}>} */
    this._columnConfigs = new Map();
    columnData.forEach(columnData => this._columnConfigs.set(columnData.title.toLowerCase(), columnData));

    this._addHeaderColumnCallback = addHeaderColumnCallback;
    this._changeHeaderColumnCallback = changeHeaderColumnCallback;
    this._removeHeaderColumnCallback = removeHeaderColumnCallback;

    this.contentElement.tabIndex = 0;
}

WebInspector.NetworkManageCustomHeadersView.prototype = {
    /**
     * @override
     */
    wasShown: function()
    {
        this._headersUpdated();
    },

    _headersUpdated: function()
    {
        this._list.clear();
        this._columnConfigs.forEach(headerData => this._list.appendItem({header: headerData.title}, headerData.editable));
    },

    _addButtonClicked: function()
    {
        this._list.addNewItem(this._columnConfigs.size, {header: ""});
    },

    /**
     * @override
     * @param {*} item
     * @param {boolean} editable
     * @return {!Element}
     */
    renderItem: function(item, editable)
    {
        var element = createElementWithClass("div", "custom-headers-list-item");
        var header = element.createChild("div", "custom-header-name");
        header.textContent = item.header;
        header.title = item.header;
        return element;
    },

    /**
     * @override
     * @param {*} item
     * @param {number} index
     */
    removeItemRequested: function(item, index)
    {
        this._removeHeaderColumnCallback(item.header);
        this._columnConfigs.delete(item.header.toLowerCase());
        this._headersUpdated();
    },

    /**
     * @override
     * @param {*} item
     * @param {!WebInspector.ListWidget.Editor} editor
     * @param {boolean} isNew
     */
    commitEdit: function(item, editor, isNew)
    {
        var headerId = editor.control("header").value.trim();
        var success;
        if (isNew)
            success = this._addHeaderColumnCallback(headerId);
        else
            success = this._changeHeaderColumnCallback(item.header, headerId);

        if (success && !isNew)
            this._columnConfigs.delete(item.header.toLowerCase());
        if (success)
            this._columnConfigs.set(headerId.toLowerCase(), {title: headerId, editable: true});

        this._headersUpdated();
    },

    /**
     * @override
     * @param {*} item
     * @return {!WebInspector.ListWidget.Editor}
     */
    beginEdit: function(item)
    {
        var editor = this._createEditor();
        editor.control("header").value = item.header;
        return editor;
    },

    /**
     * @return {!WebInspector.ListWidget.Editor}
     */
    _createEditor: function()
    {
        if (this._editor)
            return this._editor;

        var editor = new WebInspector.ListWidget.Editor();
        this._editor = editor;
        var content = editor.contentElement();

        var titles = content.createChild("div", "custom-headers-edit-row");
        titles.createChild("div", "custom-headers-header").textContent = WebInspector.UIString("Header Name");

        var fields = content.createChild("div", "custom-headers-edit-row");
        fields.createChild("div", "custom-headers-header").appendChild(editor.createInput("header", "text", "x-custom-header", validateHeader.bind(this)));

        return editor;

        /**
         * @param {*} item
         * @param {number} index
         * @param {!HTMLInputElement|!HTMLSelectElement} input
         * @this {WebInspector.NetworkManageCustomHeadersView}
         * @return {boolean}
         */
        function validateHeader(item, index, input)
        {
            var headerId = editor.control("header").value.trim().toLowerCase();
            if (this._columnConfigs.has(headerId) && item.header !== headerId)
                return false;
            return true;
        }
    },

    __proto__: WebInspector.VBox.prototype
};
