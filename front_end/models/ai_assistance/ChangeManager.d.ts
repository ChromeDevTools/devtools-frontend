import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
export interface Change {
    groupId: string;
    turnId?: number;
    sourceLocation?: string;
    selector: string;
    simpleSelector?: string;
    className: string;
    styles: Record<string, string>;
    backendNodeId?: Protocol.DOM.BackendNodeId;
}
/**
 * Keeps track of changes done by the Styling agent. Currently, it is
 * primarily for stylesheet generation based on all changes.
 */
export declare class ChangeManager {
    #private;
    constructor();
    stashChanges(): Promise<void>;
    dropStashedChanges(): void;
    popStashedChanges(): Promise<void>;
    clear(): Promise<void>;
    addChange(cssModel: SDK.CSSModel.CSSModel, frameId: Protocol.Page.FrameId, change: Change): Promise<string>;
    formatChangesForPatching(groupId: string, includeMetadata?: boolean): string;
    getChangedNodesForGroupId(groupId: string, turnId?: number): Protocol.DOM.BackendNodeId[];
}
