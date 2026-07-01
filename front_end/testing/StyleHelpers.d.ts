import * as SDK from '../core/sdk/sdk.js';
import * as Protocol from '../generated/protocol.js';
import type { MockCDPConnection } from './MockCDPConnection.js';
type GetEnvironmentVariablesCallback = (params: unknown) => Omit<Protocol.CSS.GetEnvironmentVariablesResponse, 'getError'> | {
    getError(): string;
} | PromiseLike<Omit<Protocol.CSS.GetEnvironmentVariablesResponse, 'getError'> | {
    getError(): string;
}>;
export declare function mockGetEnvironmentVariables(connection: MockCDPConnection, environmentVariables?: Record<string, string>): void;
export declare function getMatchedStylesWithStylesheet(payload: {
    cssModel: SDK.CSSModel.CSSModel;
    origin: Protocol.CSS.StyleSheetOrigin;
    styleSheetId: Protocol.DOM.StyleSheetId;
    connection: MockCDPConnection;
    getEnvironmentVariablesCallback?: GetEnvironmentVariablesCallback;
} & Partial<Protocol.CSS.CSSStyleSheetHeader> & Partial<SDK.CSSMatchedStyles.CSSMatchedStylesPayload>): Promise<SDK.CSSMatchedStyles.CSSMatchedStyles>;
export declare function getMatchedStylesWithBlankRule(payload: {
    cssModel: SDK.CSSModel.CSSModel;
    connection: MockCDPConnection;
    selector?: string;
    range?: Protocol.CSS.SourceRange;
    origin?: Protocol.CSS.StyleSheetOrigin;
    styleSheetId?: Protocol.DOM.StyleSheetId;
    getEnvironmentVariablesCallback?: GetEnvironmentVariablesCallback;
} & Partial<SDK.CSSMatchedStyles.CSSMatchedStylesPayload>): Promise<SDK.CSSMatchedStyles.CSSMatchedStyles>;
export declare function createCSSStyle(cssProperties: Protocol.CSS.CSSProperty[], range?: Protocol.CSS.SourceRange, styleSheetId?: Protocol.DOM.StyleSheetId): Protocol.CSS.CSSStyle;
export declare function ruleMatch(selectorOrList: string | Protocol.CSS.SelectorList, properties: Protocol.CSS.CSSProperty[] | Record<string, string>, options?: {
    range?: Protocol.CSS.SourceRange;
    origin?: Protocol.CSS.StyleSheetOrigin;
    styleSheetId?: Protocol.DOM.StyleSheetId;
    /** Matches all selectors if undefined */
    matchingSelectorsIndexes?: number[];
    nestingSelectors?: string[];
}): Protocol.CSS.RuleMatch;
export declare function getMatchedStylesWithProperties(payload: {
    cssModel: SDK.CSSModel.CSSModel;
    properties: Protocol.CSS.CSSProperty[] | Record<string, string>;
    connection: MockCDPConnection;
    selector?: string;
    range?: Protocol.CSS.SourceRange;
    origin?: Protocol.CSS.StyleSheetOrigin;
    styleSheetId?: Protocol.DOM.StyleSheetId;
    getEnvironmentVariablesCallback?: GetEnvironmentVariablesCallback;
} & Partial<SDK.CSSMatchedStyles.CSSMatchedStylesPayload>): Promise<SDK.CSSMatchedStyles.CSSMatchedStyles>;
export declare function getMatchedStyles(payload: Partial<SDK.CSSMatchedStyles.CSSMatchedStylesPayload> & {
    connection: MockCDPConnection;
}, getEnvironmentVariablesCallback?: GetEnvironmentVariablesCallback, connection?: MockCDPConnection): Promise<SDK.CSSMatchedStyles.CSSMatchedStyles>;
/**
 * For some unit tests we need a DOM Node but it has to have a "real" DOM
 * Model and CSS Model attached because code calls those methods and expect
 * to find the actual models.
 */
export declare function createStubbedDomNodeWithModels(opts?: {
    nodeId: number;
}): {
    node: SDK.DOMModel.DOMNode;
    domModel: SDK.DOMModel.DOMModel;
    cssModel: SDK.CSSModel.CSSModel;
};
export {};
