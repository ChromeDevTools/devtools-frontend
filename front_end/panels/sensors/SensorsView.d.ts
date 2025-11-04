import * as UI from '../../ui/legacy/legacy.js';
export declare class SensorsView extends UI.Widget.VBox {
    #private;
    private fieldsetElement;
    private timezoneError;
    private locationSelectElement;
    private latitudeInput;
    private longitudeInput;
    private timezoneInput;
    private localeInput;
    private accuracyInput;
    private latitudeSetter;
    private longitudeSetter;
    private timezoneSetter;
    private localeSetter;
    private accuracySetter;
    private localeError;
    private accuracyError;
    private customLocationsGroup;
    private readonly deviceOrientationSetting;
    private deviceOrientation;
    private deviceOrientationOverrideEnabled;
    private deviceOrientationFieldset;
    private stageElement;
    private orientationSelectElement;
    private alphaElement;
    private betaElement;
    private gammaElement;
    private alphaSetter;
    private betaSetter;
    private gammaSetter;
    private orientationLayer;
    private boxElement?;
    private boxMatrix?;
    private mouseDownVector?;
    private originalBoxMatrix?;
    constructor();
    private createPanelSeparator;
    private createLocationSection;
    private applyLocationUserInput;
    private applyLocation;
    private clearFieldsetElementInputs;
    private createDeviceOrientationSection;
    private createPressureSection;
    private enableOrientationFields;
    private orientationSelectChanged;
    private applyDeviceOrientation;
    private setSelectElementLabel;
    private applyDeviceOrientationUserInput;
    private resetDeviceOrientation;
    private setDeviceOrientation;
    private createAxisInput;
    private createDeviceOrientationOverrideElement;
    private setBoxOrientation;
    private onBoxDrag;
    private onBoxDragStart;
    private calculateRadiusVector;
    private appendTouchControl;
    private appendIdleEmulator;
    private createHardwareConcurrencySection;
}
export declare const enum DeviceOrientationModificationSource {
    USER_INPUT = "userInput",
    USER_DRAG = "userDrag",
    RESET_BUTTON = "resetButton",
    SELECT_PRESET = "selectPreset"
}
export declare const PressureOptions: {
    NoOverride: string;
    Nominal: string;
    Fair: string;
    Serious: string;
    Critical: string;
};
export declare const NonPresetOptions: {
    NoOverride: string;
    Custom: string;
    Unavailable: string;
};
export declare class ShowActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, _actionId: string): boolean;
}
export declare const ShiftDragOrientationSpeed = 16;
