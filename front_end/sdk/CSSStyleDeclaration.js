// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.CSSModel} cssModel
 * @param {?WebInspector.CSSRule} parentRule
 * @param {!CSSAgent.CSSStyle} payload
 * @param {!WebInspector.CSSStyleDeclaration.Type} type
 */
WebInspector.CSSStyleDeclaration = function(cssModel, parentRule, payload, type)
{
    this._cssModel = cssModel;
    this.parentRule = parentRule;
    this._reinitialize(payload);
    this.type = type;
}

/** @enum {string} */
WebInspector.CSSStyleDeclaration.Type = {
    Regular: "Regular",
    Inline: "Inline",
    Attributes: "Attributes"
}

WebInspector.CSSStyleDeclaration.prototype = {
    /**
     * @param {!WebInspector.CSSModel.Edit} edit
     */
    rebase: function(edit)
    {
        if (this.styleSheetId !== edit.styleSheetId || !this.range)
            return;
        if (edit.oldRange.equal(this.range)) {
            this._reinitialize(/** @type {!CSSAgent.CSSStyle} */(edit.payload));
        } else {
            this.range = this.range.rebaseAfterTextEdit(edit.oldRange, edit.newRange);
            for (var i = 0; i < this._allProperties.length; ++i)
                this._allProperties[i].rebase(edit);
        }
    },

    /**
     * @param {!CSSAgent.CSSStyle} payload
     */
    _reinitialize: function(payload)
    {
        this.styleSheetId = payload.styleSheetId;
        this.range = payload.range ? WebInspector.TextRange.fromObject(payload.range) : null;

        var shorthandEntries = payload.shorthandEntries;
        /** @type {!Map.<string, string>} */
        this._shorthandValues = new Map();
        /** @type {!Set.<string>} */
        this._shorthandIsImportant = new Set();
        for (var i = 0; i < shorthandEntries.length; ++i) {
            this._shorthandValues.set(shorthandEntries[i].name, shorthandEntries[i].value);
            if (shorthandEntries[i].important)
                this._shorthandIsImportant.add(shorthandEntries[i].name);
        }

        this._allProperties = [];
        for (var i = 0; i < payload.cssProperties.length; ++i) {
            var property = WebInspector.CSSProperty.parsePayload(this, i, payload.cssProperties[i]);
            this._allProperties.push(property);
        }

        this._generateSyntheticPropertiesIfNeeded();
        this._computeInactiveProperties();

        this._activePropertyMap = new Map();
        for (var property of this._allProperties) {
            if (!property.activeInStyle())
                continue;
            this._activePropertyMap.set(property.name, property);
        }

        this.cssText = payload.cssText;
        this._leadingProperties = null;
    },

    _generateSyntheticPropertiesIfNeeded: function()
    {
        if (this.range)
            return;

        if (!this._shorthandValues.size)
            return;

        var propertiesSet = new Set();
        for (var property of this._allProperties)
            propertiesSet.add(property.name);

        var generatedProperties = [];
        // For style-based properties, generate shorthands with values when possible.
        for (var property of this._allProperties) {
            // For style-based properties, try generating shorthands.
            var shorthands = WebInspector.CSSMetadata.cssPropertiesMetainfo.shorthands(property.name) || [];
            for (var shorthand of shorthands) {
                if (propertiesSet.has(shorthand))
                    continue;  // There already is a shorthand this longhands falls under.
                var shorthandValue = this._shorthandValues.get(shorthand);
                if (!shorthandValue)
                    continue;  // Never generate synthetic shorthands when no value is available.

                // Generate synthetic shorthand we have a value for.
                var shorthandImportance = !!this._shorthandIsImportant.has(shorthand);
                var shorthandProperty = new WebInspector.CSSProperty(this, this.allProperties.length, shorthand, shorthandValue, shorthandImportance, false, true, false);
                generatedProperties.push(shorthandProperty);
                propertiesSet.add(shorthand);
            }
        }
        this._allProperties = this._allProperties.concat(generatedProperties);
    },

    /**
     * @return {!Array.<!WebInspector.CSSProperty>}
     */
    _computeLeadingProperties: function()
    {
        /**
         * @param {!WebInspector.CSSProperty} property
         * @return {boolean}
         */
        function propertyHasRange(property)
        {
            return !!property.range;
        }

        if (this.range)
            return this._allProperties.filter(propertyHasRange);

        var leadingProperties = [];
        for (var property of this._allProperties) {
            var shorthands = WebInspector.CSSMetadata.cssPropertiesMetainfo.shorthands(property.name) || [];
            var belongToAnyShorthand = false;
            for (var shorthand of shorthands) {
                if (this._shorthandValues.get(shorthand)) {
                    belongToAnyShorthand = true;
                    break;
                }
            }
            if (!belongToAnyShorthand)
                leadingProperties.push(property);
        }

        return leadingProperties;
    },

    /**
     * @return {!Array.<!WebInspector.CSSProperty>}
     */
    leadingProperties: function()
    {
        if (!this._leadingProperties)
            this._leadingProperties = this._computeLeadingProperties();
        return this._leadingProperties;
    },

    /**
     * @return {!WebInspector.Target}
     */
    target: function()
    {
        return this._cssModel.target();
    },

    /**
     * @return {!WebInspector.CSSModel}
     */
    cssModel: function()
    {
        return this._cssModel;
    },

    _computeInactiveProperties: function()
    {
        var activeProperties = {};
        for (var i = 0; i < this._allProperties.length; ++i) {
            var property = this._allProperties[i];
            if (property.disabled || !property.parsedOk) {
                property._setActive(false);
                continue;
            }
            var canonicalName = WebInspector.CSSMetadata.canonicalPropertyName(property.name);
            var activeProperty = activeProperties[canonicalName];
            if (!activeProperty) {
                activeProperties[canonicalName] = property;
            } else if (!activeProperty.important || property.important) {
                activeProperty._setActive(false);
                activeProperties[canonicalName] = property;
            } else {
                property._setActive(false);
            }
        }
    },

    get allProperties()
    {
        return this._allProperties;
    },

    /**
     * @param {string} name
     * @return {string}
     */
    getPropertyValue: function(name)
    {
        var property = this._activePropertyMap.get(name);
        return property ? property.value : "";
    },

    /**
     * @param {string} name
     * @return {boolean}
     */
    isPropertyImplicit: function(name)
    {
        var property = this._activePropertyMap.get(name);
        return property ? property.implicit : "";
    },

    /**
     * @param {string} name
     * @return {!Array.<!WebInspector.CSSProperty>}
     */
    longhandProperties: function(name)
    {
        var longhands = WebInspector.CSSMetadata.cssPropertiesMetainfo.longhands(name);
        var result = [];
        for (var i = 0; longhands && i < longhands.length; ++i) {
            var property = this._activePropertyMap.get(longhands[i]);
            if (property)
                result.push(property);
        }
        return result;
    },

    /**
     * @param {number} index
     * @return {?WebInspector.CSSProperty}
     */
    propertyAt: function(index)
    {
        return (index < this.allProperties.length) ? this.allProperties[index] : null;
    },

    /**
     * @return {number}
     */
    pastLastSourcePropertyIndex: function()
    {
        for (var i = this.allProperties.length - 1; i >= 0; --i) {
            if (this.allProperties[i].range)
                return i + 1;
        }
        return 0;
    },

    /**
     * @param {number} index
     * @return {!WebInspector.TextRange}
     */
    _insertionRange: function(index)
    {
        var property = this.propertyAt(index);
        return property && property.range ? property.range.collapseToStart() : this.range.collapseToEnd();
    },

    /**
     * @param {number=} index
     * @return {!WebInspector.CSSProperty}
     */
    newBlankProperty: function(index)
    {
        index = (typeof index === "undefined") ? this.pastLastSourcePropertyIndex() : index;
        var property = new WebInspector.CSSProperty(this, index, "", "", false, false, true, false, "", this._insertionRange(index));
        return property;
    },

    /**
     * @param {string} text
     * @param {boolean} majorChange
     * @return {!Promise.<boolean>}
     */
    setText: function(text, majorChange)
    {
        return this._cssModel.setStyleText(this.styleSheetId, this.range, text, majorChange)
    },

    /**
     * @param {number} index
     * @param {string} name
     * @param {string} value
     * @param {function(boolean)=} userCallback
     */
    insertPropertyAt: function(index, name, value, userCallback)
    {
        this.newBlankProperty(index).setText(name + ": " + value + ";", false, true)
            .then(userCallback);
    },

    /**
     * @param {string} name
     * @param {string} value
     * @param {function(boolean)=} userCallback
     */
    appendProperty: function(name, value, userCallback)
    {
        this.insertPropertyAt(this.allProperties.length, name, value, userCallback);
    }
}
