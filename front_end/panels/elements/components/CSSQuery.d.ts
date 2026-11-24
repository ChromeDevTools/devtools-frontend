import '../../../ui/components/tooltips/tooltips.js';
import '../../../ui/legacy/components/inline_editor/inline_editor.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Tooltips from '../../../ui/components/tooltips/tooltips.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { type RegisteredPropertyDetails } from './CSSVariableValueView.js';
export interface CSSQueryData {
    queryPrefix: string;
    queryName?: string;
    queryText: string;
    onQueryTextClick?: (event: Event) => void;
    onLinkActivate?: (resolvedVariable: string | SDK.CSSMatchedStyles.CSSValueSource) => void;
    getRegisteredPropertyDetails?: (variableName: string) => RegisteredPropertyDetails | undefined;
    jslogContext: string;
}
export interface TextSection {
    text: string;
    isVariable: boolean;
}
/**
 * Context needed to resolve custom properties in a container style query,
 * for example `@container style(--foo: bar)`.
 */
export interface StyleQueryContext {
    matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles;
    style: SDK.CSSStyleDeclaration.CSSStyleDeclaration;
    containerNode: SDK.DOMModel.DOMNode;
    tooltipPrefix: Tooltips.Tooltip.IdFactory;
}
export interface ViewInput {
    queryPrefix: string;
    queryName?: string;
    queryText: TextSection[];
    onQueryTextClick?: (event: Event) => void;
    onLinkActivate?: (resolvedVariable: string | SDK.CSSMatchedStyles.CSSValueSource) => void;
    getRegisteredPropertyDetails?: (variableName: string) => RegisteredPropertyDetails | undefined;
    jslogContext?: string;
    matchedStyles?: SDK.CSSMatchedStyles.CSSMatchedStyles;
    style?: SDK.CSSStyleDeclaration.CSSStyleDeclaration;
    containerNode?: SDK.DOMModel.DOMNode;
    tooltipPrefix?: Tooltips.Tooltip.IdFactory;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement | DocumentFragment) => void;
export declare const DEFAULT_VIEW: View;
export declare class CSSQuery extends UI.Widget.Widget<ShadowRoot> {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set data(data: CSSQueryData);
    /**
     * Resolves custom properties in a container style query so parent Lit views
     * can configure `CSSQuery` declaratively via `widget()` regardless of setter order.
     */
    set styleQueryContext(context: StyleQueryContext | undefined);
    wasShown(): void;
    parseStyleQueries(matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, style: SDK.CSSStyleDeclaration.CSSStyleDeclaration, containerNode: SDK.DOMModel.DOMNode, tooltipPrefix: Tooltips.Tooltip.IdFactory): void;
    performUpdate(): void;
}
