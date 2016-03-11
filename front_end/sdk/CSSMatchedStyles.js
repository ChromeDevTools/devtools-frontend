// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.CSSModel} cssModel
 * @param {!WebInspector.DOMNode} node
 * @param {?CSSAgent.CSSStyle} inlinePayload
 * @param {?CSSAgent.CSSStyle} attributesPayload
 * @param {!Array.<!CSSAgent.RuleMatch>} matchedPayload
 * @param {!Array.<!CSSAgent.PseudoElementMatches>} pseudoPayload
 * @param {!Array.<!CSSAgent.InheritedStyleEntry>} inheritedPayload
 * @param {!Array.<!CSSAgent.CSSKeyframesRule>} animationsPayload
 */
WebInspector.CSSMatchedStyles = function(cssModel, node, inlinePayload, attributesPayload, matchedPayload, pseudoPayload, inheritedPayload, animationsPayload)
{
    this._cssModel = cssModel;
    this._node = node;
    this._nodeStyles = [];
    this._nodeForStyle = new Map();
    this._inheritedStyles = new Set();
    this._keyframes = [];
    /** @type {!Map<!DOMAgent.NodeId, !Map<string, boolean>>} */
    this._matchingSelectors = new Map();

    /**
     * @this {WebInspector.CSSMatchedStyles}
     */
    function addAttributesStyle()
    {
        if (!attributesPayload)
            return;
        var style = new WebInspector.CSSStyleDeclaration(cssModel, null, attributesPayload, WebInspector.CSSStyleDeclaration.Type.Attributes);
        this._nodeForStyle.set(style, this._node);
        this._nodeStyles.push(style);
    }

    // Inline style has the greatest specificity.
    if (inlinePayload && this._node.nodeType() === Node.ELEMENT_NODE) {
        var style = new WebInspector.CSSStyleDeclaration(cssModel, null, inlinePayload, WebInspector.CSSStyleDeclaration.Type.Inline);
        this._nodeForStyle.set(style, this._node);
        this._nodeStyles.push(style);
    }

    // Add rules in reverse order to match the cascade order.
    var addedAttributesStyle;
    for (var i = matchedPayload.length - 1; i >= 0; --i) {
        var rule = new WebInspector.CSSStyleRule(cssModel, matchedPayload[i].rule);
        if ((rule.isInjected() || rule.isUserAgent()) && !addedAttributesStyle) {
            // Show element's Style Attributes after all author rules.
            addedAttributesStyle = true;
            addAttributesStyle.call(this);
        }
        this._nodeForStyle.set(rule.style, this._node);
        this._nodeStyles.push(rule.style);
        addMatchingSelectors.call(this, this._node, rule, matchedPayload[i].matchingSelectors);
    }

    if (!addedAttributesStyle)
        addAttributesStyle.call(this);

    // Walk the node structure and identify styles with inherited properties.
    var parentNode = this._node.parentNode;
    for (var i = 0; parentNode && inheritedPayload && i < inheritedPayload.length; ++i) {
        var entryPayload = inheritedPayload[i];
        var inheritedInlineStyle = entryPayload.inlineStyle ? new WebInspector.CSSStyleDeclaration(cssModel, null, entryPayload.inlineStyle, WebInspector.CSSStyleDeclaration.Type.Inline) : null;
        if (inheritedInlineStyle && this._containsInherited(inheritedInlineStyle)) {
            this._nodeForStyle.set(inheritedInlineStyle, parentNode);
            this._nodeStyles.push(inheritedInlineStyle);
            this._inheritedStyles.add(inheritedInlineStyle);
        }

        var inheritedMatchedCSSRules = entryPayload.matchedCSSRules || [];
        for (var j = inheritedMatchedCSSRules.length - 1; j >= 0; --j) {
            var inheritedRule = new WebInspector.CSSStyleRule(cssModel, inheritedMatchedCSSRules[j].rule);
            addMatchingSelectors.call(this, parentNode, inheritedRule, inheritedMatchedCSSRules[j].matchingSelectors);
            if (!this._containsInherited(inheritedRule.style))
                continue;
            this._nodeForStyle.set(inheritedRule.style, parentNode);
            this._nodeStyles.push(inheritedRule.style);
            this._inheritedStyles.add(inheritedRule.style);
        }
        parentNode = parentNode.parentNode;
    }

    // Set up pseudo styles map.
    this._pseudoStyles = new Map();
    if (pseudoPayload) {
        for (var i = 0; i < pseudoPayload.length; ++i) {
            var entryPayload = pseudoPayload[i];
            // PseudoElement nodes are not created unless "content" css property is set.
            var pseudoElement = this._node.pseudoElements().get(entryPayload.pseudoType) || null;
            var pseudoStyles = [];
            var rules = entryPayload.matches || [];
            for (var j = rules.length - 1; j >= 0; --j) {
                var pseudoRule = new WebInspector.CSSStyleRule(cssModel, rules[j].rule);
                pseudoStyles.push(pseudoRule.style);
                this._nodeForStyle.set(pseudoRule.style, pseudoElement);
                if (pseudoElement)
                    addMatchingSelectors.call(this, pseudoElement, pseudoRule, rules[j].matchingSelectors);
            }
            this._pseudoStyles.set(entryPayload.pseudoType, pseudoStyles);
        }
    }

    if (animationsPayload)
        this._keyframes = animationsPayload.map(rule => new WebInspector.CSSKeyframesRule(cssModel, rule));

    this.resetActiveProperties();

    /**
     * @param {!WebInspector.DOMNode} node
     * @param {!WebInspector.CSSStyleRule} rule
     * @param {!Array<number>} matchingSelectorIndices
     * @this {WebInspector.CSSMatchedStyles}
     */
    function addMatchingSelectors(node, rule, matchingSelectorIndices)
    {
        for (var matchingSelectorIndex of matchingSelectorIndices) {
            var selector = rule.selectors[matchingSelectorIndex];
            this._setSelectorMatches(node, selector.text, true);
        }
    }
}

