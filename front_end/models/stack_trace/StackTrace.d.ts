import type * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Workspace from '../workspace/workspace.js';
export interface StackTrace extends Common.EventTarget.EventTarget<EventTypes> {
    readonly syncFragment: Fragment;
    readonly asyncFragments: readonly AsyncFragment[];
}
export interface Fragment {
    readonly frames: readonly Frame[];
}
export interface AsyncFragment extends Fragment {
    readonly description: string;
}
export interface Frame {
    readonly url?: string;
    readonly uiSourceCode?: Workspace.UISourceCode.UISourceCode;
    readonly name?: string;
    readonly line: number;
    readonly column: number;
    readonly missingDebugInfo?: MissingDebugInfo;
}
export declare const enum MissingDebugInfoType {
    /** No debug information at all for the call frame */
    NO_INFO = "NO_INFO",
    /** Some debug information available, but it references files with debug information we were not able to retrieve */
    PARTIAL_INFO = "PARTIAL_INFO"
}
export type MissingDebugInfo = {
    type: MissingDebugInfoType.NO_INFO;
} | {
    type: MissingDebugInfoType.PARTIAL_INFO;
    missingDebugFiles: SDK.DebuggerModel.MissingDebugFiles[];
};
export declare const enum Events {
    UPDATED = "UPDATED"
}
export interface EventTypes {
    [Events.UPDATED]: void;
}
