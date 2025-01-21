// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../core/sdk/sdk.js';
import * as Protocol from '../generated/protocol.js';

export function getMatchedStylesWithStylesheet(
    cssModel: SDK.CSSModel.CSSModel, origin: Protocol.CSS.StyleSheetOrigin, styleSheetId: Protocol.CSS.StyleSheetId,
    header: Partial<Protocol.CSS.CSSStyleSheetHeader>,
    payload: Partial<SDK.CSSMatchedStyles.CSSMatchedStylesPayload> = {}):
    Promise<SDK.CSSMatchedStyles.CSSMatchedStyles> {
  cssModel.styleSheetAdded({
    styleSheetId,
    frameId: '' as Protocol.Page.FrameId,
    sourceURL: '',
    origin,
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
    ...header,
  });
  return getMatchedStyles({cssModel, ...payload});
}

export function getMatchedStylesWithBlankRule(
    cssModel: SDK.CSSModel.CSSModel, selector = 'div', range: Protocol.CSS.SourceRange|undefined = undefined,
    origin = Protocol.CSS.StyleSheetOrigin.Regular, styleSheetId = '0' as Protocol.CSS.StyleSheetId,
    payload: Partial<SDK.CSSMatchedStyles.CSSMatchedStylesPayload> = {}) {
  return getMatchedStylesWithProperties(cssModel, {}, selector, range, origin, styleSheetId, payload);
}

export function getMatchedStylesWithProperties(
    cssModel: SDK.CSSModel.CSSModel, properties: Protocol.CSS.CSSProperty[]|Record<string, string>, selector = 'div',
    range: Protocol.CSS.SourceRange|undefined = undefined, origin = Protocol.CSS.StyleSheetOrigin.Regular,
    styleSheetId = '0' as Protocol.CSS.StyleSheetId,
    payload: Partial<SDK.CSSMatchedStyles.CSSMatchedStylesPayload> = {}) {
  const cssProperties =
      Array.isArray(properties) ? properties : Object.keys(properties).map(name => ({name, value: properties[name]}));
  const matchedPayload: Protocol.CSS.RuleMatch[] = [{
    rule: {
      selectorList: {selectors: [{text: selector}], text: selector},
      origin,
      style: {styleSheetId, range, cssProperties, shorthandEntries: []},
    },
    matchingSelectors: [0],
  }];
  return getMatchedStylesWithStylesheet(cssModel, origin, styleSheetId, {}, {matchedPayload, ...payload});
}

export function getMatchedStyles(payload: Partial<SDK.CSSMatchedStyles.CSSMatchedStylesPayload> = {}) {
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
    ...payload,
  });
}
