import * as Common from '../../../core/common/common.js';
import * as SDK from '../../../core/sdk/sdk.js';
import { type EventTypes, type State, StateKind, type StateProvider } from '../State.js';
/**
 * Owns access to `CPUThrottlingManager` for `StateManager`: lists CPU throttling state, resets it, and reports
 * changes.
 */
export declare class CPUThrottlingStateProvider extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements StateProvider {
    #private;
    constructor(cpuThrottlingManager: SDK.CPUThrottlingManager.CPUThrottlingManager);
    allStates(): State[];
    reset(kind: StateKind): void;
    dispose(): void;
}
