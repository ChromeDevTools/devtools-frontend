// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../ui/legacy/legacy.js';
import * as Sources from '../sources/sources.js';

import { ExplainPopover } from './ExplainPopover.js';

let actionDelegateInstance: ActionDelegate;

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): ActionDelegate {
    const {forceNew} = opts;
    if (!actionDelegateInstance || forceNew) {
      actionDelegateInstance = new ActionDelegate();
    }

    return actionDelegateInstance;
  }

  handleAction(_context: UI.Context.Context, actionId: string): boolean {
    switch (actionId) {
      case 'explain.code': {
        const frame = UI.Context.Context.instance().flavor(Sources.UISourceCodeFrame.UISourceCodeFrame);
        if (frame) {
          new ExplainPopover(frame);
          return true;
        }
      }
    }
    return false;
  }
}
