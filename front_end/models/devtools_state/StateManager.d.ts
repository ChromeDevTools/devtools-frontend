import * as Common from '../../core/common/common.js';
import { type EventTypes, type State, type StateKind, type StateProvider } from './State.js';
/**
 * The single place to read, reveal, reset, and listen to changes of the DevTools state. It delegates to providers so
 * callers do not depend on the parts of DevTools that own the underlying state.
 */
export declare class StateManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    constructor(providers: StateProvider[]);
    state(kind: StateKind): State | null;
    allStates(): State[];
    nonDefaultStates(): State[];
    reveal(kind: StateKind): Promise<void>;
    reset(kind: StateKind): void;
    dispose(): void;
}
