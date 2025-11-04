import type * as SDK from '../../../core/sdk/sdk.js';
export interface RegisteredPropertyDetails {
    registration: SDK.CSSMatchedStyles.CSSRegisteredProperty;
    goToDefinition: () => void;
}
export declare class CSSVariableParserError extends HTMLElement {
    #private;
    constructor(details: RegisteredPropertyDetails);
}
export declare class CSSVariableValueView extends HTMLElement {
    #private;
    readonly variableName: string;
    readonly details: RegisteredPropertyDetails | undefined;
    constructor({ variableName, value, details, }: {
        variableName: string;
        value: string | undefined;
        details?: RegisteredPropertyDetails;
    });
    get value(): string | undefined;
    set value(value: string | undefined);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-css-variable-value-view': CSSVariableValueView;
        'devtools-css-variable-parser-error': CSSVariableParserError;
    }
}
