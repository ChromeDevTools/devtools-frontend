// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { getRegisteredActionExtensions, reset as resetActionRegistrations } from './ActionRegistration.js';
import { Context } from './Context.js';
let actionRegistryInstance;
export class ActionRegistry {
    actionsById;
    constructor() {
        this.actionsById = new Map();
        this.registerActions();
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!actionRegistryInstance || forceNew) {
            actionRegistryInstance = new ActionRegistry();
        }
        return actionRegistryInstance;
    }
    static removeInstance() {
        actionRegistryInstance = undefined;
    }
    static reset() {
        ActionRegistry.removeInstance();
        resetActionRegistrations();
    }
    registerActions() {
        for (const action of getRegisteredActionExtensions()) {
            this.actionsById.set(action.id(), action);
            if (!action.canInstantiate()) {
                action.setEnabled(false);
            }
        }
    }
    availableActions() {
        return this.applicableActions([...this.actionsById.keys()], Context.instance());
    }
    actions() {
        return [...this.actionsById.values()];
    }
    applicableActions(actionIds, context) {
        const applicableActions = [];
        for (const actionId of actionIds) {
            const action = this.actionsById.get(actionId);
            if (action?.enabled()) {
                if (isActionApplicableToContextTypes(action, context.flavors())) {
                    applicableActions.push(action);
                }
            }
        }
        return applicableActions;
        function isActionApplicableToContextTypes(action, currentContextTypes) {
            const contextTypes = action.contextTypes();
            if (!contextTypes) {
                return true;
            }
            for (let i = 0; i < contextTypes.length; ++i) {
                const contextType = contextTypes[i];
                const isMatching = Boolean(contextType) && currentContextTypes.has(contextType);
                if (isMatching) {
                    return true;
                }
            }
            return false;
        }
    }
    hasAction(actionId) {
        return this.actionsById.has(actionId);
    }
    getAction(actionId) {
        const action = this.actionsById.get(actionId);
        if (action) {
            return action;
        }
        throw new Error(`Cannot find registered action with ID '${actionId}'`);
    }
}
//# sourceMappingURL=ActionRegistry.js.map