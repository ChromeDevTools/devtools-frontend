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
    constructor(element?: HTMLElement, view?: View);
    get variableName(): string;
    set variableName(variableName: string);
    get value(): string | undefined;
    set value(value: string | undefined);
    get details(): RegisteredPropertyDetails | undefined;
    set details(details: RegisteredPropertyDetails | undefined);
    wasShown(): void;
    performUpdate(): void;
}
