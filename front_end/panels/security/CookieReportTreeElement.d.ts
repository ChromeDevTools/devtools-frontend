import { SecurityPanelSidebarTreeElement } from './SecurityPanelSidebarTreeElement.js';
export declare class CookieReportTreeElement extends SecurityPanelSidebarTreeElement {
    constructor(title: string, jslogContext: string | number);
    get elemId(): string;
    showElement(): void;
}
