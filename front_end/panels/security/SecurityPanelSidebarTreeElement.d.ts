import * as UI from '../../ui/legacy/legacy.js';
export declare class SecurityPanelSidebarTreeElement extends UI.TreeOutline.TreeElement {
    constructor(title?: string, expandable?: boolean, jslogContext?: string | number);
    get elemId(): string;
    showElement(): void;
    onselect(selectedByUser?: boolean): boolean;
}
