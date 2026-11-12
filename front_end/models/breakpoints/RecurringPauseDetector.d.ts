import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Bindings from '../bindings/bindings.js';
import { type BreakpointManager } from './BreakpointManager.js';
export declare const RECURRING_PAUSE_WINDOW_MS = 10000;
export interface RecurringPauseActions {
    disableBreakpoint?: () => Promise<void>;
    neverPauseHere?: () => Promise<void>;
    deactivateBreakpointsAndResume?: () => void;
}
export declare class RecurringPauseDetector {
    #private;
    constructor(debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, breakpointManager: BreakpointManager, settings: Common.Settings.Settings);
    onPaused(details: SDK.DebuggerModel.DebuggerPausedDetails | null): Promise<RecurringPauseActions>;
}
