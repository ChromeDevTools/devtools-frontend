// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.CSSStyleModel.MatchedStyleResult} matchedStyles
 * @param {!Array<!WebInspector.CSSStyleDeclaration>} styles
 */
WebInspector.SectionCascade = function(matchedStyles, styles)
{
    this._matchedStyles = matchedStyles;
    this._styles = styles;
    this.resetActiveProperties();
}

/**
 * @param {!WebInspector.CSSStyleModel.MatchedStyleResult} matchedStyles
 * @return {!{matched: !WebInspector.SectionCascade, pseudo: !Map.<number, !WebInspector.SectionCascade>}}
 */
WebInspector.SectionCascade.fromMatchedStyles = function(matchedStyles)
{
    var matched = new WebInspector.SectionCascade(matchedStyles, matchedStyles.nodeStyles());
    var pseudo = new Map();

    var pseudoStyles = matchedStyles.pseudoStyles();
    var pseudoElements = pseudoStyles.keysArray();
    for (var i = 0; i < pseudoElements.length; ++i) {
        var pseudoElement = pseudoElements[i];
        var pseudoCascade = new WebInspector.SectionCascade(matchedStyles, /** @type {!Array<!WebInspector.CSSStyleDeclaration>} */(pseudoStyles.get(pseudoElement)));
        pseudo.set(pseudoElement, pseudoCascade);
    }

    return {
        matched: matched,
        pseudo: pseudo
    };
}

