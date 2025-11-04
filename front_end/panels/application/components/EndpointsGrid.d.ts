import '../../../ui/legacy/components/data_grid/data_grid.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as UI from '../../../ui/legacy/legacy.js';
export declare const i18nString: (id: string, values?: import("../../../core/i18n/i18nTypes.js").Values | undefined) => import("../../../core/platform/UIString.js").LocalizedString;
export interface ViewInput {
    endpoints: Map<string, Protocol.Network.ReportingApiEndpoint[]>;
}
export declare const DEFAULT_VIEW: (input: ViewInput, output: undefined, target: HTMLElement) => void;
type View = typeof DEFAULT_VIEW;
export declare class EndpointsGrid extends UI.Widget.Widget {
    #private;
    endpoints: Map<string, Protocol.Network.ReportingApiEndpoint[]>;
    constructor(element?: HTMLElement, view?: View);
    performUpdate(): void;
}
export {};
