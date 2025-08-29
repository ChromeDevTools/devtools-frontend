// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../core/sdk/sdk.js';
import * as Protocol from '../generated/protocol.js';

import {
  clearMockConnectionResponseHandler,
  type ProtocolCommandHandler,
  setMockConnectionResponseHandler
} from './MockConnection.js';

export function getMatchedStylesWithStylesheet(payload: {
  cssModel: SDK.CSSModel.CSSModel,
  origin: Protocol.CSS.StyleSheetOrigin,
  styleSheetId: Protocol.CSS.StyleSheetId,
  getEnvironmentVariablesCallback?: ProtocolCommandHandler<'CSS.getEnvironmentVariables'>,
}&Partial<Protocol.CSS.CSSStyleSheetHeader>&Partial<SDK.CSSMatchedStyles.CSSMatchedStylesPayload>):
    Promise<SDK.CSSMatchedStyles.CSSMatchedStyles> {
  payload.cssModel.styleSheetAdded({
    frameId: '' as Protocol.Page.FrameId,
    sourceURL: '',
    title: '',
    disabled: false,
    isInline: false,
    isMutable: false,
    isConstructed: false,
    startLine: 0,
    startColumn: 0,
    length: 0,
    endLine: 0,
    endColumn: 0,
    ...payload,
  });
  return getMatchedStyles(payload, payload.getEnvironmentVariablesCallback);
}

export function getMatchedStylesWithBlankRule(payload: {
  cssModel: SDK.CSSModel.CSSModel,
  selector?: string,
  range?: Protocol.CSS.SourceRange,
  origin?: Protocol.CSS.StyleSheetOrigin,
  styleSheetId?: Protocol.CSS.StyleSheetId,
  getEnvironmentVariablesCallback?: ProtocolCommandHandler<'CSS.getEnvironmentVariables'>,
}&Partial<SDK.CSSMatchedStyles.CSSMatchedStylesPayload>) {
  return getMatchedStylesWithProperties({properties: {}, ...payload});
}

export function createCSSStyle(
    cssProperties: Protocol.CSS.CSSProperty[],
    range?: Protocol.CSS.SourceRange,
    styleSheetId = '0' as Protocol.CSS.StyleSheetId,
    ): Protocol.CSS.CSSStyle {
  return {
    cssProperties,
    styleSheetId,
    range,
    shorthandEntries: [],
  };
}

function getSimpleList(selector: string): Protocol.CSS.SelectorList {
  return {
    selectors: [{text: selector}],
    text: selector,
  };
}

export function ruleMatch(
    selectorOrList: string|Protocol.CSS.SelectorList,
    properties: Protocol.CSS.CSSProperty[]|Record<string, string>,
    options: {
      range?: Protocol.CSS.SourceRange,
      origin?: Protocol.CSS.StyleSheetOrigin,
      styleSheetId?: Protocol.CSS.StyleSheetId,
      /** Matches all selectors if undefined */
      matchingSelectorsIndexes?: number[],
      nestingSelectors?: string[],
    } = {},
    ): Protocol.CSS.RuleMatch {
  const {
    range,
    origin = Protocol.CSS.StyleSheetOrigin.Regular,
    styleSheetId,
    matchingSelectorsIndexes,
    nestingSelectors,
  } = options;

  const cssProperties =
      Array.isArray(properties) ? properties : Object.keys(properties).map(name => ({name, value: properties[name]}));
  const selectorList = typeof selectorOrList === 'string' ? getSimpleList(selectorOrList) : selectorOrList;
  const matchingSelectors = matchingSelectorsIndexes ?? selectorList.selectors.map((_, index) => index);

  return {
    rule: {
      nestingSelectors,
      selectorList,
      origin,
      style: createCSSStyle(cssProperties, range, styleSheetId),
      styleSheetId,
    },
    matchingSelectors,
  };
}

export function getMatchedStylesWithProperties(payload: {
  cssModel: SDK.CSSModel.CSSModel,
  properties: Protocol.CSS.CSSProperty[]|Record<string, string>,
  selector?: string,
  range?: Protocol.CSS.SourceRange,
  origin?: Protocol.CSS.StyleSheetOrigin,
  styleSheetId?: Protocol.CSS.StyleSheetId,
  getEnvironmentVariablesCallback?: ProtocolCommandHandler<'CSS.getEnvironmentVariables'>,
}&Partial<SDK.CSSMatchedStyles.CSSMatchedStylesPayload>) {
  const styleSheetId = payload.styleSheetId ?? '0' as Protocol.CSS.StyleSheetId;
  const range = payload.range;
  const origin = payload.origin ?? Protocol.CSS.StyleSheetOrigin.Regular;
  const matchedPayload = [ruleMatch(payload.selector ?? 'div', payload.properties, {range, origin, styleSheetId})];
  return getMatchedStylesWithStylesheet({styleSheetId, origin, matchedPayload, ...payload});
}

export function getMatchedStyles(
    payload: Partial<SDK.CSSMatchedStyles.CSSMatchedStylesPayload> = {},
    getEnvironmentVariablesCallback: ProtocolCommandHandler<'CSS.getEnvironmentVariables'> = () => ({})) {
  clearMockConnectionResponseHandler('CSS.getEnvironmentVariables');
  setMockConnectionResponseHandler('CSS.getEnvironmentVariables', getEnvironmentVariablesCallback);
  let node = payload.node;
  if (!node) {
    node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    node.id = 1 as Protocol.DOM.NodeId;
  }

  let cssModel = payload.cssModel;
  if (!cssModel) {
    cssModel = sinon.createStubInstance(SDK.CSSModel.CSSModel);
  }
  return SDK.CSSMatchedStyles.CSSMatchedStyles.create({
    cssModel,
    node,
    inlinePayload: null,
    attributesPayload: null,
    matchedPayload: [],
    pseudoPayload: [],
    inheritedPayload: [],
    inheritedPseudoPayload: [],
    animationsPayload: [],
    parentLayoutNodeId: undefined,
    positionTryRules: [],
    propertyRules: [],
    cssPropertyRegistrations: [],
    fontPaletteValuesRule: undefined,
    activePositionFallbackIndex: -1,
    animationStylesPayload: [],
    transitionsStylePayload: null,
    inheritedAnimatedPayload: [],
    functionRules: [],
    ...payload,
  });
}
