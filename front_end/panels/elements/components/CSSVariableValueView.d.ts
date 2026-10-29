import type * as SDK from '../../../core/sdk/sdk.js';
import * as UI from '../../../ui/legacy/legacy.js';
export interface RegisteredPropertyDetails {
    registration: SDK.CSSMatchedStyles.CSSRegisteredProperty;
    goToDefinition: () => void;
}
export interface ParserErrorViewInput {
    details: RegisteredPropertyDetails;
}
export type ParserErrorView = (input: ParserErrorViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_PARSER_ERROR_VIEW: ParserErrorView;
export declare class CSSVariableParserError extends UI.Widget.Widget {
    #private;
    constructor(details: RegisteredPropertyDetails, view?: ParserErrorView);
    wasShown(): void;
    performUpdate(): void;
}
export interface ViewInput {
    variableName: string;
    value?: string;
    details?: RegisteredPropertyDetails;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class CSSVariableValueView extends UI.Widget.Widget {
    #private;
    readonly variableName: string;
    readonly details: RegisteredPropertyDetails | undefined;
    constructor({ variableName, value, details, }: {
        variableName: string;
        value: string | undefined;
        details?: RegisteredPropertyDetails;
    }, view?: View);
    get value(): string | undefined;
    set value(value: string | undefined);
    wasShown(): void;
    performUpdate(): void;
}
