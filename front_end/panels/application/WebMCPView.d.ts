import '../../ui/components/icon_button/icon_button.js';
import '../../ui/components/lists/lists.js';
import '../../ui/legacy/legacy.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    tools: Protocol.WebMCP.Tool[];
}
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class WebMCPView extends UI.Widget.VBox {
    #private;
    constructor(target?: HTMLElement, view?: View);
    performUpdate(): void;
}
