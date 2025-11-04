import '../../../ui/components/icon_button/icon_button.js';
export interface ElementsTreeExpandButtonData {
    clickHandler: (event?: Event) => void;
}
export declare class ElementsTreeExpandButton extends HTMLElement {
    #private;
    set data(data: ElementsTreeExpandButtonData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-elements-tree-expand-button': ElementsTreeExpandButton;
    }
}
