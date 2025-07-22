// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Platform from '../platform/platform.js';

import {CSSContainerQuery} from './CSSContainerQuery.js';
import {CSSLayer} from './CSSLayer.js';
import {CSSMedia} from './CSSMedia.js';
import type {CSSModel, Edit} from './CSSModel.js';
import {CSSScope} from './CSSScope.js';
import {CSSStyleDeclaration, Type} from './CSSStyleDeclaration.js';
import type {CSSStyleSheetHeader} from './CSSStyleSheetHeader.js';
import {CSSSupports} from './CSSSupports.js';

function styleSheetHeaderForRule(
    cssModel: CSSModel, {styleSheetId}: {styleSheetId?: Protocol.CSS.StyleSheetId}): CSSStyleSheetHeader|null {
  return styleSheetId && cssModel.styleSheetHeaderForId(styleSheetId) || null;
}

export class CSSRule {
  readonly cssModelInternal: CSSModel;
  readonly origin: Protocol.CSS.StyleSheetOrigin;
  readonly style: CSSStyleDeclaration;
  readonly header: CSSStyleSheetHeader|null;

  constructor(cssModel: CSSModel, payload: {
    style: Protocol.CSS.CSSStyle,
    origin: Protocol.CSS.StyleSheetOrigin,
    header: CSSStyleSheetHeader|null,
  }) {
    this.header = payload.header;
    this.cssModelInternal = cssModel;
    this.origin = payload.origin;
    this.style = new CSSStyleDeclaration(this.cssModelInternal, this, payload.style, Type.Regular);
  }

  get sourceURL(): string|undefined {
    return this.header?.sourceURL;
  }

  rebase(edit: Edit): void {
    if (this.header?.id !== edit.styleSheetId) {
      return;
    }
    this.style.rebase(edit);
  }

  resourceURL(): Platform.DevToolsPath.UrlString {
    return this.header?.resourceURL() ?? Platform.DevToolsPath.EmptyUrlString;
  }

  isUserAgent(): boolean {
    return this.origin === Protocol.CSS.StyleSheetOrigin.UserAgent;
  }

  isInjected(): boolean {
    return this.origin === Protocol.CSS.StyleSheetOrigin.Injected;
  }

  isViaInspector(): boolean {
    return this.origin === Protocol.CSS.StyleSheetOrigin.Inspector;
  }

  isRegular(): boolean {
    return this.origin === Protocol.CSS.StyleSheetOrigin.Regular;
  }

  isKeyframeRule(): boolean {
    return false;
  }

  cssModel(): CSSModel {
    return this.cssModelInternal;
  }
}

class CSSValue {
  text: string;
  range?: TextUtils.TextRange.TextRange;
  specificity?: Protocol.CSS.Specificity;
  constructor(payload: Protocol.CSS.Value) {
    this.text = payload.text;
    if (payload.range) {
      this.range = TextUtils.TextRange.TextRange.fromObject(payload.range);
    }
    if (payload.specificity) {
      this.specificity = payload.specificity;
    }
  }

  rebase(edit: Edit): void {
    if (!this.range) {
      return;
    }
    this.range = this.range.rebaseAfterTextEdit(edit.oldRange, edit.newRange);
  }
}

