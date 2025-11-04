import * as Types from '../types/types.js';
export declare function reset(): void;
export declare function handleEvent(event: Types.Events.Event): void;
export declare function finalize(): Promise<void>;
export interface AuctionWorkletsData {
    worklets: Map<Types.Events.ProcessID, Types.Events.SyntheticAuctionWorklet>;
}
export declare function data(): AuctionWorkletsData;
