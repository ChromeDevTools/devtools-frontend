import '../../../ui/components/chrome_link/chrome_link.js';
import '../../../ui/components/expandable_list/expandable_list.js';
import '../../../ui/components/report_view/report_view.js';
import '../../../ui/legacy/legacy.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as UI from '../../../ui/legacy/legacy.js';
declare const enum ScreenStatusType {
    RUNNING = "Running",
    RESULT = "Result"
}
interface ViewInput {
    frame: SDK.ResourceTreeModel.ResourceTreeFrame | null;
    frameTreeData: {
        node: FrameTreeNodeData;
        frameCount: number;
        issueCount: number;
    } | undefined;
    reasonToFramesMap: Map<Protocol.Page.BackForwardCacheNotRestoredReason, string[]>;
    screenStatus: ScreenStatusType;
    navigateAwayAndBack: () => Promise<void>;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare class BackForwardCacheView extends UI.Widget.Widget {
    #private;
    constructor(view?: View);
    performUpdate(): Promise<void>;
}
interface FrameTreeNodeData {
    text: string;
    iconName?: string;
    children?: FrameTreeNodeData[];
}
export {};
