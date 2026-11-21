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
    frameId: Protocol.Page.FrameId;
    elementId: string;
    /**
     * The element that embeds the ad iframe, which the Element ID links to.
     * Null while it is being resolved, and if it couldn't be resolved or the ad
     * iframe has none.
     */
    ownerNode: SDK.DOMModel.DOMNode | null;
    initialOrigin: string;
    networkBytes: string;
    rawNetworkBytes: number;
    cpuTime: string;
    rawCpuTime: number;
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
    /**
     * Called when the mouse leaves the ad iframes table. Also called when it
     * leaves a row, because the data grid forwards the `mouseleave` events of
     * its rows as bubbling events.
     */
    onAdFramesMouseLeave: () => void;
    onAdFrameContextMenu: (contextMenu: UI.ContextMenu.ContextMenu, frameId: Protocol.Page.FrameId) => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement | DocumentFragment) => void;
export declare const DEFAULT_VIEW: View;
export declare class AdsView extends UI.Widget.Widget {
    #private;
    constructor(view?: View);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
}
export {};
