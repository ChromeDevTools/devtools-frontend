import '../../../ui/components/icon_button/icon_button.js';
import * as Platform from '../../../core/platform/platform.js';
export interface ProtocolHandler {
    protocol: string;
    url: string;
}
export interface ProtocolHandlersData {
    protocolHandlers: ProtocolHandler[];
    manifestLink: Platform.DevToolsPath.UrlString;
}
export declare class ProtocolHandlersView extends HTMLElement {
    #private;
    set data(data: ProtocolHandlersData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-protocol-handlers-view': ProtocolHandlersView;
    }
}
