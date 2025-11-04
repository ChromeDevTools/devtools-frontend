import { SecurityPanelSidebarTreeElement } from './SecurityPanelSidebarTreeElement.js';
export declare class IPProtectionTreeElement extends SecurityPanelSidebarTreeElement {
    constructor(title: string, jslogContext: string | number);
    get elemId(): string;
    showElement(): void;
}
