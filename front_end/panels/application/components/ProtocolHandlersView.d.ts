import '../../../ui/components/icon_button/icon_button.js';
import * as Platform from '../../../core/platform/platform.js';
import * as UI from '../../../ui/legacy/legacy.js';
interface HTMLSelectElementEvent extends Event {
    target: HTMLSelectElement;
}
interface HTMLInputElementEvent extends Event {
    target: HTMLInputElement;
}
interface ViewInput {
    protocolHandler: ProtocolHandler[];
    manifestLink: Platform.DevToolsPath.UrlString;
    queryInputState: string;
    protocolSelectHandler: (evt: HTMLSelectElementEvent) => void;
    queryInputChangeHandler: (evt: HTMLInputElementEvent) => void;
    testProtocolClickHandler: () => void;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export interface ProtocolHandler {
    protocol: string;
    url: string;
}
export interface ProtocolHandlersData {
    protocolHandlers: ProtocolHandler[];
    manifestLink: Platform.DevToolsPath.UrlString;
}
export declare class ProtocolHandlersView extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set protocolHandlers(protocolHandlers: ProtocolHandler[]);
    get protocolHandlers(): ProtocolHandler[];
    set manifestLink(manifestLink: Platform.DevToolsPath.UrlString);
    get manifestLink(): Platform.DevToolsPath.UrlString;
    performUpdate(): void;
}
export {};
