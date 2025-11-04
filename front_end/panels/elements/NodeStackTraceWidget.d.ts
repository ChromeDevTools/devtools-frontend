import * as SDK from '../../core/sdk/sdk.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    target?: SDK.Target.Target;
    linkifier: Components.Linkifier.Linkifier;
    options: Components.JSPresentationUtils.Options;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class NodeStackTraceWidget extends UI.Widget.VBox {
    #private;
    constructor(view?: View);
    wasShown(): void;
    willHide(): void;
    performUpdate(): Promise<void>;
}
export declare const MaxLengthForLinks = 40;
export {};