WebInspector.SectionCascade.prototype = {
    /**
     * @param {!WebInspector.CSSStyleDeclaration} style
     * @return {boolean}
     */
    hasMatchingSelectors: function(style)
    {
        return style.parentRule ? style.parentRule.matchingSelectors && style.parentRule.matchingSelectors.length > 0 && this.mediaMatches(style) : true;
    },

    /**
     * @param {!WebInspector.CSSStyleDeclaration} style
     * @return {boolean}
     */
    mediaMatches: function(style)
    {
        var media = style.parentRule ? style.parentRule.media : [];
        for (var i = 0; media && i < media.length; ++i) {
            if (!media[i].active())
                return false;
        }
        return true;
    },

    /**
     * @param {!WebInspector.CSSStyleDeclaration} style
     * @return {?WebInspector.DOMNode}
     */
    nodeForStyle: function(style)
    {
        return this._matchedStyles.nodeForStyle(style);
    },

    /**
     * @param {!WebInspector.CSSStyleDeclaration} style
     * @return {boolean}
     */
    isInherited: function(style)
    {
        return this._matchedStyles.isInherited(style);
    },

    /**
     * @return {!Array.<!WebInspector.CSSStyleDeclaration>}
     */
    styles: function()
    {
        return this._styles;
    },

    /**
     * @param {!WebInspector.CSSStyleDeclaration} style
     * @param {!WebInspector.CSSStyleDeclaration=} insertAfter
     */
    insertStyle: function(style, insertAfter)
    {
        if (insertAfter) {
            var index = this._styles.indexOf(insertAfter);
            console.assert(index !== -1, "The insertAfter anchor could not be found in cascade");
            this._styles.splice(index + 1, 0, style);
        } else {
            this._styles.push(style);
        }
        this.resetActiveProperties();
    },

    /**
     * @param {!WebInspector.CSSProperty} property
     * @return {?WebInspector.SectionCascade.PropertyState}
     */
    propertyState: function(property)
    {
        if (this._propertiesState.size === 0)
            this._propertiesState = this._computeActiveProperties();
        return this._propertiesState.get(property) || null;
    },

    resetActiveProperties: function()
    {
        /** @type {!Map<!WebInspector.CSSProperty, !WebInspector.SectionCascade.PropertyState>} */
        this._propertiesState = new Map();
    },

    /**
     * @return {!Map<!WebInspector.CSSProperty, !WebInspector.SectionCascade.PropertyState>}
     */
    _computeActiveProperties: function()
    {
        /** @type {!Set.<string>} */
        var foundImportantProperties = new Set();
        /** @type {!Map.<string, !Map<string, !WebInspector.CSSProperty>>} */
        var propertyToEffectiveRule = new Map();
        /** @type {!Map.<string, !WebInspector.DOMNode>} */
        var inheritedPropertyToNode = new Map();
        /** @type {!Set<string>} */
        var allUsedProperties = new Set();
        var result = new Map();
        for (var i = 0; i < this._styles.length; ++i) {
            var style = this._styles[i];
            if (!this.hasMatchingSelectors(style))
                continue;

            /** @type {!Map<string, !WebInspector.CSSProperty>} */
            var styleActiveProperties = new Map();
            var allProperties = style.allProperties;
            for (var j = 0; j < allProperties.length; ++j) {
                var property = allProperties[j];

                // Do not pick non-inherited properties from inherited styles.
                var inherited = this._matchedStyles.isInherited(style);
                if (inherited && !WebInspector.CSSMetadata.isPropertyInherited(property.name))
                    continue;

                if (!property.activeInStyle()) {
                    result.set(property, WebInspector.SectionCascade.PropertyState.Overloaded);
                    continue;
                }

                var canonicalName = WebInspector.CSSMetadata.canonicalPropertyName(property.name);
                if (foundImportantProperties.has(canonicalName)) {
                    result.set(property, WebInspector.SectionCascade.PropertyState.Overloaded);
                    continue;
                }

                if (!property.important && allUsedProperties.has(canonicalName)) {
                    result.set(property, WebInspector.SectionCascade.PropertyState.Overloaded);
                    continue;
                }

                var isKnownProperty = propertyToEffectiveRule.has(canonicalName);
                var inheritedFromNode = inherited ? this._matchedStyles.nodeForStyle(style) : null;
                if (!isKnownProperty && inheritedFromNode && !inheritedPropertyToNode.has(canonicalName))
                    inheritedPropertyToNode.set(canonicalName, inheritedFromNode);

                if (property.important) {
                    if (inherited && isKnownProperty && inheritedFromNode !== inheritedPropertyToNode.get(canonicalName)) {
                        result.set(property, WebInspector.SectionCascade.PropertyState.Overloaded);
                        continue;
                    }

                    foundImportantProperties.add(canonicalName);
                    if (isKnownProperty) {
                        var overloaded = propertyToEffectiveRule.get(canonicalName).get(canonicalName);
                        result.set(overloaded, WebInspector.SectionCascade.PropertyState.Overloaded);
                        propertyToEffectiveRule.get(canonicalName).delete(canonicalName);
                    }
                }

                styleActiveProperties.set(canonicalName, property);
                allUsedProperties.add(canonicalName);
                propertyToEffectiveRule.set(canonicalName, styleActiveProperties);
                result.set(property, WebInspector.SectionCascade.PropertyState.Active);
            }

            // If every longhand of the shorthand is not active, then the shorthand is not active too.
            for (var property of style.leadingProperties()) {
                var canonicalName = WebInspector.CSSMetadata.canonicalPropertyName(property.name);
                if (!styleActiveProperties.has(canonicalName))
                    continue;
                var longhands = style.longhandProperties(property.name);
                if (!longhands.length)
                    continue;
                var notUsed = true;
                for (var longhand of longhands) {
                    var longhandCanonicalName = WebInspector.CSSMetadata.canonicalPropertyName(longhand.name);
                    notUsed = notUsed && !styleActiveProperties.has(longhandCanonicalName);
                }
                if (!notUsed)
                    continue;
                styleActiveProperties.delete(canonicalName);
                allUsedProperties.delete(canonicalName);
                result.set(property, WebInspector.SectionCascade.PropertyState.Overloaded);
            }
        }
        return result;
    }
}

/** @enum {string} */
WebInspector.SectionCascade.PropertyState = {
    Active: "Active",
    Overloaded: "Overloaded"
}