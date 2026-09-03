import '../../../ui/kit/kit.js';
import '../../../ui/legacy/components/data_grid/data_grid.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as UI from '../../../ui/legacy/legacy.js';
export declare const i18nString: i18n.LocalizeString;
export interface ReportsGridData {
    reports: Protocol.Network.ReportingApiReport[];
}
export interface ViewInput {
    reports: Protocol.Network.ReportingApiReport[];
    protocolMonitorExperimentEnabled: boolean;
    onSelect: (id: string) => void;
}
export declare const DEFAULT_VIEW: (input: ViewInput, output: undefined, target: HTMLElement) => void;
type View = typeof DEFAULT_VIEW;
export declare class ReportsGrid extends UI.Widget.Widget {
    #private;
    reports: Protocol.Network.ReportingApiReport[];
    onReportSelected: (id: string) => void;
    constructor(element?: HTMLElement, view?: View);
    performUpdate(): void;
}
export {};
