import type * as Platform from '../../core/platform/platform.js';
import * as Protocol from '../../generated/protocol.js';
import { SecurityPanelSidebarTreeElement } from './SecurityPanelSidebarTreeElement.js';
export declare class ShowOriginEvent extends Event {
    static readonly eventName = "showorigin";
    origin: Platform.DevToolsPath.UrlString | null;
    constructor(origin: Platform.DevToolsPath.UrlString | null);
}
export declare class OriginTreeElement extends SecurityPanelSidebarTreeElement {
    #private;
    constructor(className: string, renderTreeElement: (element: SecurityPanelSidebarTreeElement) => void, origin?: Platform.DevToolsPath.UrlString | null);
    setSecurityState(newSecurityState: Protocol.Security.SecurityState): void;
    securityState(): Protocol.Security.SecurityState | null;
    origin(): Platform.DevToolsPath.UrlString | null;
    showElement(): void;
}
declare global {
    interface HTMLElementEventMap {
        showorigin: ShowOriginEvent;
    }
}
