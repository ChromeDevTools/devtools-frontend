// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../../models/text_utils/text_utils.js';
import type * as Protocol from '../../generated/protocol.js';

import {cssMetadata, CustomVariableRegex, VariableRegex} from './CSSMetadata.js';
import type {CSSModel} from './CSSModel.js';
import type {CSSProperty} from './CSSProperty.js';
import {CSSKeyframesRule, CSSStyleRule} from './CSSRule.js';
import {CSSStyleDeclaration, Type} from './CSSStyleDeclaration.js';
import type {DOMNode} from './DOMModel.js';

export class CSSMatchedStyles {
  readonly #cssModelInternal: CSSModel;
  readonly #nodeInternal: DOMNode;
  readonly #addedStyles: Map<CSSStyleDeclaration, DOMNode>;
  readonly #matchingSelectors: Map<number, Map<string, boolean>>;
  readonly #keyframesInternal: CSSKeyframesRule[];
  readonly #nodeForStyleInternal: Map<CSSStyleDeclaration, DOMNode|null>;
  readonly #inheritedStyles: Set<CSSStyleDeclaration>;
  readonly #mainDOMCascade: DOMInheritanceCascade;
  readonly #pseudoDOMCascades: Map<Protocol.DOM.PseudoType, DOMInheritanceCascade>;
  readonly #styleToDOMCascade: Map<CSSStyleDeclaration, DOMInheritanceCascade>;

