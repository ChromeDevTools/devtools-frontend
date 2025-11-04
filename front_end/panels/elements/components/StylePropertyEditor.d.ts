import '../../../ui/components/icon_button/icon_button.js';
import { type IconInfo } from './CSSPropertyIconResolver.js';
declare global {
    interface HTMLElementEventMap {
        propertyselected: PropertySelectedEvent;
        propertydeselected: PropertyDeselectedEvent;
    }
}
interface FlexEditorData {
    authoredProperties: Map<string, string>;
    computedProperties: Map<string, string>;
}
interface EditableProperty {
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
export declare class StylePropertyEditor extends HTMLElement {
    #private;
    protected readonly editableProperties: EditableProperty[];
    getEditableProperties(): EditableProperty[];
    set data(data: FlexEditorData);
    protected findIcon(_query: string, _computedProperties: Map<string, string>): IconInfo | null;
}
export declare class FlexboxEditor extends StylePropertyEditor {
    readonly jslogContext = "cssFlexboxEditor";
    protected readonly editableProperties: EditableProperty[];
    protected findIcon(query: string, computedProperties: Map<string, string>): IconInfo | null;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-flexbox-editor': FlexboxEditor;
    }
}
export declare class GridEditor extends StylePropertyEditor {
    readonly jslogContext = "cssGridEditor";
    protected readonly editableProperties: EditableProperty[];
    protected findIcon(query: string, computedProperties: Map<string, string>): IconInfo | null;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-grid-editor': GridEditor;
    }
}
export declare class MasonryEditor extends StylePropertyEditor {
    readonly jslogContext = "cssMasonryEditor";
    protected readonly editableProperties: EditableProperty[];
    protected findIcon(query: string, computedProperties: Map<string, string>): IconInfo | null;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-masonry-editor': MasonryEditor;
    }
}
export declare const FlexboxEditableProperties: {
    propertyName: string;
    propertyValues: string[];
}[];
export declare const GridEditableProperties: {
    propertyName: string;
    propertyValues: string[];
}[];
export declare const MasonryEditableProperties: {
    propertyName: string;
    propertyValues: string[];
}[];
export {};
