// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Platform from '../platform/platform.js';

import {cssMetadata, VariableRegex} from './CSSMetadata.js';
import {type CSSModel} from './CSSModel.js';
import {type CSSProperty} from './CSSProperty.js';
import {CSSKeyframesRule, CSSPositionFallbackRule, CSSPropertyRule, CSSStyleRule} from './CSSRule.js';
import {CSSStyleDeclaration, Type} from './CSSStyleDeclaration.js';
import {type DOMNode} from './DOMModel.js';

export function parseCSSVariableNameAndFallback(cssVariableValue: string): {
  variableName: string|null,
  fallback: string|null,
} {
  const match = cssVariableValue.match(/var\(\s*(--(?:[\s\w\P{ASCII}-]|\\.)+),?\s*(.*)\s*\)/u);
  return {variableName: match && match[1].trim(), fallback: match && match[2]};
}

function containsStyle(styles: CSSStyleDeclaration[]|Set<CSSStyleDeclaration>, query: CSSStyleDeclaration): boolean {
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

function containsInherited(style: CSSStyleDeclaration): boolean {
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

/**
 * Return a mapping of the highlight names in the specified RuleMatch to
 * the indices of selectors in that selector list with that highlight name.
 *
 * For example, consider the following ruleset:
 * span::highlight(foo), div, #mySpan::highlight(bar), .highlighted::highlight(foo) {
 *   color: blue;
 * }
 *
 * For a <span id="mySpan" class="highlighted"></span>, a RuleMatch for that span
 * would have matchingSelectors [0, 2, 3] indicating that the span
 * matches all of the highlight selectors.
 *
 * For that RuleMatch, this function would produce the following map:
 * {
 *  "foo": [0, 3],
 *  "bar": [2]
 * }
 *
 * @param ruleMatch
 * @returns A mapping of highlight names to lists of indices into the selector
 * list associated with ruleMatch. The indices correspond to the selectors in the rule
 * associated with the key's highlight name.
 */
function customHighlightNamesToMatchingSelectorIndices(ruleMatch: Protocol.CSS.RuleMatch): Map<string, number[]> {
  const highlightNamesToMatchingSelectors = new Map<string, number[]>();

  for (let i = 0; i < ruleMatch.matchingSelectors.length; i++) {
    const matchingSelectorIndex = ruleMatch.matchingSelectors[i];
    const selectorText = ruleMatch.rule.selectorList.selectors[matchingSelectorIndex].text;
    const highlightNameMatch = selectorText.match(/::highlight\((.*)\)/);
    if (highlightNameMatch) {
      const highlightName = highlightNameMatch[1];
      const selectorsForName = highlightNamesToMatchingSelectors.get(highlightName);
      if (selectorsForName) {
        selectorsForName.push(matchingSelectorIndex);
      } else {
        highlightNamesToMatchingSelectors.set(highlightName, [matchingSelectorIndex]);
      }
    }
  }
  return highlightNamesToMatchingSelectors;
}

function queryMatches(style: CSSStyleDeclaration): boolean {
  if (!style.parentRule) {
    return true;
  }
  const parentRule = style.parentRule as CSSStyleRule;
  const queries = [...parentRule.media, ...parentRule.containerQueries, ...parentRule.supports, ...parentRule.scopes];
  for (const query of queries) {
    if (!query.active()) {
      return false;
    }
  }
  return true;
}

interface CSSMatchedStylesPayload {
  cssModel: CSSModel;
  node: DOMNode;
  inlinePayload: Protocol.CSS.CSSStyle|null;
  attributesPayload: Protocol.CSS.CSSStyle|null;
  matchedPayload: Protocol.CSS.RuleMatch[];
  pseudoPayload: Protocol.CSS.PseudoElementMatches[];
  inheritedPayload: Protocol.CSS.InheritedStyleEntry[];
  inheritedPseudoPayload: Protocol.CSS.InheritedPseudoElementMatches[];
  animationsPayload: Protocol.CSS.CSSKeyframesRule[];
  parentLayoutNodeId: Protocol.DOM.NodeId|undefined;
  positionFallbackRules: Protocol.CSS.CSSPositionFallbackRule[];
  propertyRules: Protocol.CSS.CSSPropertyRule[];
  cssPropertyRegistrations: Protocol.CSS.CSSPropertyRegistration[];
}

export class CSSRegisteredProperty {
  #registration: Protocol.CSS.CSSPropertyRegistration|CSSPropertyRule;
  #cssModel: CSSModel;
  #style: CSSStyleDeclaration|undefined;
  constructor(cssModel: CSSModel, registration: CSSPropertyRule|Protocol.CSS.CSSPropertyRegistration) {
    this.#cssModel = cssModel;
    this.#registration = registration;
  }

  isAtProperty(): boolean {
    return this.#registration instanceof CSSPropertyRule;
  }

  propertyName(): string {
    return this.#registration instanceof CSSPropertyRule ? this.#registration.propertyName().text :
                                                           this.#registration.propertyName;
  }

  initialValue(): string|null {
    return this.#registration instanceof CSSPropertyRule ? this.#registration.initialValue() :
                                                           this.#registration.initialValue?.text ?? null;
  }

  inherits(): boolean {
    return this.#registration instanceof CSSPropertyRule ? this.#registration.inherits() : this.#registration.inherits;
  }

  syntax(): string {
    return this.#registration instanceof CSSPropertyRule ? this.#registration.syntax() :
                                                           `"${this.#registration.syntax}"`;
  }

  #asCSSProperties(): Protocol.CSS.CSSProperty[] {
    if (this.#registration instanceof CSSPropertyRule) {
      return [];
    }
    const {inherits, initialValue, syntax} = this.#registration;
    const properties = [
      {name: 'inherits', value: `${inherits}`},
      {name: 'syntax', value: `"${syntax}"`},
    ];
    if (initialValue !== undefined) {
      properties.push({name: 'initial-value', value: initialValue.text});
    }
    return properties;
  }

  style(): CSSStyleDeclaration {
    if (!this.#style) {
      this.#style = this.#registration instanceof CSSPropertyRule ?
          this.#registration.style :
          new CSSStyleDeclaration(
              this.#cssModel, null, {cssProperties: this.#asCSSProperties(), shorthandEntries: []}, Type.Pseudo);
    }
    return this.#style;
  }
}

export class CSSMatchedStyles {
  #cssModelInternal: CSSModel;
  #nodeInternal: DOMNode;
  #addedStyles: Map<CSSStyleDeclaration, DOMNode>;
  #matchingSelectors: Map<number, Map<string, boolean>>;
  #keyframesInternal: CSSKeyframesRule[];
  #registeredProperties: CSSRegisteredProperty[];
  #registeredPropertyMap = new Map<string, CSSRegisteredProperty>();
  #nodeForStyleInternal: Map<CSSStyleDeclaration, DOMNode|null>;
  #inheritedStyles: Set<CSSStyleDeclaration>;
  #styleToDOMCascade: Map<CSSStyleDeclaration, DOMInheritanceCascade>;
  #parentLayoutNodeId: Protocol.DOM.NodeId|undefined;
  #positionFallbackRules: CSSPositionFallbackRule[];
  #mainDOMCascade?: DOMInheritanceCascade;
  #pseudoDOMCascades?: Map<Protocol.DOM.PseudoType, DOMInheritanceCascade>;
  #customHighlightPseudoDOMCascades?: Map<string, DOMInheritanceCascade>;

  static async create(payload: CSSMatchedStylesPayload): Promise<CSSMatchedStyles> {
    const cssMatchedStyles = new CSSMatchedStyles(payload);
    await cssMatchedStyles.init(payload);
    return cssMatchedStyles;
  }

  private constructor({
    cssModel,
    node,
    animationsPayload,
    parentLayoutNodeId,
    positionFallbackRules,
    propertyRules,
    cssPropertyRegistrations,
  }: CSSMatchedStylesPayload) {
    this.#cssModelInternal = cssModel;
    this.#nodeInternal = node;
    this.#addedStyles = new Map();
    this.#matchingSelectors = new Map();
    this.#registeredProperties = [
      ...propertyRules.map(rule => new CSSPropertyRule(cssModel, rule)),
      ...cssPropertyRegistrations,
    ].map(r => new CSSRegisteredProperty(cssModel, r));
    this.#keyframesInternal = [];
    if (animationsPayload) {
      this.#keyframesInternal = animationsPayload.map(rule => new CSSKeyframesRule(cssModel, rule));
    }
    this.#positionFallbackRules = positionFallbackRules.map(rule => new CSSPositionFallbackRule(cssModel, rule));
    this.#parentLayoutNodeId = parentLayoutNodeId;

    this.#nodeForStyleInternal = new Map();
    this.#inheritedStyles = new Set();
    this.#styleToDOMCascade = new Map();
    this.#registeredPropertyMap = new Map();
  }

  private async init({
    matchedPayload,
    inheritedPayload,
    inlinePayload,
    attributesPayload,
    pseudoPayload,
    inheritedPseudoPayload,
  }: CSSMatchedStylesPayload): Promise<void> {
    matchedPayload = cleanUserAgentPayload(matchedPayload);
    for (const inheritedResult of inheritedPayload) {
      inheritedResult.matchedCSSRules = cleanUserAgentPayload(inheritedResult.matchedCSSRules);
    }

    this.#mainDOMCascade =
        await this.buildMainCascade(inlinePayload, attributesPayload, matchedPayload, inheritedPayload);
    [this.#pseudoDOMCascades, this.#customHighlightPseudoDOMCascades] =
        this.buildPseudoCascades(pseudoPayload, inheritedPseudoPayload);

    for (const domCascade of Array.from(this.#customHighlightPseudoDOMCascades.values())
             .concat(Array.from(this.#pseudoDOMCascades.values()))
             .concat(this.#mainDOMCascade)) {
      for (const style of domCascade.styles()) {
        this.#styleToDOMCascade.set(style, domCascade);
      }
    }

    for (const prop of this.#registeredProperties) {
      this.#registeredPropertyMap.set(prop.propertyName(), prop);
    }
  }

  private async buildMainCascade(
      inlinePayload: Protocol.CSS.CSSStyle|null, attributesPayload: Protocol.CSS.CSSStyle|null,
      matchedPayload: Protocol.CSS.RuleMatch[],
      inheritedPayload: Protocol.CSS.InheritedStyleEntry[]): Promise<DOMInheritanceCascade> {
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
    const traverseParentInFlatTree = async(node: DOMNode): Promise<DOMNode|null> => {
      if (node.hasAssignedSlot()) {
        return await node.assignedSlot?.deferredNode.resolvePromise() ?? null;
      }

      return node.parentNode;
    };

    for (let i = 0; parentNode && inheritedPayload && i < inheritedPayload.length; ++i) {
      const inheritedStyles = [];
      const entryPayload = inheritedPayload[i];
      const inheritedInlineStyle = entryPayload.inlineStyle ?
          new CSSStyleDeclaration(this.#cssModelInternal, null, entryPayload.inlineStyle, Type.Inline) :
          null;
      if (inheritedInlineStyle && containsInherited(inheritedInlineStyle)) {
        this.#nodeForStyleInternal.set(inheritedInlineStyle, parentNode);
        inheritedStyles.push(inheritedInlineStyle);
        this.#inheritedStyles.add(inheritedInlineStyle);
      }

      const inheritedMatchedCSSRules = entryPayload.matchedCSSRules || [];
      for (let j = inheritedMatchedCSSRules.length - 1; j >= 0; --j) {
        const inheritedRule = new CSSStyleRule(this.#cssModelInternal, inheritedMatchedCSSRules[j].rule);
        this.addMatchingSelectors(parentNode, inheritedRule, inheritedMatchedCSSRules[j].matchingSelectors);
        if (!containsInherited(inheritedRule.style)) {
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
      parentNode = await traverseParentInFlatTree(parentNode);
      nodeCascades.push(new NodeCascade(this, inheritedStyles, true /* #isInherited */));
    }

    return new DOMInheritanceCascade(nodeCascades, this.#registeredProperties);
  }

  /**
   * Pseudo rule matches received via the inspector protocol are grouped by pseudo type.
   * For custom highlight pseudos, we need to instead group the rule matches by highlight
   * name in order to produce separate cascades for each highlight name. This is necessary
   * so that styles of ::highlight(foo) are not shown as overriding styles of ::highlight(bar).
   *
   * This helper function takes a list of rule matches and generates separate NodeCascades
   * for each custom highlight name that was matched.
   */
  private buildSplitCustomHighlightCascades(
      rules: Protocol.CSS.RuleMatch[], node: DOMNode, isInherited: boolean,
      pseudoCascades: Map<string, NodeCascade[]>): void {
    const splitHighlightRules = new Map<string, CSSStyleDeclaration[]>();

    for (let j = rules.length - 1; j >= 0; --j) {
      const highlightNamesToMatchingSelectorIndices = customHighlightNamesToMatchingSelectorIndices(rules[j]);

      for (const [highlightName, matchingSelectors] of highlightNamesToMatchingSelectorIndices) {
        const pseudoRule = new CSSStyleRule(this.#cssModelInternal, rules[j].rule);
        this.#nodeForStyleInternal.set(pseudoRule.style, node);
        if (isInherited) {
          this.#inheritedStyles.add(pseudoRule.style);
        }
        this.addMatchingSelectors(node, pseudoRule, matchingSelectors);

        const ruleListForHighlightName = splitHighlightRules.get(highlightName);
        if (ruleListForHighlightName) {
          ruleListForHighlightName.push(pseudoRule.style);
        } else {
          splitHighlightRules.set(highlightName, [pseudoRule.style]);
        }
      }
    }

    for (const [highlightName, highlightStyles] of splitHighlightRules) {
      const nodeCascade = new NodeCascade(this, highlightStyles, isInherited, true /* #isHighlightPseudoCascade*/);
      const cascadeListForHighlightName = pseudoCascades.get(highlightName);
      if (cascadeListForHighlightName) {
        cascadeListForHighlightName.push(nodeCascade);
      } else {
        pseudoCascades.set(highlightName, [nodeCascade]);
      }
    }
  }

  private buildPseudoCascades(
      pseudoPayload: Protocol.CSS.PseudoElementMatches[],
      inheritedPseudoPayload: Protocol.CSS.InheritedPseudoElementMatches[]):
      [Map<Protocol.DOM.PseudoType, DOMInheritanceCascade>, Map<string, DOMInheritanceCascade>] {
    const pseudoInheritanceCascades = new Map<Protocol.DOM.PseudoType, DOMInheritanceCascade>();
    const customHighlightPseudoInheritanceCascades = new Map<string, DOMInheritanceCascade>();
    if (!pseudoPayload) {
      return [pseudoInheritanceCascades, customHighlightPseudoInheritanceCascades];
    }

    const pseudoCascades = new Map<Protocol.DOM.PseudoType, NodeCascade[]>();
    const customHighlightPseudoCascades = new Map<string, NodeCascade[]>();
    for (let i = 0; i < pseudoPayload.length; ++i) {
      const entryPayload = pseudoPayload[i];
      // PseudoElement nodes are not created unless "content" css property is set.
      const pseudoElement = this.#nodeInternal.pseudoElements().get(entryPayload.pseudoType)?.at(-1) || null;
      const pseudoStyles = [];
      const rules = entryPayload.matches || [];

      if (entryPayload.pseudoType === Protocol.DOM.PseudoType.Highlight) {
        this.buildSplitCustomHighlightCascades(
            rules, this.#nodeInternal, false /* #isInherited */, customHighlightPseudoCascades);
      } else {
        for (let j = rules.length - 1; j >= 0; --j) {
          const pseudoRule = new CSSStyleRule(this.#cssModelInternal, rules[j].rule);
          pseudoStyles.push(pseudoRule.style);
          const nodeForStyle =
              cssMetadata().isHighlightPseudoType(entryPayload.pseudoType) ? this.#nodeInternal : pseudoElement;
          this.#nodeForStyleInternal.set(pseudoRule.style, nodeForStyle);
          if (nodeForStyle) {
            this.addMatchingSelectors(nodeForStyle, pseudoRule, rules[j].matchingSelectors);
          }
        }
        const isHighlightPseudoCascade = cssMetadata().isHighlightPseudoType(entryPayload.pseudoType);
        const nodeCascade = new NodeCascade(
            this, pseudoStyles, false /* #isInherited */, isHighlightPseudoCascade /* #isHighlightPseudoCascade*/);
        pseudoCascades.set(entryPayload.pseudoType, [nodeCascade]);
      }
    }

    if (inheritedPseudoPayload) {
      let parentNode: (DOMNode|null) = this.#nodeInternal.parentNode;
      for (let i = 0; parentNode && i < inheritedPseudoPayload.length; ++i) {
        const inheritedPseudoMatches = inheritedPseudoPayload[i].pseudoElements;
        for (let j = 0; j < inheritedPseudoMatches.length; ++j) {
          const inheritedEntryPayload = inheritedPseudoMatches[j];
          const rules = inheritedEntryPayload.matches || [];

          if (inheritedEntryPayload.pseudoType === Protocol.DOM.PseudoType.Highlight) {
            this.buildSplitCustomHighlightCascades(
                rules, parentNode, true /* #isInherited */, customHighlightPseudoCascades);
          } else {
            const pseudoStyles = [];
            for (let k = rules.length - 1; k >= 0; --k) {
              const pseudoRule = new CSSStyleRule(this.#cssModelInternal, rules[k].rule);
              pseudoStyles.push(pseudoRule.style);
              this.#nodeForStyleInternal.set(pseudoRule.style, parentNode);
              this.#inheritedStyles.add(pseudoRule.style);
              this.addMatchingSelectors(parentNode, pseudoRule, rules[k].matchingSelectors);
            }

            const isHighlightPseudoCascade = cssMetadata().isHighlightPseudoType(inheritedEntryPayload.pseudoType);
            const nodeCascade = new NodeCascade(
                this, pseudoStyles, true /* #isInherited */, isHighlightPseudoCascade /* #isHighlightPseudoCascade*/);
            const cascadeListForPseudoType = pseudoCascades.get(inheritedEntryPayload.pseudoType);
            if (cascadeListForPseudoType) {
              cascadeListForPseudoType.push(nodeCascade);
            } else {
              pseudoCascades.set(inheritedEntryPayload.pseudoType, [nodeCascade]);
            }
          }
        }

        parentNode = parentNode.parentNode;
      }
    }

    // Now that we've built the arrays of NodeCascades for each pseudo type, convert them into
    // DOMInheritanceCascades.
    for (const [pseudoType, nodeCascade] of pseudoCascades.entries()) {
      pseudoInheritanceCascades.set(pseudoType, new DOMInheritanceCascade(nodeCascade, this.#registeredProperties));
    }

    for (const [highlightName, nodeCascade] of customHighlightPseudoCascades.entries()) {
      customHighlightPseudoInheritanceCascades.set(
          highlightName, new DOMInheritanceCascade(nodeCascade, this.#registeredProperties));
    }

    return [pseudoInheritanceCascades, customHighlightPseudoInheritanceCascades];
  }

  private addMatchingSelectors(
      this: CSSMatchedStyles, node: DOMNode, rule: CSSStyleRule, matchingSelectorIndices: number[]): void {
    for (const matchingSelectorIndex of matchingSelectorIndices) {
      const selector = rule.selectors[matchingSelectorIndex];
      if (selector) {
        this.setSelectorMatches(node, selector.text, true);
      }
    }
  }

  node(): DOMNode {
    return this.#nodeInternal;
  }

  cssModel(): CSSModel {
    return this.#cssModelInternal;
  }

  hasMatchingSelectors(rule: CSSStyleRule): boolean {
    return this.getMatchingSelectors(rule).length > 0 && queryMatches(rule.style);
  }

  getParentLayoutNodeId(): Protocol.DOM.NodeId|undefined {
    return this.#parentLayoutNodeId;
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

  nodeStyles(): CSSStyleDeclaration[] {
    Platform.assertNotNullOrUndefined(this.#mainDOMCascade);
    return this.#mainDOMCascade.styles();
  }

  registeredProperties(): CSSRegisteredProperty[] {
    return this.#registeredProperties;
  }

  getRegisteredProperty(name: string): CSSRegisteredProperty|undefined {
    return this.#registeredPropertyMap.get(name);
  }

  keyframes(): CSSKeyframesRule[] {
    return this.#keyframesInternal;
  }

  positionFallbackRules(): CSSPositionFallbackRule[] {
    return this.#positionFallbackRules;
  }

  pseudoStyles(pseudoType: Protocol.DOM.PseudoType): CSSStyleDeclaration[] {
    Platform.assertNotNullOrUndefined(this.#pseudoDOMCascades);
    const domCascade = this.#pseudoDOMCascades.get(pseudoType);
    return domCascade ? domCascade.styles() : [];
  }

  pseudoTypes(): Set<Protocol.DOM.PseudoType> {
    Platform.assertNotNullOrUndefined(this.#pseudoDOMCascades);
    return new Set(this.#pseudoDOMCascades.keys());
  }

  customHighlightPseudoStyles(highlightName: string): CSSStyleDeclaration[] {
    Platform.assertNotNullOrUndefined(this.#customHighlightPseudoDOMCascades);
    const domCascade = this.#customHighlightPseudoDOMCascades.get(highlightName);
    return domCascade ? domCascade.styles() : [];
  }

  customHighlightPseudoNames(): Set<string> {
    Platform.assertNotNullOrUndefined(this.#customHighlightPseudoDOMCascades);
    return new Set(this.#customHighlightPseudoDOMCascades.keys());
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
    return domCascade ? domCascade.computeSingleVariableValue(style, cssVariableValue) : null;
  }

  isInherited(style: CSSStyleDeclaration): boolean {
    return this.#inheritedStyles.has(style);
  }

  propertyState(property: CSSProperty): PropertyState|null {
    const domCascade = this.#styleToDOMCascade.get(property.ownerStyle);
    return domCascade ? domCascade.propertyState(property) : null;
  }

  resetActiveProperties(): void {
    Platform.assertNotNullOrUndefined(this.#mainDOMCascade);
    Platform.assertNotNullOrUndefined(this.#pseudoDOMCascades);
    Platform.assertNotNullOrUndefined(this.#customHighlightPseudoDOMCascades);
    this.#mainDOMCascade.reset();
    for (const domCascade of this.#pseudoDOMCascades.values()) {
      domCascade.reset();
    }

    for (const domCascade of this.#customHighlightPseudoDOMCascades.values()) {
      domCascade.reset();
    }
  }
}

class NodeCascade {
  #matchedStyles: CSSMatchedStyles;
  readonly styles: CSSStyleDeclaration[];
  readonly #isInherited: boolean;
  readonly #isHighlightPseudoCascade: boolean;
  readonly propertiesState: Map<CSSProperty, PropertyState>;
  readonly activeProperties: Map<string, CSSProperty>;
  constructor(
      matchedStyles: CSSMatchedStyles, styles: CSSStyleDeclaration[], isInherited: boolean,
      isHighlightPseudoCascade: boolean = false) {
    this.#matchedStyles = matchedStyles;
    this.styles = styles;
    this.#isInherited = isInherited;
    this.#isHighlightPseudoCascade = isHighlightPseudoCascade;
    this.propertiesState = new Map();
    this.activeProperties = new Map();
  }

  computeActiveProperties(): void {
    this.propertiesState.clear();
    this.activeProperties.clear();

    for (let i = this.styles.length - 1; i >= 0; i--) {
      const style = this.styles[i];
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

        // All properties are inherited for highlight pseudos.
        if (this.#isInherited && !this.#isHighlightPseudoCascade && !metadata.isPropertyInherited(property.name)) {
          continue;
        }

        // When a property does not have a range in an otherwise ranged CSSStyleDeclaration,
        // we consider it as a non-leading property (see computeLeadingProperties()), and most
        // of them are computed longhands. We exclude these from activeProperties calculation,
        // and use parsed longhands instead (see below).
        if (style.range && !property.range) {
          continue;
        }

        if (!property.activeInStyle()) {
          this.propertiesState.set(property, PropertyState.Overloaded);
          continue;
        }

        // If the custom property was registered with `inherits: false;`, inherited properties are invalid.
        if (this.#isInherited) {
          const registration = this.#matchedStyles.getRegisteredProperty(property.name);
          if (registration && !registration.inherits()) {
            this.propertiesState.set(property, PropertyState.Overloaded);
            continue;
          }
        }

        const canonicalName = metadata.canonicalPropertyName(property.name);
        this.updatePropertyState(property, canonicalName);
        for (const longhand of property.getLonghandProperties()) {
          if (metadata.isCSSPropertyName(longhand.name)) {
            this.updatePropertyState(longhand, longhand.name);
          }
        }
      }
    }
  }

  private updatePropertyState(propertyWithHigherSpecificity: CSSProperty, canonicalName: string): void {
    const activeProperty = this.activeProperties.get(canonicalName);
    if (activeProperty?.important && !propertyWithHigherSpecificity.important) {
      this.propertiesState.set(propertyWithHigherSpecificity, PropertyState.Overloaded);
      return;
    }

    if (activeProperty) {
      this.propertiesState.set(activeProperty, PropertyState.Overloaded);
    }
    this.propertiesState.set(propertyWithHigherSpecificity, PropertyState.Active);
    this.activeProperties.set(canonicalName, propertyWithHigherSpecificity);
  }
}

class DOMInheritanceCascade {
  readonly #nodeCascades: NodeCascade[];
  readonly #propertiesState: Map<CSSProperty, PropertyState>;
  readonly #availableCSSVariables: Map<NodeCascade, Map<string, string|null>>;
  readonly #computedCSSVariables: Map<NodeCascade, Map<string, string|null>>;
  #initialized: boolean;
  readonly #styleToNodeCascade: Map<CSSStyleDeclaration, NodeCascade>;
  #registeredProperties: CSSRegisteredProperty[];
  constructor(nodeCascades: NodeCascade[], registeredProperties: CSSRegisteredProperty[]) {
    this.#nodeCascades = nodeCascades;
    this.#propertiesState = new Map();
    this.#availableCSSVariables = new Map();
    this.#computedCSSVariables = new Map();
    this.#initialized = false;
    this.#registeredProperties = registeredProperties;

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
    const {variableName} = parseCSSVariableNameAndFallback(cssVariableValue);

    return {computedValue, fromFallback: variableName !== null && !availableCSSVariables.has(variableName)};
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
      const {variableName, fallback} = parseCSSVariableNameAndFallback(result.value);
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
      for (const [property, state] of nodeCascade.propertiesState) {
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
    for (const [canonicalName, shorthandProperty] of activeProperties) {
      const shorthandStyle = shorthandProperty.ownerStyle;
      const longhands = shorthandProperty.getLonghandProperties();
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
    this.#registeredProperties.forEach(rule => accumulatedCSSVariables.set(rule.propertyName(), rule.initialValue()));
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
