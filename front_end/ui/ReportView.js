// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {string} title
 */
WebInspector.ReportView = function(title)
{
    WebInspector.VBox.call(this, true);
    this.registerRequiredCSS("ui/reportView.css");

    var contentBox = this.contentElement.createChild("div", "report-content-box");
    this._headerElement = contentBox.createChild("div", "report-header vbox");
    this._headerElement.createChild("div", "report-title").textContent = title;

    this._sectionList = contentBox.createChild("div", "vbox");
}

WebInspector.ReportView.prototype = {
    /**
     * @param {string} subtitle
     */
    setSubtitle: function(subtitle)
    {
        if (this._subtitleElement && this._subtitleElement.textContent === subtitle)
            return;
        if (!this._subtitleElement)
            this._subtitleElement = this._headerElement.createChild("div", "report-subtitle");
        this._subtitleElement.textContent = subtitle;
    },

    /**
     * @param {?string} url
     */
    setURL: function(url)
    {
        if (this._url === url)
            return;
        if (!this._urlElement)
            this._urlElement = this._headerElement.createChild("div", "report-url link");

        this._url = url;
        this._urlElement.removeChildren();
        if (url)
            this._urlElement.appendChild(WebInspector.linkifyURLAsNode(url));
    },

    /**
     * @return {!WebInspector.Toolbar}
     */
    createToolbar: function()
    {
        var toolbar = new WebInspector.Toolbar("");
        this._headerElement.appendChild(toolbar.element);
        return toolbar;
    },

    /**
     * @param {string} title
     * @param {string=} className
     * @return {!WebInspector.ReportView.Section}
     */
    appendSection: function(title, className)
    {
        var section = new WebInspector.ReportView.Section(title, className);
        section.show(this._sectionList);
        return section;
    },

    removeAllSection: function()
    {
        this._sectionList.removeChildren();
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {string} title
 * @param {string=} className
 */
WebInspector.ReportView.Section = function(title, className)
{
    WebInspector.VBox.call(this);
    this.element.classList.add("report-section");
    if (className)
        this.element.classList.add(className);
    this._headerElement = this.element.createChild("div", "report-section-header");
    this._titleElement = this._headerElement.createChild("div", "report-section-title");
    this._titleElement.textContent = title;
    this._fieldList = this.element.createChild("div", "vbox");
    /** @type {!Map.<string, !Element>} */
    this._fieldMap = new Map();
}

WebInspector.ReportView.Section.prototype = {
    /**
     * @param {string} title
     */
    setTitle: function(title)
    {
        if (this._titleElement.textContent !== title)
            this._titleElement.textContent = title;
    },

    /**
     * @return {!WebInspector.Toolbar}
     */
    createToolbar: function()
    {
        var toolbar = new WebInspector.Toolbar("");
        this._headerElement.appendChild(toolbar.element);
        return toolbar;
    },

    /**
     * @param {string} title
     * @param {string=} textValue
     * @return {!Element}
     */
    appendField: function(title, textValue)
    {
        var row = this._fieldMap.get(title);
        if (!row) {
            row = this._fieldList.createChild("div", "report-field");
            row.createChild("div", "report-field-name").textContent = title;
            this._fieldMap.set(title, row);
            row.createChild("div", "report-field-value");
        }
        if (textValue)
            row.lastElementChild.textContent = textValue;
        return /** @type {!Element} */ (row.lastElementChild);
    },

    remove: function()
    {
        this.element.remove();
    },

    /**
     * @param {string} title
     */
    removeField: function(title)
    {
        var row = this._fieldMap.get(title);
        if (row)
            row.remove();
        this._fieldMap.delete(title);
    },

    /**
     * @param {string} title
     * @param {boolean} visible
     */
    setFieldVisible: function(title, visible)
    {
        var row = this._fieldMap.get(title);
        if (row)
            row.classList.toggle("hidden", !visible);
    },

    /**
     * @param {string} title
     * @return {?Element}
     */
    fieldValue: function(title)
    {
        var row = this._fieldMap.get(title);
        return row ? row.lastElementChild : null;
    },

    /**
     * @return {!Element}
     */
    appendRow: function()
    {
        return this._fieldList.createChild("div", "report-row");
    },

    clearContent: function()
    {
        this._fieldList.removeChildren();
        this._fieldMap.clear();
    },

    __proto__: WebInspector.VBox.prototype
}