export class CSSStyleRule extends CSSRule {
  selectors!: CSSValue[];
  nestingSelectors?: string[];
  media: CSSMedia[];
  containerQueries: CSSContainerQuery[];
  supports: CSSSupports[];
  scopes: CSSScope[];
  layers: CSSLayer[];
  ruleTypes: Protocol.CSS.CSSRuleType[];
  wasUsed: boolean;
  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSRule, wasUsed?: boolean) {
    super(cssModel, {origin: payload.origin, style: payload.style, header: styleSheetHeaderForRule(cssModel, payload)});
    this.reinitializeSelectors(payload.selectorList);
    this.nestingSelectors = payload.nestingSelectors;
    this.media = payload.media ? CSSMedia.parseMediaArrayPayload(cssModel, payload.media) : [];
    this.containerQueries = payload.containerQueries ?
        CSSContainerQuery.parseContainerQueriesPayload(cssModel, payload.containerQueries) :
        [];
    this.scopes = payload.scopes ? CSSScope.parseScopesPayload(cssModel, payload.scopes) : [];
    this.supports = payload.supports ? CSSSupports.parseSupportsPayload(cssModel, payload.supports) : [];
    this.layers = payload.layers ? CSSLayer.parseLayerPayload(cssModel, payload.layers) : [];
    this.ruleTypes = payload.ruleTypes || [];
    this.wasUsed = wasUsed || false;
  }

  static createDummyRule(cssModel: CSSModel, selectorText: string): CSSStyleRule {
    const dummyPayload = {
      selectorList: {
        text: '',
        selectors: [{text: selectorText, value: undefined}],
      },
      style: {
        styleSheetId: '0' as Protocol.CSS.StyleSheetId,
        range: new TextUtils.TextRange.TextRange(0, 0, 0, 0),
        shorthandEntries: [],
        cssProperties: [],
      },
      origin: Protocol.CSS.StyleSheetOrigin.Inspector,
    };
    return new CSSStyleRule(cssModel, (dummyPayload as Protocol.CSS.CSSRule));
  }

  private reinitializeSelectors(selectorList: Protocol.CSS.SelectorList): void {
    this.selectors = [];
    for (let i = 0; i < selectorList.selectors.length; ++i) {
      this.selectors.push(new CSSValue(selectorList.selectors[i]));
    }
  }

  setSelectorText(newSelector: string): Promise<boolean> {
    const styleSheetId = this.header?.id;
    if (!styleSheetId) {
      throw new Error('No rule stylesheet id');
    }
    const range = this.selectorRange();
    if (!range) {
      throw new Error('Rule selector is not editable');
    }
    return this.cssModelInternal.setSelectorText(styleSheetId, range, newSelector);
  }

  selectorText(): string {
    return this.selectors.map(selector => selector.text).join(', ');
  }

  selectorRange(): TextUtils.TextRange.TextRange|null {
    // Nested group rules might not contain a selector.
    // https://www.w3.org/TR/css-nesting-1/#conditionals
    if (this.selectors.length === 0) {
      return null;
    }

    const firstRange = this.selectors[0].range;
    const lastRange = this.selectors[this.selectors.length - 1].range;
    if (!firstRange || !lastRange) {
      return null;
    }
    return new TextUtils.TextRange.TextRange(
        firstRange.startLine, firstRange.startColumn, lastRange.endLine, lastRange.endColumn);
  }

  lineNumberInSource(selectorIndex: number): number {
    const selector = this.selectors[selectorIndex];
    if (!selector?.range || !this.header) {
      return 0;
    }
    return this.header.lineNumberInSource(selector.range.startLine);
  }

  columnNumberInSource(selectorIndex: number): number|undefined {
    const selector = this.selectors[selectorIndex];
    if (!selector?.range || !this.header) {
      return undefined;
    }
    return this.header.columnNumberInSource(selector.range.startLine, selector.range.startColumn);
  }

  override rebase(edit: Edit): void {
    if (this.header?.id !== edit.styleSheetId) {
      return;
    }
    const range = this.selectorRange();
    if (range?.equal(edit.oldRange)) {
      this.reinitializeSelectors((edit.payload as Protocol.CSS.SelectorList));
    } else {
      for (let i = 0; i < this.selectors.length; ++i) {
        this.selectors[i].rebase(edit);
      }
    }
    this.media.forEach(media => media.rebase(edit));
    this.containerQueries.forEach(cq => cq.rebase(edit));
    this.scopes.forEach(scope => scope.rebase(edit));
    this.supports.forEach(supports => supports.rebase(edit));

    super.rebase(edit);
  }
}

export class CSSPropertyRule extends CSSRule {
  #name: CSSValue;
  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSPropertyRule) {
    super(cssModel, {origin: payload.origin, style: payload.style, header: styleSheetHeaderForRule(cssModel, payload)});
    this.#name = new CSSValue(payload.propertyName);
  }

  propertyName(): CSSValue {
    return this.#name;
  }

  initialValue(): string|null {
    return this.style.hasActiveProperty('initial-value') ? this.style.getPropertyValue('initial-value') : null;
  }

  syntax(): string {
    return this.style.getPropertyValue('syntax');
  }
  inherits(): boolean {
    return this.style.getPropertyValue('inherits') === 'true';
  }
  setPropertyName(newPropertyName: string): Promise<boolean> {
    const styleSheetId = this.header?.id;
    if (!styleSheetId) {
      throw new Error('No rule stylesheet id');
    }
    const range = this.#name.range;
    if (!range) {
      throw new Error('Property name is not editable');
    }
    return this.cssModelInternal.setPropertyRulePropertyName(styleSheetId, range, newPropertyName);
  }
}

export class CSSFontPaletteValuesRule extends CSSRule {
  readonly #paletteName: CSSValue;
  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSFontPaletteValuesRule) {
    super(cssModel, {origin: payload.origin, style: payload.style, header: styleSheetHeaderForRule(cssModel, payload)});
    this.#paletteName = new CSSValue(payload.fontPaletteName);
  }

  name(): CSSValue {
    return this.#paletteName;
  }
}

