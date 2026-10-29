import '../../../ui/components/tooltips/tooltips.js';
import '../../../ui/legacy/components/inline_editor/inline_editor.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as UI from '../../../ui/legacy/legacy.js';
import type { CSSVariableValueView } from './CSSVariableValueView.js';
export interface CSSQueryData {
    queryPrefix: string;
    queryName?: string;
    queryText: string;
    onQueryTextClick?: (event: Event) => void;
    onLinkActivate?: (resolvedVariable: string | SDK.CSSMatchedStyles.CSSValueSource) => void;
    getPopoverContents?: (variableName: string, variableValue: string | null) => CSSVariableValueView;
    jslogContext: string;
}
export interface TextSection {
    text: string;
    isVariable: boolean;
}
export interface ViewInput {
    queryPrefix: string;
    queryName?: string;
    queryText: TextSection[];
    onQueryTextClick?: (event: Event) => void;
    onLinkActivate?: (resolvedVariable: string | SDK.CSSMatchedStyles.CSSValueSource) => void;
    getPopoverContents?: (variableName: string, variableValue: string | null) => CSSVariableValueView;
    jslogContext?: string;
    matchedStyles?: SDK.CSSMatchedStyles.CSSMatchedStyles;
    style?: SDK.CSSStyleDeclaration.CSSStyleDeclaration;
    containerNode?: SDK.DOMModel.DOMNode;
    tooltipPrefix: string;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class CSSQuery extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set data(data: CSSQueryData);
    wasShown(): void;
    parseStyleQueries(matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, style: SDK.CSSStyleDeclaration.CSSStyleDeclaration, containerNode: SDK.DOMModel.DOMNode, tooltipPrefix: string): void;
    performUpdate(): void;
}
