import * as UI from '../../ui/legacy/legacy.js';
import type * as ElementsComponents from './components/components.js';
import type { StylePropertiesSection } from './StylePropertiesSection.js';
import type { StylesContainer } from './StylesContainer.js';
type PropertySelectedEvent = ElementsComponents.StylePropertyEditor.PropertySelectedEvent;
type PropertyDeselectedEvent = ElementsComponents.StylePropertyEditor.PropertyDeselectedEvent;
interface Editor extends HTMLElement {
    data: {
        authoredProperties: Map<String, String>;
        computedProperties: Map<String, String>;
    };
    getEditableProperties(): Array<{
        propertyName: string;
    }>;
    jslogContext: string;
}
/**
 * Thin UI.Widget wrapper around style editors to allow using it as a popover.
 */
export declare class StyleEditorWidget extends UI.Widget.VBox {
    #private;
    private editor?;
    private stylesContainer?;
    private section?;
    private editorContainer;
    constructor();
    getSection(): StylePropertiesSection | undefined;
    onPropertySelected(event: PropertySelectedEvent): Promise<void>;
    onPropertyDeselected(event: PropertyDeselectedEvent): Promise<void>;
    bindContext(stylesContainer: StylesContainer, section: StylePropertiesSection): void;
    setTriggerKey(value: string): void;
    getTriggerKey(): string | undefined;
    unbindContext(): void;
    render(): Promise<void>;
    performUpdate(): Promise<void>;
    static instance(): StyleEditorWidget;
    setEditor(editorClass: {
        new (): Editor;
    }): void;
    static createTriggerButton(stylesContainer: StylesContainer, section: StylePropertiesSection, editorClass: {
        new (): Editor;
    }, buttonTitle: string, triggerKey: string): HTMLElement;
}
export {};
