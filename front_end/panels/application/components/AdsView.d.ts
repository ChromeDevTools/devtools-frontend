import '../../../ui/legacy/components/data_grid/data_grid.js';
import '../../../ui/kit/kit.js';
import '../../../ui/components/tooltips/tooltips.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
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
interface AdScriptNodeData {
    url: Platform.DevToolsPath.UrlString;
    parsedProvenance: Protocol.Network.AdProvenance | null;
    scriptId: Protocol.Runtime.ScriptId;
}
export interface ViewInput {
    metrics: Protocol.Ads.AdMetrics;
    adFrames: AdFrameNodeData[];
    adScripts: AdScriptNodeData[];
    target: SDK.Target.Target | null;
    getLinkElement: (url: string) => HTMLElement;
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
