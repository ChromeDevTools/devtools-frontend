import '../../../ui/kit/kit.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { type IconInfo } from './CSSPropertyIconResolver.js';
declare global {
    interface HTMLElementEventMap {
        propertyselected: PropertySelectedEvent;
        propertydeselected: PropertyDeselectedEvent;
    }
}
export interface EditableProperty {
    propertyName: string;
    propertyValues: string[];
}
export declare class PropertySelectedEvent extends Event {
    static readonly eventName = "propertyselected";
    data: {
        name: string;
        value: string;
    };
    constructor(name: string, value: string);
}
export declare class PropertyDeselectedEvent extends Event {
    static readonly eventName = "propertydeselected";
    data: {
        name: string;
        value: string;
    };
    constructor(name: string, value: string);
}
export interface ViewInput {
    authoredProperties: Map<string, string>;
    computedProperties: Map<string, string>;
    editableProperties: EditableProperty[];
    containerClass?: string;
    findIcon: (query: string) => IconInfo | null;
    onButtonClick: (propertyName: string, propertyValue: string, selected: boolean) => void;
    onDenseCheckboxChange: (checked: boolean, isRow: boolean, isColumn: boolean) => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class StylePropertyEditor extends UI.Widget.VBox {
    #private;
    static get editableProperties(): EditableProperty[];
    protected readonly containerClass: string;
    constructor(element?: HTMLElement, view?: View);
    getEditableProperties(): EditableProperty[];
    get authoredProperties(): Map<string, string>;
    set authoredProperties(authoredProperties: Map<string, string>);
    get computedProperties(): Map<string, string>;
    set computedProperties(computedProperties: Map<string, string>);
    wasShown(): void;
    performUpdate(): void;
    protected findIcon(_query: string, _computedProperties: Map<string, string>): IconInfo | null;
}
export declare class FlexboxEditor extends StylePropertyEditor {
    static get editableProperties(): EditableProperty[];
    protected readonly containerClass = "flexbox-editor";
    protected findIcon(query: string, computedProperties: Map<string, string>): IconInfo | null;
}
export declare class GridEditor extends StylePropertyEditor {
    static get editableProperties(): EditableProperty[];
    protected readonly containerClass = "grid-editor";
    protected findIcon(query: string, computedProperties: Map<string, string>): IconInfo | null;
}
export declare class GridLanesEditor extends StylePropertyEditor {
    static get editableProperties(): EditableProperty[];
    protected readonly containerClass = "grid-lanes-editor";
    protected findIcon(query: string, computedProperties: Map<string, string>): IconInfo | null;
}
export declare const FlexboxEditableProperties: Array<{
    propertyName: string;
    propertyValues: string[];
}>;
export declare const GridEditableProperties: Array<{
    propertyName: string;
    propertyValues: string[];
}>;
export declare const GridLanesEditableProperties: Array<{
    propertyName: string;
    propertyValues: string[];
}>;