  constructor(
      cssModel: CSSModel, node: DOMNode, inlinePayload: Protocol.CSS.CSSStyle|null,
      attributesPayload: Protocol.CSS.CSSStyle|null, matchedPayload: Protocol.CSS.RuleMatch[],
      pseudoPayload: Protocol.CSS.PseudoElementMatches[], inheritedPayload: Protocol.CSS.InheritedStyleEntry[],
      animationsPayload: Protocol.CSS.CSSKeyframesRule[]) {
    this.#cssModelInternal = cssModel;
    this.#nodeInternal = node;
    this.#addedStyles = new Map();
    this.#matchingSelectors = new Map();
    this.#keyframesInternal = [];
    if (animationsPayload) {
      this.#keyframesInternal = animationsPayload.map(rule => new CSSKeyframesRule(cssModel, rule));
    }

    this.#nodeForStyleInternal = new Map();
    this.#inheritedStyles = new Set();

    matchedPayload = cleanUserAgentPayload(matchedPayload);
    for (const inheritedResult of inheritedPayload) {
      inheritedResult.matchedCSSRules = cleanUserAgentPayload(inheritedResult.matchedCSSRules);
    }

    this.#mainDOMCascade = this.buildMainCascade(inlinePayload, attributesPayload, matchedPayload, inheritedPayload);
    this.#pseudoDOMCascades = this.buildPseudoCascades(pseudoPayload);

    this.#styleToDOMCascade = new Map();
    for (const domCascade of Array.from(this.#pseudoDOMCascades.values()).concat(this.#mainDOMCascade)) {
      for (const style of domCascade.styles()) {
        this.#styleToDOMCascade.set(style, domCascade);
      }
    }

    function cleanUserAgentPayload(payload: Protocol.CSS.RuleMatch[]): Protocol.CSS.RuleMatch[] {
      for (const ruleMatch of payload) {
        cleanUserAgentSelectors(ruleMatch);
      }

      // Merge UA rules that are sequential and have similar selector/media.
      const cleanMatchedPayload = [];
      for (const ruleMatch of payload) {
        const lastMatch = cleanMatchedPayload[cleanMatchedPayload.length - 1];
        if (!lastMatch || ruleMatch.rule.origin !== 'user-agent' || lastMatch.rule.origin !== 'user-agent' ||
            ruleMatch.rule.selectorList.text !== lastMatch.rule.selectorList.text ||
            mediaText(ruleMatch) !== mediaText(lastMatch)) {
          cleanMatchedPayload.push(ruleMatch);
          continue;
        }
        mergeRule(ruleMatch, lastMatch);
      }
      return cleanMatchedPayload;

      function mergeRule(from: Protocol.CSS.RuleMatch, to: Protocol.CSS.RuleMatch): void {
        const shorthands = (new Map() as Map<string, string>);
        const properties = (new Map() as Map<string, string>);
        for (const entry of to.rule.style.shorthandEntries) {
          shorthands.set(entry.name, entry.value);
        }
        for (const entry of to.rule.style.cssProperties) {
          properties.set(entry.name, entry.value);
        }
        for (const entry of from.rule.style.shorthandEntries) {
          shorthands.set(entry.name, entry.value);
        }
        for (const entry of from.rule.style.cssProperties) {
          properties.set(entry.name, entry.value);
        }
        to.rule.style.shorthandEntries = [...shorthands.entries()].map(([name, value]) => ({name, value}));
        to.rule.style.cssProperties = [...properties.entries()].map(([name, value]) => ({name, value}));
      }

      function mediaText(ruleMatch: Protocol.CSS.RuleMatch): string|null {
        if (!ruleMatch.rule.media) {
          return null;
        }
        return ruleMatch.rule.media.map(media => media.text).join(', ');
      }

      function cleanUserAgentSelectors(ruleMatch: Protocol.CSS.RuleMatch): void {
        const {matchingSelectors, rule} = ruleMatch;
        if (rule.origin !== 'user-agent' || !matchingSelectors.length) {
          return;
        }
        rule.selectorList.selectors = rule.selectorList.selectors.filter((item, i) => matchingSelectors.includes(i));
        rule.selectorList.text = rule.selectorList.selectors.map(item => item.text).join(', ');
        ruleMatch.matchingSelectors = matchingSelectors.map((item, i) => i);
      }
    }
  }

  private buildMainCascade(
      inlinePayload: Protocol.CSS.CSSStyle|null, attributesPayload: Protocol.CSS.CSSStyle|null,
      matchedPayload: Protocol.CSS.RuleMatch[],
      inheritedPayload: Protocol.CSS.InheritedStyleEntry[]): DOMInheritanceCascade {
    const nodeCascades: NodeCascade[] = [];

    const nodeStyles: CSSStyleDeclaration[] = [];

    function addAttributesStyle(this: CSSMatchedStyles): void {
      if (!attributesPayload) {
        return;
      }
      const style = new CSSStyleDeclaration(this.#cssModelInternal, null, attributesPayload, Type.Attributes);
      this.#nodeForStyleInternal.set(style, this.#nodeInternal);
      nodeStyles.push(style);
    }

    // Inline style has the greatest specificity.
    if (inlinePayload && this.#nodeInternal.nodeType() === Node.ELEMENT_NODE) {
      const style = new CSSStyleDeclaration(this.#cssModelInternal, null, inlinePayload, Type.Inline);
      this.#nodeForStyleInternal.set(style, this.#nodeInternal);
      nodeStyles.push(style);
    }

    // Add rules in reverse order to match the cascade order.
    let addedAttributesStyle;
    for (let i = matchedPayload.length - 1; i >= 0; --i) {
      const rule = new CSSStyleRule(this.#cssModelInternal, matchedPayload[i].rule);
      if ((rule.isInjected() || rule.isUserAgent()) && !addedAttributesStyle) {
        // Show element's Style Attributes after all author rules.
        addedAttributesStyle = true;
        addAttributesStyle.call(this);
      }
      this.#nodeForStyleInternal.set(rule.style, this.#nodeInternal);
      nodeStyles.push(rule.style);
      this.addMatchingSelectors(this.#nodeInternal, rule, matchedPayload[i].matchingSelectors);
    }

    if (!addedAttributesStyle) {
      addAttributesStyle.call(this);
    }
    nodeCascades.push(new NodeCascade(this, nodeStyles, false /* #isInherited */));

    // Walk the node structure and identify styles with inherited properties.
    let parentNode: (DOMNode|null) = this.#nodeInternal.parentNode;
    for (let i = 0; parentNode && inheritedPayload && i < inheritedPayload.length; ++i) {
      const inheritedStyles = [];
      const entryPayload = inheritedPayload[i];
      const inheritedInlineStyle = entryPayload.inlineStyle ?
          new CSSStyleDeclaration(this.#cssModelInternal, null, entryPayload.inlineStyle, Type.Inline) :
          null;
      if (inheritedInlineStyle && this.containsInherited(inheritedInlineStyle)) {
        this.#nodeForStyleInternal.set(inheritedInlineStyle, parentNode);
        inheritedStyles.push(inheritedInlineStyle);
        this.#inheritedStyles.add(inheritedInlineStyle);
      }

      const inheritedMatchedCSSRules = entryPayload.matchedCSSRules || [];
      for (let j = inheritedMatchedCSSRules.length - 1; j >= 0; --j) {
        const inheritedRule = new CSSStyleRule(this.#cssModelInternal, inheritedMatchedCSSRules[j].rule);
        this.addMatchingSelectors(parentNode, inheritedRule, inheritedMatchedCSSRules[j].matchingSelectors);
        if (!this.containsInherited(inheritedRule.style)) {
          continue;
        }
        if (containsStyle(nodeStyles, inheritedRule.style) ||
            containsStyle(this.#inheritedStyles, inheritedRule.style)) {
          continue;
        }
        this.#nodeForStyleInternal.set(inheritedRule.style, parentNode);
        inheritedStyles.push(inheritedRule.style);
        this.#inheritedStyles.add(inheritedRule.style);
      }
      parentNode = parentNode.parentNode;
      nodeCascades.push(new NodeCascade(this, inheritedStyles, true /* #isInherited */));
    }

    return new DOMInheritanceCascade(nodeCascades);

    function containsStyle(
        styles: CSSStyleDeclaration[]|Set<CSSStyleDeclaration>, query: CSSStyleDeclaration): boolean {
      if (!query.styleSheetId || !query.range) {
        return false;
      }
      for (const style of styles) {
        if (query.styleSheetId === style.styleSheetId && style.range && query.range.equal(style.range)) {
          return true;
        }
      }
      return false;
    }
  }

  private buildPseudoCascades(pseudoPayload: Protocol.CSS.PseudoElementMatches[]):
      Map<Protocol.DOM.PseudoType, DOMInheritanceCascade> {
    const pseudoCascades = new Map<Protocol.DOM.PseudoType, DOMInheritanceCascade>();
    if (!pseudoPayload) {
      return pseudoCascades;
    }
    for (let i = 0; i < pseudoPayload.length; ++i) {
      const entryPayload = pseudoPayload[i];
      // PseudoElement nodes are not created unless "content" css property is set.
      const pseudoElement = this.#nodeInternal.pseudoElements().get(entryPayload.pseudoType) || null;
      const pseudoStyles = [];
      const rules = entryPayload.matches || [];
      for (let j = rules.length - 1; j >= 0; --j) {
        const pseudoRule = new CSSStyleRule(this.#cssModelInternal, rules[j].rule);
        pseudoStyles.push(pseudoRule.style);
        this.#nodeForStyleInternal.set(pseudoRule.style, pseudoElement);
        if (pseudoElement) {
          this.addMatchingSelectors(pseudoElement, pseudoRule, rules[j].matchingSelectors);
        }
      }
      const nodeCascade = new NodeCascade(this, pseudoStyles, false /* #isInherited */);
      pseudoCascades.set(entryPayload.pseudoType, new DOMInheritanceCascade([nodeCascade]));
    }
    return pseudoCascades;
  }

  private addMatchingSelectors(
      this: CSSMatchedStyles, node: DOMNode, rule: CSSStyleRule, matchingSelectorIndices: number[]): void {
    for (const matchingSelectorIndex of matchingSelectorIndices) {
      const selector = rule.selectors[matchingSelectorIndex];
      this.setSelectorMatches(node, selector.text, true);
    }
  }

  node(): DOMNode {
    return this.#nodeInternal;
  }

  cssModel(): CSSModel {
    return this.#cssModelInternal;
  }

  hasMatchingSelectors(rule: CSSStyleRule): boolean {
    const matchingSelectors = this.getMatchingSelectors(rule);
    return matchingSelectors.length > 0 && this.mediaMatches(rule.style);
  }

  getMatchingSelectors(rule: CSSStyleRule): number[] {
    const node = this.nodeForStyle(rule.style);
    if (!node || typeof node.id !== 'number') {
      return [];
    }
    const map = this.#matchingSelectors.get(node.id);
    if (!map) {
      return [];
    }
    const result = [];
    for (let i = 0; i < rule.selectors.length; ++i) {
      if (map.get(rule.selectors[i].text)) {
        result.push(i);
      }
    }
    return result;
  }

  async recomputeMatchingSelectors(rule: CSSStyleRule): Promise<void> {
    const node = this.nodeForStyle(rule.style);
    if (!node) {
      return;
    }
    const promises = [];
    for (const selector of rule.selectors) {
      promises.push(querySelector.call(this, node, selector.text));
    }
    await Promise.all(promises);

    async function querySelector(this: CSSMatchedStyles, node: DOMNode, selectorText: string): Promise<void> {
      const ownerDocument = node.ownerDocument;
      if (!ownerDocument) {
        return;
      }
      // We assume that "matching" property does not ever change during the
      // MatchedStyleResult's lifetime.
      if (typeof node.id === 'number') {
        const map = this.#matchingSelectors.get(node.id);
        if (map && map.has(selectorText)) {
          return;
        }
      }

      if (typeof ownerDocument.id !== 'number') {
        return;
      }
      const matchingNodeIds = await this.#nodeInternal.domModel().querySelectorAll(ownerDocument.id, selectorText);

      if (matchingNodeIds) {
        if (typeof node.id === 'number') {
          this.setSelectorMatches(node, selectorText, matchingNodeIds.indexOf(node.id) !== -1);
        } else {
          this.setSelectorMatches(node, selectorText, false);
        }
      }
    }
  }

  addNewRule(rule: CSSStyleRule, node: DOMNode): Promise<void> {
    this.#addedStyles.set(rule.style, node);
    return this.recomputeMatchingSelectors(rule);
  }

  private setSelectorMatches(node: DOMNode, selectorText: string, value: boolean): void {
    if (typeof node.id !== 'number') {
      return;
    }
    let map = this.#matchingSelectors.get(node.id);
    if (!map) {
      map = new Map();
      this.#matchingSelectors.set(node.id, map);
    }
    map.set(selectorText, value);
  }

  mediaMatches(style: CSSStyleDeclaration): boolean {
    if (!style.parentRule) {
      return true;
    }
    const media = (style.parentRule as CSSStyleRule).media;
    for (let i = 0; media && i < media.length; ++i) {
      if (!media[i].active()) {
        return false;
      }
    }
    return true;
  }

  nodeStyles(): CSSStyleDeclaration[] {
    return this.#mainDOMCascade.styles();
  }

  keyframes(): CSSKeyframesRule[] {
    return this.#keyframesInternal;
  }

  pseudoStyles(pseudoType: Protocol.DOM.PseudoType): CSSStyleDeclaration[] {
    const domCascade = this.#pseudoDOMCascades.get(pseudoType);
    return domCascade ? domCascade.styles() : [];
  }

  pseudoTypes(): Set<Protocol.DOM.PseudoType> {
    return new Set(this.#pseudoDOMCascades.keys());
  }

  private containsInherited(style: CSSStyleDeclaration): boolean {
    const properties = style.allProperties();
    for (let i = 0; i < properties.length; ++i) {
      const property = properties[i];
      // Does this style contain non-overridden inherited property?
      if (property.activeInStyle() && cssMetadata().isPropertyInherited(property.name)) {
        return true;
      }
    }
    return false;
  }

  nodeForStyle(style: CSSStyleDeclaration): DOMNode|null {
    return this.#addedStyles.get(style) || this.#nodeForStyleInternal.get(style) || null;
  }

  availableCSSVariables(style: CSSStyleDeclaration): string[] {
    const domCascade = this.#styleToDOMCascade.get(style) || null;
    return domCascade ? domCascade.findAvailableCSSVariables(style) : [];
  }

  computeCSSVariable(style: CSSStyleDeclaration, variableName: string): string|null {
    const domCascade = this.#styleToDOMCascade.get(style) || null;
    return domCascade ? domCascade.computeCSSVariable(style, variableName) : null;
  }

  computeValue(style: CSSStyleDeclaration, value: string): string|null {
    const domCascade = this.#styleToDOMCascade.get(style) || null;
    return domCascade ? domCascade.computeValue(style, value) : null;
  }

  /**
   * Same as computeValue, but to be used for `var(--#name [,...])` values only
   */
  computeSingleVariableValue(style: CSSStyleDeclaration, cssVariableValue: string): {
    computedValue: string|null,
    fromFallback: boolean,
  }|null {
    const domCascade = this.#styleToDOMCascade.get(style) || null;
    const cssVariableValueNoSpaces = cssVariableValue.replace(/\s/g, '');
    return domCascade ? domCascade.computeSingleVariableValue(style, cssVariableValueNoSpaces) : null;
  }

  isInherited(style: CSSStyleDeclaration): boolean {
    return this.#inheritedStyles.has(style);
  }

  propertyState(property: CSSProperty): PropertyState|null {
    const domCascade = this.#styleToDOMCascade.get(property.ownerStyle);
    return domCascade ? domCascade.propertyState(property) : null;
  }

  resetActiveProperties(): void {
    this.#mainDOMCascade.reset();
    for (const domCascade of this.#pseudoDOMCascades.values()) {
      domCascade.reset();
    }
  }
}

class NodeCascade {
  #matchedStyles: CSSMatchedStyles;
  readonly styles: CSSStyleDeclaration[];
  readonly #isInherited: boolean;
  readonly propertiesState: Map<CSSProperty, PropertyState>;
  readonly activeProperties: Map<string, CSSProperty>;
  constructor(matchedStyles: CSSMatchedStyles, styles: CSSStyleDeclaration[], isInherited: boolean) {
    this.#matchedStyles = matchedStyles;
    this.styles = styles;
    this.#isInherited = isInherited;
    this.propertiesState = new Map();
    this.activeProperties = new Map();
  }

  computeActiveProperties(): void {
    this.propertiesState.clear();
    this.activeProperties.clear();

    for (const style of this.styles) {
      const rule = style.parentRule;
      // Compute cascade for CSSStyleRules only.
      if (rule && !(rule instanceof CSSStyleRule)) {
        continue;
      }
      if (rule && !this.#matchedStyles.hasMatchingSelectors(rule)) {
        continue;
      }

      for (const property of style.allProperties()) {
        // Do not pick non-inherited properties from inherited styles.
        const metadata = cssMetadata();
        if (this.#isInherited && !metadata.isPropertyInherited(property.name)) {
          continue;
        }

        if (!property.activeInStyle()) {
          this.propertiesState.set(property, PropertyState.Overloaded);
          continue;
        }

        const canonicalName = metadata.canonicalPropertyName(property.name);
        const isPropShorthand = Boolean(metadata.getLonghands(canonicalName));

        if (isPropShorthand) {
          const longhandsFromShort =
              (property.value.match(CustomVariableRegex) || []).map(e => e.replace(CustomVariableRegex, '$2'));
          longhandsFromShort.forEach(longhandProperty => {
            if (metadata.isCSSPropertyName(longhandProperty)) {
              const activeProperty = this.activeProperties.get(longhandProperty);
              if (!activeProperty) {
                this.activeProperties.set(longhandProperty, property);
              } else {
                this.propertiesState.set(activeProperty, PropertyState.Overloaded);
                this.activeProperties.set(longhandProperty, property);
              }
            }
          });
        }

        const activeProperty = this.activeProperties.get(canonicalName);
        if (activeProperty && (activeProperty.important || !property.important)) {
          this.propertiesState.set(property, PropertyState.Overloaded);
          continue;
        }

        if (activeProperty) {
          this.propertiesState.set(activeProperty, PropertyState.Overloaded);
        }
        this.propertiesState.set(property, PropertyState.Active);
        this.activeProperties.set(canonicalName, property);
      }
    }
  }
}

class DOMInheritanceCascade {
  readonly #nodeCascades: NodeCascade[];
  readonly #propertiesState: Map<CSSProperty, PropertyState>;
  readonly #availableCSSVariables: Map<NodeCascade, Map<string, string|null>>;
  readonly #computedCSSVariables: Map<NodeCascade, Map<string, string|null>>;
  #initialized: boolean;
  readonly #styleToNodeCascade: Map<CSSStyleDeclaration, NodeCascade>;
  constructor(nodeCascades: NodeCascade[]) {
    this.#nodeCascades = nodeCascades;
    this.#propertiesState = new Map();
    this.#availableCSSVariables = new Map();
    this.#computedCSSVariables = new Map();
    this.#initialized = false;

    this.#styleToNodeCascade = new Map();
    for (const nodeCascade of nodeCascades) {
      for (const style of nodeCascade.styles) {
        this.#styleToNodeCascade.set(style, nodeCascade);
      }
    }
  }

  findAvailableCSSVariables(style: CSSStyleDeclaration): string[] {
    const nodeCascade = this.#styleToNodeCascade.get(style);
    if (!nodeCascade) {
      return [];
    }
    this.ensureInitialized();
    const availableCSSVariables = this.#availableCSSVariables.get(nodeCascade);
    if (!availableCSSVariables) {
      return [];
    }
    return Array.from(availableCSSVariables.keys());
  }

  computeCSSVariable(style: CSSStyleDeclaration, variableName: string): string|null {
    const nodeCascade = this.#styleToNodeCascade.get(style);
    if (!nodeCascade) {
      return null;
    }
    this.ensureInitialized();
    const availableCSSVariables = this.#availableCSSVariables.get(nodeCascade);
    const computedCSSVariables = this.#computedCSSVariables.get(nodeCascade);
    if (!availableCSSVariables || !computedCSSVariables) {
      return null;
    }
    return this.innerComputeCSSVariable(availableCSSVariables, computedCSSVariables, variableName);
  }

  computeValue(style: CSSStyleDeclaration, value: string): string|null {
    const nodeCascade = this.#styleToNodeCascade.get(style);
    if (!nodeCascade) {
      return null;
    }
    this.ensureInitialized();
    const availableCSSVariables = this.#availableCSSVariables.get(nodeCascade);
    const computedCSSVariables = this.#computedCSSVariables.get(nodeCascade);
    if (!availableCSSVariables || !computedCSSVariables) {
      return null;
    }
    return this.innerComputeValue(availableCSSVariables, computedCSSVariables, value);
  }

  computeSingleVariableValue(style: CSSStyleDeclaration, cssVariableValue: string): {
    computedValue: string|null,
    fromFallback: boolean,
  }|null {
    const nodeCascade = this.#styleToNodeCascade.get(style);
    if (!nodeCascade) {
      return null;
    }
    this.ensureInitialized();
    const availableCSSVariables = this.#availableCSSVariables.get(nodeCascade);
    const computedCSSVariables = this.#computedCSSVariables.get(nodeCascade);
    if (!availableCSSVariables || !computedCSSVariables) {
      return null;
    }
    const computedValue = this.innerComputeValue(availableCSSVariables, computedCSSVariables, cssVariableValue);
    const {variableName} = this.getCSSVariableNameAndFallback(cssVariableValue);

    return {computedValue, fromFallback: variableName !== null && !availableCSSVariables.has(variableName)};
  }

  private getCSSVariableNameAndFallback(cssVariableValue: string): {
    variableName: string|null,
    fallback: string|null,
  } {
    const match = cssVariableValue.match(/^var\((--[a-zA-Z0-9-_]+)[,]?\s*(.*)\)$/);
    return {variableName: match && match[1], fallback: match && match[2]};
  }

  private innerComputeCSSVariable(
      availableCSSVariables: Map<string, string|null>, computedCSSVariables: Map<string, string|null>,
      variableName: string): string|null {
    if (!availableCSSVariables.has(variableName)) {
      return null;
    }
    if (computedCSSVariables.has(variableName)) {
      return computedCSSVariables.get(variableName) || null;
    }
    // Set dummy value to avoid infinite recursion.
    computedCSSVariables.set(variableName, null);
    const definedValue = availableCSSVariables.get(variableName);
    if (definedValue === undefined || definedValue === null) {
      return null;
    }
    const computedValue = this.innerComputeValue(availableCSSVariables, computedCSSVariables, definedValue);
    computedCSSVariables.set(variableName, computedValue);
    return computedValue;
  }

  private innerComputeValue(
      availableCSSVariables: Map<string, string|null>, computedCSSVariables: Map<string, string|null>,
      value: string): string|null {
    const results = TextUtils.TextUtils.Utils.splitStringByRegexes(value, [VariableRegex]);
    const tokens = [];
    for (const result of results) {
      if (result.regexIndex === -1) {
        tokens.push(result.value);
        continue;
      }
      // process var() function
      const {variableName, fallback} = this.getCSSVariableNameAndFallback(result.value);
      if (!variableName) {
        return null;
      }
      const computedValue = this.innerComputeCSSVariable(availableCSSVariables, computedCSSVariables, variableName);
      if (computedValue === null && !fallback) {
        return null;
      }
      if (computedValue === null) {
        tokens.push(fallback);
      } else {
        tokens.push(computedValue);
      }
    }
    return tokens.map(token => token ? token.trim() : '').join(' ');
  }

  styles(): CSSStyleDeclaration[] {
    return Array.from(this.#styleToNodeCascade.keys());
  }

  propertyState(property: CSSProperty): PropertyState|null {
    this.ensureInitialized();
    return this.#propertiesState.get(property) || null;
  }

  reset(): void {
    this.#initialized = false;
    this.#propertiesState.clear();
    this.#availableCSSVariables.clear();
    this.#computedCSSVariables.clear();
  }

  private ensureInitialized(): void {
    if (this.#initialized) {
      return;
    }
    this.#initialized = true;

    const activeProperties = new Map<string, CSSProperty>();
    for (const nodeCascade of this.#nodeCascades) {
      nodeCascade.computeActiveProperties();
      for (const entry of nodeCascade.propertiesState.entries()) {
        const property = (entry[0] as CSSProperty);
        const state = (entry[1] as PropertyState);
        if (state === PropertyState.Overloaded) {
          this.#propertiesState.set(property, PropertyState.Overloaded);
          continue;
        }
        const canonicalName = cssMetadata().canonicalPropertyName(property.name);
        if (activeProperties.has(canonicalName)) {
          this.#propertiesState.set(property, PropertyState.Overloaded);
          continue;
        }
        activeProperties.set(canonicalName, property);
        this.#propertiesState.set(property, PropertyState.Active);
      }
    }
    // If every longhand of the shorthand is not active, then the shorthand is not active too.
    for (const entry of activeProperties.entries()) {
      const canonicalName = (entry[0] as string);
      const shorthandProperty = (entry[1] as CSSProperty);
      const shorthandStyle = shorthandProperty.ownerStyle;
      const longhands = shorthandStyle.longhandProperties(shorthandProperty.name);
      if (!longhands.length) {
        continue;
      }
      let hasActiveLonghands = false;
      for (const longhand of longhands) {
        const longhandCanonicalName = cssMetadata().canonicalPropertyName(longhand.name);
        const longhandActiveProperty = activeProperties.get(longhandCanonicalName);
        if (!longhandActiveProperty) {
          continue;
        }
        if (longhandActiveProperty.ownerStyle === shorthandStyle) {
          hasActiveLonghands = true;
          break;
        }
      }
      if (hasActiveLonghands) {
        continue;
      }
      activeProperties.delete(canonicalName);
      this.#propertiesState.set(shorthandProperty, PropertyState.Overloaded);
    }

    // Work inheritance chain backwards to compute visible CSS Variables.
    const accumulatedCSSVariables = new Map<string, string|null>();
    for (let i = this.#nodeCascades.length - 1; i >= 0; --i) {
      const nodeCascade = this.#nodeCascades[i];
      const variableNames = [];
      for (const entry of nodeCascade.activeProperties.entries()) {
        const propertyName = (entry[0] as string);
        const property = (entry[1] as CSSProperty);
        if (propertyName.startsWith('--')) {
          accumulatedCSSVariables.set(propertyName, property.value);
          variableNames.push(propertyName);
        }
      }
      const availableCSSVariablesMap = new Map(accumulatedCSSVariables);
      const computedVariablesMap = new Map();
      this.#availableCSSVariables.set(nodeCascade, availableCSSVariablesMap);
      this.#computedCSSVariables.set(nodeCascade, computedVariablesMap);
      for (const variableName of variableNames) {
        accumulatedCSSVariables.delete(variableName);
        accumulatedCSSVariables.set(
            variableName, this.innerComputeCSSVariable(availableCSSVariablesMap, computedVariablesMap, variableName));
      }
    }
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum PropertyState {
  Active = 'Active',
  Overloaded = 'Overloaded',
}
