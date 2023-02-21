// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getRegisteredActionExtensions, type Action, reset as resetActionRegistrations} from './ActionRegistration.js';
import {Context} from './Context.js';

let actionRegistryInstance: ActionRegistry|undefined;

export class ActionRegistry {
  private readonly actionsById: Map<string, Action>;
  private constructor() {
    this.actionsById = new Map();
    this.registerActions();
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): ActionRegistry {
    const {forceNew} = opts;
    if (!actionRegistryInstance || forceNew) {
      actionRegistryInstance = new ActionRegistry();
    }

    return actionRegistryInstance;
  }

  static removeInstance(): void {
    actionRegistryInstance = undefined;
  }

  static reset(): void {
    ActionRegistry.removeInstance();
    resetActionRegistrations();
  }

  private registerActions(): void {
    for (const action of getRegisteredActionExtensions()) {
      this.actionsById.set(action.id(), action);
      if (!action.canInstantiate()) {
        action.setEnabled(false);
      }
    }
  }

  availableActions(): Action[] {
    return this.applicableActions([...this.actionsById.keys()], Context.instance());
  }

  actions(): Action[] {
    return [...this.actionsById.values()];
  }

  applicableActions(actionIds: string[], context: Context): Action[] {
    const applicableActions: Action[] = [];
    for (const actionId of actionIds) {
      const action = this.actionsById.get(actionId);
      if (action && action.enabled()) {
        if (isActionApplicableToContextTypes((action as Action), context.flavors())) {
          applicableActions.push((action as Action));
        }
      }
    }
    return applicableActions;

    function isActionApplicableToContextTypes(action: Action, currentContextTypes: Set<unknown>): boolean {
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

  action(actionId: string): Action|null {
    return this.actionsById.get(actionId) || null;
  }
}
