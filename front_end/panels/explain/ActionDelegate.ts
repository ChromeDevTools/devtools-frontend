// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../ui/legacy/legacy.js';
import * as Console from '../console/console.js';

import {ConsoleInsight} from './components/ConsoleInsight.js';
import {InsightProvider} from './InsightProvider.js';
import {PromptBuilder} from './PromptBuilder.js';

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
      case 'explain.consoleMessage': {
        const consoleViewMessage = UI.Context.Context.instance().flavor(Console.ConsoleViewMessage.ConsoleViewMessage);
        if (consoleViewMessage) {
          const insight = new ConsoleInsight(new PromptBuilder(consoleViewMessage), new InsightProvider());
          consoleViewMessage.setInsight(insight);
          void insight.update();
          return true;
        }
        return false;
      }
    }
    return false;
  }
}
