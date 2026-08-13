import '../../../../ui/components/report_view/report_view.js';
import '../../../../ui/kit/kit.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as UI from '../../../../ui/legacy/legacy.js';
export interface ViewInput {
    header: Platform.UIString.LocalizedString | null;
    warnings: Array<{
        key: Platform.UIString.LocalizedString;
        valueId: string;
        placeholders?: Record<string, {
            title: Platform.UIString.LocalizedString;
            href: Platform.DevToolsPath.UrlString;
        }>;
    }>;
}
type ViewOutput = unknown;
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement | DocumentFragment) => void;
export declare const DEFAULT_VIEW: View;
export declare class PreloadingDisabledInfobar extends UI.Widget.VBox {
    #private;
    constructor(view?: View);
    get disabledByPreference(): boolean;
    set disabledByPreference(value: boolean);
    get disabledByDataSaver(): boolean;
    set disabledByDataSaver(value: boolean);
    get disabledByBatterySaver(): boolean;
    set disabledByBatterySaver(value: boolean);
    get disabledByHoldbackPrefetchSpeculationRules(): boolean;
    set disabledByHoldbackPrefetchSpeculationRules(value: boolean);
    get disabledByHoldbackPrerenderSpeculationRules(): boolean;
    set disabledByHoldbackPrerenderSpeculationRules(value: boolean);
    wasShown(): void;
    performUpdate(): void;
}
export {};
