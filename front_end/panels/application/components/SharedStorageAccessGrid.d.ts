import '../../../ui/legacy/components/data_grid/data_grid.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as UI from '../../../ui/legacy/legacy.js';
export declare const i18nString: (id: string, values?: import("../../../core/i18n/i18nTypes.js").Values | undefined) => import("../../../core/platform/UIString.js").LocalizedString;
export interface ViewInput {
    events: Protocol.Storage.SharedStorageAccessedEvent[];
    onSelect: (event: Protocol.Storage.SharedStorageAccessedEvent) => void;
}
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class SharedStorageAccessGrid extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set events(events: Protocol.Storage.SharedStorageAccessedEvent[]);
    set onSelect(onSelect: (event: Protocol.Storage.SharedStorageAccessedEvent) => unknown);
    get onSelect(): (event: Protocol.Storage.SharedStorageAccessedEvent) => unknown;
    performUpdate(): void;
}
