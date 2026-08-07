import * as UI from '../../ui/legacy/legacy.js';
import * as PanelsCommon from '../common/common.js';
interface CPUThrottlingGroup {
    name: string;
    items: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption[];
}
interface ViewInput {
    recommendedOption: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption | null;
    currentOption: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption;
    groups: CPUThrottlingGroup[];
    throttling: PanelsCommon.CPUThrottlingOption.CalibratedCPUThrottling;
    onSelect: (option: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption) => void;
    onCalibrateClick: () => void;
}
export declare const DEFAULT_VIEW: (input: ViewInput, _output: undefined, target: HTMLElement) => void;
type View = typeof DEFAULT_VIEW;
export declare class CPUThrottlingSelector extends UI.Widget.Widget {
    #private;
    static createForGlobalConditions(element: HTMLElement): CPUThrottlingSelector;
    constructor(element?: HTMLElement, view?: View);
    set recommendedOption(recommendedOption: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption | null);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
}
export {};
