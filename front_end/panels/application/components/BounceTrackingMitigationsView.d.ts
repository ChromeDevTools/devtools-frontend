import '../../../ui/components/report_view/report_view.js';
import '../../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../../ui/legacy/legacy.js';
export declare const i18nString: (id: string, values?: import("../../../core/i18n/i18nTypes.js").Values | undefined) => import("../../../core/platform/UIString.js").LocalizedString;
export declare const enum ScreenStatusType {
    INITIALIZING = "Initializing",
    RUNNING = "Running",
    RESULT = "Result",
    DISABLED = "Disabled"
}
export interface BounceTrackingMitigationsViewData {
    trackingSites: string[];
}
export interface ViewInput {
    screenStatus: ScreenStatusType;
    trackingSites: string[];
    seenButtonClick: boolean;
    runMitigations: () => Promise<void>;
}
export declare const DEFAULT_VIEW: (input: ViewInput, _output: undefined, target: HTMLElement) => void;
type ViewFunction = typeof DEFAULT_VIEW;
export declare class BounceTrackingMitigationsView extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: ViewFunction);
    wasShown(): void;
    performUpdate(): void;
}
export {};
