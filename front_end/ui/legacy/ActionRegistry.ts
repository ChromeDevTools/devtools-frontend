// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type {Action} from './ActionRegistration.js';
import {getRegisteredActionExtensions} from './ActionRegistration.js';          // eslint-disable-line no-unused-vars
import {Context} from './Context.js';                                           // eslint-disable-line no-unused-vars

let actionRegistryInstance: ActionRegistry|undefined;

export class ActionRegistry {
  _actionsById: Map<string, Action>;
  private constructor() {
    this._actionsById = new Map();
    this._registerActions();
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

  _registerActions(): void {
    for (const action of getRegisteredActionExtensions()) {
      this._actionsById.set(action.id(), action);
      if (!action.canInstantiate()) {
        action.setEnabled(false);
      }
    }
  }

  availableActions(): Action[] {
    return this.applicableActions([...this._actionsById.keys()], Context.instance());
  }

  actions(): Action[] {
    return [...this._actionsById.values()];
  }

  applicableActions(actionIds: string[], context: Context): Action[] {
    const applicableActions: Action[] = [];
    for (const actionId of actionIds) {
      const action = this._actionsById.get(actionId);
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
    return this._actionsById.get(actionId) || null;
  }
}
