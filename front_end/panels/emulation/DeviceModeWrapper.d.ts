import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import { InspectedPagePlaceholder } from './InspectedPagePlaceholder.js';
export declare class DeviceModeWrapper extends UI.Widget.VBox {
    #private;
    private readonly inspectedPagePlaceholder;
    private deviceModeView;
    private readonly toggleDeviceModeAction;
    private showDeviceModeSetting;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
        inspectedPagePlaceholder: InspectedPagePlaceholder | null;
    }): DeviceModeWrapper;
    toggleDeviceMode(): void;
    isDeviceModeOn(): boolean;
    static captureScreenshot(fullSize?: boolean, clip?: Protocol.Page.Viewport): boolean;
    private screenshotRequestedFromOverlay;
    update(force?: boolean): void;
}
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(context: UI.Context.Context, actionId: string): boolean;
}
