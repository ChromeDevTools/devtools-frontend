import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    showDeviceMode: boolean;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class DeviceModeWrapper extends UI.Widget.VBox {
    #private;
    private readonly toggleDeviceModeAction;
    private showDeviceModeSetting;
    constructor(element?: HTMLElement, view?: View);
    static captureScreenshot(fullSize?: boolean, clip?: Protocol.Page.Viewport): boolean;
    private screenshotRequestedFromOverlay;
    performUpdate(): void;
}
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(context: UI.Context.Context, actionId: string): boolean;
}
export {};
