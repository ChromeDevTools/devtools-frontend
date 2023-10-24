// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Platform from '../platform/platform.js';

import {CSSContainerQuery} from './CSSContainerQuery.js';
import {CSSLayer} from './CSSLayer.js';
import {CSSMedia} from './CSSMedia.js';
import {type CSSModel, type Edit} from './CSSModel.js';
import {CSSScope} from './CSSScope.js';
import {CSSStyleDeclaration, Type} from './CSSStyleDeclaration.js';
import {type CSSStyleSheetHeader} from './CSSStyleSheetHeader.js';
import {CSSSupports} from './CSSSupports.js';

export class CSSRule {
  readonly cssModelInternal: CSSModel;
  styleSheetId: Protocol.CSS.StyleSheetId|undefined;
  sourceURL: string|undefined;
  origin: Protocol.CSS.StyleSheetOrigin;
  style: CSSStyleDeclaration;

  constructor(cssModel: CSSModel, payload: {
    style: Protocol.CSS.CSSStyle,
    styleSheetId: Protocol.CSS.StyleSheetId|undefined,
    origin: Protocol.CSS.StyleSheetOrigin,
  }) {
    this.cssModelInternal = cssModel;
    this.styleSheetId = payload.styleSheetId;

    if (this.styleSheetId) {
      const styleSheetHeader = this.getStyleSheetHeader(this.styleSheetId);
      this.sourceURL = styleSheetHeader.sourceURL;
    }
    this.origin = payload.origin;
    this.style = new CSSStyleDeclaration(this.cssModelInternal, this, payload.style, Type.Regular);
  }

  rebase(edit: Edit): void {
    if (this.styleSheetId !== edit.styleSheetId) {
      return;
    }
    this.style.rebase(edit);
  }

  resourceURL(): Platform.DevToolsPath.UrlString {
    if (!this.styleSheetId) {
      return Platform.DevToolsPath.EmptyUrlString;
    }
    const styleSheetHeader = this.getStyleSheetHeader(this.styleSheetId);
    return styleSheetHeader.resourceURL();
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

  getStyleSheetHeader(styleSheetId: Protocol.CSS.StyleSheetId): CSSStyleSheetHeader {
    const styleSheetHeader = this.cssModelInternal.styleSheetHeaderForId(styleSheetId);
    console.assert(styleSheetHeader !== null);
    return styleSheetHeader as CSSStyleSheetHeader;
  }
}

class CSSValue {
  text: string;
  range: TextUtils.TextRange.TextRange|undefined;
  specificity: Protocol.CSS.Specificity|undefined;
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
    super(cssModel, {origin: payload.origin, style: payload.style, styleSheetId: payload.styleSheetId});
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
    const styleSheetId = this.styleSheetId;
    if (!styleSheetId) {
      throw 'No rule stylesheet id';
    }
    const range = this.selectorRange();
    if (!range) {
      throw 'Rule selector is not editable';
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
    if (!selector || !selector.range || !this.styleSheetId) {
      return 0;
    }
    const styleSheetHeader = this.getStyleSheetHeader(this.styleSheetId);
    return styleSheetHeader.lineNumberInSource(selector.range.startLine);
  }

  columnNumberInSource(selectorIndex: number): number|undefined {
    const selector = this.selectors[selectorIndex];
    if (!selector || !selector.range || !this.styleSheetId) {
      return undefined;
    }
    const styleSheetHeader = this.getStyleSheetHeader(this.styleSheetId);
    return styleSheetHeader.columnNumberInSource(selector.range.startLine, selector.range.startColumn);
  }

  override rebase(edit: Edit): void {
    if (this.styleSheetId !== edit.styleSheetId) {
      return;
    }
    const range = this.selectorRange();
    if (range && range.equal(edit.oldRange)) {
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
    super(cssModel, {origin: payload.origin, style: payload.style, styleSheetId: payload.styleSheetId});
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
    const styleSheetId = this.styleSheetId;
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

export class CSSKeyframesRule {
  readonly #animationName: CSSValue;
  readonly #keyframesInternal: CSSKeyframeRule[];
  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSKeyframesRule) {
    this.#animationName = new CSSValue(payload.animationName);
    this.#keyframesInternal = payload.keyframes.map(keyframeRule => new CSSKeyframeRule(cssModel, keyframeRule));
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
  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSKeyframeRule) {
    super(cssModel, {origin: payload.origin, style: payload.style, styleSheetId: payload.styleSheetId});
    this.reinitializeKey(payload.keyText);
  }

  key(): CSSValue {
    return this.#keyText;
  }

  private reinitializeKey(payload: Protocol.CSS.Value): void {
    this.#keyText = new CSSValue(payload);
  }

  override rebase(edit: Edit): void {
    if (this.styleSheetId !== edit.styleSheetId || !this.#keyText.range) {
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
    const styleSheetId = this.styleSheetId;
    if (!styleSheetId) {
      throw 'No rule stylesheet id';
    }
    const range = this.#keyText.range;
    if (!range) {
      throw 'Keyframe key is not editable';
    }
    return this.cssModelInternal.setKeyframeKey(styleSheetId, range, newKeyText);
  }
}

export class CSSPositionFallbackRule {
  readonly #name: CSSValue;
  readonly #tryRules: CSSRule[];
  constructor(cssModel: CSSModel, payload: Protocol.CSS.CSSPositionFallbackRule) {
    this.#name = new CSSValue(payload.name);
    this.#tryRules = payload.tryRules.map(
        tryRule =>
            new CSSRule(cssModel, {origin: tryRule.origin, style: tryRule.style, styleSheetId: tryRule.styleSheetId}));
  }

  name(): CSSValue {
    return this.#name;
  }

  tryRules(): CSSRule[] {
    return this.#tryRules;
  }
}
