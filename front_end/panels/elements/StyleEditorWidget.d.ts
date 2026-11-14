import '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type LitTemplate } from '../../ui/lit/lit.js';
import type * as ElementsComponents from './components/components.js';
import type { StylePropertiesSection } from './StylePropertiesSection.js';
import type { StylesContainer } from './StylesContainer.js';
export interface ViewInput {
    editorClass?: typeof ElementsComponents.StylePropertyEditor.StylePropertyEditor;
    authoredProperties: Map<string, string>;
    computedProperties: Map<string, string>;
    onPropertySelected: (event: ElementsComponents.StylePropertyEditor.PropertySelectedEvent) => void;
    onPropertyDeselected: (event: ElementsComponents.StylePropertyEditor.PropertyDeselectedEvent) => void;
}
export interface ViewOutput {
    waitForEditorUpdate?: () => Promise<void>;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
/**
 * Thin UI.Widget wrapper around style editors to allow using it as a popover.
 */
export declare class StyleEditorWidget extends UI.Widget.VBox {
    #private;
    constructor(element?: HTMLElement, view?: View);
    getSection(): StylePropertiesSection | undefined;
    onPropertySelected(event: ElementsComponents.StylePropertyEditor.PropertySelectedEvent): Promise<void>;
    onPropertyDeselected(event: ElementsComponents.StylePropertyEditor.PropertyDeselectedEvent): Promise<void>;
    bindContext(stylesContainer: StylesContainer, section: StylePropertiesSection): void;
    setTriggerKey(value: string): void;
    getTriggerKey(): string | undefined;
    unbindContext(): void;
    render(): Promise<void>;
    performUpdate(): Promise<void>;
    static instance(): StyleEditorWidget;
    setEditor(editorClass: typeof ElementsComponents.StylePropertyEditor.StylePropertyEditor): void;
    static createTriggerButton(stylesContainer: StylesContainer, section: StylePropertiesSection, editorClass: typeof ElementsComponents.StylePropertyEditor.StylePropertyEditor, buttonTitle: string, triggerKey: string, jslogContext: string, onClick?: () => void): LitTemplate;
}
