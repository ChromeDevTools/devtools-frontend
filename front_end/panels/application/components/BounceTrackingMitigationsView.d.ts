import '../../../ui/components/report_view/report_view.js';
import '../../../ui/legacy/components/data_grid/data_grid.js';
import '../../../ui/kit/kit.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
export declare const i18nString: i18n.LocalizeString;
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
export declare const DEFAULT_VIEW: (input: ViewInput, _output: undefined, target: HTMLElement | DocumentFragment) => void;
type ViewFunction = typeof DEFAULT_VIEW;
export declare class BounceTrackingMitigationsView extends UI.Widget.Widget<ShadowRoot> {
    #private;
    constructor(element?: HTMLElement, view?: ViewFunction);
    wasShown(): void;
    performUpdate(): void;
}
export {};
