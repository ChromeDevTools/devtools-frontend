import '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { PlayerEvent } from './MediaModel.js';
export interface EventDisplayRow {
    displayTimestamp: string;
    event: string;
    value: Record<string, unknown>;
}
export interface PlayerEventsViewInput {
    parsedEvents: EventDisplayRow[];
}
export type View = (input: PlayerEventsViewInput, output: void, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class PlayerEventsView extends UI.Widget.VBox {
    #private;
    private firstEventTime;
    constructor(view?: View);
    wasShown(): void;
    performUpdate(): void;
    onEvent(event: PlayerEvent): void;
    private subtractFirstEventTime;
}
