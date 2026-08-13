import '../../../ui/legacy/components/data_grid/data_grid.js';
import '../../../ui/kit/kit.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as UI from '../../../ui/legacy/legacy.js';
/**
 * @description Data for a single row in the ad iframes table.
 */
interface AdFrameNodeData {
    elementId: string;
    initialOrigin: string;
    networkBytes: string;
    rawNetworkBytes: number;
    cpuTime: string;
    rawCpuTime: number;
    revealFrame: (e: Event) => void;
}
export interface ViewInput {
    metrics: Protocol.Ads.AdMetrics;
    adFrames: AdFrameNodeData[];
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement | DocumentFragment) => void;
export declare class AdsView extends UI.Widget.Widget {
    #private;
    constructor(view?: View);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
}
export {};
