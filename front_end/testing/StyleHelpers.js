// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import sinon from 'sinon';
import * as SDK from '../core/sdk/sdk.js';
export function mockGetEnvironmentVariables(connection, environmentVariables = {}) {
    connection.setHandler('CSS.getEnvironmentVariables', null);
    connection.setSuccessHandler('CSS.getEnvironmentVariables', () => ({ environmentVariables }));
}
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
    return getMatchedStyles(payload, payload.getEnvironmentVariablesCallback, payload.connection);
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
export function getMatchedStyles(payload, getEnvironmentVariablesCallback = () => ({ environmentVariables: {} }), connection = payload.connection) {
    connection.setHandler('CSS.getEnvironmentVariables', null);
    connection.setHandler('CSS.getEnvironmentVariables', params => {
        const result = getEnvironmentVariablesCallback(params);
        if (result && 'then' in result) {
            return Promise.resolve(result).then(res => {
                if ('getError' in res && typeof res.getError === 'function' && res.getError()) {
                    return { error: { message: res.getError(), code: -32000 } };
                }
                return { result: res };
            });
        }
        if (result && 'getError' in result && typeof result.getError === 'function' && result.getError()) {
            return { error: { message: result.getError(), code: -32000 } };
        }
        return { result: result };
    });
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
/**
 * For some unit tests we need a DOM Node but it has to have a "real" DOM
 * Model and CSS Model attached because code calls those methods and expect
 * to find the actual models.
 */
export function createStubbedDomNodeWithModels(opts = {
    nodeId: 1,
}) {
    const target = sinon.createStubInstance(SDK.Target.Target);
    const cssModel = sinon.createStubInstance(SDK.CSSModel.CSSModel, {
        target,
    });
    const domModel = sinon.createStubInstance(SDK.DOMModel.DOMModel, {
        cssModel,
    });
    const node = sinon.createStubInstance(SDK.DOMModel.DOMNode, {
        domModel,
    });
    node.id = opts.nodeId;
    return { cssModel, domModel, node };
}
//# sourceMappingURL=StyleHelpers.js.map