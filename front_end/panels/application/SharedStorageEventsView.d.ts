import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ApplicationComponents from './components/components.js';
export declare class SharedStorageEventsView extends UI.SplitWidget.SplitWidget {
    #private;
    constructor();
    get id(): Protocol.Page.FrameId;
    wasShown(): void;
    addEvent(event: Protocol.Storage.SharedStorageAccessedEvent): void;
    clearEvents(): void;
    setDefaultIdForTesting(id: Protocol.Page.FrameId): void;
    getEventsForTesting(): Protocol.Storage.SharedStorageAccessedEvent[];
    getSharedStorageAccessGridForTesting(): ApplicationComponents.SharedStorageAccessGrid.SharedStorageAccessGrid;
}
