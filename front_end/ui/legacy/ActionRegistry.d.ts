import { type Action } from './ActionRegistration.js';
import { Context } from './Context.js';
export declare class ActionRegistry {
    private readonly actionsById;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): ActionRegistry;
    static removeInstance(): void;
    static reset(): void;
    private registerActions;
    availableActions(): Action[];
    actions(): Action[];
    applicableActions(actionIds: string[], context: Context): Action[];
    hasAction(actionId: string): boolean;
    getAction(actionId: string): Action;
}
