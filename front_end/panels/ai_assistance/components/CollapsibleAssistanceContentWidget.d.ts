export interface CollapsibleAssistanceContentWidgetData {
    headerText: string;
}
export declare class CollapsibleAssistanceContentWidget extends HTMLElement {
    #private;
    set data(data: CollapsibleAssistanceContentWidgetData);
    connectedCallback(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-collapsible-assistance-content-widget': CollapsibleAssistanceContentWidget;
    }
}
