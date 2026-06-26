import '../../../ui/components/tooltips/tooltips.js';
import '../../../ui/legacy/components/inline_editor/inline_editor.js';
import * as SDK from '../../../core/sdk/sdk.js';
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
export declare class CSSQuery extends HTMLElement {
    #private;
    set data(data: CSSQueryData);
    parseStyleQueries(matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, style: SDK.CSSStyleDeclaration.CSSStyleDeclaration, containerNode: SDK.DOMModel.DOMNode, tooltipPrefix: string): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-css-query': CSSQuery;
    }
}