export class CSSKeyframesRule {
  readonly #animationName: CSSValue;
  readonly #keyframesInternal: CSSKeyframeRule[];
  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSKeyframesRule) {
    this.#animationName = new CSSValue(payload.animationName);
    this.#keyframesInternal =
        payload.keyframes.map(keyframeRule => new CSSKeyframeRule(cssModel, keyframeRule, this.#animationName.text));
  }

  name(): CSSValue {
    return this.#animationName;
  }

  keyframes(): CSSKeyframeRule[] {
    return this.#keyframesInternal;
  }
}

export class CSSKeyframeRule extends CSSRule {
  #keyText!: CSSValue;
  #parentRuleName: string;
  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSKeyframeRule, parentRuleName: string) {
    super(cssModel, {origin: payload.origin, style: payload.style, header: styleSheetHeaderForRule(cssModel, payload)});
    this.reinitializeKey(payload.keyText);
    this.#parentRuleName = parentRuleName;
  }

  parentRuleName(): string {
    return this.#parentRuleName;
  }

  key(): CSSValue {
    return this.#keyText;
  }

  private reinitializeKey(payload: Protocol.CSS.Value): void {
    this.#keyText = new CSSValue(payload);
  }

  override rebase(edit: Edit): void {
    if (this.header?.id !== edit.styleSheetId || !this.#keyText.range) {
      return;
    }
    if (edit.oldRange.equal(this.#keyText.range)) {
      this.reinitializeKey((edit.payload as Protocol.CSS.Value));
    } else {
      this.#keyText.rebase(edit);
    }

    super.rebase(edit);
  }

  override isKeyframeRule(): boolean {
    return true;
  }

  setKeyText(newKeyText: string): Promise<boolean> {
    const styleSheetId = this.header?.id;
    if (!styleSheetId) {
      throw new Error('No rule stylesheet id');
    }
    const range = this.#keyText.range;
    if (!range) {
      throw new Error('Keyframe key is not editable');
    }
    return this.cssModelInternal.setKeyframeKey(styleSheetId, range, newKeyText);
  }
}

export class CSSPositionTryRule extends CSSRule {
  readonly #name: CSSValue;
  readonly #active: boolean;
  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSPositionTryRule) {
    super(cssModel, {origin: payload.origin, style: payload.style, header: styleSheetHeaderForRule(cssModel, payload)});
    this.#name = new CSSValue(payload.name);
    this.#active = payload.active;
  }

  name(): CSSValue {
    return this.#name;
  }

  active(): boolean {
    return this.#active;
  }
}

export interface CSSNestedStyleLeaf {
  style: CSSStyleDeclaration;
}

export type CSSNestedStyleCondition = {
  children: CSSNestedStyle[],
}&({media: CSSMedia}|{container: CSSContainerQuery}|{supports: CSSSupports});

export type CSSNestedStyle = CSSNestedStyleLeaf|CSSNestedStyleCondition;

export class CSSFunctionRule extends CSSRule {
  readonly #name: CSSValue;
  readonly #parameters: string[];
  readonly #children: CSSNestedStyle[];
  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSFunctionRule) {
    super(cssModel, {
      origin: payload.origin,
      style: {cssProperties: [], shorthandEntries: []},
      header: styleSheetHeaderForRule(cssModel, payload)
    });
    this.#name = new CSSValue(payload.name);
    this.#parameters = payload.parameters.map(({name}) => name);
    this.#children = this.protocolNodesToNestedStyles(payload.children);
  }

  functionName(): CSSValue {
    return this.#name;
  }

  parameters(): string[] {
    return this.#parameters;
  }

  children(): CSSNestedStyle[] {
    return this.#children;
  }

  nameWithParameters(): string {
    return `${this.functionName().text}(${this.parameters().join(', ')})`;
  }

  protocolNodesToNestedStyles(nodes: Protocol.CSS.CSSFunctionNode[]): CSSNestedStyle[] {
    const result = [];
    for (const node of nodes) {
      const nestedStyle = this.protocolNodeToNestedStyle(node);
      if (nestedStyle) {
        result.push(nestedStyle);
      }
    }
    return result;
  }

  protocolNodeToNestedStyle(node: Protocol.CSS.CSSFunctionNode): CSSNestedStyle|undefined {
    if (node.style) {
      return {style: new CSSStyleDeclaration(this.cssModelInternal, this, node.style, Type.Regular)};
    }
    if (node.condition) {
      const children = this.protocolNodesToNestedStyles(node.condition.children);
      if (node.condition.media) {
        return {children, media: new CSSMedia(this.cssModelInternal, node.condition.media)};
      }
      if (node.condition.containerQueries) {
        return {
          children,
          container: new CSSContainerQuery(this.cssModelInternal, node.condition.containerQueries),
        };
      }
      if (node.condition.supports) {
        return {
          children,
          supports: new CSSSupports(this.cssModelInternal, node.condition.supports),
        };
      }
      console.error('A function rule condition must have a media, container, or supports');
      return;
    }
    console.error('A function rule node must have a style or condition');
    return;
  }
}
