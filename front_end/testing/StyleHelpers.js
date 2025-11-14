// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../core/sdk/sdk.js';
import { clearMockConnectionResponseHandler, setMockConnectionResponseHandler } from './MockConnection.js';
export function getMatchedStylesWithStylesheet(payload) {
    payload.cssModel.styleSheetAdded({
        frameId: '',
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
export function getMatchedStylesWithBlankRule(payload) {
    return getMatchedStylesWithProperties({ properties: {}, ...payload });
}
export function createCSSStyle(cssProperties, range, styleSheetId = '0') {
    return {
        cssProperties,
        styleSheetId,
        range,
        shorthandEntries: [],
    };
}
function getSimpleList(selector) {
    return {
        selectors: [{ text: selector }],
        text: selector,
    };
}
export function ruleMatch(selectorOrList, properties, options = {}) {
    const { range, origin = "regular" /* Protocol.CSS.StyleSheetOrigin.Regular */, styleSheetId, matchingSelectorsIndexes, nestingSelectors, } = options;
    const cssProperties = Array.isArray(properties) ? properties : Object.keys(properties).map(name => ({ name, value: properties[name] }));
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
export function getMatchedStylesWithProperties(payload) {
    const styleSheetId = payload.styleSheetId ?? '0';
    const range = payload.range;
    const origin = payload.origin ?? "regular" /* Protocol.CSS.StyleSheetOrigin.Regular */;
    const matchedPayload = [ruleMatch(payload.selector ?? 'div', payload.properties, { range, origin, styleSheetId })];
    return getMatchedStylesWithStylesheet({ styleSheetId, origin, matchedPayload, ...payload });
}
export function getMatchedStyles(payload = {}, getEnvironmentVariablesCallback = () => ({ environmentVariables: {} })) {
    clearMockConnectionResponseHandler('CSS.getEnvironmentVariables');
    setMockConnectionResponseHandler('CSS.getEnvironmentVariables', getEnvironmentVariablesCallback);
    let node = payload.node;
    if (!node) {
        node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1;
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
        atRules: [],
        activePositionFallbackIndex: -1,
        animationStylesPayload: [],
        transitionsStylePayload: null,
        inheritedAnimatedPayload: [],
        functionRules: [],
        ...payload,
    });
}
//# sourceMappingURL=StyleHelpers.js.map