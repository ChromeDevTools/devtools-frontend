import '../../ui/components/report_view/report_view.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type DeviceBoundSessionsModel, type SessionAndEvents } from './DeviceBoundSessionsModel.js';
interface ViewInput {
    sessionAndEvents?: SessionAndEvents;
}
type ViewOutput = object;
export declare const DEFAULT_VIEW: (input: ViewInput, _output: ViewOutput, target: HTMLElement) => void;
export declare class DeviceBoundSessionsView extends UI.Widget.VBox {
    #private;
    constructor(view?: typeof DEFAULT_VIEW);
    showSession(model: DeviceBoundSessionsModel, site: string, sessionId?: string): void;
    performUpdate(): void;
}
export {};
