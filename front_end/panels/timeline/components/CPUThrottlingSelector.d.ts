import '../../../ui/kit/kit.js';
import '../../../ui/components/menus/menus.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Menus from '../../../ui/components/menus/menus.js';
import * as UI from '../../../ui/legacy/legacy.js';
interface CPUThrottlingGroup {
    name: string;
    items: SDK.CPUThrottlingManager.CPUThrottlingOption[];
    showCustomAddOption?: boolean;
}
interface ViewInput {
    recommendedOption: SDK.CPUThrottlingManager.CPUThrottlingOption | null;
    currentOption: SDK.CPUThrottlingManager.CPUThrottlingOption;
    groups: CPUThrottlingGroup[];
    throttling: SDK.CPUThrottlingManager.CalibratedCPUThrottling;
    onMenuItemSelected: (event: Menus.SelectMenu.SelectMenuItemSelectedEvent) => void;
    onCalibrateClick: () => void;
}
export declare const DEFAULT_VIEW: (input: ViewInput, _output: undefined, target: HTMLElement) => void;
type View = typeof DEFAULT_VIEW;
export declare class CPUThrottlingSelector extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set recommendedOption(recommendedOption: SDK.CPUThrottlingManager.CPUThrottlingOption | null);
    wasShown(): void;
    willHide(): void;
    performUpdate(): Promise<void>;
}
export {};
