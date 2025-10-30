import * as Protocol from '../../generated/protocol.js';
import { OverlayModel } from './OverlayModel.js';
import { SDKModel } from './SDKModel.js';
import { type Target } from './Target.js';
export declare const enum DataSaverOverride {
    UNSET = "unset",
    ENABLED = "enabled",
    DISABLED = "disabled"
}
export declare class EmulationModel extends SDKModel<void> {
    #private;
    constructor(target: Target);
    setTouchEmulationAllowed(touchEmulationAllowed: boolean): void;
    supportsDeviceEmulation(): boolean;
    resetPageScaleFactor(): Promise<void>;
    emulateDevice(metrics: Protocol.Page.SetDeviceMetricsOverrideRequest | null): Promise<void>;
    overlayModel(): OverlayModel | null;
    setPressureSourceOverrideEnabled(enabled: boolean): Promise<void>;
    setPressureStateOverride(pressureState: string): Promise<void>;
    emulateLocation(location: Location | null): Promise<void>;
    emulateDeviceOrientation(deviceOrientation: DeviceOrientation | null): Promise<void>;
    setIdleOverride(emulationParams: {
        isUserActive: boolean;
        isScreenUnlocked: boolean;
    }): Promise<void>;
    clearIdleOverride(): Promise<void>;
    private emulateCSSMedia;
    private emulateAutoDarkMode;
    private emulateVisionDeficiency;
    private emulateOSTextScale;
    private setLocalFontsDisabled;
    private setDisabledImageTypes;
    setDataSaverOverride(dataSaverOverride: DataSaverOverride): Promise<void>;
    setCPUThrottlingRate(rate: number): Promise<void>;
    setHardwareConcurrency(hardwareConcurrency: number): Promise<void>;
    emulateTouch(enabled: boolean, mobile: boolean): Promise<void>;
    overrideEmulateTouch(enabled: boolean): Promise<void>;
    private updateTouch;
    private updateCssMedia;
}
export declare class Location {
    static readonly DEFAULT_ACCURACY = 150;
    latitude: number;
    longitude: number;
    timezoneId: string;
    locale: string;
    accuracy: number;
    unavailable: boolean;
    constructor(latitude: number, longitude: number, timezoneId: string, locale: string, accuracy: number, unavailable: boolean);
    static parseSetting(value: string): Location;
    static parseUserInput(latitudeString: string, longitudeString: string, timezoneId: string, locale: string, accuracyString: string): Location | null;
    static latitudeValidator(value: string): boolean;
    static longitudeValidator(value: string): boolean;
    static timezoneIdValidator(value: string): boolean;
    static localeValidator(value: string): boolean;
    static accuracyValidator(value: string): {
        valid: boolean;
        errorMessage: (string | undefined);
    };
    toSetting(): string;
}
export declare class DeviceOrientation {
    alpha: number;
    beta: number;
    gamma: number;
    constructor(alpha: number, beta: number, gamma: number);
    static parseSetting(value: string): DeviceOrientation;
    static parseUserInput(alphaString: string, betaString: string, gammaString: string): DeviceOrientation | null;
    static angleRangeValidator(value: string, interval: {
        minimum: number;
        maximum: number;
    }): boolean;
    static alphaAngleValidator(value: string): boolean;
    static betaAngleValidator(value: string): boolean;
    static gammaAngleValidator(value: string): boolean;
    toSetting(): string;
}
