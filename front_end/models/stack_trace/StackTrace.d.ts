import type * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Workspace from '../workspace/workspace.js';
export type StackTrace = BaseStackTrace<Fragment>;
export type DebuggableStackTrace = BaseStackTrace<DebuggableFragment>;
export interface BaseStackTrace<SyncFragmentT extends Fragment> extends Common.EventTarget.EventTarget<EventTypes> {
    readonly syncFragment: SyncFragmentT;
    readonly asyncFragments: readonly AsyncFragment[];
}
export interface Fragment {
    readonly frames: readonly Frame[];
}
export interface AsyncFragment extends Fragment {
    readonly description: string;
}
export interface DebuggableFragment {
    readonly frames: readonly DebuggableFrame[];
}
export interface Frame {
    readonly url?: string;
    readonly uiSourceCode?: Workspace.UISourceCode.UISourceCode;
    readonly name?: string;
    readonly line: number;
    readonly column: number;
    readonly missingDebugInfo?: MissingDebugInfo;
}
export interface DebuggableFrame extends Frame {
    readonly sdkFrame: SDK.DebuggerModel.CallFrame;
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
/**
 * A small wrapper around a DebuggableFrame usable as a UI.Context flavor.
 * This is necessary as Frame and DebuggableFrame are updated in place, but
 * for UI.Context we need a new instance.
 */
export declare class DebuggableFrameFlavor implements DebuggableFrame {
    #private;
    readonly url?: string;
    readonly uiSourceCode?: Workspace.UISourceCode.UISourceCode;
    readonly name?: string;
    readonly line: number;
    readonly column: number;
    readonly missingDebugInfo?: MissingDebugInfo;
    readonly sdkFrame: SDK.DebuggerModel.CallFrame;
    /** Use the static {@link for}. Only public to satisfy the `setFlavor` Ctor type  */
    constructor(frame: DebuggableFrame);
    /** @returns the same instance of DebuggableFrameFlavor for repeated calls with the same (i.e. deep equal) DebuggableFrame */
    static for(frame: DebuggableFrame): DebuggableFrameFlavor;
}
