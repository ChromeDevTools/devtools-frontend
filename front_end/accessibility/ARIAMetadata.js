// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {?Object} config
 */
WebInspector.ARIAMetadata = function(config)
{
    /** @type {!Map<string, !WebInspector.ARIAMetadata.Attribute>} */
    this._attributes = new Map();

    if (config)
        this._initialize(config);
}

/**
 * @return {!WebInspector.ARIAMetadata}
 */
WebInspector.ariaMetadata = function()
{
    if (!WebInspector.ARIAMetadata._instance)
        WebInspector.ARIAMetadata._instance = new WebInspector.ARIAMetadata(WebInspector.ARIAMetadata._config || null);
    return WebInspector.ARIAMetadata._instance;
};

WebInspector.ARIAMetadata.prototype = {
    /**
     * @param {!Object} config
     */
    _initialize: function(config)
    {
        var attributes = config["attributes"];

        var booleanEnum = ["true", "false"];
        for (var name in attributes) {
            var attributeConfig = attributes[name];
            if (attributeConfig.type === "boolean")
                attributeConfig.enum = booleanEnum;
            this._attributes.set(name, new WebInspector.ARIAMetadata.Attribute(attributeConfig));
        }

        /** @type {!Array<string>} */
        this._roleNames = Object.keys(config["roles"]);
    },

    /**
     * @param {string} property
     * @return {!Array<string>}
     */
    valuesForProperty: function(property)
    {
        if (this._attributes.has(property))
            return this._attributes.get(property).enum();

        if (property === "role")
            return this._roleNames;

        return [];
    }
};

/**
 * @constructor
 * @param {!Object} config
 */
WebInspector.ARIAMetadata.Attribute = function(config)
{
    /** @type {!Array<string>} */
    this._enum = [];

    if ("enum" in config)
        this._enum = config.enum;
};

WebInspector.ARIAMetadata.Attribute.prototype = {
    /**
     * @return {!Array<string>}
     */
    enum: function()
    {
        return this._enum;
    }
};
