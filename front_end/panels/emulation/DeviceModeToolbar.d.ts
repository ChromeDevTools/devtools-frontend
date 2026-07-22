import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface DeviceModeOption {
    device: EmulationModel.EmulatedDevices.EmulatedDevice;
    title: string;
    selected: boolean;
    jslogContext: string;
}
export interface ViewInput {
    isResponsive: boolean;
    isFullHeight: boolean;
    widthValue: string;
    heightValue: string;
    heightPlaceholder: string;
    modeButtonTitle: string;
    modeButtonDisabled: boolean;
    showSpanButton: boolean;
    showPostureItem: boolean;
    deviceModeOptions: {
        responsive: {
            title: string;
            selected: boolean;
            jslogContext: string;
        };
        standard: DeviceModeOption[];
        custom: DeviceModeOption[];
        edit: {
            title: string;
            jslogContext: string;
        };
    };
    scaleOptions: Array<{
        title: string;
        value: number;
        selected: boolean;
        jslogContext: string;
    }>;
    dprOptions: Array<{
        title: string;
        value: number;
        selected: boolean;
        jslogContext: string;
    }>;
    uaOptions: Array<{
        title: string;
        value: EmulationModel.DeviceModeModel.UA;
        selected: boolean;
        jslogContext: string;
    }>;
    postureOptions: Array<{
        title: string;
        value: string;
        selected: boolean;
    }>;
    selectedDeviceOption: {
        title: string;
        selected: boolean;
        jslogContext: string;
    } | undefined;
    deviceText: string;
    scaleText: string;
    dprText: string;
    uaText: string;
    postureText: string;
    onDeviceChange: (event: Event) => void;
    onWidthChange: (event: Event) => void;
    onHeightChange: (event: Event) => void;
    onScaleChange: (event: Event) => void;
    onDeviceScaleChange: (event: Event) => void;
    onUAChange: (event: Event) => void;
    onPostureChange: (event: Event) => void;
    onModeMenuClick: (event: Event) => void;
    onSpanClick: () => void;
    onMoreOptionsClick: (event: Event) => void;
    autoAdjustScaleSetting: Common.Settings.Setting<boolean>;
    showDeviceScaleFactorSetting: Common.Settings.Setting<boolean>;
    showUserAgentTypeSetting: Common.Settings.Setting<boolean>;
}
export type View = (input: ViewInput, output: object, target: HTMLElement | DocumentFragment) => void;
export declare const DEFAULT_VIEW: View;
export declare class DeviceModeToolbar extends UI.Widget.Widget {
    #private;
    private readonly showMediaInspectorSetting;
    private readonly showRulersSetting;
    private readonly showDeviceScaleFactorSetting;
    private readonly showUserAgentTypeSetting;
    private autoAdjustScaleSetting;
    private readonly lastMode;
    private readonly emulatedDevicesList;
    private readonly persistenceSetting;
    private readonly view;
    constructor(element?: HTMLElement, view?: View);
    get model(): EmulationModel.DeviceModeModel.DeviceModeModel | undefined;
    set model(model: EmulationModel.DeviceModeModel.DeviceModeModel);
    wasShown(): void;
    performUpdate(): void;
    private getDevicePostureOptions;
    private onPostureChange;
    private currentDevicePosture;
    private getScaleOptions;
    private onScaleChange;
    private getDeviceScaleFactorOptions;
    private onDeviceScaleChange;
    private getUserAgentOptions;
    private onUAChange;
    private appendOptionsMenuItems;
    private reset;
    private emulateDevice;
    private switchToResponsive;
    private filterDevices;
    private standardDevices;
    private customDevices;
    private allDevices;
    private getDeviceModeOptions;
    private onDeviceChange;
    private deviceListChanged;
    private spanClicked;
    private modeMenuClicked;
    private getPrettyFitZoomPercentage;
    private getPrettyZoomPercentage;
    restore(): void;
}
