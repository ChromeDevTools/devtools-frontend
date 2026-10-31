import '../../ui/components/lists/lists.js';
import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface CPUThrottlingCardViewInput {
    state: 'cta' | 'prompting' | 'calibrating';
    hasCalibrated: boolean;
    lowResultText: string;
    lowNotCalibrated: boolean;
    midResultText: string;
    midNotCalibrated: boolean;
    warnings: string[];
    progressWorked: number;
    onCalibrateClick: () => void;
    onCancelClick: () => void;
}
export type CPUThrottlingCardView = (input: CPUThrottlingCardViewInput, output: undefined, target: HTMLElement) => void;
export declare const CPU_THROTTLING_CARD_DEFAULT_VIEW: CPUThrottlingCardView;
export declare class CPUThrottlingCard extends UI.Widget.Widget {
    #private;
    private computePressurePromise?;
    private controller?;
    private state;
    private warnings;
    constructor(element?: HTMLElement, view?: CPUThrottlingCardView);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
    private getCalibrationWarnings;
    private calibrateButtonClicked;
    private cancelButtonClicked;
    private runCalibration;
}
export interface EditorValues {
    title: string;
    download: string;
    upload: string;
    latency: string;
    packetLoss: string;
    packetQueueLength: string;
    packetReordering: boolean;
}
export type EditorFieldName = keyof EditorValues;
export interface ViewInput {
    presets: SDK.NetworkManager.Conditions[];
    customConditions: SDK.NetworkManager.Conditions[];
    editingIndex: number | null;
    editingValues: EditorValues;
    validationErrors: Partial<Record<EditorFieldName, Common.UIString.LocalizedString>>;
    showValidationErrors: boolean;
    onAddCustomProfile: () => void;
    onBeginEdit: (index: number) => void;
    onRemoveCustomProfile: (index: number) => void;
    onEditorInput: <K extends EditorFieldName>(field: K, value: EditorValues[K]) => void;
    onCommitEdit: () => void;
    onCancelEdit: () => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ThrottlingSettingsTab extends UI.Widget.VBox {
    #private;
    private readonly customUserConditions;
    constructor(settings: Common.Settings.Settings, view?: View);
    performUpdate(): void;
    wasShown(): void;
}
