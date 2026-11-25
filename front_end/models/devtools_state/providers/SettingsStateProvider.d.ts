import * as Common from '../../../core/common/common.js';
import { type EventTypes, type State, StateKind, type StateProvider } from '../State.js';
/**
 * Owns access to `Common.Settings` for `StateManager`: lists tracked settings, reveals them, resets them, and reports
 * changes.
 */
export declare class SettingsStateProvider extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements StateProvider {
    #private;
    constructor(settings: Common.Settings.Settings);
    allStates(): State[];
    reveal(kind: StateKind): Promise<void>;
    reset(kind: StateKind): void;
    dispose(): void;
}
