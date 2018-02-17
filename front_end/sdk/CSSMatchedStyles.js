// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
SDK.CSSMatchedStyles = class {
  /**
   * @param {!SDK.CSSModel} cssModel
   * @param {!SDK.DOMNode} node
   * @param {?Protocol.CSS.CSSStyle} inlinePayload
   * @param {?Protocol.CSS.CSSStyle} attributesPayload
   * @param {!Array.<!Protocol.CSS.RuleMatch>} matchedPayload
   * @param {!Array.<!Protocol.CSS.PseudoElementMatches>} pseudoPayload
   * @param {!Array.<!Protocol.CSS.InheritedStyleEntry>} inheritedPayload
   * @param {!Array.<!Protocol.CSS.CSSKeyframesRule>} animationsPayload
   */
  constructor(
      cssModel,
      node,
      inlinePayload,
      attributesPayload,
      matchedPayload,
      pseudoPayload,
      inheritedPayload,
      animationsPayload) {
    this._cssModel = cssModel;
    this._node = node;
    this._nodeStyles = [];
    this._nodeForStyle = new Map();
    this._inheritedStyles = new Set();
    this._keyframes = [];
    /** @type {!Map<!Protocol.DOM.NodeId, !Map<string, boolean>>} */
    this._matchingSelectors = new Map();

    /**
     * @this {SDK.CSSMatchedStyles}
     */
    function addAttributesStyle() {
      if (!attributesPayload)
        return;
      const style =
          new SDK.CSSStyleDeclaration(cssModel, null, attributesPayload, SDK.CSSStyleDeclaration.Type.Attributes);
      this._nodeForStyle.set(style, this._node);
      this._nodeStyles.push(style);
    }

    // Inline style has the greatest specificity.
    if (inlinePayload && this._node.nodeType() === Node.ELEMENT_NODE) {
      const style = new SDK.CSSStyleDeclaration(cssModel, null, inlinePayload, SDK.CSSStyleDeclaration.Type.Inline);
      this._nodeForStyle.set(style, this._node);
      this._nodeStyles.push(style);
    }

    // Add rules in reverse order to match the cascade order.
    let addedAttributesStyle;
    for (let i = matchedPayload.length - 1; i >= 0; --i) {
      const rule = new SDK.CSSStyleRule(cssModel, matchedPayload[i].rule);
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
    let parentNode = this._node.parentNode;
    for (let i = 0; parentNode && inheritedPayload && i < inheritedPayload.length; ++i) {
      const entryPayload = inheritedPayload[i];
      const inheritedInlineStyle = entryPayload.inlineStyle ?
          new SDK.CSSStyleDeclaration(cssModel, null, entryPayload.inlineStyle, SDK.CSSStyleDeclaration.Type.Inline) :
          null;
      if (inheritedInlineStyle && this._containsInherited(inheritedInlineStyle)) {
        this._nodeForStyle.set(inheritedInlineStyle, parentNode);
        this._nodeStyles.push(inheritedInlineStyle);
        this._inheritedStyles.add(inheritedInlineStyle);
      }

      const inheritedMatchedCSSRules = entryPayload.matchedCSSRules || [];
      for (let j = inheritedMatchedCSSRules.length - 1; j >= 0; --j) {
        const inheritedRule = new SDK.CSSStyleRule(cssModel, inheritedMatchedCSSRules[j].rule);
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
      for (let i = 0; i < pseudoPayload.length; ++i) {
        const entryPayload = pseudoPayload[i];
        // PseudoElement nodes are not created unless "content" css property is set.
        const pseudoElement = this._node.pseudoElements().get(entryPayload.pseudoType) || null;
        const pseudoStyles = [];
        const rules = entryPayload.matches || [];
        for (let j = rules.length - 1; j >= 0; --j) {
          const pseudoRule = new SDK.CSSStyleRule(cssModel, rules[j].rule);
          pseudoStyles.push(pseudoRule.style);
          this._nodeForStyle.set(pseudoRule.style, pseudoElement);
          if (pseudoElement)
            addMatchingSelectors.call(this, pseudoElement, pseudoRule, rules[j].matchingSelectors);
        }
        this._pseudoStyles.set(entryPayload.pseudoType, pseudoStyles);
      }
    }

    if (animationsPayload)
      this._keyframes = animationsPayload.map(rule => new SDK.CSSKeyframesRule(cssModel, rule));

    this.resetActiveProperties();

    /**
     * @param {!SDK.DOMNode} node
     * @param {!SDK.CSSStyleRule} rule
     * @param {!Array<number>} matchingSelectorIndices
     * @this {SDK.CSSMatchedStyles}
     */
    function addMatchingSelectors(node, rule, matchingSelectorIndices) {
      for (const matchingSelectorIndex of matchingSelectorIndices) {
        const selector = rule.selectors[matchingSelectorIndex];
        this._setSelectorMatches(node, selector.text, true);
      }
    }
  }

  /**
   * @return {!SDK.DOMNode}
   */
  node() {
    return this._node;
  }

  /**
   * @return {!SDK.CSSModel}
   */
  cssModel() {
    return this._cssModel;
  }

  /**
   * @param {!SDK.CSSStyleRule} rule
   * @return {boolean}
   */
  hasMatchingSelectors(rule) {
    const matchingSelectors = this.matchingSelectors(rule);
    return matchingSelectors.length > 0 && this.mediaMatches(rule.style);
  }

  /**
   * @param {!SDK.CSSStyleRule} rule
   * @return {!Array<number>}
   */
  matchingSelectors(rule) {
    const node = this.nodeForStyle(rule.style);
    if (!node)
      return [];
    const map = this._matchingSelectors.get(node.id);
    if (!map)
      return [];
    const result = [];
    for (let i = 0; i < rule.selectors.length; ++i) {
      if (map.get(rule.selectors[i].text))
        result.push(i);
    }
    return result;
  }

  /**
   * @param {!SDK.CSSStyleRule} rule
   * @return {!Promise}
   */
  recomputeMatchingSelectors(rule) {
    const node = this.nodeForStyle(rule.style);
    if (!node)
      return Promise.resolve();
    const promises = [];
    for (const selector of rule.selectors)
      promises.push(querySelector.call(this, node, selector.text));
    return Promise.all(promises);

    /**
     * @param {!SDK.DOMNode} node
     * @param {string} selectorText
     * @this {SDK.CSSMatchedStyles}
     */
    async function querySelector(node, selectorText) {
      const ownerDocument = node.ownerDocument || null;
      // We assume that "matching" property does not ever change during the
      // MatchedStyleResult's lifetime.
      const map = this._matchingSelectors.get(node.id);
      if ((map && map.has(selectorText)) || !ownerDocument)
        return;

      const matchingNodeIds = await this._node.domModel().querySelectorAll(ownerDocument.id, selectorText);

      if (matchingNodeIds)
        this._setSelectorMatches(node, selectorText, matchingNodeIds.indexOf(node.id) !== -1);
    }
  }

  /**
   * @param {!SDK.CSSStyleRule} rule
   * @param {!SDK.DOMNode} node
   * @return {!Promise}
   */
  addNewRule(rule, node) {
    this._nodeForStyle.set(rule.style, node);
    return this.recomputeMatchingSelectors(rule);
  }

  /**
   * @param {!SDK.DOMNode} node
   * @param {string} selectorText
   * @param {boolean} value
   */
  _setSelectorMatches(node, selectorText, value) {
    let map = this._matchingSelectors.get(node.id);
    if (!map) {
      map = new Map();
      this._matchingSelectors.set(node.id, map);
    }
    map.set(selectorText, value);
  }

  /**
   * @param {!SDK.CSSStyleDeclaration} style
   * @return {boolean}
   */
  mediaMatches(style) {
    const media = style.parentRule ? style.parentRule.media : [];
    for (let i = 0; media && i < media.length; ++i) {
      if (!media[i].active())
        return false;
    }
    return true;
  }

  /**
   * @return {!Array<!SDK.CSSStyleDeclaration>}
   */
  nodeStyles() {
    return this._nodeStyles;
  }

  /**
   * @return {!Array.<!SDK.CSSKeyframesRule>}
   */
  keyframes() {
    return this._keyframes;
  }

  /**
   * @return {!Map.<!Protocol.DOM.PseudoType, !Array<!SDK.CSSStyleDeclaration>>}
   */
  pseudoStyles() {
    return this._pseudoStyles;
  }

  /**
   * @param {!SDK.CSSStyleDeclaration} style
   * @return {boolean}
   */
  _containsInherited(style) {
    const properties = style.allProperties();
    for (let i = 0; i < properties.length; ++i) {
      const property = properties[i];
      // Does this style contain non-overridden inherited property?
      if (property.activeInStyle() && SDK.cssMetadata().isPropertyInherited(property.name))
        return true;
    }
    return false;
  }

  /**
   * @param {!SDK.CSSStyleDeclaration} style
   * @return {?SDK.DOMNode}
   */
  nodeForStyle(style) {
    return this._nodeForStyle.get(style) || null;
  }

  /**
   * @return {!Array<string>}
   */
  cssVariables() {
    const cssVariables = [];
    for (const style of this.nodeStyles()) {
      for (const property of style.allProperties()) {
        if (property.name.startsWith('--'))
          cssVariables.push(property.name);
      }
    }
    return cssVariables;
  }

  /**
   * @param {!SDK.CSSStyleDeclaration} style
   * @return {boolean}
   */
  isInherited(style) {
    return this._inheritedStyles.has(style);
  }

  /**
   * @param {!SDK.CSSProperty} property
   * @return {?SDK.CSSMatchedStyles.PropertyState}
   */
  propertyState(property) {
    if (this._propertiesState.size === 0) {
      this._computeActiveProperties(this._nodeStyles, this._propertiesState);
      for (const pseudoElementStyles of this._pseudoStyles.valuesArray())
        this._computeActiveProperties(pseudoElementStyles, this._propertiesState);
    }
    return this._propertiesState.get(property) || null;
  }

  resetActiveProperties() {
    /** @type {!Map<!SDK.CSSProperty, !SDK.CSSMatchedStyles.PropertyState>} */
    this._propertiesState = new Map();
  }

  /**
   * @param {!Array<!SDK.CSSStyleDeclaration>} styles
   * @param {!Map<!SDK.CSSProperty, !SDK.CSSMatchedStyles.PropertyState>} result
   */
  _computeActiveProperties(styles, result) {
    /** @type {!Set.<string>} */
    const foundImportantProperties = new Set();
    /** @type {!Map.<string, !Map<string, !SDK.CSSProperty>>} */
    const propertyToEffectiveRule = new Map();
    /** @type {!Map.<string, !SDK.DOMNode>} */
    const inheritedPropertyToNode = new Map();
    /** @type {!Set<string>} */
    const allUsedProperties = new Set();
    for (let i = 0; i < styles.length; ++i) {
      const style = styles[i];
      const rule = style.parentRule;
      // Compute cascade for CSSStyleRules only.
      if (rule && !(rule instanceof SDK.CSSStyleRule))
        continue;
      if (rule && !this.hasMatchingSelectors(rule))
        continue;

      /** @type {!Map<string, !SDK.CSSProperty>} */
      const styleActiveProperties = new Map();
      const allProperties = style.allProperties();
      for (let j = 0; j < allProperties.length; ++j) {
        const property = allProperties[j];

        // Do not pick non-inherited properties from inherited styles.
        const inherited = this.isInherited(style);
        if (inherited && !SDK.cssMetadata().isPropertyInherited(property.name))
          continue;

        if (!property.activeInStyle()) {
          result.set(property, SDK.CSSMatchedStyles.PropertyState.Overloaded);
          continue;
        }

        const canonicalName = SDK.cssMetadata().canonicalPropertyName(property.name);
        if (foundImportantProperties.has(canonicalName)) {
          result.set(property, SDK.CSSMatchedStyles.PropertyState.Overloaded);
          continue;
        }

        if (!property.important && allUsedProperties.has(canonicalName)) {
          result.set(property, SDK.CSSMatchedStyles.PropertyState.Overloaded);
          continue;
        }

        const isKnownProperty = propertyToEffectiveRule.has(canonicalName);
        const inheritedFromNode = inherited ? this.nodeForStyle(style) : null;
        if (!isKnownProperty && inheritedFromNode && !inheritedPropertyToNode.has(canonicalName))
          inheritedPropertyToNode.set(canonicalName, inheritedFromNode);

        if (property.important) {
          if (inherited && isKnownProperty && inheritedFromNode !== inheritedPropertyToNode.get(canonicalName)) {
            result.set(property, SDK.CSSMatchedStyles.PropertyState.Overloaded);
            continue;
          }

          foundImportantProperties.add(canonicalName);
          if (isKnownProperty) {
            const overloaded =
                /** @type {!SDK.CSSProperty} */ (propertyToEffectiveRule.get(canonicalName).get(canonicalName));
            result.set(overloaded, SDK.CSSMatchedStyles.PropertyState.Overloaded);
            propertyToEffectiveRule.get(canonicalName).delete(canonicalName);
          }
        }

        styleActiveProperties.set(canonicalName, property);
        allUsedProperties.add(canonicalName);
        propertyToEffectiveRule.set(canonicalName, styleActiveProperties);
        result.set(property, SDK.CSSMatchedStyles.PropertyState.Active);
      }

      // If every longhand of the shorthand is not active, then the shorthand is not active too.
      for (const property of style.leadingProperties()) {
        const canonicalName = SDK.cssMetadata().canonicalPropertyName(property.name);
        if (!styleActiveProperties.has(canonicalName))
          continue;
        const longhands = style.longhandProperties(property.name);
        if (!longhands.length)
          continue;
        let notUsed = true;
        for (const longhand of longhands) {
          const longhandCanonicalName = SDK.cssMetadata().canonicalPropertyName(longhand.name);
          notUsed = notUsed && !styleActiveProperties.has(longhandCanonicalName);
        }
        if (!notUsed)
          continue;
        styleActiveProperties.delete(canonicalName);
        allUsedProperties.delete(canonicalName);
        result.set(property, SDK.CSSMatchedStyles.PropertyState.Overloaded);
      }
    }
  }
};

/** @enum {string} */
SDK.CSSMatchedStyles.PropertyState = {
  Active: 'Active',
  Overloaded: 'Overloaded'
};
