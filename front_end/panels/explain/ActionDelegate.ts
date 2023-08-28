// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../ui/legacy/legacy.js';
import * as Console from '../console/console.js';
import * as Sources from '../sources/sources.js';

import {ExplainPopover} from './ExplainPopover.js';
import {CodeFrameSource} from './sources/CodeFrameSource.js';
import {ConsoleMessageSource} from './sources/ConsoleMessageSource.js';

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
          const popover = new ExplainPopover(new CodeFrameSource(frame));
          void popover.show();
          return true;
        }
        return false;
      }
      case 'explain.consoleMessage': {
        const consoleViewMessage = UI.Context.Context.instance().flavor(Console.ConsoleViewMessage.ConsoleViewMessage);
        if (consoleViewMessage) {
          const popover = new ExplainPopover(new ConsoleMessageSource(consoleViewMessage));
          void popover.show();
          return true;
        }
        return false;
      }
    }
    return false;
  }
}
