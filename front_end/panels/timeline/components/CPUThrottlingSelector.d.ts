import '../../../ui/kit/kit.js';
import '../../../ui/components/menus/menus.js';
import type * as Menus from '../../../ui/components/menus/menus.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as PanelsCommon from '../../common/common.js';
interface CPUThrottlingGroup {
    name: string;
    items: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption[];
    showCustomAddOption?: boolean;
}
interface ViewInput {
    recommendedOption: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption | null;
    currentOption: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption;
    groups: CPUThrottlingGroup[];
    throttling: PanelsCommon.CPUThrottlingOption.CalibratedCPUThrottling;
    onMenuItemSelected: (event: Menus.SelectMenu.SelectMenuItemSelectedEvent) => void;
    onCalibrateClick: () => void;
}
export declare const DEFAULT_VIEW: (input: ViewInput, _output: undefined, target: HTMLElement) => void;
type View = typeof DEFAULT_VIEW;
export declare class CPUThrottlingSelector extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set recommendedOption(recommendedOption: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption | null);
    wasShown(): void;
    willHide(): void;
    performUpdate(): Promise<void>;
}
export {};