WebInspector.CSSMatchedStyles.prototype = {
    /**
     * @return {!WebInspector.DOMNode}
     */
    node: function()
    {
        return this._node;
    },

    /**
     * @return {!WebInspector.CSSModel}
     */
    cssModel: function()
    {
        return this._cssModel;
    },

    /**
     * @param {!WebInspector.CSSStyleRule} rule
     * @return {boolean}
     */
    hasMatchingSelectors: function(rule)
    {
        var matchingSelectors = this.matchingSelectors(rule);
        return matchingSelectors.length > 0 && this.mediaMatches(rule.style);
    },

    /**
     * @param {!WebInspector.CSSStyleRule} rule
     * @return {!Array<number>}
     */
    matchingSelectors: function(rule)
    {
        var node = this.nodeForStyle(rule.style);
        if (!node)
            return [];
        var map = this._matchingSelectors.get(node.id);
        if (!map)
            return [];
        var result = [];
        for (var i = 0; i < rule.selectors.length; ++i) {
            if (map.get(rule.selectors[i].text))
                result.push(i);
        }
        return result;
    },

    /**
     * @param {!WebInspector.CSSStyleRule} rule
     * @return {!Promise}
     */
    recomputeMatchingSelectors: function(rule)
    {
        var node = this.nodeForStyle(rule.style);
        if (!node)
            return Promise.resolve();
        var promises = [];
        for (var selector of rule.selectors)
            promises.push(querySelector.call(this, node, selector.text));
        return Promise.all(promises);

        /**
         * @param {!WebInspector.DOMNode} node
         * @param {string} selectorText
         * @return {!Promise}
         * @this {WebInspector.CSSMatchedStyles}
         */
        function querySelector(node, selectorText)
        {
            var ownerDocument = node.ownerDocument || null;
            // We assume that "matching" property does not ever change during the
            // MatchedStyleResult's lifetime.
            var map = this._matchingSelectors.get(node.id);
            if ((map && map.has(selectorText)) || !ownerDocument)
                return Promise.resolve();

            var resolve;
            var promise = new Promise(fulfill => resolve = fulfill);
            this._node.domModel().querySelectorAll(ownerDocument.id, selectorText, onQueryComplete.bind(this, node, selectorText, resolve));
            return promise;
        }

        /**
         * @param {!WebInspector.DOMNode} node
         * @param {string} selectorText
         * @param {function()} callback
         * @param {!Array.<!DOMAgent.NodeId>=} matchingNodeIds
         * @this {WebInspector.CSSMatchedStyles}
         */
        function onQueryComplete(node, selectorText, callback, matchingNodeIds)
        {
            if (matchingNodeIds)
                this._setSelectorMatches(node, selectorText, matchingNodeIds.indexOf(node.id) !== -1);
            callback();
        }
    },

    /**
     * @param {!WebInspector.CSSStyleRule} rule
     * @param {!WebInspector.DOMNode} node
     * @return {!Promise}
     */
    addNewRule: function(rule, node)
    {
        this._nodeForStyle.set(rule.style, node);
        return this.recomputeMatchingSelectors(rule);
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @param {string} selectorText
     * @param {boolean} value
     */
    _setSelectorMatches: function(node, selectorText, value)
    {
        var map = this._matchingSelectors.get(node.id);
        if (!map) {
            map = new Map();
            this._matchingSelectors.set(node.id, map);
        }
        map.set(selectorText, value);
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
     * @return {!Array<!WebInspector.CSSStyleDeclaration>}
     */
    nodeStyles: function()
    {
        return this._nodeStyles;
    },

    /**
     * @return {!Array.<!WebInspector.CSSKeyframesRule>}
     */
    keyframes: function()
    {
        return this._keyframes;
    },

    /**
     * @return {!Map.<!DOMAgent.PseudoType, !Array<!WebInspector.CSSStyleDeclaration>>}
     */
    pseudoStyles: function()
    {
        return this._pseudoStyles;
    },

    /**
     * @param {!WebInspector.CSSStyleDeclaration} style
     * @return {boolean}
     */
    _containsInherited: function(style)
    {
        var properties = style.allProperties;
        for (var i = 0; i < properties.length; ++i) {
            var property = properties[i];
            // Does this style contain non-overridden inherited property?
            if (property.activeInStyle() && WebInspector.CSSMetadata.isPropertyInherited(property.name))
                return true;
        }
        return false;
    },

    /**
     * @param {!WebInspector.CSSStyleDeclaration} style
     * @return {?WebInspector.DOMNode}
     */
    nodeForStyle: function(style)
    {
        return this._nodeForStyle.get(style) || null;
    },

    /**
     * @param {!WebInspector.CSSStyleDeclaration} style
     * @return {boolean}
     */
    isInherited: function(style)
    {
        return this._inheritedStyles.has(style);
    },

    /**
     * @param {!WebInspector.CSSProperty} property
     * @return {?WebInspector.CSSMatchedStyles.PropertyState}
     */
    propertyState: function(property)
    {
        if (this._propertiesState.size === 0) {
            this._computeActiveProperties(this._nodeStyles, this._propertiesState);
            for (var pseudoElementStyles of this._pseudoStyles.valuesArray())
                this._computeActiveProperties(pseudoElementStyles, this._propertiesState);
        }
        return this._propertiesState.get(property) || null;
    },

    resetActiveProperties: function()
    {
        /** @type {!Map<!WebInspector.CSSProperty, !WebInspector.CSSMatchedStyles.PropertyState>} */
        this._propertiesState = new Map();
    },

    /**
     * @param {!Array<!WebInspector.CSSStyleDeclaration>} styles
     * @param {!Map<!WebInspector.CSSProperty, !WebInspector.CSSMatchedStyles.PropertyState>} result
     */
    _computeActiveProperties: function(styles, result)
    {
        /** @type {!Set.<string>} */
        var foundImportantProperties = new Set();
        /** @type {!Map.<string, !Map<string, !WebInspector.CSSProperty>>} */
        var propertyToEffectiveRule = new Map();
        /** @type {!Map.<string, !WebInspector.DOMNode>} */
        var inheritedPropertyToNode = new Map();
        /** @type {!Set<string>} */
        var allUsedProperties = new Set();
        for (var i = 0; i < styles.length; ++i) {
            var style = styles[i];
            var rule = style.parentRule;
            // Compute cascade for CSSStyleRules only.
            if (rule && !(rule instanceof WebInspector.CSSStyleRule))
                continue;
            if (rule && !this.hasMatchingSelectors(rule))
                continue;

            /** @type {!Map<string, !WebInspector.CSSProperty>} */
            var styleActiveProperties = new Map();
            var allProperties = style.allProperties;
            for (var j = 0; j < allProperties.length; ++j) {
                var property = allProperties[j];

                // Do not pick non-inherited properties from inherited styles.
                var inherited = this.isInherited(style);
                if (inherited && !WebInspector.CSSMetadata.isPropertyInherited(property.name))
                    continue;

                if (!property.activeInStyle()) {
                    result.set(property, WebInspector.CSSMatchedStyles.PropertyState.Overloaded);
                    continue;
                }

                var canonicalName = WebInspector.CSSMetadata.canonicalPropertyName(property.name);
                if (foundImportantProperties.has(canonicalName)) {
                    result.set(property, WebInspector.CSSMatchedStyles.PropertyState.Overloaded);
                    continue;
                }

                if (!property.important && allUsedProperties.has(canonicalName)) {
                    result.set(property, WebInspector.CSSMatchedStyles.PropertyState.Overloaded);
                    continue;
                }

                var isKnownProperty = propertyToEffectiveRule.has(canonicalName);
                var inheritedFromNode = inherited ? this.nodeForStyle(style) : null;
                if (!isKnownProperty && inheritedFromNode && !inheritedPropertyToNode.has(canonicalName))
                    inheritedPropertyToNode.set(canonicalName, inheritedFromNode);

                if (property.important) {
                    if (inherited && isKnownProperty && inheritedFromNode !== inheritedPropertyToNode.get(canonicalName)) {
                        result.set(property, WebInspector.CSSMatchedStyles.PropertyState.Overloaded);
                        continue;
                    }

                    foundImportantProperties.add(canonicalName);
                    if (isKnownProperty) {
                        var overloaded = /** @type {!WebInspector.CSSProperty} */(propertyToEffectiveRule.get(canonicalName).get(canonicalName));
                        result.set(overloaded, WebInspector.CSSMatchedStyles.PropertyState.Overloaded);
                        propertyToEffectiveRule.get(canonicalName).delete(canonicalName);
                    }
                }

                styleActiveProperties.set(canonicalName, property);
                allUsedProperties.add(canonicalName);
                propertyToEffectiveRule.set(canonicalName, styleActiveProperties);
                result.set(property, WebInspector.CSSMatchedStyles.PropertyState.Active);
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
                result.set(property, WebInspector.CSSMatchedStyles.PropertyState.Overloaded);
            }
        }
    }
}

/** @enum {string} */
WebInspector.CSSMatchedStyles.PropertyState = {
    Active: "Active",
    Overloaded: "Overloaded"
}
